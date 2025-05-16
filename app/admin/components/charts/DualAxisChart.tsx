import React, { useState, useMemo, useRef, useCallback } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft, AxisRight } from '@visx/axis';
import { Bar } from '@visx/shape';
import { LinePath } from '@visx/shape';
import { ChartConfig, YAxisConfig } from '../../types';
import { blue, getColorByIndex } from '@/app/utils/chartColors';
import ChartTooltip from '@/app/components/shared/ChartTooltip';
import ButtonSecondary from "@/app/components/shared/buttons/ButtonSecondary";
import Loader from "@/app/components/shared/Loader";
import BrushTimeScale from "@/app/components/shared/BrushTimeScale";
import { curveCatmullRom } from '@visx/curve';

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

interface DualAxisChartProps {
  chartConfig: ChartConfig;
  data: any[];
  width?: number;
  height?: number;
  isExpanded?: boolean;
  onCloseExpanded?: () => void;
  colorMap?: Record<string, string>;
  filterValues?: Record<string, string>;
}

// Helper function to get field from YAxisConfig or use string directly
function getYAxisField(field: string | YAxisConfig): string {
  return typeof field === 'string' ? field : field.field;
}

const DualAxisChart: React.FC<DualAxisChartProps> = ({ 
  chartConfig, 
  data, 
  width = 500, 
  height = 300,
  isExpanded = false,
  onCloseExpanded,
  colorMap: externalColorMap,
  filterValues
}) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Brush state
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  
  // Filtered data based on brush
  const [filteredData, setFilteredData] = useState<any[]>([]);

  // Update tooltip state definition
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    left: number;
    top: number;
    key: string;
    title?: string;
    items: { label: string, value: string | number, color: string, shape?: 'circle' | 'square' }[];
  }>({
    visible: false,
    left: 0,
    top: 0,
    key: '',
    items: []
  });

  // Extract mapping fields
  const xField = chartConfig.dataMapping.xAxis;
  const yField = chartConfig.dataMapping.yAxis;
  
  // For type safety, ensure we use string values for indexing
  const xKey = typeof xField === 'string' ? xField : xField[0];
  
  // Format value for tooltip
  const formatValue = useCallback((value: number) => {
    // Add null/undefined check
    if (value === undefined || value === null) {
      return '$0.00';
    }
    
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(2)}B`;
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    } else {
      return `$${value.toFixed(2)}`;
    }
  }, []);

  // Format y-axis tick value with appropriate units
  const formatTickValue = useCallback((value: number) => {
    if (value === 0) return '0';
    
    if (value >= 1000000000) {
      const formattedValue = (value / 1000000000).toFixed(1);
      return formattedValue.endsWith('.0') 
        ? `${formattedValue.slice(0, -2)}B` 
        : `${formattedValue}B`;
    } else if (value >= 1000000) {
      const formattedValue = (value / 1000000).toFixed(1);
      return formattedValue.endsWith('.0') 
        ? `${formattedValue.slice(0, -2)}M` 
        : `${formattedValue}M`;
    } else if (value >= 1000) {
      const formattedValue = (value / 1000).toFixed(1);
      return formattedValue.endsWith('.0') 
        ? `${formattedValue.slice(0, -2)}K` 
        : `${formattedValue}K`;
    } else {
      return value.toFixed(0);
    }
  }, []);

  // Placeholder for refresh data functionality
  const refreshData = useCallback(() => {
    setLoading(true);
    
    // If onFilterChange exists in chartConfig, call it with current filters
    if (chartConfig.onFilterChange) {
      chartConfig.onFilterChange(filterValues || {});
    }
    
    setTimeout(() => {
      setLoading(false);
      setError(null);
    }, 300);
  }, [filterValues, chartConfig]);

  // Extract data for the chart
  const { chartData, fields, fieldColors } = useMemo(() => {
    const currentData = isBrushActive && filteredData.length > 0 ? filteredData : data;
    
    if (!currentData || currentData.length === 0) {
      return { chartData: [], fields: [], fieldColors: {} };
    }

    // Use external color map if available
    const preferredColorMap = externalColorMap || {};
    
    // Filter data first to remove any undefined x values
    const processedData = currentData.filter(d => d[xKey] !== undefined && d[xKey] !== null);
    
    // Sort by date if applicable
    if (processedData.length > 0) {
      // Detect if data contains dates
      const isDateField = typeof processedData[0][xKey] === 'string' && 
        (processedData[0][xKey].match(/^\d{4}-\d{2}-\d{2}/) || 
        /^\w+\s\d{4}$/.test(processedData[0][xKey]) || 
        /^\d{4}$/.test(processedData[0][xKey]));
      
      if (isDateField) {
        // Sort dates chronologically (oldest to newest)
        processedData.sort((a, b) => {
          const dateA = new Date(a[xKey]);
          const dateB = new Date(b[xKey]);
          return dateA.getTime() - dateB.getTime();
        });
      }
    }
    
    // Get all field names that should appear in the chart
    let allFields: string[] = [];
    if (Array.isArray(yField)) {
      allFields = yField.map(field => getYAxisField(field));
    } else {
      allFields = [getYAxisField(yField)];
    }
    
    // Prepare color mapping for fields
    const colorMapping: Record<string, string> = {};
    allFields.forEach((field, index) => {
      colorMapping[field] = preferredColorMap[field] || getColorByIndex(index);
    });
    
    return { 
      chartData: processedData,
      fields: allFields,
      fieldColors: colorMapping
    };
  }, [data, filteredData, isBrushActive, xKey, yField, externalColorMap]);

  // Handle mouse leave for tooltip
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);

  // Format tooltip title
  const formatTooltipTitle = useCallback((label: string) => {
    if (!label) return '';
    
    const strLabel = String(label);
    
    // Detect if it's a date format
    if (/^\d{4}-\d{2}-\d{2}/.test(strLabel) || /^\d{2}\/\d{2}\/\d{4}/.test(strLabel)) {
      const d = new Date(strLabel);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { 
          month: 'short',
          day: '2-digit',
          year: 'numeric'
        });
      }
    }
    
    // For month-year format like "Jan 2023"
    if (/^[A-Za-z]{3}\s\d{4}$/.test(strLabel)) {
      return strLabel;
    }
    
    // For year only
    if (/^\d{4}$/.test(strLabel)) {
      return strLabel;
    }
    
    return strLabel;
  }, []);
  
  // Handle mouse move for tooltips
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Get mouse position - use client coordinates for consistency
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Use current data based on brush state
    const currentData = isBrushActive && filteredData.length > 0 ? filteredData : data;
    
    // Check if we have data to work with
    if (currentData.length === 0) return;
    
    // Calculate available chart space for dual-axis chart
    const margin = { top: 10, right: 25, bottom: 30, left: 40 };
    const innerWidth = rect.width - margin.left - margin.right;
    
    // Adjust mouseX to account for margin
    const adjustedMouseX = mouseX - margin.left;
    
    // Early exit if mouse is outside the chart area
    if (adjustedMouseX < 0 || adjustedMouseX > innerWidth) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    // Calculate bar width and find closest bar
    const barWidth = innerWidth / chartData.length;
    const barIndex = Math.floor(adjustedMouseX / barWidth);
    
    // Validate the index
    if (barIndex < 0 || barIndex >= chartData.length) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    // Get the data point at this index
    const dataPoint = chartData[barIndex];
    if (!dataPoint) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }

    const xValue = dataPoint[xKey];
    
    // Calculate tooltip position
    const tooltipLeft = mouseX;
    const tooltipTop = Math.max(mouseY - 10, 10);
    
    // Only update if showing a new x-value or hiding previous one
    if (!tooltip.visible || tooltip.key !== xValue) {
      // For dual-axis, show all field values
      const tooltipItems = fields
        .filter(field => {
          // Only include fields with non-zero values
          const value = Number(dataPoint[field]);
          return !isNaN(value) && value > 0;
        })
        .map(field => ({
          label: field,
          value: formatValue(Number(dataPoint[field]) || 0),
          color: fieldColors[field] || blue,
          shape: 'square' as 'square'
        }));
      
      // If no values found, show placeholder
      if (tooltipItems.length === 0 && fields.length > 0) {
        tooltipItems.push({
          label: fields[0],
          value: "$0.00",
          color: fieldColors[fields[0]] || blue,
          shape: 'square' as 'square'
        });
      }
      
      // Update the tooltip
      setTooltip({
        visible: true,
        key: xValue,
        title: formatTooltipTitle(xValue),
        items: tooltipItems,
        left: tooltipLeft,
        top: tooltipTop
      });
    } else {
      // If tooltip content isn't changing, just update position
      setTooltip(prev => ({
        ...prev,
        left: tooltipLeft,
        top: tooltipTop
      }));
    }
  }, [data, filteredData, isBrushActive, chartData, fields, xKey, fieldColors, formatValue, tooltip, formatTooltipTitle]);

  // Utility to determine if a field belongs to the right axis
  const isRightAxisField = useCallback((field: string): boolean => {
    if (!chartConfig.dualAxisConfig) return false;
    return chartConfig.dualAxisConfig.rightAxisFields.includes(field);
  }, [chartConfig.dualAxisConfig]);

  // Utility to check if a field should be rendered as a line
  const shouldRenderAsLine = useCallback((field: string): boolean => {
    if (!chartConfig.dualAxisConfig) return false;
    
    // Check field configuration in yField if available
    if (Array.isArray(yField) && typeof yField[0] !== 'string') {
      const fieldConfig = (yField as YAxisConfig[]).find(config => config.field === field);
      if (fieldConfig) {
        return fieldConfig.type === 'line';
      }
    }
    
    // Otherwise use axis type from dual axis config
    const isRight = isRightAxisField(field);
    return isRight ? 
      chartConfig.dualAxisConfig.rightAxisType === 'line' : 
      chartConfig.dualAxisConfig.leftAxisType === 'line';
  }, [chartConfig.dualAxisConfig, yField, isRightAxisField]);

  // Process brush data - simplify for just dual axis
  const brushData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Filter and ensure x values are valid
    const processedData = data.filter(d => d[xKey] !== undefined && d[xKey] !== null);
    
    // Create synthetic dates for brush
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    
    // Get the first field for brush data
    const firstField = fields.length > 0 ? fields[0] : '';
    
    // Create date points for the brush
    return processedData.map((d, i) => {
      // Try to parse date from x value or use synthetic date
      let date;
      if (typeof d[xKey] === 'string' && 
         (d[xKey].match(/^\d{4}-\d{2}-\d{2}/) || 
          /^\d{2}\/\d{2}\/\d{4}/.test(d[xKey]) ||
          /^[A-Za-z]{3}\s\d{4}$/.test(d[xKey]) || 
          /^\d{4}$/.test(d[xKey]))) {
        date = new Date(d[xKey]);
        if (isNaN(date.getTime())) {
          date = new Date(baseDate);
          date.setDate(baseDate.getDate() + i);
        }
      } else {
        date = new Date(baseDate);
        date.setDate(baseDate.getDate() + i);
      }
      
      return {
        date,
        value: Number(d[firstField]) || 0,
        originalData: d
      };
    });
  }, [data, xKey, fields]);

  // Handle brush change
  const handleBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isBrushActive) {
        setBrushDomain(null);
        setIsBrushActive(false);
        setFilteredData([]);
      }
      return;
    }
    
    const { x0, x1 } = domain;
    
    // Update brush domain
    setBrushDomain([new Date(x0), new Date(x1)]);
    
    // Filter data based on brush selection
    const selectedItems = brushData
      .filter(item => item.date >= new Date(x0) && item.date <= new Date(x1))
      .map(item => item.originalData);
      
    setFilteredData(selectedItems);
    
    if (!isBrushActive) {
      setIsBrushActive(true);
    }
  }, [isBrushActive, brushData]);

  // Render content function
  const renderChartContent = useCallback((chartWidth: number, chartHeight: number) => {
    // Show loading state
    if (loading) {
      return <div className="flex justify-center items-center h-full"><Loader size="sm" /></div>;
    }
    
    // Show error state or no data
    if (error || chartData.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-full">
          <div className="text-gray-400/80 text-xs mb-2">{error || 'No data available'}</div>
          <ButtonSecondary onClick={refreshData}>
            <div className="flex items-center gap-1.5">
              <RefreshIcon className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </div>
          </ButtonSecondary>
        </div>
      );
    }
    
    // Define margins for chart
    const margin = { top: 10, right: 25, bottom: 30, left: 40 };
    const innerWidth = chartWidth - margin.left - margin.right;
    const innerHeight = chartHeight - margin.top - margin.bottom;
    
    if (innerWidth <= 0 || innerHeight <= 0) return null;
    
    // Create scales for dual-axis chart
    const xScale = scaleBand<string>({
      domain: chartData.map(d => d[xKey]),
      range: [0, innerWidth],
      padding: 0.2,
    });
    
    // Calculate max values for left and right axes
    const leftAxisFields = fields.filter(field => !isRightAxisField(field));
    const rightAxisFields = fields.filter(field => isRightAxisField(field));
    
    const leftMax = Math.max(
      ...chartData.flatMap(d => leftAxisFields.map(field => Number(d[field]) || 0)),
      1
    );
    
    const rightMax = Math.max(
      ...chartData.flatMap(d => rightAxisFields.map(field => Number(d[field]) || 0)),
      1
    );
    
    // Create scales for left and right y-axes
    const leftYScale = scaleLinear<number>({
      domain: [0, leftMax * 1.1],
      range: [innerHeight, 0],
      nice: true,
      clamp: true,
    });
    
    const rightYScale = scaleLinear<number>({
      domain: [0, rightMax * 1.1],
      range: [innerHeight, 0],
      nice: true,
      clamp: true,
    });
    
    // Create line data for series that should be rendered as lines
    const lineDataByField: Record<string, Array<{x: number, y: number}>> = {};
    
    // Initialize data structure for each field that should be a line
    fields.forEach(field => {
      if (shouldRenderAsLine(field)) {
        lineDataByField[field] = [];
      }
    });
    
    // Build line points
    chartData.forEach(d => {
      fields.forEach(field => {
        if (shouldRenderAsLine(field)) {
          const x = xScale(d[xKey]) || 0;
          const centerX = x + (xScale.bandwidth() / 2); // Center of the bar
          
          // Use appropriate scale based on axis
          const y = isRightAxisField(field)
            ? rightYScale(Number(d[field]) || 0)
            : leftYScale(Number(d[field]) || 0);
          
          lineDataByField[field].push({ x: centerX, y });
        }
      });
    });
    
    // Sort line data by x position
    Object.keys(lineDataByField).forEach(field => {
      lineDataByField[field].sort((a, b) => a.x - b.x);
    });
    
    // Calculate x-axis tick values
    const tickInterval = Math.ceil(chartData.length / 8);
    const xTickValues = chartData
      .filter((_, i) => i % tickInterval === 0)
      .map(d => d[xKey]);
    
    // Render the chart content
    return (
      <div 
        className="relative w-full h-full" 
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        ref={chartRef}
      >
        {/* Tooltip */}
        {tooltip.visible && tooltip.items && (
          <ChartTooltip
            title={tooltip.title || String(tooltip.key)}
            items={tooltip.items}
            left={tooltip.left}
            top={tooltip.top}
            isModal={false}
          />
        )}
        
        <svg width={chartWidth} height={chartHeight}>
          <Group left={margin.left} top={margin.top}>
            {/* Y-axis grid lines */}
            <GridRows
              scale={leftYScale}
              width={innerWidth}
              stroke="#1f2937"
              strokeOpacity={0.5}
              strokeDasharray="2,3"
            />
            
            {/* Left Y-axis */}
            <AxisLeft
              scale={leftYScale}
              stroke="#374151"
              strokeWidth={0.5}
              tickStroke="transparent"
              tickLength={0}
              hideZero={false}
              numTicks={5}
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
            
            {/* Right Y-axis */}
            <AxisRight
              scale={rightYScale}
              left={innerWidth}
              stroke="#374151"
              strokeWidth={0.5}
              tickStroke="transparent"
              tickLength={0}
              hideZero={false}
              numTicks={5}
              tickFormat={(value) => formatTickValue(Number(value))}
              tickLabelProps={() => ({
                fill: '#6b7280',
                fontSize: 11,
                fontWeight: 300,
                letterSpacing: '0.05em',
                textAnchor: 'start',
                dy: '0.33em',
                dx: '0.25em'
              })}
            />
            
            {/* X-axis */}
            <AxisBottom
              top={innerHeight}
              scale={xScale}
              stroke="#374151"
              strokeWidth={0.5}
              tickStroke="transparent"
              hideAxisLine={false}
              tickLength={0}
              tickValues={xTickValues}
              tickFormat={(value) => {
                // Format date labels for readability
                if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }
                return value;
              }}
              tickLabelProps={() => ({
                fill: '#6b7280',
                fontSize: 11,
                fontWeight: 300,
                textAnchor: 'middle',
                dy: '0.5em'
              })}
            />
            
            {/* Render bars first (so lines appear on top) */}
            {chartData.map((d, i) => (
              <React.Fragment key={`bars-${i}`}>
                {fields.map((field, fieldIndex) => {
                  // Skip if this field should be rendered as a line
                  if (shouldRenderAsLine(field)) return null;
                  
                  // Determine how many fields should be rendered as bars
                  const barFields = fields.filter(f => !shouldRenderAsLine(f));
                  const barWidth = xScale.bandwidth() / barFields.length;
                  
                  // Find this field's position in the barFields array
                  const barFieldIndex = barFields.indexOf(field);
                  
                  // Calculate bar dimensions
                  const value = Number(d[field]) || 0;
                  const scale = isRightAxisField(field) ? rightYScale : leftYScale;
                  const barHeight = innerHeight - scale(value);
                  const barX = (xScale(d[xKey]) || 0) + (barFieldIndex * barWidth);
                  const barY = innerHeight - barHeight;
                  
                  return (
                    <Bar
                      key={`bar-${i}-${field}`}
                      x={barX}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      fill={fieldColors[field]}
                      opacity={tooltip.visible && tooltip.key === d[xKey] ? 1 : 0.8}
                      rx={2}
                    />
                  );
                })}
              </React.Fragment>
            ))}
            
            {/* Render lines on top of bars */}
            {fields.map(field => {
              // Only render fields configured as lines
              if (!shouldRenderAsLine(field)) return null;
              
              const lineData = lineDataByField[field];
              if (!lineData || lineData.length === 0) return null;
              
              return (
                <LinePath
                  key={`line-${field}`}
                  data={lineData}
                  x={d => d.x}
                  y={d => d.y}
                  stroke={fieldColors[field]}
                  strokeWidth={2}
                  curve={curveCatmullRom}
                />
              );
            })}
          </Group>
        </svg>
      </div>
    );
  }, [
    chartData, fields, xKey, loading, error, refreshData, handleMouseMove, handleMouseLeave,
    tooltip, fieldColors, isRightAxisField, shouldRenderAsLine, formatTickValue
  ]);

  // Render the chart with brush
  return (
    <div className="w-full h-full relative">
      <div className="h-[85%] w-full">
        <ParentSize debounceTime={10}>
          {({ width: parentWidth, height: parentHeight }) => 
            parentWidth > 0 && parentHeight > 0 
              ? renderChartContent(parentWidth, parentHeight)
              : null
          }
        </ParentSize>
      </div>
      
      {brushData.length > 0 ? (
        <div className="h-[15%] w-full mt-2">
          <BrushTimeScale
            data={brushData}
            activeBrushDomain={brushDomain}
            onBrushChange={handleBrushChange}
            onClearBrush={() => {
              setBrushDomain(null);
              setIsBrushActive(false);
              setFilteredData([]);
            }}
            getDate={(d) => d.date}
            getValue={(d) => d.value}
            lineColor="#60a5fa"
            margin={{ top: 0, right: 25, bottom: 20, left: 30 }}
            isModal={false}
            curveType="catmullRom"
            strokeWidth={1.5}
          />
        </div>
      ) : (
        <div className="h-[15%] w-full flex items-center justify-center text-gray-500 text-sm">
          No brush data available
        </div>
      )}
    </div>
  );
};

export default React.memo(DualAxisChart); 