import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { Pie } from '@visx/shape';
import { scaleOrdinal } from '@visx/scale';
import { ChartConfig } from '../../types';
import { getColorByIndex, colors, blue } from '@/app/utils/chartColors';
import ChartTooltip from '@/app/components/shared/ChartTooltip';
import ButtonSecondary from "@/app/components/shared/buttons/ButtonSecondary";
import PrettyLoader from "@/app/components/shared/PrettyLoader";
import Modal from '@/app/components/shared/Modal';
import LegendItem from "@/app/components/shared/LegendItem";
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

export interface PieChartProps {
  chartConfig: ChartConfig;
  data: any[];
  width?: number;
  height?: number;
  isExpanded?: boolean;
  onCloseExpanded?: () => void;
  colorMap?: Record<string, string>;
  filterValues?: Record<string, string>;
  yAxisUnit?: string;
  hiddenSeries?: string[];
  onFilterChange?: (newFilters: Record<string, string>) => void;
}

interface PieDataPoint {
  label: string;
  value: number;
  percentage: number;
}

const PieChart: React.FC<PieChartProps> = ({ 
  chartConfig, 
  data, 
  width = 500, 
  height = 300,
  isExpanded = false,
  onCloseExpanded,
  colorMap: externalColorMap,
  filterValues,
  yAxisUnit,
  hiddenSeries = [],
  onFilterChange
}) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const modalChartRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [legendItems, setLegendItems] = useState<Array<{
    id: string;
    label: string;
    color: string;
    value?: number;
    percentage: number;
  }>>([]);
  
  // Add state to track client-side rendering
  const [isClient, setIsClient] = useState(false);
  
  // Add state for modal filter values
  const [modalFilterValues, setModalFilterValues] = useState<Record<string, string>>(filterValues || {});

  // Update tooltip state definition
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    left: number;
    top: number;
    data: PieDataPoint | null;
  }>({
    visible: false,
    left: 0,
    top: 0,
    data: null
  });

  // Track hidden series (by field id)
  const [hiddenSeriesState, setHiddenSeriesState] = useState<string[]>(hiddenSeries);

  // Debounce timer ref for filter changes
  const filterDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Extract mapping fields
  const labelField = chartConfig.dataMapping.xAxis;
  const valueField = chartConfig.dataMapping.yAxis;
  
  // For type safety, ensure we use string values for indexing
  const xKey = typeof labelField === 'string' ? labelField : labelField[0];
  const yField = typeof valueField === 'string' ? valueField : 
                (Array.isArray(valueField) ? (typeof valueField[0] === 'string' ? valueField[0] : valueField[0].field) : '');
  
  // Extract unit if available from YAxisConfig or prop
  const yUnit = typeof valueField === 'string' ? yAxisUnit : 
               (Array.isArray(valueField) && valueField.length > 0 && typeof valueField[0] !== 'string' ? 
               valueField[0].unit : yAxisUnit);
  
  // For data access, we need just the field name
  const yKey = yField;
  
  // Helper function to find matching field with flexible matching
  const findMatchingField = useCallback((obj: any, fieldName: string): string | null => {
    if (!obj || !fieldName) return null;
    
    // Direct match
    if (fieldName in obj) return fieldName;
    
    // Case insensitive match
    const lowerField = fieldName.toLowerCase();
    const keys = Object.keys(obj);
    
    // First try exact match with lowercase
    for (const key of keys) {
      if (key.toLowerCase() === lowerField) return key;
    }
    
    // Then try replacing spaces with underscores and vice versa
    const spaceToUnderscore = lowerField.replace(/ /g, '_');
    const underscoreToSpace = lowerField.replace(/_/g, ' ');
    
    for (const key of keys) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === spaceToUnderscore || lowerKey === underscoreToSpace) {
        return key;
      }
    }
    
    return null;
  }, []);
  
  // Get actual field names from data (with fallback matching)
  const actualXKey = useMemo(() => {
    if (!data || data.length === 0) return xKey;
    const matchingField = findMatchingField(data[0], xKey);
    return matchingField || xKey;
  }, [data, xKey, findMatchingField]);
  
  const actualYKey = useMemo(() => {
    if (!data || data.length === 0) return yKey;
    const matchingField = findMatchingField(data[0], yKey);
    return matchingField || yKey;
  }, [data, yKey, findMatchingField]);
  
  // Log field mapping for debugging
  console.log('PieChart field mapping:', {
    chartTitle: chartConfig.title,
    configuredXKey: xKey,
    configuredYKey: yKey,
    actualXKey,
    actualYKey,
    dataAvailable: data && data.length > 0,
    availableFields: data && data.length > 0 ? Object.keys(data[0]) : [],
    yUnit
  });

  // Format value with appropriate units
  const formatValue = useCallback((value: number, unit?: string) => {
    // Add null/undefined check
    if (value === undefined || value === null) {
      return '0.00';
    }
    
    // Get the unit symbol (don't use a default)
    const unitSymbol = unit || '';
    const isUnitPrefix = unitSymbol && unitSymbol !== '%' && unitSymbol !== 'SOL'; // Most units are prefixed, but some go after
    
    // Format with appropriate scale
    let formattedValue: string;
    if (value >= 1000000000) {
      formattedValue = `${(value / 1000000000).toFixed(2)}B`;
    } else if (value >= 1000000) {
      formattedValue = `${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      formattedValue = `${(value / 1000).toFixed(2)}K`;
    } else {
      formattedValue = value.toFixed(2);
    }
    
    // Return with correct unit placement (or no unit if not specified)
    if (!unitSymbol) return formattedValue;
    return isUnitPrefix ? `${unitSymbol}${formattedValue}` : `${formattedValue}\u00A0${unitSymbol}`;
  }, []);

  // Transform raw data into pie chart format
  const pieData = useMemo(() => {
    if (!data || data.length === 0 || !actualXKey || !actualYKey) {
      return [];
    }
    
    console.log('PieChart data processing:', {
      dataLength: data.length,
      actualXKey,
      actualYKey,
      sampleData: data.slice(0, 2),
      availableFields: data.length > 0 ? Object.keys(data[0]) : []
    });
    
    // Calculate total value for percentage (excluding hidden series)
    const filteredData = data.filter(item => {
      const labelValue = item[actualXKey];
      const isHidden = hiddenSeriesState.includes(String(labelValue));
      
      // Log any null/undefined labels that might cause "unknown" entries
      if (labelValue === null || labelValue === undefined || labelValue === '') {
        console.warn('Found null/undefined/empty label in pie chart data:', item);
      }
      
      return !isHidden && labelValue !== null && labelValue !== undefined && labelValue !== '';
    });
    
    const totalValue = filteredData.reduce((sum, item) => sum + (Number(item[actualYKey]) || 0), 0);
    
    // Create pie data points with percentages
    return filteredData
      .map(item => {
        const labelValue = item[actualXKey];
        const numericValue = Number(item[actualYKey]) || 0;
        
        // Ensure we have valid label and value
        if (labelValue === null || labelValue === undefined || labelValue === '' || numericValue <= 0) {
          console.warn('Skipping invalid pie chart entry:', { label: labelValue, value: numericValue, item });
          return null;
        }
        
        return {
          label: String(labelValue).trim(), // Trim whitespace
          value: numericValue,
          percentage: totalValue > 0 ? (numericValue / totalValue) * 100 : 0,
          originalData: item
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null) // Filter out null entries
      .filter(item => item.value > 0)  // Filter out zero values
      .sort((a, b) => b.value - a.value); // Sort by value (descending)
  }, [data, actualXKey, actualYKey, hiddenSeriesState]);

  // Create color scale based on data
  const colorScale = useMemo(() => {
    // Use all data for color scale, not just filtered data, but filter out invalid entries
    const dataLabels = data
      .filter(d => d[actualXKey] !== null && d[actualXKey] !== undefined && d[actualXKey] !== '')
      .map(d => String(d[actualXKey]).trim());
    
    console.log('PieChart color scale labels:', dataLabels);
    
    // Use external color map if available, otherwise generate from color palette
    const colorValues = dataLabels.map((label, index) => 
      externalColorMap?.[label] || getColorByIndex(index)
    );
    
    return scaleOrdinal({
      domain: dataLabels,
      range: colorValues
    });
  }, [data, actualXKey, externalColorMap]);

  // Refresh data placeholder
  const refreshData = useCallback(() => {
    // If onFilterChange exists in chartConfig, call it with current filters
    if (onFilterChange) {
      onFilterChange(filterValues || {});
    }
    
    setError(null);
  }, [filterValues, onFilterChange]);

  // Handle mouse leave for tooltip
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);

  // Handle touch end to close tooltip when user stops touching
  const handleTouchEnd = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);

  // Helper function to calculate safe tooltip position for mobile
  const calculateSafeTooltipPosition = (
    mouseX: number, 
    mouseY: number, 
    containerRect: DOMRect,
    tooltipEstimatedWidth = 200, // Estimated tooltip width
    tooltipEstimatedHeight = 100 // Estimated tooltip height
  ) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = viewportWidth < 768;
    
    if (!isMobile) {
      // Desktop: use original positioning
      return {
        left: mouseX,
        top: mouseY
      };
    }
    
    // Mobile: calculate safe position
    const absoluteX = containerRect.left + mouseX;
    const absoluteY = containerRect.top + mouseY;
    
    let safeLeft = mouseX;
    let safeTop = mouseY;
    
    // Check right boundary
    if (absoluteX + tooltipEstimatedWidth > viewportWidth) {
      safeLeft = mouseX - tooltipEstimatedWidth;
      // Ensure it doesn't go off the left edge
      if (containerRect.left + safeLeft < 0) {
        safeLeft = 10 - containerRect.left;
      }
    }
    
    // Check left boundary
    if (absoluteX < tooltipEstimatedWidth / 2) {
      safeLeft = 10;
    }
    
    // Check top boundary
    if (absoluteY - tooltipEstimatedHeight < 0) {
      safeTop = mouseY + 20; // Position below cursor
    }
    
    // Check bottom boundary
    if (absoluteY + tooltipEstimatedHeight > viewportHeight) {
      safeTop = mouseY - tooltipEstimatedHeight - 10;
      // Ensure it doesn't go above the top
      if (containerRect.top + safeTop < 0) {
        safeTop = 10 - containerRect.top;
      }
    }
    
    return {
      left: Math.max(safeLeft, 0),
      top: Math.max(safeTop, 0)
    };
  };

  // Handle mouse interaction for pie segments
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, dataPoint: PieDataPoint) => {
    // Don't show tooltip for hidden segments
    if (hiddenSeriesState.includes(dataPoint.label)) return;
    const containerRef = e.currentTarget.closest('.chart-container');
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Calculate safe position for mobile
    const safePosition = calculateSafeTooltipPosition(x, y, rect);
    setTooltip({
      visible: true,
      data: dataPoint,
      left: safePosition.left,
      top: safePosition.top
    });
  }, [hiddenSeriesState]);

  // Handle touch interaction for pie segments
  const handleTouch = useCallback((e: React.TouchEvent<HTMLDivElement>, dataPoint: PieDataPoint) => {
    // Don't show tooltip for hidden segments
    if (hiddenSeriesState.includes(dataPoint.label)) return;
    // Note: Cannot preventDefault in touch handlers due to passive event listeners
    const containerRef = e.currentTarget.closest('.chart-container');
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    // Calculate safe position for mobile
    const safePosition = calculateSafeTooltipPosition(x, y, rect);
    setTooltip({
      visible: true,
      data: dataPoint,
      left: safePosition.left,
      top: safePosition.top
    });
  }, [hiddenSeriesState]);

  // Set isClient to true when component mounts in browser
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update modal filters when component receives new filter values
  useEffect(() => {
    if (filterValues) {
      setModalFilterValues(filterValues);
    }
  }, [filterValues]);

  // Update hidden series when prop changes
  useEffect(() => {
    setHiddenSeriesState(hiddenSeries);
  }, [hiddenSeries]);

  // Helper function to format field names for display
  const formatFieldName = (fieldName: string): string => {
    if (!fieldName) return '';
    
    // Convert only snake_case to space-separated, preserve dashes
    const spaceSeparated = fieldName.replace(/_/g, ' ');
    
    // Split into words and capitalize each word
    return spaceSeparated
      .split(' ')
      .map(word => {
        if (word.length === 0) return '';
        // Capitalize first letter, lowercase the rest
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  // Update legend items when data changes
  useEffect(() => {
    if (!data || data.length === 0 || !xKey || !yKey) {
      setLegendItems([]);
      return;
    }
    // Calculate total value for percentage (all data)
    const totalValue = data.reduce((sum, item) => sum + (Number(item[yKey]) || 0), 0);
    const allLegendItems = data
      .filter(item => Number(item[yKey]) > 0) // Only show items with positive values
      .map(item => {
        const label = String(item[xKey]);
        const value = Number(item[yKey]) || 0;
        const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
        return {
          id: label,
          label: formatFieldName(label),
          color: colorScale(label) as string,
          value,
          percentage
        };
      })
        .sort((a, b) => b.value - a.value);
    setLegendItems(allLegendItems);
  }, [data, xKey, yKey, colorScale]);

  // Enhanced function to handle modal filter changes
  const handleModalFilterChange = useCallback((key: string, value: string) => {
    console.log(`Modal filter changed: ${key} = ${value}`);
    
    const updatedFilters = {
      ...modalFilterValues,
      [key]: value
    };
    
    // Update local state immediately for UI responsiveness
    setModalFilterValues(updatedFilters);
    
    // Clear existing timer
    if (filterDebounceTimer.current) {
      clearTimeout(filterDebounceTimer.current);
    }
    
    // Debounce the actual filter change callback
    filterDebounceTimer.current = setTimeout(() => {
      // If onFilterChange exists in chartConfig, call it with updated filters
      if (onFilterChange) {
        onFilterChange(updatedFilters);
      }
    }, 300); // 300ms debounce delay
  }, [modalFilterValues, onFilterChange]);
  
  // Handle filter changes - for both modal and normal view
  const handleFilterChange = useCallback((key: string, value: string) => {
    // For modal-specific behavior, use the enhanced handler
    if (isExpanded) {
      return handleModalFilterChange(key, value);
    }
    
    console.log(`Filter changed: ${key} = ${value}`);
    
    const updatedFilters = {
      ...modalFilterValues,
      [key]: value
    };
    
    // Update local state
    setModalFilterValues(updatedFilters);
    
    // If onFilterChange exists in chartConfig, call it with updated filters
    if (onFilterChange) {
      onFilterChange(updatedFilters);
    }
  }, [modalFilterValues, isExpanded, handleModalFilterChange, onFilterChange]);

  // Handler to toggle series visibility
  const handleLegendClick = (fieldId: string) => {
    setHiddenSeriesState(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  // Render chart content
  const renderChartContent = useCallback((chartWidth: number, chartHeight: number, isModal = false) => {
    // Show error state or no data
    if (error) {
      return (
        <div className="flex flex-col justify-center items-center h-full">
          <div className="text-gray-400/80 text-xs mb-2">{error}</div>
          <ButtonSecondary onClick={refreshData}>
            <div className="flex items-center gap-1.5">
              <RefreshIcon className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </div>
          </ButtonSecondary>
        </div>
      );
    }
    
    // Show message when all series are hidden
    if (data.length > 0 && hiddenSeriesState.length === data.length) {
      return (
        <div className="flex justify-center items-center h-full">
          <p className="text-gray-400 text-[12px]">Select a series from the legend to show data.</p>
        </div>
      );
    }
    
    // Show loader when no data is available yet
    if (pieData.length === 0 && hiddenSeriesState.length < data.length) {
      return (
        <div className="flex justify-center items-center h-full">
          <PrettyLoader size="sm" />
        </div>
      );
    }
    
    // Define margins for chart
    const margin = { top: 10, right: 15, bottom: 10, left: 15 };
    const innerWidth = chartWidth - margin.left - margin.right;
    const innerHeight = chartHeight - margin.top - margin.bottom;
    
    if (innerWidth <= 0 || innerHeight <= 0) return null;
    
    // Define pie dimensions
    const radius = Math.min(innerWidth, innerHeight) / 2.5;
    
    // Check if mobile device
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    // Adjust top position based on device type
    const topPosition = isMobile ? chartHeight / 2.5 : chartHeight / 2;
    
    // Render the chart content
    return (
      <div 
        className="relative w-full h-full chart-container" 
        onMouseLeave={handleMouseLeave}
        onTouchEnd={handleTouchEnd}
        ref={isModal ? modalChartRef : chartRef}
      >
        {/* Tooltip - only show for non-modal version, modal has its own tooltip container */}
        {tooltip.visible && tooltip.data && !isModal && (
          <ChartTooltip
            title={formatFieldName(tooltip.data.label)}
            items={[
              {
                label: 'Value',
                value: formatValue(tooltip.data.value, yUnit),
                color: colorScale(tooltip.data.label) as string,
                shape: 'square'
              },
              {
                label: 'Percentage',
                value: `${tooltip.data.percentage.toFixed(1)}%`,
                color: colorScale(tooltip.data.label) as string,
                shape: 'square'
              }
            ]}
            left={tooltip.left}
            top={tooltip.top}
            isModal={false}
            currencyFilter={filterValues?.currencyFilter}
          />
        )}
        
        <svg width={chartWidth} height={chartHeight}>
          <Group left={chartWidth / 2} top={topPosition}>
            <Pie
              data={pieData}
              pieValue={d => d.value}
              outerRadius={radius}
              innerRadius={radius * 0.6} // Creates a donut chart with 60% inner radius
              cornerRadius={1}
              padAngle={0.005}
            >
              {pie => {
                return pie.arcs.map((arc, index) => {
                  const dataPoint = arc.data;
                  const [centroidX, centroidY] = pie.path.centroid(arc);
                  const hasSpaceForLabel = dataPoint.percentage > 5;
                  const fillColor = colorScale(dataPoint.label) as string;
                  
                  return (
                    <g 
                      key={`arc-${dataPoint.label}-${index}`}
                      onMouseMove={(e) => {
                        const containerRect = e.currentTarget.closest('svg')?.getBoundingClientRect();
                        if (!containerRect) return;
                        
                        const x = e.clientX - containerRect.left;
                        const y = e.clientY - containerRect.top;
                        
                        // Calculate safe position for mobile
                        const safePosition = calculateSafeTooltipPosition(x, y, containerRect);
                        
                        setTooltip({
                          visible: true,
                          data: dataPoint,
                          left: safePosition.left,
                          top: safePosition.top
                        });
                      }}
                      onTouchStart={(e) => {
                        // Only prevent default if we're actually within the pie segment
                        const containerRect = e.currentTarget.closest('svg')?.getBoundingClientRect();
                        if (!containerRect) return;
                        
                        const touch = e.touches[0];
                        const x = touch.clientX - containerRect.left;
                        const y = touch.clientY - containerRect.top;
                        
                        // Check if touch is within reasonable bounds of the pie chart
                        const centerX = containerRect.width / 2;
                        const centerY = containerRect.height / 2;
                        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                        const maxRadius = Math.min(containerRect.width, containerRect.height) / 2;
                        
                        // Only show tooltip if touch is within pie area
                        if (distance <= maxRadius) {
                          // Calculate safe position for mobile
                          const safePosition = calculateSafeTooltipPosition(x, y, containerRect);
                          
                          setTooltip({
                            visible: true,
                            data: dataPoint,
                            left: safePosition.left,
                            top: safePosition.top
                          });
                        }
                      }}
                      onTouchMove={(e) => {
                        // Handle touch move if needed
                      }}
                      onTouchEnd={handleTouchEnd}
                      onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                    >
                      <path
                        d={pie.path(arc) || ''}
                        fill={fillColor}
                        stroke="#000"
                        strokeWidth={0.5}
                        strokeOpacity={0.3}
                      />
                      {hasSpaceForLabel && (
                        <text
                          fill="black"
                          x={centroidX}
                          y={centroidY}
                          dy=".33em"
                          fontSize={11}
                          textAnchor="middle"
                          pointerEvents="none"
                        >
                          {`${dataPoint.percentage.toFixed(0)}%`}
                        </text>
                      )}
                    </g>
                  );
                });
              }}
            </Pie>
          </Group>
        </svg>
      </div>
    );
  }, [
    pieData, error, refreshData, handleMouseLeave,
    tooltip, colorScale, formatValue, yUnit, filterValues, hiddenSeriesState
  ]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (filterDebounceTimer.current) {
        clearTimeout(filterDebounceTimer.current);
      }
    };
  }, []);

  // Render the chart with legends
  return (
    <>
      {/* Expanded view in modal */}
      {isExpanded && isClient ? (
        <Modal 
          isOpen={isExpanded} 
          onClose={onCloseExpanded || (() => {})}
          title={chartConfig.title || "Pie Chart"}
          subtitle={chartConfig.subtitle}
        >
          <div className="w-full h-[80vh] relative overflow-visible">
            {/* Filters row */}
            <div className="mb-4 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                {/* Time filter */}
                {chartConfig.additionalOptions?.filters?.timeFilter && (
                  <div className="flex items-center">
                    <TimeFilterSelector
                      value={modalFilterValues?.timeFilter || chartConfig.additionalOptions.filters.timeFilter.activeValue || 'M'}
                      onChange={(value) => handleModalFilterChange('timeFilter', value)}
                      options={chartConfig.additionalOptions.filters.timeFilter.options?.map((opt: string) => ({
                        value: opt,
                        label: opt
                      }))}
                    />
                  </div>
                )}
                
                {/* Currency filter */}
                {chartConfig.additionalOptions?.filters?.currencyFilter && (
                  <CurrencyFilter
                    currency={modalFilterValues?.currencyFilter || chartConfig.additionalOptions.filters.currencyFilter.activeValue || 'USD'}
                    onChange={(value) => handleModalFilterChange('currencyFilter', value)}
                    options={chartConfig.additionalOptions.filters.currencyFilter.options}
                    
                  />
                )}
                
                {/* Display mode filter */}
                {chartConfig.additionalOptions?.filters?.displayModeFilter && (
                  <div className="flex items-center">
                    <DisplayModeFilter
                      mode={(modalFilterValues?.displayMode || chartConfig.additionalOptions.filters.displayModeFilter.activeValue || 'absolute') as DisplayMode}
                      onChange={(value) => handleModalFilterChange('displayMode', value)}
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Horizontal line below filters */}
            <div className="w-full h-px bg-gray-900 mb-4"></div>
            
            {/* Chart with legends */}
            <div className="flex h-full">
              {/* Chart area - 90% width */}
              <div className="w-full lg:w-[90%] h-[90%] lg:pr-3 lg:border-r lg:border-gray-900">
                <div className="flex flex-col h-full">
                  {/* Main chart - 100% height for pie chart */}
                  <div className="h-full w-full relative chart-container">
                    <ParentSize debounceTime={10}>
                      {({ width: parentWidth, height: parentHeight }) => 
                        parentWidth > 0 && parentHeight > 0 
                          ? renderChartContent(parentWidth, parentHeight, true)
                          : null
                      }
                    </ParentSize>
                  </div>
                  
                  {/* Display tooltip at the container level for modal views */}
                  {tooltip.visible && tooltip.data && (
                    <ChartTooltip
                      title={formatFieldName(tooltip.data.label)}
                      items={[
                        {
                          label: 'Value',
                          value: formatValue(tooltip.data.value, yUnit),
                          color: colorScale(tooltip.data.label) as string,
                          shape: 'square'
                        },
                        {
                          label: 'Percentage',
                          value: `${tooltip.data.percentage.toFixed(1)}%`,
                          color: colorScale(tooltip.data.label) as string,
                          shape: 'square'
                        }
                      ]}
                      left={tooltip.left}
                      top={tooltip.top}
                      isModal={true}
                      currencyFilter={filterValues?.currencyFilter}
                    />
                  )}
                </div>
              </div>
              
              {/* Legend area - 10% width */}
              <div className="w-[10%] h-full pl-3 flex flex-col justify-start items-start hidden lg:flex">
                {/* Show legend items */}
                <div className="space-y-2 w-full overflow-y-auto max-h-[600px]
                  [&::-webkit-scrollbar]:w-1.5 
                  [&::-webkit-scrollbar-track]:bg-transparent 
                  [&::-webkit-scrollbar-thumb]:bg-gray-700/40
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
                  scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700/40">
                  {legendItems.map(item => (
                    <LegendItem 
                      key={item.id} 
                      label={`${item.label} (${item.percentage.toFixed(1)}%)`}
                      color={item.color}
                      shape="square"
                      onClick={() => handleLegendClick(item.id)}
                      inactive={hiddenSeriesState.includes(item.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      ) : (
        // Normal view
        <div className="w-full h-full relative">
          <ParentSize debounceTime={10}>
            {({ width: parentWidth, height: parentHeight }) => 
              parentWidth > 0 && parentHeight > 0 
                ? renderChartContent(parentWidth, parentHeight)
                : null
            }
          </ParentSize>
        </div>
      )}
    </>
  );
};

export default React.memo(PieChart); 