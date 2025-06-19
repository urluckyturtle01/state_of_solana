import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { AreaClosed, LinePath } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { LinearGradient } from '@visx/gradient';
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

// Helper function to create gradient colors using chartColors array
const createGradientColor = (baseColor: string, index: number = 0): { main: string, light: string, lighter: string } => {
  // Use the color from chartColors array based on index
  const colors = allColorsArray;
  const selectedColor = colors[index % colors.length];
  
  // If we have a specific base color that's different from the default, use it
  if (baseColor && baseColor !== blue && baseColor !== selectedColor) {
    return {
      main: baseColor,
      light: baseColor,
      lighter: baseColor
    };
  }
  
  // Use the indexed color from chartColors
  return {
    main: selectedColor,
    light: selectedColor,
    lighter: selectedColor
  };
};

export interface SimpleAreaChartProps {
  chartConfig: ChartConfig;
  data: any[];
  width?: number;
  height?: number;
  isExpanded?: boolean;
  onCloseExpanded?: () => void;
  colorMap?: Record<string, string>;
  filterValues?: Record<string, string>;
  yAxisUnit?: string;
  isStacked?: boolean;
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

const SimpleAreaChart: React.FC<SimpleAreaChartProps> = ({ 
  chartConfig, 
  data, 
  width = 500, 
  height = 300,
  isExpanded = false,
  onCloseExpanded,
  colorMap: externalColorMap,
  filterValues,
  yAxisUnit,
  isStacked = false,
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
  }>>([]);
  
  // Add ref to track if colors have been generated to prevent infinite loops
  const colorsGeneratedRef = useRef<boolean>(false);
  
  // Debounce timer ref for filter changes
  const filterDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  
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

  // Internal display mode state for time aggregation charts
  const [internalDisplayMode, setInternalDisplayMode] = useState<DisplayMode>('absolute');
  
  // Get current display mode from filters or use internal state
  const currentDisplayMode = modalFilterValues?.displayMode as DisplayMode || 
                             filterValues?.displayMode as DisplayMode || 
                             internalDisplayMode;

  // Track hidden series (by field id)
  const [hiddenSeriesState, setHiddenSeriesState] = useState<string[]>(hiddenSeries || []);

  // Extract mapping fields
  const xField = chartConfig.dataMapping.xAxis;
  const yField = chartConfig.dataMapping.yAxis;
  
  console.log('SimpleAreaChart chartConfig.dataMapping:', {
    xAxis: chartConfig.dataMapping.xAxis,
    yAxis: chartConfig.dataMapping.yAxis,
      yField: yField,
      timeAggregationEnabled: chartConfig.additionalOptions?.enableTimeAggregation
  });
  
  // For type safety, ensure we use string values for indexing
  const xKey = typeof xField === 'string' ? xField : xField[0];
  
  // Helper function to get field from YAxisConfig or use string directly
  const getYAxisField = useCallback((field: string | YAxisConfig): string => {
    return typeof field === 'string' ? field : field.field;
  }, []);
  
  // Determine if we have multiple Y-axis fields
  const isMultiSeries = useMemo(() => Array.isArray(yField) && yField.length > 1, [yField]);
  
  // Get array of y-fields
  const yFields = useMemo(() => {
    if (typeof yField === 'string') {
      return [yField];
    } else if (Array.isArray(yField)) {
      return yField.map(f => getYAxisField(f));
    }
    return [];
  }, [yField, getYAxisField]);
  
  // Ensure yKey is always a string (first y-field for backwards compatibility)
  const yKey = yFields[0];

  // Format value for tooltip with display mode support
  const formatValue = useCallback((value: number, unit?: string) => {
    // Add null/undefined check
    if (value === undefined || value === null) {
      return '0.00';
    }
    
    // Handle percentage mode for time aggregation
    if (currentDisplayMode === 'percent') {
      return `${value.toFixed(1)}%`;
    }
    
    // Get the unit symbol (don't use a default)
    const unitSymbol = unit || '';
    const isUnitPrefix = unitSymbol && unitSymbol !== '%' && unitSymbol !== 'SOL'; // Most units are prefixed, but some go after
    
    // Format with appropriate scale
    let formattedValue: string;
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    if (absValue >= 1000000000) {
      formattedValue = `${sign}${(absValue / 1000000000).toFixed(2)}B`;
    } else if (absValue >= 1000000) {
      formattedValue = `${sign}${(absValue / 1000000).toFixed(2)}M`;
    } else if (absValue >= 1000) {
      formattedValue = `${sign}${(absValue / 1000).toFixed(2)}K`;
    } else {
      formattedValue = `${sign}${absValue.toFixed(2)}`;
    }
    
    // Return with correct unit placement (or no unit if not specified)
    if (!unitSymbol) return formattedValue;
    return isUnitPrefix ? `${unitSymbol}${formattedValue}` : `${formattedValue}\u00A0${unitSymbol}`;
  }, [currentDisplayMode]);

  // Format y-axis tick value with appropriate units and display mode support
  const formatTickValue = useCallback((value: number) => {
    if (currentDisplayMode === 'percent') {
      return `${value.toFixed(0)}%`;
    }

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
  }, [currentDisplayMode]);

  // Update modal filters when component receives new filter values
  useEffect(() => {
    if (filterValues) {
      setModalFilterValues(filterValues);
      
      // Update internal display mode if provided in filter values
      if (filterValues.displayMode) {
        setInternalDisplayMode(filterValues.displayMode as DisplayMode);
      }
    }
  }, [filterValues]);

  // Set isClient to true when component mounts in browser
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Track data changes for debugging time aggregation
  useEffect(() => {
    console.log('SimpleAreaChart: Data prop changed:', {
      dataLength: data.length,
      timeAggregationEnabled: chartConfig.additionalOptions?.enableTimeAggregation,
      firstDataItem: data[0],
      currentDisplayMode: currentDisplayMode
    });
  }, [data, chartConfig.additionalOptions?.enableTimeAggregation, currentDisplayMode]);

  // Placeholder for refresh data functionality
  const refreshData = useCallback(() => {
    // If onFilterChange exists in chartConfig, call it with current filters
    if (chartConfig.onFilterChange) {
      chartConfig.onFilterChange(filterValues || {});
    }
    
    setError(null);
  }, [filterValues, chartConfig]);

  // Process data for the chart - use filtered data when available
  const { chartData, areaColor, gradientColors } = useMemo(() => {
    // Use appropriate filtered data depending on context
    const currentData: any[] = 
      (isExpanded && isModalBrushActive && modalFilteredData.length > 0) ? modalFilteredData :
      (!isExpanded && isBrushActive && filteredData.length > 0) ? filteredData : 
      data;
    
    console.log('SimpleAreaChart data processing:', {
      dataLength: data.length,
      currentDataLength: currentData.length,
      isTimeAggregationEnabled: chartConfig.additionalOptions?.enableTimeAggregation,
      currentDisplayMode: currentDisplayMode,
      filterValues: filterValues
    });
    
    if (isExpanded) {
      console.log('Modal chart data source:', 
        isModalBrushActive && modalFilteredData.length > 0 ? 'modal filtered data' : 'full data',
        'Count:', currentData.length);
    }
      
    // If no data is available, return empty defaults
    if (!currentData || currentData.length === 0) {
      return { 
        chartData: [] as ChartDataItem[], 
        areaColor: blue as ColorResult,
        gradientColors: {} as Record<string, { main: string, light: string, lighter: string }>
      };
    }

    // Use external color map if available
    const preferredColorMap = externalColorMap || {};
    
    // For simple area chart, use consistent color unless explicitly configured
    const shouldUseConsistentColor = !chartConfig.useDistinctColors;
    
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
    
    // If multi-series, handle differently than single y-field
    if (isMultiSeries) {
      // Create color map for each y-field
      const colorMap: Record<string, string> = {};
      const gradientMap: Record<string, { main: string, light: string, lighter: string }> = {};
      
      yFields.forEach((field, i) => {
        const baseColor = preferredColorMap[field] || getColorByIndex(i);
        colorMap[field] = baseColor;
        gradientMap[field] = createGradientColor(baseColor, i);
      });
      
      // Group by x-axis values to prevent duplicate x values
      const groupedData: Record<string, ChartDataItem> = {};
      processedData.forEach((item: ChartDataItem) => {
        const xValue = String(item[xKey]);
        
        if (!groupedData[xValue]) {
          // First time seeing this x value, create a base object
          groupedData[xValue] = { 
            [xKey]: item[xKey] 
          };
          
          // Copy all y field values
          yFields.forEach(field => {
            groupedData[xValue][field] = item[field] !== undefined ? item[field] : 0;
          });
        } else {
          // For time aggregation, sum the values instead of taking max
          yFields.forEach(field => {
            if (item[field] !== undefined) {
              const existingValue = Number(groupedData[xValue][field]) || 0;
              const newValue = Number(item[field]) || 0;
              groupedData[xValue][field] = existingValue + newValue;
            }
          });
        }
      });
      
      // Convert back to array
      let uniqueProcessedData = Object.values(groupedData);
      
      // Apply percentage mode conversion if enabled
      if (currentDisplayMode === 'percent') {
        uniqueProcessedData = uniqueProcessedData.map(item => {
          // Calculate total for this data point across all y-fields
          const total = yFields.reduce((sum, field) => sum + (Number(item[field]) || 0), 0);
          
          // Create new item with percentage values
          const percentageItem = { ...item };
          if (total > 0) {
            yFields.forEach(field => {
              const value = Number(item[field]) || 0;
              percentageItem[field] = (value / total) * 100;
            });
          }
          
          return percentageItem;
        });
      }
      
      return {
        chartData: uniqueProcessedData,
        areaColor: colorMap,
        gradientColors: gradientMap
      };
    } else {
      // Single y-field, original logic
      // Group by x-axis values to prevent duplicate areas
      const groupedData: Record<string, ChartDataItem> = {};
      processedData.forEach((item: ChartDataItem) => {
        const xValue = String(item[xKey]);
        
        // If this x-value is already in the grouped data, update it
        if (groupedData[xValue]) {
          // By default, take the highest value to address the double area issue
          if ((Number(item[yKey]) || 0) > (Number(groupedData[xValue][yKey]) || 0)) {
            groupedData[xValue] = item;
          }
        } else {
          // First time seeing this x value
          groupedData[xValue] = { ...item };
        }
      });
      
      // Convert back to array
      let uniqueProcessedData = Object.values(groupedData);
      console.log(`Processed ${processedData.length} items into ${uniqueProcessedData.length} unique data points`);
      
      // Apply percentage mode conversion if enabled (for single y-field, normalize to 100%)
      if (currentDisplayMode === 'percent') {
        const total = uniqueProcessedData.reduce((sum, item) => sum + (Number(item[yKey]) || 0), 0);
        if (total > 0) {
          uniqueProcessedData = uniqueProcessedData.map(item => ({
            ...item,
            [yKey]: (Number(item[yKey]) / total) * 100
          }));
        }
      }
      
      // Use a consistent color unless distinctColors is requested
      if (shouldUseConsistentColor) {
        const baseColor = preferredColorMap[yKey] || blue;
        const gradientColor = createGradientColor(baseColor, 0);
        
        return { 
          chartData: uniqueProcessedData, 
          areaColor: baseColor,
          gradientColors: { [yKey]: gradientColor }
        };
      } else {
        // Create color map for each area if distinct colors requested
        const colorMap: Record<string, string> = {};
        const gradientMap: Record<string, { main: string, light: string, lighter: string }> = {};
        
        uniqueProcessedData.forEach((d: any, i: number) => {
          const xValue = String(d[xKey]);
          const baseColor = preferredColorMap[xValue] || getColorByIndex(i % allColorsArray.length);
          colorMap[xValue] = baseColor;
          gradientMap[xValue] = createGradientColor(baseColor, i);
        });
        
        return { 
          chartData: uniqueProcessedData, 
          areaColor: colorMap,
          gradientColors: gradientMap
        };
      }
    }
  }, [data, filteredData, modalFilteredData, isBrushActive, isModalBrushActive, xKey, yKey, chartConfig, isMultiSeries, yFields, externalColorMap, isExpanded]);

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
    if (currentData.length === 0) return;
    
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
    
    // Get the actual rendered data
    const effectiveData = isMultiSeries ? chartData : chartData;
    
    // Calculate area width based on the actual rendered data
    const areaWidth = innerWidth / effectiveData.length;
    
    // Calculate the index of the area under the mouse pointer
    const areaIndex = Math.floor(adjustedMouseX / areaWidth);
    
    // Validate the index
    if (areaIndex < 0 || areaIndex >= effectiveData.length) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    // Get the data point at this index
    const dataPoint = effectiveData[areaIndex];
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
      let tooltipItems = [];
      
      if (isMultiSeries) {
        // For multi-series, show non-zero values for all y fields
        const visibleFields = yFields.filter(field => !hiddenSeriesState.includes(field));
        // If no visible fields, hide tooltip and return
        if (visibleFields.length === 0) {
          if (tooltip.visible) {
            setTooltip(prev => ({ ...prev, visible: false }));
          }
          return;
        }
        tooltipItems = visibleFields
          .filter(field => {
            const value = Number(dataPoint[field]);
            return !isNaN(value) && value !== 0;
          })
          .map((field) => ({
            label: formatFieldName(field),
            value: formatValue(Number(dataPoint[field]) || 0, getYAxisUnit(yField, yAxisUnit)),
            color: allColorsArray[yFields.indexOf(field) % allColorsArray.length],
            shape: 'circle' as 'circle'
          }))
          .sort((a, b) => {
            // Sort by absolute value (descending) to show larger values first
            const aVal = typeof a.value === 'string' 
              ? Math.abs(parseFloat(a.value.replace(/[^0-9.-]+/g, '')))
              : Math.abs(Number(a.value));
            const bVal = typeof b.value === 'string' 
              ? Math.abs(parseFloat(b.value.replace(/[^0-9.-]+/g, '')))
              : Math.abs(Number(b.value));
            return bVal - aVal;
          });
        // If no items passed the filter, show placeholder for first visible field
        if (tooltipItems.length === 0 && visibleFields.length > 0) {
          const firstVisibleField = visibleFields[0];
          tooltipItems = [{
            label: formatFieldName(firstVisibleField),
            value: formatValue(0, getYAxisUnit(yField, yAxisUnit)),
            color: allColorsArray[yFields.indexOf(firstVisibleField) % allColorsArray.length],
            shape: 'circle' as 'circle'
          }];
        }
        // Only set tooltip if there are items
        if (tooltipItems.length === 0) {
          if (tooltip.visible) {
            setTooltip(prev => ({ ...prev, visible: false }));
          }
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
        return;
      } else {
        // For simple area chart, just show the single value
        if (hiddenSeriesState.includes(yKey)) {
          if (tooltip.visible) {
            setTooltip(prev => ({ ...prev, visible: false }));
          }
          return;
        }
        tooltipItems = [{
          label: formatFieldName(yKey),
          value: formatValue(dataPoint[yKey], getYAxisUnit(yField, yAxisUnit)),
          color: allColorsArray[0],
          shape: 'circle' as 'circle'
        }];
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
  }, [data, filteredData, modalFilteredData, isBrushActive, isModalBrushActive, chartData, xKey, yKey, yFields, areaColor, formatValue, 
      tooltip.visible, tooltip.key, isMultiSeries, yAxisUnit, hiddenSeriesState]);
      
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

  // Process data for brush component
  const brushData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // console.log('Creating brush data with', data.length, 'items');
    
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
    
    // Create synthetic dates if needed
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    
    // Check if we're dealing with a simple area chart without filters
    const isSimpleChartWithoutFilters = 
      !filterValues || Object.keys(filterValues).length === 0;
    
    // For simple chart without filters, use more direct approach to ensure continuous line
    if (isSimpleChartWithoutFilters) {
      console.log('Processing simple chart without filters');
      
      // Group by x-axis values to prevent duplicates
      const groupedData: Record<string, any> = {};
      processedData.forEach((item: any) => {
        const xValue = String(item[xKey]);
        
        if (groupedData[xValue]) {
          // Keep the highest value
          if ((Number(item[yKey]) || 0) > (Number(groupedData[xValue][yKey]) || 0)) {
            groupedData[xValue] = item;
          }
        } else {
          groupedData[xValue] = item;
        }
      });
      
      // Convert back to array
      const uniqueData = Object.values(groupedData);
              // console.log(`Processed ${processedData.length} brush items into ${uniqueData.length} unique data points`);
      
      // Create a series of evenly spaced date points for consistency
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
        
        // Convert value to number and ensure it's valid
        const numValue = Number(d[yKey]);
        const value = isNaN(numValue) ? 0 : numValue;
        
        return {
          date: dateObj,
          value: value,
          idx: i,
          originalIndex: i,
          originalData: d
        };
      });
      
