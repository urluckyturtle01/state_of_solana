import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleBand, scaleLinear, scaleLog } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Line, LinePath } from '@visx/shape';
import { ChartConfig } from '../../types';
import { blue, getColorByIndex, allColorsArray } from '@/app/utils/chartColors';
import ChartTooltip from '@/app/components/shared/ChartTooltip';
import ButtonSecondary from "@/app/components/shared/buttons/ButtonSecondary";
import PrettyLoader from "@/app/components/shared/PrettyLoader";
import LegendItem from "@/app/components/shared/LegendItem";
import BrushTimeScale from "@/app/components/shared/BrushTimeScale";
import Modal from '@/app/components/shared/Modal';
import TimeFilterSelector from '@/app/components/shared/filters/TimeFilter';
import CurrencyFilter from '@/app/components/shared/filters/CurrencyFilter';
import DisplayModeFilter, { DisplayMode } from '@/app/components/shared/filters/DisplayModeFilter';

// Define RefreshIcon component
const RefreshIcon = ({ className = "w-4 h-4" }) => {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
      />
    </svg>
  );
};

export interface BoxPlotData {
  category: string; // X-axis category (e.g., epoch, date)
  p5: number;       // 5th percentile
  p10: number;      // 10th percentile  
  p25: number;      // 25th percentile (Q1)
  p50: number;      // 50th percentile (median)
  p75: number;      // 75th percentile (Q3)
  p90: number;      // 90th percentile
  p95: number;      // 95th percentile
  p99: number;      // 99th percentile
  [key: string]: any; // Allow additional fields
}

export interface BoxChartProps {
  chartConfig: ChartConfig;
  data: BoxPlotData[];
  width?: number;
  height?: number;
  isExpanded?: boolean;
  onCloseExpanded?: () => void;
  colorMap?: Record<string, string>;
  filterValues?: Record<string, string>;
  yAxisUnit?: string;
  onFilterChange?: (newFilters: Record<string, string>) => void;
  onModalFilterUpdate?: (newFilters: Record<string, string>) => void;
  maxXAxisTicks?: number;
}

const DEFAULT_MARGIN = { top: 10, right: 15, bottom: 30, left: 40 };

