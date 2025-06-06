import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Bar, BarStack } from '@visx/shape';
import { ChartConfig, YAxisConfig } from '../../types';
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

export interface StackedBarChartProps {
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

interface DateBrushPoint {
  date: Date;
  value: number;
}

interface ChartDataItem {
  [key: string]: any;
}

type ColorResult = string | Record<string, string>;

const StackedBarChart: React.FC<StackedBarChartProps> = ({ 
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
  const [legendItems, setLegendItems] = useState<Array<{id: string, label: string, color: string, value?: number}>>([]);
  
  // Brush state
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  
  // Filtered data based on brush
  const [filteredData, setFilteredData] = useState<any[]>([]);

  // Modal-specific filtered data
  const [modalFilteredData, setModalFilteredData] = useState<any[]>([]);

  // Update tooltip state definition
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    left: number;
    top: number;
    key: string;
    items: { label: string, value: string | number, color: string, shape?: 'circle' | 'square' }[];
  }>({
    visible: false,
    left: 0,
    top: 0,
    key: '',
    items: []
  });

  // Modal brush state
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  
  // Add state for filter values in modal
  const [modalFilterValues, setModalFilterValues] = useState<Record<string, string>>(filterValues || {});
  
  // Add state to track client-side rendering
  const [isClient, setIsClient] = useState(false);

  // Add display mode to state
  const [displayMode, setDisplayMode] = useState<DisplayMode>('absolute');

  // Track hidden series (by field id)
  const [hiddenSeriesState, setHiddenSeriesState] = useState<string[]>(hiddenSeries);

  // Extract mapping fields
  const xField = chartConfig.dataMapping.xAxis;
  const yField = chartConfig.dataMapping.yAxis;
  const groupByField = chartConfig.dataMapping.groupBy || '';
  
  // For type safety, ensure we use string values for indexing
  const xKey = typeof xField === 'string' ? xField : xField[0];
  
  // Helper function to get field from YAxisConfig or use string directly
  const getYAxisField = useCallback((field: string | YAxisConfig): string => {
    return typeof field === 'string' ? field : field.field;
  }, []);
  
  // Get actual y-field name to use for data extraction
  const yKey = useMemo(() => {
    if (typeof yField === 'string') {
      return yField;
    } else if (Array.isArray(yField) && yField.length > 0) {
      // Get the first y-field if it's an array
      return getYAxisField(yField[0]);
    }
    return '';
  }, [yField, getYAxisField]);
  
  // Get all y-field names when stacked chart with multiple y fields
  const allYFields = useMemo(() => {
    if (typeof yField === 'string') {
      return [yField];
    } else if (Array.isArray(yField)) {
      return yField.map(field => getYAxisField(field));
    }
    return [];
  }, [yField, getYAxisField]);
  
  // Set isClient to true when component mounts in browser
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Format value for tooltip
  const formatValue = useCallback((value: number, unit?: string) => {
    // Add null/undefined check
    if (value === undefined || value === null) {
      return '0.00';
    }
    
    // Handle percentage mode
    if (displayMode === 'percent') {
      return `${value.toFixed(1)}%`;
    }
    
    // Get the unit symbol (use component prop as fallback)
    const unitSymbol = unit || yAxisUnit || '';
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
  }, [yAxisUnit, displayMode]);

  // Format y-axis tick value with appropriate units
  const formatTickValue = useCallback((value: number) => {
    if (displayMode === 'percent') {
      return `${value.toFixed(0)}%`;
    }

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
    } else if (value < 1) {
      // For values between 0 and 1, show decimal places
      return value.toFixed(1);
    } else {
      return value.toFixed(0);
    }
  }, [displayMode]);

  // Update modal filters when component receives new filter values
  useEffect(() => {
    if (filterValues) {
      setModalFilterValues(filterValues);
      // Extract display mode from filter values if available
      if (filterValues['displayMode']) {
        setDisplayMode(filterValues['displayMode'] as DisplayMode);
      }
    }
  }, [filterValues]);

  // Enhanced filter change handler for modal
  const handleModalFilterChange = useCallback((key: string, value: string) => {
    console.log(`Modal filter changed: ${key} = ${value}`);
    
    // Update display mode state if that's what changed
    if (key === 'displayMode') {
      setDisplayMode(value as DisplayMode);
    }
    
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
  }, [modalFilterValues, onFilterChange]);
  
  // Handle filter changes - for both modal and normal view
  const handleFilterChange = useCallback((key: string, value: string) => {
    // For modal-specific behavior, use the enhanced handler
    if (isExpanded) {
      return handleModalFilterChange(key, value);
    }
    
    console.log(`Filter changed: ${key} = ${value}`);
    
    // Update display mode state if that's what changed
    if (key === 'displayMode') {
      setDisplayMode(value as DisplayMode);
    }
    
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
  }, [modalFilterValues, onFilterChange, isExpanded, handleModalFilterChange]);

  // Placeholder for refresh data functionality
  const refreshData = useCallback(() => {
    // If onFilterChange exists in chartConfig, call it with current filters
    if (onFilterChange) {
      onFilterChange(filterValues || {});
    }
    
    setError(null);
  }, [filterValues, onFilterChange]);