              // console.log('Created brush data points for simple chart:', brushDataPoints.length);
      return brushDataPoints;
    }
    
    // Standard processing for charts with filters
    // Important: Create a multi-point pattern for the brush line that follows area heights
    // The BrushTimeScale component uses indexes for x-axis and value for y-axis
    const brushDataPoints = processedData.map((d: any, i: number) => {
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
      
      // For general case, still handle null/undefined values
      let yValue = Number(d[yKey]);
      if (yValue === null || yValue === undefined || isNaN(yValue)) {
        yValue = 0;
      }
      
      return {
        date: dateObj,
        value: yValue,
        idx: i,
        originalIndex: i,
        originalData: d
      };
    });
    
          // console.log('Created brush data points:', brushDataPoints.length);
    return brushDataPoints;
  }, [data, xKey, yKey, filterValues]);
  
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
    
    // Map back to original data using originalData directly
    const selectedDataObjects = selectedBrushItems.map(item => item.originalData);
    
    console.log('Filtered data after brush:', selectedDataObjects.length);
    setFilteredData(selectedDataObjects);
    
    if (!isBrushActive) {
      setIsBrushActive(true);
    }
  }, [isBrushActive, brushData]);

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
    
    // Map back to original data using originalData
    // We use the actual data objects rather than indices to ensure the modal view shows correct data
    const selectedDataObjects = selectedBrushItems.map(item => item.originalData);
    
    console.log('Filtered data after modal brush:', selectedDataObjects.length);
    setModalFilteredData(selectedDataObjects);
    
    if (!isModalBrushActive) {
      setIsModalBrushActive(true);
    }
  }, [isModalBrushActive, brushData]);

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

  // Update memoized values for max chart value to use in brush
  const maxValue = useMemo(() => {
    if (!chartData || chartData.length === 0) return 1;
    
    const values = chartData.map(d => Number(d[yKey]) || 0);
    return Math.max(...values, 1);
  }, [chartData, yKey]);

  // Handler to toggle series visibility
  const handleLegendClick = (fieldId: string) => {
    setHiddenSeriesState(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  // Update hidden series when prop changes
  useEffect(() => {
    console.log('SimpleAreaChart: hiddenSeries prop changed:', hiddenSeries);
    console.log('SimpleAreaChart: yFields are:', yFields);
    console.log('SimpleAreaChart: isMultiSeries:', isMultiSeries);
    setHiddenSeriesState(hiddenSeries || []);
  }, [hiddenSeries, yFields, isMultiSeries]);

  // Reset colors generated flag when data changes
  useEffect(() => {
    colorsGeneratedRef.current = false;
  }, [data]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (filterDebounceTimer.current) {
        clearTimeout(filterDebounceTimer.current);
      }
    };
  }, []);

  // Render chart content
  const renderChartContent = useCallback((chartWidth: number, chartHeight: number, isModal = false) => {
    console.log('SimpleAreaChart renderChartContent:', {
      yFields,
      hiddenSeriesState,
      isMultiSeries
    });
    
    // Show error state with refresh button
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
      padding: 0.1,
    });
    
    // Calculate the max and min values for the y-axis with display mode support
    let yMax, yMin;
    
    if (currentDisplayMode === 'percent') {
      // For percentage mode, use fixed scale
      yMax = isMultiSeries ? 100 : 100; // 100% for both multi-series and single series
      yMin = 0;
    } else {
      // For absolute mode, calculate from data
      yMax = isMultiSeries
      ? Math.max(
          ...chartData.flatMap(d => 
            yFields.map(field => Number(d[field]) || 0)
          ), 
          1
        )
      : Math.max(...chartData.map((d: ChartDataItem) => Number(d[yKey]) || 0), 1);
    
      yMin = isMultiSeries
      ? Math.min(
          ...chartData.flatMap(d => 
            yFields.map(field => Number(d[field]) || 0)
          ),
          0
        )
      : Math.min(...chartData.map((d: ChartDataItem) => Number(d[yKey]) || 0), 0);
    }
    
    const yScale = scaleLinear<number>({
      domain: currentDisplayMode === 'percent' 
        ? [yMin, yMax] // No padding for percentage mode
        : [yMin * 1.1, yMax * 1.1], // Add 10% padding for absolute mode
      range: [innerHeight, 0],
      nice: currentDisplayMode !== 'percent', // Don't use nice() for percentage mode
      clamp: true,
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
        onTouchEnd={handleTouchEnd}
        onMouseLeave={handleMouseLeave}
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
          {/* Define gradients for each series */}
          <defs>
            {isMultiSeries ? (
              yFields.map((field, i) => {
                if (hiddenSeriesState.includes(field)) {
                  console.log(`SimpleAreaChart: Hiding field ${field} because it's in hiddenSeriesState:`, hiddenSeriesState);
                  return null;
                }
                const color = allColorsArray[i % allColorsArray.length];
                return (
                  <LinearGradient
                    key={`gradient-${field}`}
                    id={`gradient-${field}-${isModal ? 'modal' : 'normal'}`}
                    from={color}
                    to={color}
                    fromOpacity={0.56}
                    toOpacity={0}
                    vertical={true}
                  />
                );
              })
            ) : (
              <LinearGradient
                id={`gradient-${yKey}-${isModal ? 'modal' : 'normal'}`}
                from={allColorsArray[0]}
                to={allColorsArray[0]}
                fromOpacity={0.56}
                toOpacity={0}
                vertical={true}
              />
            )}
          </defs>
          
          <Group left={margin.left} top={margin.top}>
            {/* Y-axis grid lines with subtle styling */}
            <GridRows
              scale={yScale}
              width={innerWidth}
              stroke="#374151"
              strokeOpacity={0.3}
              strokeDasharray="1,3"
            />
            
            {/* Zero line with special styling when we have negative values */}
            {yMin < 0 && (
              <line
                x1={0}
                y1={yScale(0)}
                x2={innerWidth}
                y2={yScale(0)}
                stroke="#6B7280"
                strokeWidth={1}
                strokeOpacity={0.6}
              />
            )}
            
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
                  
                  // For US dates (MM/DD/YYYY)
                  if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                      // Use same formatting logic as above
                      return formatXAxisLabel(value, filterValues);
                    }
                  }
                  
                  // For quarterly format (Q1 2023)
                  if (/^Q[1-4]\s\d{4}$/.test(value)) {
                    return value.substring(0, 2); // Just "Q1", "Q2", etc.
                  }
                  
                  // For month-year format (Jan 2023)
                  if (/^[A-Za-z]{3}\s\d{4}$/.test(value)) {
                    return value.substring(0, 3); // Just "Jan", "Feb", etc.
                  }
                }
                
                // For non-date values, format using our helper function
                return formatXAxisLabel(String(value), filterValues);
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
            
            {/* Render areas with simple gradients and clean borders */}
            {isMultiSeries ? (
              // For multi-series, render stacked or overlapping areas
              yFields.map((field, i) => {
                if (hiddenSeriesState.includes(field)) {
                  console.log(`SimpleAreaChart: Hiding field ${field} because it's in hiddenSeriesState:`, hiddenSeriesState);
                  return null;
                }
                // Get color for this field
                const color = allColorsArray[i % allColorsArray.length];
                return (
                  <g key={`area-group-${field}`}>
                    {/* Area fill without stroke */}
                    <AreaClosed
                      data={chartData}
                      x={(d) => (xScale(d[xKey]) || 0) + xScale.bandwidth() / 2}
                      y={(d) => yScale(Number(d[field]) || 0)}
                      yScale={yScale}
                      fill={`url(#gradient-${field}-${isModal ? 'modal' : 'normal'})`}
                      stroke="none"
                      curve={curveMonotoneX}
                    />
                    {/* Top line only */}
                    <LinePath
                      data={chartData}
                      x={(d) => (xScale(d[xKey]) || 0) + xScale.bandwidth() / 2}
                      y={(d) => yScale(Number(d[field]) || 0)}
                      stroke={color}
                      strokeWidth={0.5}
                      curve={curveMonotoneX}
                      fill="none"
                    />
                  </g>
                );
              })
            ) : (
              // For single y-field, render single area with clean styling
              hiddenSeriesState.includes(yKey) ? null : (
              <g>
                {/* Area fill without stroke */}
                <AreaClosed
                  data={chartData}
                  x={(d) => (xScale(d[xKey]) || 0) + xScale.bandwidth() / 2}
                  y={(d) => yScale(Number(d[yKey]) || 0)}
                  yScale={yScale}
                  fill={`url(#gradient-${yKey}-${isModal ? 'modal' : 'normal'})`}
                  stroke="none"
                  curve={curveMonotoneX}
                />
                {/* Top line only */}
                <LinePath
                  data={chartData}
                  x={(d) => (xScale(d[xKey]) || 0) + xScale.bandwidth() / 2}
                  y={(d) => yScale(Number(d[yKey]) || 0)}
                  stroke={allColorsArray[0]}
                  strokeWidth={0.5}
                  curve={curveMonotoneX}
                  fill="none"
                />
              </g>
              )
            )}
          </Group>
        </svg>
      </div>
    );
  }, [chartData, xKey, yKey, yFields, areaColor, gradientColors, formatTickValue, error, refreshData, tooltip, handleMouseMove, handleMouseLeave, isMultiSeries, filterValues]);

  // Update legend items 
  useEffect(() => {
    if (chartData.length > 0) {
      let colorMap: Record<string, string> = {};
      
      if (isMultiSeries) {
        // For multi-series, create a legend item for each y-field and calculate total values for sorting
        const fieldTotals: Record<string, number> = {};
        
        // Calculate total value for each field across all data points
        yFields.forEach(field => {
          fieldTotals[field] = chartData.reduce((sum, d) => sum + (Number(d[field]) || 0), 0);
        });
        
        // Create and sort legend items by value (descending)
        const items = yFields
          .map((field, index) => {
            const color = allColorsArray[index % allColorsArray.length];
            const label = formatFieldName(field);
            colorMap[label] = color;
            
            return {
              id: field,
              label,
              color,
              value: fieldTotals[field]
            };
          })
          .sort((a, b) => b.value - a.value);
        
        setLegendItems(items);
      } else {
        // Single y-field - can't really sort a single item
        const color = allColorsArray[0];
        const label = formatFieldName(yKey);
        colorMap[label] = color;
        
        setLegendItems([{
          id: yKey,
          label,
          color,
          value: chartData.reduce((sum, d) => sum + (Number(d[yKey]) || 0), 0)
        }]);
      }
      
      // Communicate colors to dashboard renderer only once per data change
      if (onFilterChange && Object.keys(colorMap).length > 0 && !colorsGeneratedRef.current) {
        onFilterChange(colorMap);
        colorsGeneratedRef.current = true;
      }
    }
  }, [chartData, yKey, isMultiSeries, yFields, onFilterChange]);

  // Render the brush with proper shape reflecting area values
  const renderBrushArea = useCallback((modalView = false) => {
    if (!brushData || brushData.length === 0) return null;
    
    // For chart without filters, we need to customize the brush path
    const isSimpleChartWithoutFilters = 
      !filterValues || Object.keys(filterValues).length === 0;
    
    // Calculate padding to prevent line from extending beyond brush area
    // Add a small negative padding to keep the line just inside the brush bounds
    const padding = isSimpleChartWithoutFilters ? -0.5 : 0;
    
    // Calculate max value for brush scaling
    const maxBrushValue = Math.max(...brushData.map(d => d.value || 0), 1);
    
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
            // For simple charts without filters, ensure we have a visible line
            // that doesn't change shape during brushing
            const val = d.value || 0;
            const absVal = Math.abs(val);
            
            // For brush visualization, we always show a positive value to create a visible line
            // Ensure the line doesn't touch the base by applying a minimum value
            // This makes the line more visible even for small values
            return Math.max(absVal, maxBrushValue * 0.05);
          }}
          lineColor={"#3b82f6"} // Brighter blue for simple charts
          margin={{ top: 10, right: 15 + padding, bottom: modalView ? 10 : 20, left: 40 + padding }}
          isModal={modalView}
          // Use smoother curve type to avoid sharp corners
          curveType={isMultiSeries ? "monotoneX" : "monotoneX"}
          //strokeWidth={isMultiSeries ? 2 : 1.5} // Slightly thicker line for multi-series
          filterValues={modalView ? modalFilterValues : filterValues}
        />
      </div>
    );
  }, [brushData, modalBrushDomain, brushDomain, handleModalBrushChange, handleBrushChange, 
      setModalBrushDomain, setIsModalBrushActive, setModalFilteredData, setBrushDomain, 
      setIsBrushActive, setFilteredData, isMultiSeries, filterValues, modalFilterValues]);

  // Enhanced filter change handler for area charts with time aggregation support
  const handleFilterChange = useCallback((key: string, value: string) => {
    console.log(`SimpleAreaChart filter changed: ${key} = ${value}`);
    
    const updatedFilters = {
      ...modalFilterValues,
      [key]: value
    };
    
    // Update local state immediately for UI responsiveness
    setModalFilterValues(updatedFilters);
    
    // Update internal display mode if changed
    if (key === 'displayMode') {
      setInternalDisplayMode(value as DisplayMode);
    }
    
    // Clear existing timer
    if (filterDebounceTimer.current) {
      clearTimeout(filterDebounceTimer.current);
    }
    
    // For time aggregation enabled charts, we need special handling
    const isTimeAggregationEnabled = chartConfig.additionalOptions?.enableTimeAggregation;
    
    if (isTimeAggregationEnabled && key === 'timeFilter') {
      console.log('SimpleAreaChart: Time aggregation enabled - delegating to ChartRenderer:', value);
      
      // For time aggregation, immediately call the parent filter change
      // The ChartRenderer will handle the actual data re-aggregation
      if (onFilterChange) {
        console.log('SimpleAreaChart: Calling onFilterChange with updated filters');
        onFilterChange(updatedFilters);
      }
    } else {
      // Debounce other filter changes
    filterDebounceTimer.current = setTimeout(() => {
        console.log('SimpleAreaChart: Debounced filter change for:', key);
      if (onFilterChange) {
        onFilterChange(updatedFilters);
      }
    }, 300); // 300ms debounce delay
    }
  }, [modalFilterValues, onFilterChange, chartConfig.additionalOptions?.enableTimeAggregation]);

  // Helper function to format field names for display
  const formatFieldName = (fieldName: string): string => {
    if (!fieldName) return '';
    
    // Convert snake_case or kebab-case to space-separated
    const spaceSeparated = fieldName.replace(/[_-]/g, ' ');
    
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
            <div className="flex items-center space-x-4">
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
              
              {/* Display mode filter */}
              {chartConfig.additionalOptions?.filters?.displayModeFilter && (
                <div className="flex items-center">
                  <DisplayModeFilter
                    mode={(modalFilterValues?.displayMode || chartConfig.additionalOptions.filters.displayModeFilter.activeValue || 'absolute') as DisplayMode}
                    onChange={(value) => handleFilterChange('displayMode', value)}
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
                {/* Main chart - 85% height */}
                <div className="h-[85%] w-full relative" ref={modalChartRef}>
                  <ParentSize debounceTime={10}>
                    {({ width: parentWidth, height: parentHeight }) => 
                      parentWidth > 0 && parentHeight > 0 
                        ? renderChartContent(parentWidth, parentHeight, true)
                        : null
                    }
                  </ParentSize>
                </div>
                
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
                
                {/* Brush component - 15% height */}
                {brushData.length > 0 ? (
                  renderBrushArea(true)
                ) : (null)}
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
                    shape="circle"
                    tooltipText={item.value ? formatValue(item.value) : undefined}
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

// Helper function to get unit from YAxisConfig or component prop
function getYAxisUnit(field: string | YAxisConfig | (string | YAxisConfig)[], defaultUnit?: string): string | undefined {
  if (typeof field === 'string') {
    return defaultUnit;
  } else if (Array.isArray(field)) {
    if (field.length === 0) return defaultUnit;
    return typeof field[0] === 'string' ? defaultUnit : field[0].unit || defaultUnit;
  } else {
    return field.unit || defaultUnit;
  }
}

// Helper function to format X-axis tick labels
const formatXAxisLabel = (value: string, filterValues?: Record<string, string>): string => {
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
      
      // Default format if timeFilter is not specified
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

export default React.memo(SimpleAreaChart); 