export default function BoxChart({
  chartConfig,
  data = [],
  width = 800,
  height = 400,
  isExpanded = false,
  onCloseExpanded,
  colorMap = {},
  filterValues = {},
  yAxisUnit,
  onFilterChange,
  onModalFilterUpdate,
  maxXAxisTicks = 10
}: BoxChartProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localFilters, setLocalFilters] = useState<Record<string, string>>(filterValues);
  const [tooltipData, setTooltipData] = useState<any>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('absolute');
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  
  const svgRef = useRef<SVGSVGElement>(null);

  // Process and validate data
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    try {
      return data.filter(d => {
        // Ensure all required percentile fields exist for the box plot
        return d.p5 !== undefined && d.p25 !== undefined && 
               d.p50 !== undefined && d.p75 !== undefined &&
               d.p95 !== undefined;
      }).map(d => ({
        ...d,
        category: d.category || d[chartConfig.dataMapping.xAxis as string] || 'Unknown'
      }));
    } catch (err) {
      console.error('Error processing box plot data:', err);
      setError('Error processing data');
      return [];
    }
  }, [data, chartConfig.dataMapping.xAxis]);

  // Create scales factory function to be used with responsive dimensions
  const createScales = useCallback((chartWidth: number, chartHeight: number) => {
    if (!processedData.length) {
      return {
        xScale: scaleBand<string>({ domain: [], range: [0, chartWidth] }),
        yScale: scaleLinear({ domain: [0, 1], range: [chartHeight, 0] })
      };
    }

    const xDomain = processedData.map(d => String(d.category));
    const xScale = scaleBand<string>({
      domain: xDomain,
      range: [0, chartWidth - DEFAULT_MARGIN.left - DEFAULT_MARGIN.right],
      padding: 0.2
    });

    // Calculate y-domain from displayed percentile values
    const allValues = processedData.flatMap(d => [
      d.p5, d.p25, d.p50, d.p75, d.p95
    ]).filter(val => val > 0); // Filter out zero/negative values for log scale

    if (allValues.length === 0) {
      return {
        xScale: scaleBand<string>({ domain: [], range: [0, chartWidth] }),
        yScale: scaleLinear({ domain: [0, 1], range: [chartHeight - DEFAULT_MARGIN.bottom, DEFAULT_MARGIN.top] })
      };
    }

    const yMin = Math.min(...allValues);
    const yMax = Math.max(...allValues);
    
    // Use logarithmic scale with reasonable bounds
    const logMin = Math.max(yMin * 0.8, 0.01); // Ensure minimum is positive for log scale
    const logMax = yMax * 1.2;

    const yScale = scaleLog({
      domain: [logMin, logMax],
      range: [chartHeight - DEFAULT_MARGIN.top - DEFAULT_MARGIN.bottom, 0]
    });

    return { xScale, yScale };
  }, [processedData]);

  // Handle tooltip
  const handleMouseMove = useCallback((event: React.MouseEvent, datum: BoxPlotData) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltipPosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
      setTooltipData(datum);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltipData(null);
  }, []);

  // Format y-axis tick value with appropriate units (matching SimpleBarChart style)
  const formatTickValue = useCallback((value: number) => {
    if (value === 0) return '0';
    
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    if (absValue >= 1000000000) {
      const formattedValue = (absValue / 1000000000).toFixed(1);
      return formattedValue.endsWith('.0') 
        ? `${sign}${formattedValue.slice(0, -2)}B` 
        : `${sign}${formattedValue}B`;
    } else if (absValue >= 1000000) {
      const formattedValue = (absValue / 1000000).toFixed(1);
      return formattedValue.endsWith('.0') 
        ? `${sign}${formattedValue.slice(0, -2)}M` 
        : `${sign}${formattedValue}M`;
    } else if (absValue >= 1000) {
      const formattedValue = (absValue / 1000).toFixed(1);
      return formattedValue.endsWith('.0') 
        ? `${sign}${formattedValue.slice(0, -2)}K` 
        : `${sign}${formattedValue}K`;
    } else if (absValue < 1) {
      // For values between 0 and 1, show decimal places
      return `${sign}${absValue.toFixed(1)}`;
    } else {
      return `${sign}${absValue.toFixed(0)}`;
    }
  }, []);


  // Render box plot for a single data point
  const renderBoxPlot = useCallback((datum: BoxPlotData, index: number, xScale: any, yScale: any) => {
    const x = xScale(String(datum.category));
    const bandwidth = xScale.bandwidth();
    
    if (!x || bandwidth === undefined) return null;

    const boxWidth = bandwidth * 0.6; // Slightly smaller to match SimpleBarChart proportions
    const boxX = x + (bandwidth - boxWidth) / 2;
    
    // Calculate y positions using logarithmic scale
    // Ensure all values are positive for log scale
    const y5 = yScale(Math.max(datum.p5, 0.01));
    const y25 = yScale(Math.max(datum.p25, 0.01));
    const y50 = yScale(Math.max(datum.p50, 0.01));
    const y75 = yScale(Math.max(datum.p75, 0.01));
    const y95 = yScale(Math.max(datum.p95, 0.01));

    const color = blue; // Use consistent blue color for all boxes
    const strokeColor = color;
    const fillColor = `${color}40`; // Slightly more visible but still subtle

    return (
      <Group key={`box-${index}`}>
        {/* Whiskers - dotted lines */}
        {/* Lower whisker (p5 to p25) */}
        <Line
          from={{ x: boxX + boxWidth / 2, y: y5 }}
          to={{ x: boxX + boxWidth / 2, y: y25 }}
          stroke={strokeColor}
          strokeWidth={1}
          strokeDasharray="2,3"
          opacity={0.7}
        />
        
        {/* Upper whisker (p75 to p95) */}
        <Line
          from={{ x: boxX + boxWidth / 2, y: y75 }}
          to={{ x: boxX + boxWidth / 2, y: y95 }}
          stroke={strokeColor}
          strokeWidth={1}
          strokeDasharray="2,3"
          opacity={0.7}
        />

        {/* Whisker caps - subtle */}
        <Line
          from={{ x: boxX + boxWidth * 0.35, y: y5 }}
          to={{ x: boxX + boxWidth * 0.65, y: y5 }}
          stroke={strokeColor}
          strokeWidth={1}
          opacity={0.7}
        />
        <Line
          from={{ x: boxX + boxWidth * 0.35, y: y95 }}
          to={{ x: boxX + boxWidth * 0.65, y: y95 }}
          stroke={strokeColor}
          strokeWidth={1}
          opacity={0.7}
        />

        {/* Box (IQR: p25 to p75) - clean styling matching SimpleBarChart */}
        <rect
          x={boxX}
          y={y75}
          width={boxWidth}
          height={y25 - y75}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={1}
          rx={0}
          onMouseMove={(e) => handleMouseMove(e, datum)}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: 'pointer' }}
          opacity={0.8}
        />

        {/* Median line (p50) - clear and prominent */}
        <Line
          from={{ x: boxX + 1, y: y50 }}
          to={{ x: boxX + boxWidth - 1, y: y50 }}
          stroke={strokeColor}
          strokeWidth={2}
          opacity={1}
        />
      </Group>
    );
  }, [handleMouseMove, handleMouseLeave]);

  // Filter management
  const handleFilterChange = useCallback((key: string, value: string) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange?.(newFilters);
  }, [localFilters, onFilterChange]);

  const handleModalFilterUpdate = useCallback((newFilters: Record<string, string>) => {
    setLocalFilters(newFilters);
    onModalFilterUpdate?.(newFilters);
    setIsFilterModalOpen(false);
  }, [onModalFilterUpdate]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        <div className="text-center">
          <p className="mb-2">Error loading chart data</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <PrettyLoader />
      </div>
    );
  }

  if (!processedData.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <p className="mb-2">No data available</p>
          <p className="text-sm">Try adjusting your filters or time range</p>
        </div>
      </div>
    );
  }

  const chartContent = (
    <div className="w-full h-full relative overflow-hidden rounded-lg">
      <div className="h-[100%] w-full overflow-hidden">
        <ParentSize debounceTime={10}>
          {({ width: parentWidth, height: parentHeight }) => {
            // Ensure we have valid dimensions and constrain to container bounds
            const maxWidth = Math.min(parentWidth > 0 ? parentWidth : width || 800, 1200);
            const maxHeight = Math.min(parentHeight > 0 ? parentHeight : height || 400, 800);
            const chartWidth = Math.max(maxWidth, 300); // Minimum width for readability
            const chartHeight = Math.max(maxHeight, 200); // Minimum height for readability

            // Only render if we have valid dimensions
            if (chartWidth <= 0 || chartHeight <= 0) return null;

            const { xScale, yScale } = createScales(chartWidth, chartHeight);

            return (
              <div className="relative overflow-hidden max-w-full max-h-full">
                <svg
                  ref={svgRef}
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="max-w-full max-h-full"
                >
                  <Group left={DEFAULT_MARGIN.left} top={DEFAULT_MARGIN.top}>
                    {/* Y-axis grid lines - matching SimpleBarChart style */}
                    <GridRows
                      scale={yScale}
                      width={chartWidth - DEFAULT_MARGIN.left - DEFAULT_MARGIN.right}
                      stroke="#1f2937"
                      strokeOpacity={0.5}
                      strokeDasharray="2,3"
                    />

                    {/* Box plots */}
                    <Group>
                      {processedData.map((datum, index) => renderBoxPlot(datum, index, xScale, yScale))}
                    </Group>

                    {/* X-axis - matching SimpleBarChart style */}
                    <AxisBottom
                      top={chartHeight - DEFAULT_MARGIN.top - DEFAULT_MARGIN.bottom}
                      scale={xScale}
                      stroke="#374151"
                      strokeWidth={0.5}
                      tickStroke="transparent"
                      hideAxisLine={false}
                      tickLength={0}
                      numTicks={Math.min(processedData.length, maxXAxisTicks)}
                      tickLabelProps={() => ({
                        fill: '#6b7280',
                        fontSize: 11,
                        fontWeight: 300,
                        textAnchor: 'middle',
                        dy: '0.5em'
                      })}
                      left={0}
                    />

                    {/* Y-axis - matching SimpleBarChart style */}
                    <AxisLeft
                      scale={yScale}
                      stroke="#374151"
                      strokeWidth={0.5}
                      tickStroke="transparent"
                      tickLength={0}
                      hideZero={false}
                      tickValues={(() => {
                        // Generate exactly 5 tick values for logarithmic scale
                        const domain = yScale.domain();
                        const min = domain[0];
                        const max = domain[1];
                        
                        if (min <= 0 || max <= 0) return [0.1, 1, 10, 100, 1000];
                        
                        const logMin = Math.log10(min);
                        const logMax = Math.log10(max);
                        const step = (logMax - logMin) / 4; // 4 intervals = 5 ticks
                        
                        return Array.from({ length: 5 }, (_, i) => 
                          Math.pow(10, logMin + i * step)
                        );
                      })()}
                      tickFormat={(value) => formatTickValue(Number(value))}
                      tickLabelProps={() => ({
                        fill: '#6b7280',
                        fontSize: 11,
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: 'end',
                        dy: '0.33em',
                        dx: '-0.25em'
                      })}
                    />
                  </Group>
                </svg>

                {/* Tooltip */}
                {tooltipData && (
                  <ChartTooltip
                    title={`${chartConfig.dataMapping.xAxis}: ${tooltipData.category}`}
                    items={[
                      { label: 'P95 (Upper Whisker)', value: `${tooltipData.p95.toFixed(2)} ${yAxisUnit || ''}`.trim(), color: blue },
                      { label: 'P75 (Q3, Box Top)', value: `${tooltipData.p75.toFixed(2)} ${yAxisUnit || ''}`.trim(), color: blue },
                      { label: 'P50 (Median)', value: `${tooltipData.p50.toFixed(2)} ${yAxisUnit || ''}`.trim(), color: '#ffffff' },
                      { label: 'P25 (Q1, Box Bottom)', value: `${tooltipData.p25.toFixed(2)} ${yAxisUnit || ''}`.trim(), color: blue },
                      { label: 'P5 (Lower Whisker)', value: `${tooltipData.p5.toFixed(2)} ${yAxisUnit || ''}`.trim(), color: blue },
                    ]}
                    top={tooltipPosition.y}
                    left={tooltipPosition.x}
                  />
                )}
              </div>
          );
          }}
        </ParentSize>
      </div>
    </div>
  );


  if (isExpanded) {
    return (
      <Modal
        isOpen={isExpanded}
        onClose={onCloseExpanded || (() => {})}
        title={chartConfig.title}
      >
        <div className="h-full flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            {React.cloneElement(chartContent as React.ReactElement, {
              width: undefined,
              height: 600
            })}
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <div className="w-full h-full max-w-full overflow-hidden">
      {chartContent}
    </div>
  );
}

// Separate BoxChart Legend component for ChartCard
export const BoxChartLegend: React.FC = () => {
  return (
    <>
      <LegendItem
        label="Box (IQR: P25-P75)"
        color={blue}
        shape="square"
        tooltipText="Interquartile Range (25th to 75th percentile)"
      />
      <LegendItem
        label="Median (P50)"
        color="#ffffff"
        shape="square"
        tooltipText="50th percentile (median value)"
      />
      <LegendItem
        label="Whiskers (P5-P95)"
        color={blue}
        shape="square"
        tooltipText="5th to 95th percentile range"
      />
      
    </>
  );
};