  // Process data for the chart - use filtered data when available
  const { chartData, keys, groupColors } = useMemo(() => {
    // Use appropriate filtered data depending on context
    const currentData: any[] = 
      (isExpanded && isModalBrushActive && modalFilteredData.length > 0) ? modalFilteredData :
      (!isExpanded && isBrushActive && filteredData.length > 0) ? filteredData : 
      data;
    
    if (isExpanded) {
      console.log('Modal chart data source:', 
        isModalBrushActive && modalFilteredData.length > 0 ? 'modal filtered data' : 'full data',
        'Count:', currentData.length);
    }
      
    // If no data is available, return empty defaults
    if (!currentData || currentData.length === 0) {
      return { 
        chartData: [] as ChartDataItem[],
        keys: [] as string[],
        groupColors: {} as Record<string, string>
      };
    }

    // Use external color map if available
    const preferredColorMap = externalColorMap || {};
    
    // Filter data first
    const processedData: ChartDataItem[] = currentData.filter((d: any) => d[xKey] !== undefined && d[xKey] !== null);
    
    // Sort by date if applicable
    if (processedData.length > 0) {
      // Detect if data contains dates
      const isDateField = typeof processedData[0][xKey] === 'string' && 
        (processedData[0][xKey].match(/^\d{4}-\d{2}-\d{2}/) || 
         /^\w+\s\d{4}$/.test(processedData[0][xKey]) || 
         /^\d{4}$/.test(processedData[0][xKey]));
      
      if (isDateField) {
        // Sort dates chronologically (oldest to newest)
        processedData.sort((a: any, b: any) => {
          const dateA = new Date(a[xKey]);
          const dateB = new Date(b[xKey]);
          return dateA.getTime() - dateB.getTime();
        });
      }
    }
    
    // Check if we have multiple Y-axis fields with stacked mode
    const isMultiYFieldsStacked = Array.isArray(yField) && yField.length > 1 && chartConfig.isStacked;
    
    // Check if we have a groupBy field
    const hasGroupBy = groupByField && groupByField.trim() !== '';
    
    // If we have multiple Y fields and stacked mode is enabled
    if (isMultiYFieldsStacked) {
      console.log('Processing multi-y-field stacked chart');
      
      // Get all y-fields as keys for stacking (excluding hidden ones)
      const stackKeys = Array.isArray(yField) 
        ? yField
            .map(field => typeof field === 'string' ? field : field.field)
            .filter(key => !hiddenSeriesState.includes(key))
        : [yKey];
      
      // Group by x-axis values to prevent duplicate x values
      const groupedData: Record<string, ChartDataItem> = {};
      
      processedData.forEach((item: ChartDataItem) => {
        const xValue = String(item[xKey]);
        
        if (!groupedData[xValue]) {
          // Initialize with x value and all stack keys with 0
          groupedData[xValue] = { [xKey]: item[xKey] };
          
          // Initialize all stack keys with 0
          stackKeys.forEach(key => {
            groupedData[xValue][key] = 0;
          });
        }
        
        // Update values for all y-fields that exist in this item
        stackKeys.forEach(key => {
          if (item[key] !== undefined && item[key] !== null) {
            const value = Number(item[key]) || 0;
            groupedData[xValue][key] = (groupedData[xValue][key] || 0) + value;
          }
        });
      });
      
      // For percentage mode, we need to convert values to percentages
      if (displayMode === 'percent') {
        Object.keys(groupedData).forEach(xValue => {
          // Calculate the total for this x value
          const total = stackKeys.reduce((sum, key) => sum + (groupedData[xValue][key] || 0), 0);
          if (total > 0) {
            // Convert each value to percentage
            stackKeys.forEach(key => {
              groupedData[xValue][key] = (groupedData[xValue][key] / total) * 100;
            });
          }
        });
      }
      
      // Create color map for each y-field
      const colorsByField: Record<string, string> = {};
      stackKeys.forEach((field, i) => {
        colorsByField[field] = preferredColorMap[field] || getColorByIndex(i % allColorsArray.length);
      });
      
      return {
        chartData: Object.values(groupedData),
        keys: stackKeys,
        groupColors: colorsByField
      };
    }
    
    // If no groupBy field is specified, treat it as a simple bar chart
    if (!hasGroupBy) {
      console.log('Processing simple bar chart (no groupBy)');
      
      // Group by x-axis values to aggregate duplicates
      const groupedData: Record<string, ChartDataItem> = {};
      
      processedData.forEach((item: ChartDataItem) => {
        const xValue = String(item[xKey]);
        
        if (!groupedData[xValue]) {
          // Initialize with x value and y value
          groupedData[xValue] = { 
            [xKey]: item[xKey],
            [yKey]: 0
          };
        }
        
        // Sum the y values for the same x value
        const currentValue = Number(item[yKey]) || 0;
        groupedData[xValue][yKey] = (groupedData[xValue][yKey] || 0) + currentValue;
      });
      
      // For percentage mode in simple bar chart, normalize to 100%
      if (displayMode === 'percent') {
        const total = Object.values(groupedData).reduce((sum, item) => sum + (item[yKey] || 0), 0);
        if (total > 0) {
          Object.keys(groupedData).forEach(xValue => {
            groupedData[xValue][yKey] = (groupedData[xValue][yKey] / total) * 100;
          });
        }
      }
      
      // Create color for the single series
      const singleColor = preferredColorMap[yKey] || blue;
      
      return {
        chartData: Object.values(groupedData),
        keys: [yKey], // Single key for the y-axis field
        groupColors: { [yKey]: singleColor }
      };
    }
    
    // Standard processing for group-by stacking (original logic)
    // Group by x-axis values to prevent duplicate bars
    const groupedData: Record<string, ChartDataItem> = {};
    const groupedValues: Record<string, Record<string, number>> = {};
    const allGroups = new Set<string>();
    
    // First pass: collect all unique groups and x values
    processedData.forEach((item: ChartDataItem) => {
      const xValue = String(item[xKey]);
      const groupValue = String(item[groupByField]);
      
      // Track all unique group values (excluding hidden ones)
      if (!hiddenSeriesState.includes(groupValue)) {
      allGroups.add(groupValue);
      }
      
      // Initialize the grouped data structure for this x value
      if (!groupedData[xValue]) {
        groupedData[xValue] = { 
          [xKey]: item[xKey] 
        };
        groupedValues[xValue] = {};
      }
      
      // Sum values for the same x value and group (if not hidden)
      if (!hiddenSeriesState.includes(groupValue)) {
      const currentValue = Number(item[yKey]) || 0;
      groupedValues[xValue][groupValue] = (groupedValues[xValue][groupValue] || 0) + currentValue;
      }
    });
    
    // Second pass: build the final data structure
    Object.keys(groupedData).forEach(xValue => {
      // Make sure each group has a value (even if zero)
      allGroups.forEach(group => {
        groupedData[xValue][group] = groupedValues[xValue][group] || 0;
      });
    });
    
    // For percentage mode, convert values to percentages
    if (displayMode === 'percent') {
      Object.keys(groupedData).forEach(xValue => {
        // Calculate the total for this x value
        const total = Array.from(allGroups).reduce(
          (sum, group) => sum + (groupedData[xValue][group] || 0), 0
        );
        
        if (total > 0) {
          // Convert each value to percentage
          allGroups.forEach(group => {
            groupedData[xValue][group] = (groupedData[xValue][group] / total) * 100;
          });
        }
      });
    }
    
    // Convert to array
    const uniqueProcessedData = Object.values(groupedData);
    
    // Get all unique group values as keys for the stack
    const stackKeys = Array.from(allGroups);
    console.log(`Found ${stackKeys.length} groups for stacking:`, stackKeys);
    
    // Create color map for each group
    const colorsByGroup: Record<string, string> = {};
    stackKeys.forEach((group, i) => {
      colorsByGroup[group] = preferredColorMap[group] || getColorByIndex(i % allColorsArray.length);
    });
    
    return { 
      chartData: uniqueProcessedData,
      keys: stackKeys,
      groupColors: colorsByGroup
    };
  }, [data, filteredData, modalFilteredData, isBrushActive, isModalBrushActive, xKey, yKey, yField, groupByField, externalColorMap, isExpanded, chartConfig, displayMode, hiddenSeriesState]);

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
        top: Math.max(mouseY - 10, 10)
      };
    }
    
    // Mobile: calculate safe position
    const absoluteX = containerRect.left + mouseX;
    const absoluteY = containerRect.top + mouseY;
    
    let safeLeft = mouseX;
    let safeTop = mouseY - 10;
    
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

  // Handle interaction (mouse or touch) for tooltips
  const handleInteraction = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, isModal = false) => {
    // Get the correct coordinates based on event type
    const isTouchEvent = 'touches' in e;
    const clientX = isTouchEvent ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = isTouchEvent ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const containerRef = isModal ? modalChartRef : chartRef;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Get position relative to chart container
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    
    // Use current data based on brush state
    const currentData = isModal 
      ? (isModalBrushActive && modalFilteredData.length > 0 ? modalFilteredData : data)
      : (isBrushActive && filteredData.length > 0 ? filteredData : data);
    
    // Check if we have data to work with
    if (currentData.length === 0 || !keys || keys.length === 0) return;
    
    // Calculate available chart space
    const margin = { top: 10, right: 15, bottom: 30, left: 40 };
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
    
    // Calculate safe tooltip position for mobile
    const safePosition = calculateSafeTooltipPosition(mouseX, mouseY, rect);
    
    // Only update if showing a new x-value or hiding previous one
    if (!tooltip.visible || tooltip.key !== xValue) {
      // For stacked bar, we show all keys (stack segments)
      const tooltipItems = keys
        .filter(key => {
          // Only include keys with non-zero values and not hidden
          const value = Number(dataPoint[key]);
          return !isNaN(value) && value > 0 && !hiddenSeriesState.includes(key);
        })
        .map(key => ({
          label: formatFieldName(key),
          value: formatValue(Number(dataPoint[key]) || 0, yAxisUnit),
          color: groupColors[key] || blue,
          shape: 'square' as 'square'
        }))
        .sort((a, b) => {
          // Sort by value (descending)
          const aVal = typeof a.value === 'string' 
            ? parseFloat(a.value.replace(/[^0-9.-]+/g, '')) 
            : a.value;
          const bVal = typeof b.value === 'string' 
            ? parseFloat(b.value.replace(/[^0-9.-]+/g, '')) 
            : b.value;
          return bVal - aVal;
        });
      
      // If no items passed the filter, don't show tooltip
      if (tooltipItems.length === 0) {
        setTooltip(prev => ({ ...prev, visible: false }));
        return;
      }
      
      // Update the tooltip
      setTooltip({
        visible: true,
        key: xValue,
        items: tooltipItems,
        left: safePosition.left,
        top: safePosition.top
      });
    } else {
      // If tooltip content isn't changing, just update position
      setTooltip(prev => ({
        ...prev,
        left: safePosition.left,
        top: safePosition.top
      }));
    }
  }, [data, filteredData, modalFilteredData, isBrushActive, isModalBrushActive, chartData, xKey, keys, groupColors, formatValue, 
      tooltip.visible, tooltip.key, yAxisUnit, hiddenSeriesState]);

  // For backward compatibility
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    handleInteraction(e, isModal);
  }, [handleInteraction]);

  // Optimized touch handlers that don't interfere with page scrolling
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>, isModal = false) => {
    // Handle touch interaction without preventing default to allow normal scrolling
    const containerRef = isModal ? modalChartRef : chartRef;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const touch = e.touches[0];
    const mouseX = touch.clientX - rect.left;
    const mouseY = touch.clientY - rect.top;
    
    // Calculate available chart space
    const margin = { top: 10, right: 15, bottom: 30, left: 40 };
    const innerWidth = rect.width - margin.left - margin.right;
    const adjustedMouseX = mouseX - margin.left;
    
    // Only handle touch if it's within the chart area
    if (adjustedMouseX >= 0 && adjustedMouseX <= innerWidth && chartData.length > 0) {
      // Note: Cannot preventDefault in touch handlers due to passive event listeners
      handleInteraction(e, isModal);
    }
  }, [handleInteraction, chartData.length]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>, isModal = false) => {
    // Only handle if tooltip is already visible (user is interacting with chart)
    if (tooltip.visible) {
      // Note: Cannot preventDefault in touch move handler due to passive event listeners
      handleInteraction(e, isModal);
    }
    // Otherwise, allow normal page scrolling
  }, [handleInteraction, tooltip.visible]);

  // Helper function to format X-axis tick labels
  const formatXAxisLabel = (value: string): string => {
    // Check if the value is a date format (YYYY-MM-DD or similar)
    const isDateFormat = /^\d{4}-\d{2}-\d{2}/.test(value) || 
                        /^\d{2}\/\d{2}\/\d{4}/.test(value) ||
                        /^\d{1,2}-[A-Za-z]{3}-\d{4}/.test(value);
    
    if (isDateFormat) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        // Format based on timeFilter
        if (filterValues?.timeFilter === 'D' || filterValues?.timeFilter === 'W') {
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (filterValues?.timeFilter === 'M') {
          return date.toLocaleDateString('en-US', { month: 'short' });
        } else if (filterValues?.timeFilter === 'Q') {
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          return `Q${quarter}`;
        } else if (filterValues?.timeFilter === 'Y') {
          return date.getFullYear().toString();
        }
        
        // Default format if no timeFilter is specified
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }
    
    // For quarter format (Q1, Q2, etc.)
    if (/^Q[1-4]\s\d{4}$/.test(value)) {
      return value.substring(0, 2); // Just "Q1", "Q2", etc.
    }
    
    // For month-year format (Jan 2023)
    if (/^[A-Za-z]{3}\s\d{4}$/.test(value)) {
      return value.substring(0, 3); // Just "Jan", "Feb", etc.
    }
    
    // Don't shorten other values that are already short
    if (value.length <= 5) {
      return value;
    }
    
    // For other longer text, truncate with ellipsis
    return `${value.substring(0, 3)}...`;
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

    // Check if all series are hidden
    const allSeriesHidden = keys.length > 0 && keys.every(key => hiddenSeriesState.includes(key));

    // Show message when all series are hidden
    if (allSeriesHidden) {
      return (
        <div className="flex justify-center items-center h-full">
          <p className="text-gray-400 text-[12px]">Select a series from the legend to show data.</p>
        </div>
      );
    }

    // Show loader when no data is available yet
    if (chartData.length === 0) {
      return (
        <div className="flex justify-center items-center h-full">
          <PrettyLoader size="sm" />
        </div>
      );
    }
    
    // Define margins for chart
    const margin = { top: 10, right: 15, bottom: 30, left: 40 };
    const innerWidth = chartWidth - margin.left - margin.right;
    const innerHeight = chartHeight - margin.top - margin.bottom;
    
    if (innerWidth <= 0 || innerHeight <= 0) return null;
    
    // Create scales
    const xScale = scaleBand<string>({
      domain: chartData.map((d: ChartDataItem) => d[xKey]),
      range: [0, innerWidth],
      padding: 0.2,
    });
    
    // Calculate the max value for the y-axis (sum of stacked values)
    const yMax = Math.max(
      ...chartData.map(d => {
        // Sum all values in the stack
        return keys.reduce((total, key) => total + (Number(d[key]) || 0), 0);
      }),
      1 // Ensure minimum of 1 to avoid scaling issues
    );
    
    const yScale = scaleLinear<number>({
      domain: [0, displayMode === 'percent' ? 100 : yMax * 1.1], // Use 100 for percent mode
      range: [innerHeight, 0],
      nice: true,
      clamp: true,
    });

    // Color scale for groups
    const colorScale = scaleOrdinal<string, string>({
      domain: keys,
      range: keys.map(key => groupColors[key] || blue)
    });

    // Calculate x-axis tick values - limit to 8 for date data, 5 for mobile
    const xTickValues = (() => {
      // Check if the data contains dates
      const isDateData = chartData.length > 0 && 
        typeof chartData[0][xKey] === 'string' && 
        (/^\d{4}-\d{2}-\d{2}/.test(chartData[0][xKey]) || 
         /^\d{2}\/\d{2}\/\d{4}/.test(chartData[0][xKey]) ||
         /^\d{1,2}-[A-Za-z]{3}-\d{4}/.test(chartData[0][xKey]) ||
         /^[A-Za-z]{3}\s\d{4}$/.test(chartData[0][xKey]) || 
         /^\d{4}$/.test(chartData[0][xKey]));
      
      // Detect mobile screen size
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const maxTicks = isMobile ? 5 : 8;
      
      // For date data, limit ticks based on screen size
      if (isDateData && chartData.length > maxTicks) {
        const tickInterval = Math.ceil(chartData.length / maxTicks);
        return chartData
          .filter((_, i) => i % tickInterval === 0)
          .map(d => d[xKey]);
      }
      
      // For other data types on mobile, also limit to 5 ticks
      if (isMobile && chartData.length > 5) {
        const tickInterval = Math.ceil(chartData.length / 5);
        return chartData
          .filter((_, i) => i % tickInterval === 0)
          .map(d => d[xKey]);
      }
      
      // For other data types on desktop, show all values
      return chartData.map(d => d[xKey]);
    })();

    // Render the chart content
    return (
      <div 
        className="relative w-full h-full touch-pan-y" 
        style={{ touchAction: 'pan-y' }}
        onMouseMove={(e) => handleMouseMove(e, isModal)}
        onTouchStart={(e) => handleTouchStart(e, isModal)}
        onTouchMove={(e) => handleTouchMove(e, isModal)}
        onMouseLeave={handleMouseLeave}
        onTouchEnd={handleTouchEnd}
        ref={isModal ? modalChartRef : chartRef}
      >
        {/* Tooltip */}
        {tooltip.visible && tooltip.items && !isModal && (
          <ChartTooltip
            title={String(tooltip.key)}
            items={tooltip.items}
            left={tooltip.left}
            top={tooltip.top}
            isModal={false}
            timeFilter={filterValues?.timeFilter}
            currencyFilter={filterValues?.currencyFilter}
          />
        )}
        
        <svg width={chartWidth} height={chartHeight}>
          <Group left={margin.left} top={margin.top}>
            {/* Y-axis grid lines */}
            <GridRows
              scale={yScale}
              width={innerWidth}
              stroke="#1f2937"
              strokeOpacity={0.5}
              strokeDasharray="2,3"
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
                // Format date labels based on timeFilter
                if (typeof value === 'string') {
                  // For ISO dates (YYYY-MM-DD)
                  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
                    const date = new Date(value);
                    
                    if (!isNaN(date.getTime())) {
                      // Format based on timeFilter if available
                      if (filterValues?.timeFilter === 'D' || filterValues?.timeFilter === 'W') {
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      } else if (filterValues?.timeFilter === 'M') {
                        return date.toLocaleDateString('en-US', { month: 'short' });
                      } else if (filterValues?.timeFilter === 'Q') {
                        const quarter = Math.floor(date.getMonth() / 3) + 1;
                        return `Q${quarter}`;
                      } else if (filterValues?.timeFilter === 'Y') {
                        return date.getFullYear().toString();
                      }
                      
                      // Default format if no timeFilter is specified
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }
                  }
                  
                  // For other date formats, use the helper function
                  return formatXAxisLabel(value);
                }
                
                // For non-date values, format using our helper function
                return formatXAxisLabel(String(value));
              }}
              tickLabelProps={() => ({
                fill: '#6b7280',
                fontSize: 11,
                fontWeight: 300,
                textAnchor: 'middle',
                dy: '0.5em'
              })}
              // Ensure first tick doesn't start before origin
              left={0}
            />
            
            {/* Y-axis */}
            <AxisLeft
              scale={yScale}
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
            
            {/* Render stacked bars */}
            {chartData.map((d: ChartDataItem, i: number) => {
              const x = xScale(d[xKey]) || 0;
              
              // Check if this is a simple bar chart (single key)
              if (keys.length === 1) {
                // Simple bar chart - render single bars
                const key = keys[0];
                const value = Number(d[key]) || 0;
                const barHeight = innerHeight - yScale(value);
                const barY = yScale(value);
                
                return (
                  <Bar
                    key={`bar-${i}`}
                    x={x}
                    y={barY}
                    width={xScale.bandwidth()}
                    height={barHeight}
                    fill={groupColors[key]}
                    opacity={tooltip.visible && tooltip.key === d[xKey] ? 1 : 0.8}
                    rx={0}
                  />
                );
              }
              
              // Stacked bar chart - render stacked bars
              let barY = innerHeight;
              const stackedBars: React.ReactNode[] = [];
              
              // Generate bars for each key (group), sorted by value
              keys
                .filter(key => Number(d[key]) > 0)
                .sort((a, b) => Number(d[a]) - Number(d[b])) // Sort ascending for proper stacking
                .forEach(key => {
                  const value = Number(d[key]) || 0;
                  // For stacked bars, the height is the scaled difference of the value
                  const scaledValue = yScale(0) - yScale(value);
                  const barHeight = Math.abs(scaledValue);
                  barY -= barHeight;
                  
                  stackedBars.push(
                    <Bar
                      key={`bar-${i}-${key}`}
                      x={x}
                      y={barY}
                      width={xScale.bandwidth()}
                      height={barHeight}
                      fill={groupColors[key]}
                      opacity={tooltip.visible && tooltip.key === d[xKey] ? 1 : 0.8}
                      rx={0}
                    />
                  );
                });
              
              return (
                <Group key={`stack-${i}`}>
                  {stackedBars}
                </Group>
              );
            })}
          </Group>
        </svg>
      </div>
    );
  }, [chartData, keys, xKey, error, formatTickValue, handleMouseMove, handleMouseLeave, 
      groupColors, refreshData, tooltip.visible, tooltip.key, tooltip.items]);

  // Helper function to format field names for display
  const formatFieldName = (fieldName: string): string => {
    if (!fieldName) return '';
    
    // Convert only underscores to space-separated (keep hyphens)
    const spaceSeparated = fieldName.replace(/_/g, ' ');
    
    // Always capitalize the first letter of the entire string
    if (spaceSeparated.length === 0) return '';
    
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
    if (chartData.length > 0 && keys.length > 0) {
      // Calculate total value for each key across all data points
      const keyTotals: Record<string, number> = {};
      
      // Check if we have a groupBy field
      const hasGroupBy = groupByField && groupByField.trim() !== '';
      
      // Calculate totals using all data, not just visible data
      data.forEach(item => {
        if (Array.isArray(yField) && yField.length > 1 && chartConfig.isStacked) {
          // For multi-y-field stacked charts
          yField.forEach(field => {
            const key = typeof field === 'string' ? field : field.field;
            const value = Number(item[key]) || 0;
            keyTotals[key] = (keyTotals[key] || 0) + value;
          });
        } else if (hasGroupBy) {
          // For group-by stacked charts
          const groupValue = String(item[groupByField]);
          const value = Number(item[yKey]) || 0;
          keyTotals[groupValue] = (keyTotals[groupValue] || 0) + value;
        } else {
          // For simple bar charts (no groupBy)
          const value = Number(item[yKey]) || 0;
          keyTotals[yKey] = (keyTotals[yKey] || 0) + value;
        }
      });

      // Get all possible keys (including hidden ones)
      const allKeys = Array.isArray(yField) && yField.length > 1 && chartConfig.isStacked
        ? yField.map(field => typeof field === 'string' ? field : field.field)
        : hasGroupBy 
          ? Array.from(new Set(data.map(item => String(item[groupByField]))))
          : [yKey]; // Simple bar chart has only one key
      
      // Create and sort legend items by total value (descending)
      const newLegendItems = allKeys
        .map(key => ({
          id: key,
          label: formatFieldName(key),
          color: groupColors[key] || blue,
          value: keyTotals[key] || 0
        }))
        .sort((a, b) => b.value - a.value);
      
      setLegendItems(newLegendItems);
    }
  }, [data, chartData, keys, groupColors, yField, yKey, groupByField, chartConfig.isStacked]);

  // Process data for brush component
  const brushData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    console.log('Creating brush data with', data.length, 'items');
    
    // First, apply the same sorting/filtering as the chart data
    let processedData: any[] = [...data].filter((d: any) => d[xKey] !== undefined && d[xKey] !== null);
    
    // Sort by date if applicable
    if (processedData.length > 0) {
      // Detect if data contains dates
      const isDateField = typeof processedData[0][xKey] === 'string' && 
        (processedData[0][xKey].match(/^\d{4}-\d{2}-\d{2}/) || 
         /^\d{2}\/\d{2}\/\d{4}/.test(processedData[0][xKey]) ||
          /^[A-Za-z]{3}\s\d{4}$/.test(processedData[0][xKey]) || 
         /^\d{4}$/.test(processedData[0][xKey]));
      
      if (isDateField) {
        // Sort dates chronologically (oldest to newest)
        processedData.sort((a: any, b: any) => {
          const dateA = new Date(a[xKey]);
          const dateB = new Date(b[xKey]);
          return dateA.getTime() - dateB.getTime();
        });
      }
    }
    
    // Check if we have multiple Y-axis fields with stacked mode
    const isMultiYFieldsStacked = Array.isArray(yField) && yField.length > 1 && chartConfig.isStacked;
    
    // Group by x-axis values to prevent duplicates
    const groupedData: Record<string, any> = {};
    
    processedData.forEach((item: any) => {
      const xValue = String(item[xKey]);
      
      if (!groupedData[xValue]) {
        groupedData[xValue] = {
          ...item,
          [xKey]: item[xKey],
          totalValue: 0
        };
      }
      
      // For multi-y-field stacked charts, sum all the y fields for total value
      if (isMultiYFieldsStacked) {
        allYFields.forEach(field => {
          if (item[field] !== undefined && item[field] !== null) {
            const value = Number(item[field]) || 0;
            groupedData[xValue].totalValue += value;
          }
        });
      } else {
        // Add to the total value for this x value using the primary yKey
        groupedData[xValue].totalValue += Number(item[yKey]) || 0;
      }
    });
    
    // Convert back to array
    const uniqueData = Object.values(groupedData);
    console.log(`Processed ${processedData.length} brush items into ${uniqueData.length} unique data points`);
    
    // Create synthetic dates if needed
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    
    // Create a series of evenly spaced date points for brush
    const brushDataPoints = uniqueData.map((d: any, i: number) => {
      let dateObj;
      
      // Try to parse the date from the x-axis field
      if (typeof d[xKey] === 'string' && 
         (d[xKey].match(/^\d{4}-\d{2}-\d{2}/) || 
          /^\d{2}\/\d{2}\/\d{4}/.test(d[xKey]) ||
          /^[A-Za-z]{3}\s\d{4}$/.test(d[xKey]) || 
         /^\d{4}$/.test(d[xKey]))) {
        // This is a date string, parse it
        dateObj = new Date(d[xKey]);
        // Check if the date is valid
        if (isNaN(dateObj.getTime())) {
          // Invalid date, use synthetic date based on index
          dateObj = new Date(baseDate);
          dateObj.setDate(baseDate.getDate() + i);
        }
      } else if (d[xKey] instanceof Date) {
        // Already a Date object
        dateObj = d[xKey];
      } else {
        // Non-date value, use synthetic date based on index
        dateObj = new Date(baseDate);
        dateObj.setDate(baseDate.getDate() + i);
      }
      
      // For the brush, use the total value across all stacked elements
      const totalValue = d.totalValue || 0;
      
      return {
        date: dateObj,
        value: totalValue,
        idx: i,
        originalIndex: i,
        originalData: d
      };
    });
    
    console.log('Created brush data points for stacked chart:', brushDataPoints.length);
    return brushDataPoints;
  }, [data, xKey, yKey, yField, allYFields, chartConfig]);
  
  // Handle brush change
  const handleBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isBrushActive) {
        setBrushDomain(null);
        setIsBrushActive(false);
        setFilteredData([]); // Reset filtered data
      }
      return;
    }
    
    const { x0, x1 } = domain;
    console.log('Brush change:', new Date(x0), 'to', new Date(x1));
    
    // Update brush domain
    setBrushDomain([new Date(x0), new Date(x1)]);
    
    // Get the selected brushData items
    const selectedBrushItems = brushData.filter((item: any) => {
      return item.date >= new Date(x0) && item.date <= new Date(x1);
    });
    
    console.log('Selected brush items:', selectedBrushItems.length);
    
    // For stacked charts, we need to preserve the x-value structure
    // Extract the x values from the selected brush items
    const selectedXValues = selectedBrushItems.map(item => item.originalData[xKey]);
    
    // Filter the original data to include all items with those x values
    const selectedDataObjects = data.filter(d => selectedXValues.includes(d[xKey]));
    
    console.log('Filtered data after brush:', selectedDataObjects.length);
    setFilteredData(selectedDataObjects);
    
    if (!isBrushActive) {
      setIsBrushActive(true);
    }
  }, [isBrushActive, brushData, data, xKey]);

  // Handle modal brush change
  const handleModalBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isModalBrushActive) {
        setModalBrushDomain(null);
        setIsModalBrushActive(false);
        setModalFilteredData([]); // Reset modal filtered data
      }
      return;
    }
    
    const { x0, x1 } = domain;
    console.log('Modal brush change:', new Date(x0), 'to', new Date(x1));
    
    // Update modal brush domain
    setModalBrushDomain([new Date(x0), new Date(x1)]);
    
    // Get the selected brushData items
    const selectedBrushItems = brushData.filter((item: any) => {
      return item.date >= new Date(x0) && item.date <= new Date(x1);
    });
    
    console.log('Selected modal brush items:', selectedBrushItems.length);
    
    // Use the same approach as in handleBrushChange
    const selectedXValues = selectedBrushItems.map(item => item.originalData[xKey]);
    const selectedDataObjects = data.filter(d => selectedXValues.includes(d[xKey]));
    
    console.log('Filtered data after modal brush:', selectedDataObjects.length);
    setModalFilteredData(selectedDataObjects);
    
    if (!isModalBrushActive) {
      setIsModalBrushActive(true);
    }
  }, [isModalBrushActive, brushData, data, xKey]);

  // Sync modal brush domain with main brush domain when modal opens
  useEffect(() => {
    if (isExpanded) {
      console.log('Modal opened, syncing brush domains');
      // When modal opens, sync the brush domains
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
      
      // Also sync filtered data
      if (isBrushActive && filteredData.length > 0) {
        console.log('Syncing filtered data to modal:', filteredData.length, 'items');
        setModalFilteredData(filteredData);
      }
    }
  }, [isExpanded, brushDomain, isBrushActive, filteredData]);

  // Calculate max value for brush scaling
  const maxValue = useMemo(() => {
    if (!chartData || chartData.length === 0) return 1;
    
    // For stacked charts, use the sum of all values in each stack
    return Math.max(
      ...chartData.map(d => {
        return keys.reduce((total, key) => total + (Number(d[key]) || 0), 0);
      }),
      1
    );
  }, [chartData, keys]);

  // Render the brush with proper shape reflecting bar values
  const renderBrushArea = useCallback((modalView = false) => {
    if (!brushData || brushData.length === 0) return null;
    
    // Add a small negative padding to keep the line just inside the brush bounds
    const padding = -0.5;
    
    return (
      <div className="h-[18%] w-full mt-2">
        <BrushTimeScale
          data={brushData}
          activeBrushDomain={modalView ? modalBrushDomain : brushDomain}
          onBrushChange={modalView ? handleModalBrushChange : handleBrushChange}
          onClearBrush={() => {
            if (modalView) {
              setModalBrushDomain(null);
              setIsModalBrushActive(false);
              setModalFilteredData([]);
            } else {
              setBrushDomain(null);
              setIsBrushActive(false);
              setFilteredData([]);
            }
          }}
          getDate={(d) => d.date}
          getValue={(d) => {
            // Ensure we have a valid value for the brush line
            const val = d.value || 0;
            return Math.max(val, maxValue * 0.05);
          }}
          lineColor="#3b82f6"
          margin={{ top: 10, right: 15 + padding, bottom: modalView ? 10 : 20, left: 40 + padding }}
          isModal={modalView}
          curveType="catmullRom"
          
          filterValues={modalView ? modalFilterValues : filterValues}
        />
      </div>
    );
  }, [brushData, modalBrushDomain, brushDomain, handleModalBrushChange, handleBrushChange, 
      setModalBrushDomain, setIsModalBrushActive, setModalFilteredData, setBrushDomain, 
      setIsBrushActive, setFilteredData, maxValue, modalFilterValues, filterValues]);

  // Handler to toggle series visibility
  const handleLegendClick = useCallback((fieldId: string) => {
    setHiddenSeriesState(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  }, []);

  // Update hidden series when prop changes
  useEffect(() => {
    setHiddenSeriesState(hiddenSeries);
  }, [hiddenSeries]);

  // When rendering the chart in expanded mode, use the Modal component
  if (isExpanded) {
    // Only render Modal on client-side to prevent hydration errors
    if (!isClient) {
      return <div className="w-full h-full flex items-center justify-center">Loading expanded view...</div>;
    }
    
    // Render expanded view inside Modal
    return (
      <Modal 
        isOpen={isExpanded} 
        onClose={onCloseExpanded || (() => {})}
        title={chartConfig.title || "Chart View"}
        subtitle={chartConfig.subtitle}
      >
        <div className="w-full h-[80vh] relative overflow-visible">
          {/* Filters row */}
          <div className="mb-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {/* Time filter */}
              {chartConfig.additionalOptions?.filters?.timeFilter && (
                <div className="flex items-center">
                  <TimeFilterSelector
                    value={modalFilterValues?.timeFilter || chartConfig.additionalOptions.filters.timeFilter.activeValue || 'M'}
                    onChange={(value) => handleFilterChange('timeFilter', value)}
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
                  onChange={(value) => handleFilterChange('currencyFilter', value as string)}
                  options={chartConfig.additionalOptions.filters.currencyFilter.options}
                  
                />
              )}
              
              {/* Display mode filter - always show this for stacked charts */}
              <div className="flex items-center">
                <DisplayModeFilter
                  mode={displayMode}
                  onChange={(value) => handleFilterChange('displayMode', value)}
                />
              </div>
            </div>
          </div>
          
          {/* Horizontal line below filters */}
          <div className="w-full h-px bg-gray-900 mb-4"></div>
          
          {/* Chart with legends */}
          <div className="flex h-full">
            {/* Chart area - 90% width */}
            <div className="w-full lg:w-[90%] h-[90%] lg:pr-3 lg:border-r lg:border-gray-900">
              <div className="flex flex-col h-full">
                {/* Display tooltip at the container level for modal views */}
                {tooltip.visible && tooltip.items && (
                  <div className="absolute z-50" style={{ 
                    pointerEvents: 'none',
                    top: tooltip.top,
                    left: tooltip.left
                  }}>
                    <ChartTooltip
                      title={String(tooltip.key)}
                      items={tooltip.items}
                      left={0}
                      top={0}
                      isModal={true}
                      timeFilter={modalFilterValues?.timeFilter || filterValues?.timeFilter}
                      currencyFilter={modalFilterValues?.currencyFilter || filterValues?.currencyFilter}
                    />
                  </div>
                )}
                
                {/* Main chart - 85% height */}
                <div className="h-[85%] w-full relative">
                  <ParentSize debounceTime={10}>
                    {({ width: parentWidth, height: parentHeight }) => 
                      parentWidth > 0 && parentHeight > 0 
                        ? renderChartContent(parentWidth, parentHeight, true)
                        : null
                    }
                  </ParentSize>
                </div>
                
                {/* Brush component - 15% height */}
                {brushData.length > 0 ? renderBrushArea(true) : (null)}
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
                    label={item.label}
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
    );
  }

  // Render normal view with brush
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
      
      {brushData.length > 0 ? renderBrushArea(false) : (null)}
    </div>
  );
};

export default React.memo(StackedBarChart); 