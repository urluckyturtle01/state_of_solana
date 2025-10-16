import React, { useState, useMemo, useRef, useCallback } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridColumns } from '@visx/grid';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Bar } from '@visx/shape';
import { ChartConfig } from '../../types';
import { blue, getColorByIndex } from '@/app/utils/chartColors';
import ChartTooltip from '@/app/components/shared/ChartTooltip';
import PrettyLoader from "@/app/components/shared/PrettyLoader";
import Modal from '@/app/components/shared/Modal';

export interface LadderChartData {
  category: string;
  value: number;
  label: string;
  [key: string]: any;
}

export interface LadderChartProps {
  chartConfig: ChartConfig;
  data: LadderChartData[];
  width?: number;
  height?: number;
  isExpanded?: boolean;
  onCloseExpanded?: () => void;
  yAxisUnit?: string;
  selectedEpoch?: number;
}

const DEFAULT_MARGIN = { top: 20, right: 40, bottom: 40, left: 120 };

export default function LadderChart({
  chartConfig,
  data = [],
  width = 600,
  height = 400,
  isExpanded = false,
  onCloseExpanded,
  yAxisUnit = '',
  selectedEpoch
}: LadderChartProps) {
  const [error, setError] = useState<string | null>(null);
  const [tooltipData, setTooltipData] = useState<any>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  const svgRef = useRef<SVGSVGElement>(null);

  // Process and validate data
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    try {
      return data.filter(d => d.value !== undefined && d.category !== undefined)
                 .sort((a, b) => b.value - a.value); // Sort by value descending for ladder effect
    } catch (err) {
      console.error('Error processing ladder chart data:', err);
      setError('Error processing data');
      return [];
    }
  }, [data]);

  // Create scales factory function to be used with responsive dimensions
  const createScales = useCallback((chartWidth: number, chartHeight: number) => {
    if (!processedData.length) {
      return {
        xScale: scaleLinear({ domain: [0, 100], range: [0, chartWidth] }),
        yScale: scaleBand<string>({ domain: [], range: [0, chartHeight] })
      };
    }

    const categories = processedData.map(d => d.category);
    const yScale = scaleBand<string>({
      domain: categories,
      range: [0, chartHeight - DEFAULT_MARGIN.top - DEFAULT_MARGIN.bottom],
      padding: 0.2
    });

    // Calculate x-domain from values
    const values = processedData.map(d => d.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values, 0);
    
    const xScale = scaleLinear({
      domain: [Math.min(minValue * 1.1, 0), maxValue * 1.1],
      range: [0, chartWidth - DEFAULT_MARGIN.left - DEFAULT_MARGIN.right]
    });

    return { xScale, yScale };
  }, [processedData]);

  // Handle tooltip
  const handleMouseMove = useCallback((event: React.MouseEvent, datum: LadderChartData) => {
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

  // Format value for display
  const formatValue = useCallback((value: number) => {
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
      return `${sign}${absValue.toFixed(2)}`;
    } else {
      return `${sign}${absValue.toFixed(1)}`;
    }
  }, []);

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

  if (!processedData.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <p className="mb-2">No data available</p>
          <p className="text-sm">Try selecting a different epoch</p>
        </div>
      </div>
    );
  }

  const chartContent = (
    <div className="w-full h-full relative overflow-hidden rounded-lg">
      <div className="h-full w-full overflow-hidden">
        <ParentSize debounceTime={10}>
          {({ width: parentWidth, height: parentHeight }) => {
            // Ensure we have valid dimensions and constrain to container bounds
            const maxWidth = Math.min(parentWidth > 0 ? parentWidth : width || 600, 1200);
            const maxHeight = Math.min(parentHeight > 0 ? parentHeight : height || 400, 800);
            const chartWidth = Math.max(maxWidth, 400); // Minimum width for readability
            const chartHeight = Math.max(maxHeight, 300); // Minimum height for readability

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
                    {/* X-axis grid lines */}
                    <GridColumns
                      scale={xScale}
                      height={chartHeight - DEFAULT_MARGIN.top - DEFAULT_MARGIN.bottom}
                      stroke="#1f2937"
                      strokeOpacity={0.5}
                      strokeDasharray="2,3"
                    />

                    {/* Horizontal bars */}
                    <Group>
                      {processedData.map((datum, index) => {
                        const barHeight = yScale.bandwidth();
                        const barY = yScale(datum.category);
                        const barWidth = Math.abs(xScale(datum.value) - xScale(0));
                        const barX = Math.min(xScale(0), xScale(datum.value));
                        
                        if (barY === undefined) return null;

                        const color = getColorByIndex(index, 'bar');
                        
                        return (
                          <Bar
                            key={`bar-${index}`}
                            x={barX}
                            y={barY}
                            width={barWidth}
                            height={barHeight}
                            fill={color}
                            stroke={color}
                            strokeWidth={1}
                            rx={2}
                            onMouseMove={(e) => handleMouseMove(e, datum)}
                            onMouseLeave={handleMouseLeave}
                            style={{ cursor: 'pointer' }}
                            opacity={0.8}
                          />
                        );
                      })}
                    </Group>

                    {/* Y-axis (categories) */}
                    <AxisLeft
                      scale={yScale}
                      stroke="#374151"
                      strokeWidth={0.5}
                      tickStroke="transparent"
                      tickLength={0}
                      hideAxisLine={false}
                      tickLabelProps={() => ({
                        fill: '#6b7280',
                        fontSize: 12,
                        fontWeight: 400,
                        textAnchor: 'end',
                        dy: '0.33em',
                        dx: '-0.5em'
                      })}
                    />

                    {/* X-axis (values) */}
                    <AxisBottom
                      top={chartHeight - DEFAULT_MARGIN.top - DEFAULT_MARGIN.bottom}
                      scale={xScale}
                      stroke="#374151"
                      strokeWidth={0.5}
                      tickStroke="transparent"
                      hideAxisLine={false}
                      tickLength={0}
                      numTicks={6}
                      tickFormat={(value) => `${formatValue(Number(value))}${yAxisUnit ? ` ${yAxisUnit}` : ''}`}
                      tickLabelProps={() => ({
                        fill: '#6b7280',
                        fontSize: 11,
                        fontWeight: 300,
                        textAnchor: 'middle',
                        dy: '0.5em'
                      })}
                    />
                  </Group>
                </svg>

                {/* Tooltip */}
                {tooltipData && (
                  <ChartTooltip
                    title={`${tooltipData.label || tooltipData.category}`}
                    items={[
                      { 
                        label: 'Value', 
                        value: `${tooltipData.value.toFixed(2)}${yAxisUnit ? ` ${yAxisUnit}` : ''}`, 
                        color: blue 
                      },
                      ...(selectedEpoch ? [{ 
                        label: 'Epoch', 
                        value: selectedEpoch.toString(), 
                        color: '#6b7280' 
                      }] : [])
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
