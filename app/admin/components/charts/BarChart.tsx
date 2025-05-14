import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Bar, BarStack } from '@visx/shape';
import { ChartConfig } from '../../types';
import { blue, grid, axisLines, tickLabels, getColorByIndex, allColorsArray } from '@/app/utils/chartColors';
import ChartTooltip from '@/app/components/shared/ChartTooltip';
import { localPoint } from '@visx/event';
//import { formatNumber } from '@/app/utils/formatters';
import ButtonSecondary from "@/app/components/shared/buttons/ButtonSecondary";
import Loader from "@/app/components/shared/Loader";
import LegendItem from "@/app/components/shared/LegendItem";
import BrushTimeScale from "@/app/components/shared/BrushTimeScale";
//import TimeFilterSelector from '@/app/components/shared/filters/TimeFilter';
//import CurrencyFilter from '@/app/components/shared/filters/CurrencyFilter';
//import DisplayModeFilter, { DisplayMode } from '@/app/components/shared/filters/DisplayModeFilter';
import Modal from '@/app/components/shared/Modal';

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

interface BarChartProps {
  chartConfig: ChartConfig;
  data: any[];
  width?: number;
  height?: number;
  isExpanded?: boolean;
  onCloseExpanded?: () => void;
  colorMap?: Record<string, string>;
}

const BarChartComponent: React.FC<BarChartProps> = ({ 
  chartConfig, 
  data, 
  width = 500, 
  height = 300,
  isExpanded = false,
  onCloseExpanded,
  colorMap: externalColorMap
}) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const modalChartRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legendItems, setLegendItems] = useState<Array<{id: string, label: string, color: string, value?: number}>>([]);
  
  // Define brush data types
  interface DateBrushPoint {
    date: Date;
    value: number;
  }
  
  interface CategoryBrushPoint {
    date: Date;
    value: number;
    category: string;
  }
  
  type BrushDataPoint = DateBrushPoint | CategoryBrushPoint;
  
  // Brush state
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  
  // Modal brush state
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  
  // Filtered data based on brush
  const [filteredData, setFilteredData] = useState<any[]>([]);

  // Update tooltip state definition
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    left: number;
    top: number;
    key: string;  // X-axis value/category
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
  const groupByField = chartConfig.dataMapping.groupBy || '';
  
  // For type safety, ensure we use string values for indexing
  const xKey = typeof xField === 'string' ? xField : xField[0];
  const yKey = typeof yField === 'string' ? yField : yField[0];
  
  // Determine if we should use stacked bar mode - now checking for multiple y-axis fields as alternative
  const isStacked = chartConfig.isStacked || chartConfig.chartType.includes('stacked');
  // Determine if we should use multi-series mode (multiple y-axis fields)
  const isMultiSeries = Array.isArray(yField) && yField.length > 1;
  // Determine if this is a stacked chart with multiple y-axis fields (no groupBy needed)
  const isStackedMultiSeries = isStacked && isMultiSeries;

  // Format value for tooltip
  const formatValue = useCallback((value: number) => {
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
      // Format billions with one decimal place
      const formattedValue = (value / 1000000000).toFixed(1);
      // Remove trailing zeros and decimal if it's a whole number
      return formattedValue.endsWith('.0') 
        ? `${formattedValue.slice(0, -2)}B` 
        : `${formattedValue}B`;
    } else if (value >= 1000000) {
      // Only show 1 decimal place for millions
      const formattedValue = (value / 1000000).toFixed(1);
      // Remove trailing zeros and decimal if it's a whole number
      return formattedValue.endsWith('.0') 
        ? `${formattedValue.slice(0, -2)}M` 
        : `${formattedValue}M`;
    } else if (value >= 1000) {
      // Only show 1 decimal place for thousands
      const formattedValue = (value / 1000).toFixed(1);
      // Remove trailing zeros and decimal if it's a whole number
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
    // Simulate data refresh
    setTimeout(() => {
      setLoading(false);
      setError(null);
    }, 1000);
  }, []);

  // Process data for the chart - use filtered data when available
  const { chartData, keys, groupColors } = useMemo(() => {
    const isActiveBrushAvailable = (isBrushActive || (isExpanded && isModalBrushActive));
    const hasFilteredData = filteredData.length > 0;
    
    // If filtered data exists and brush is active, use it
    const dataToUse = hasFilteredData && isActiveBrushAvailable
      ? filteredData
      : data;
      
    // If no data is available, return empty defaults
    if (!dataToUse || dataToUse.length === 0) {
      return { 
        chartData: [], 
        keys: [], 
        groupColors: {} 
      };
    }

    // Use external color map if available
    const preferredColorMap = externalColorMap || {};

    // For stacked chart with multiple y-axis fields (no groupBy needed)
    if (isStackedMultiSeries) {
      // Get the actual y-axis fields as an array
      const yFields = Array.isArray(yField) ? yField : [yField];
      
      // Create color map for each y-axis field, prioritizing external colors
      const colorMap: Record<string, string> = {};
      yFields.forEach((field, i) => {
        if (preferredColorMap[field]) {
          colorMap[field] = preferredColorMap[field];
        } else {
          colorMap[field] = getColorByIndex(i);
        }
      });
      
      // Group data by x-axis value
      const groupedByX = dataToUse.reduce((acc: Record<string, any>, curr) => {
        const xValue = curr[xKey];
        if (xValue === undefined || xValue === null) return acc;
        
        if (!acc[xValue]) {
          acc[xValue] = { [xKey]: xValue };
          // Initialize all y-fields to 0
          yFields.forEach(field => {
            acc[xValue][field] = 0;
          });
        }
        
        // Add each y-field value to the appropriate aggregation
        yFields.forEach(field => {
          if (curr[field] !== undefined && curr[field] !== null) {
            acc[xValue][field] = (acc[xValue][field] || 0) + (Number(curr[field]) || 0);
          }
        });
        
        return acc;
      }, {});
      
      // Convert back to array and sort by x-axis value
      let processedData = Object.values(groupedByX);
      
      // Sort by X value - check if it's a date field
      if (processedData.length > 0) {
        // Detect if data contains dates
        const isDateField = typeof processedData[0][xKey] === 'string' && 
          (processedData[0][xKey].match(/^\d{4}-\d{2}-\d{2}/) || 
          /^\w+\s\d{4}$/.test(processedData[0][xKey]) || // "Jan 2024" format
          /^\d{4}$/.test(processedData[0][xKey])); // "2024" format
        
        if (isDateField) {
          // Sort dates chronologically (oldest to newest)
          processedData.sort((a, b) => {
            const dateA = new Date(a[xKey]);
            const dateB = new Date(b[xKey]);
            return dateA.getTime() - dateB.getTime();
          });
        } else {
          // For non-date strings, sort alphabetically
          processedData = processedData.sort((a, b) => String(a[xKey]).localeCompare(String(b[xKey])));
        }
      }
      
      return { 
        chartData: processedData,
        keys: yFields,
        groupColors: colorMap
      };
    }
    // For stacked chart with groupBy field
    else if (isStacked && groupByField) {
      // Get unique values for the group by field
      // Sort them by revenue to ensure consistent ordering and color assignment
      const groupTotals = dataToUse.reduce((acc: Record<string, number>, curr) => {
        const groupValue = curr[groupByField];
        if (groupValue === undefined || groupValue === null) return acc;
        
        const yValue = Number(curr[yKey]) || 0;
        acc[groupValue] = (acc[groupValue] || 0) + yValue;
        return acc;
      }, {});
      
      const uniqueGroups = Object.entries(groupTotals)
        .sort((a, b) => b[1] - a[1]) // Sort by revenue, highest first
        .map(([group]) => group);
      
      // Create color map for groups, prioritizing external colors
      const colorMap: Record<string, string> = {};
      uniqueGroups.forEach((group, i) => {
        // First check if we have a color in the external map
        if (preferredColorMap[group]) {
          colorMap[group] = preferredColorMap[group];
        } else {
          // Otherwise use getColorByIndex to ensure consistent colors
          colorMap[group] = getColorByIndex(i);
        }
      });

      // Process data for stacking by pivoting to put group values as properties
      const groupedByX = dataToUse.reduce((acc: Record<string, any>, curr) => {
        const xValue = curr[xKey];
        if (xValue === undefined || xValue === null) return acc;
        
        const groupValue = curr[groupByField];
        if (groupValue === undefined || groupValue === null) return acc;
        
        const yValue = Number(curr[yKey]) || 0;
        
        if (!acc[xValue]) {
          acc[xValue] = { [xKey]: xValue };
          // Initialize all group values to 0
          uniqueGroups.forEach(group => {
            acc[xValue][group] = 0;
          });
        }
        
        // Add this entry's value to the appropriate group
        acc[xValue][groupValue] = (acc[xValue][groupValue] || 0) + yValue;
        
        return acc;
      }, {});
      
      // Convert back to array and sort by x-axis value if it's a string
      let processedData = Object.values(groupedByX);
      
      // Sort by X value - check if it's a date field
      if (processedData.length > 0) {
        // Detect if data contains dates
        const isDateField = typeof processedData[0][xKey] === 'string' && 
          (processedData[0][xKey].match(/^\d{4}-\d{2}-\d{2}/) || 
          /^\w+\s\d{4}$/.test(processedData[0][xKey]) || // "Jan 2024" format
          /^\d{4}$/.test(processedData[0][xKey])); // "2024" format
        
        if (isDateField) {
          // Sort dates chronologically (oldest to newest)
          processedData.sort((a, b) => {
            const dateA = new Date(a[xKey]);
            const dateB = new Date(b[xKey]);
            return dateA.getTime() - dateB.getTime();
          });
        } else {
          // For non-date strings, sort alphabetically
          processedData = processedData.sort((a, b) => String(a[xKey]).localeCompare(String(b[xKey])));
        }
      }
      
      return { 
        chartData: processedData,
        keys: uniqueGroups as string[],
        groupColors: colorMap
      };
    }
    // For multi-series chart (multiple y-axis fields)
    else if (isMultiSeries) {
      // Get the actual y-axis fields as an array
      const yFields = Array.isArray(yField) ? yField : [yField];
      
      // Create color map for each y-axis field, prioritizing external colors
      const colorMap: Record<string, string> = {};
      yFields.forEach((field, i) => {
        if (preferredColorMap[field]) {
          colorMap[field] = preferredColorMap[field];
        } else {
          colorMap[field] = getColorByIndex(i);
        }
      });
      
      // Transform data to put all y-fields as separate entries with the same x value
      const transformedData: any[] = [];
      
      dataToUse.forEach(item => {
        // Get the x value - ensure we handle both string and array cases
        const xValue = item[xKey];
        if (xValue === undefined || xValue === null) return;
        
        // Add each y field as a separate entry
        yFields.forEach(yFieldName => {
          transformedData.push({
            [xKey]: xValue,
            y_value: Number(item[yFieldName]) || 0,
            y_field: yFieldName, // Store the field name for labeling
          });
        });
      });
      
      // Sort the transformed data if it's date-based
      if (transformedData.length > 0) {
        // Detect if data contains dates
        const isDateField = typeof transformedData[0][xKey] === 'string' && 
          (transformedData[0][xKey].match(/^\d{4}-\d{2}-\d{2}/) || 
          /^\w+\s\d{4}$/.test(transformedData[0][xKey]) || // "Jan 2024" format
          /^\d{4}$/.test(transformedData[0][xKey])); // "2024" format
        
        if (isDateField) {
          // Sort dates chronologically (oldest to newest)
          transformedData.sort((a, b) => {
            const dateA = new Date(a[xKey]);
            const dateB = new Date(b[xKey]);
            return dateA.getTime() - dateB.getTime();
          });
        }
      }
      
      return { 
        chartData: transformedData,
        keys: yFields,
        groupColors: colorMap
      };
    }
    // Standard bar chart with a single y-axis field
    else {
      // For regular charts, use basic color scheme
      const colorMap: Record<string, string> = {};
      
      // For regular bar charts, we should use a consistent color
      // Only use different colors if specifically configured
      const shouldUseConsistentColor = !chartConfig.useDistinctColors;
      
      // Filter data first
      const filteredData = dataToUse.filter(d => d[xKey] !== undefined && d[xKey] !== null);
      
      // Sort by date if applicable
      if (filteredData.length > 0) {
        // Detect if data contains dates
        const isDateField = typeof filteredData[0][xKey] === 'string' && 
          (filteredData[0][xKey].match(/^\d{4}-\d{2}-\d{2}/) || 
           /^\w+\s\d{4}$/.test(filteredData[0][xKey]) || // "Jan 2024" format
           /^\d{4}$/.test(filteredData[0][xKey])); // "2024" format
        
        if (isDateField) {
          // Sort dates chronologically (oldest to newest)
          filteredData.sort((a, b) => {
            const dateA = new Date(a[xKey]);
            const dateB = new Date(b[xKey]);
            return dateA.getTime() - dateB.getTime();
          });
        }
      }
      
      if (shouldUseConsistentColor) {
        // Use a single consistent color for all bars
        return { 
          chartData: filteredData, 
          keys: [yKey], 
          groupColors: { [yKey]: blue } 
        };
      } else {
        // Use different colors for each bar if specifically requested
        const uniqueXValues = filteredData.map(d => String(d[xKey]));
          
        uniqueXValues.forEach((xValue, i) => {
          if (preferredColorMap[xValue]) {
            colorMap[xValue] = preferredColorMap[xValue];
          } else {
            colorMap[xValue] = getColorByIndex(i);
          }
        });
        
        return { 
          chartData: filteredData, 
          keys: [yKey], 
          groupColors: colorMap
        };
      }
    }
  }, [data, filteredData, isBrushActive, isModalBrushActive, isExpanded, 
       xKey, yKey, groupByField, isStacked, isMultiSeries, yField, externalColorMap]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);

  // Handle mouse move for tooltips with area-based detection
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    const containerRef = isModal ? modalChartRef : chartRef;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Get mouse position - for modal, use client coordinates for proper positioning
    let mouseX, mouseY;
    if (isModal) {
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    } else {
      // For regular view, use the localPoint
      const point = localPoint(e) || { x: 0, y: 0 };
      mouseX = point.x;
      mouseY = point.y;
    }
    
    // Use current data based on brush state and modal state
    const isActiveBrush = isModal ? isModalBrushActive : isBrushActive;
    const currentData = isActiveBrush && filteredData.length > 0
      ? filteredData 
      : chartData;
    
    // Check if we have data to work with
    if (currentData.length === 0) return;
    
    // Calculate available chart space
    const margin = { top: 10, right: 15, bottom: 30, left: 40 };
    const innerWidth = rect.width - margin.left - margin.right;
    
    // Calculate bar width based on number of data points
    const barWidth = innerWidth / currentData.length;
    
    // Find the bar index based on mouse position
    const barIndex = Math.floor((mouseX - margin.left) / barWidth);
    
    // Validate the index
    if (barIndex < 0 || barIndex >= currentData.length) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    // Get the data point at this index
    const dataPoint = currentData[barIndex];
    const xValue = dataPoint[xKey];
    
    // Only update if showing a new x-value or hiding previous one
    if (!tooltip.visible || tooltip.key !== xValue) {
      // Create tooltip items based on chart type
      let tooltipItems: { label: string, value: string | number, color: string, shape?: 'circle' | 'square' }[] = [];
      
      if (isStackedMultiSeries) {
        // For stacked multi-series charts, show each y-axis field value
        tooltipItems = keys
          .filter(key => dataPoint[key] > 0)
          .map(key => ({
            label: key,
            value: formatValue(dataPoint[key]),
            color: groupColors[key],
            shape: 'square' as 'square'
          }))
          .sort((a, b) => {
            // Convert string values back to numbers for sorting
            const aVal = typeof a.value === 'string' 
              ? parseFloat(a.value.replace(/[^0-9.-]+/g, '')) 
              : a.value;
            const bVal = typeof b.value === 'string' 
              ? parseFloat(b.value.replace(/[^0-9.-]+/g, '')) 
              : b.value;
            return bVal - aVal; // Descending order
          });
      } else if (isStacked && groupByField) {
        // For traditional stacked charts, show all segments in this bar
        tooltipItems = keys
          .filter(key => dataPoint[key] > 0)
          .map(key => ({
            label: key,
            value: formatValue(dataPoint[key]),
            color: groupColors[key],
            shape: 'square' as 'square'
          }))
          .sort((a, b) => {
            // Convert string values back to numbers for sorting
            const aVal = typeof a.value === 'string' 
              ? parseFloat(a.value.replace(/[^0-9.-]+/g, '')) 
              : a.value;
            const bVal = typeof b.value === 'string' 
              ? parseFloat(b.value.replace(/[^0-9.-]+/g, '')) 
              : b.value;
            return bVal - aVal; // Descending order
          });
      } else if (isMultiSeries) {
        // For multi-series, filter this x value
        const pointsForThisX = currentData.filter(d => d[xKey] === xValue);
        tooltipItems = pointsForThisX.map(point => ({
          label: point.y_field,
          value: formatValue(point.y_value),
          color: groupColors[point.y_field],
          shape: 'square' as 'square'
        })).sort((a, b) => {
          // Convert string values back to numbers for sorting
          const aVal = typeof a.value === 'string' 
            ? parseFloat(a.value.replace(/[^0-9.-]+/g, '')) 
            : a.value;
          const bVal = typeof b.value === 'string' 
            ? parseFloat(b.value.replace(/[^0-9.-]+/g, '')) 
            : b.value;
          return bVal - aVal; // Descending order
        });
      } else {
        // For regular bar charts, just show the single value
        tooltipItems = [{
          label: yKey,
          value: formatValue(dataPoint[yKey]),
          color: groupColors[yKey] || blue,
          shape: 'square' as 'square'
        }];
      }
      
      setTooltip({
        visible: true,
        key: xValue,
        items: tooltipItems,
        left: mouseX,
        top: mouseY
      });
    }
  }, [chartData, filteredData, isBrushActive, isModalBrushActive, xKey, yKey, 
      keys, isStacked, isMultiSeries, groupByField, groupColors, formatValue, 
      tooltip.visible, tooltip.key, chartRef, modalChartRef]);

  // Process data for brush component - look for date fields or create categorical brushes
  const processBrushData = useCallback((): BrushDataPoint[] => {
    if (!data || data.length === 0) return [];
    
    // First, check if we have categorical data vs. time series data
    const dateField = typeof xField === 'string' ? xField : xField[0];
    
    // Quick check for categorical data
    const uniqueXValues = [...new Set(data.map(d => d[dateField]))];
    const isCategoricalOnly = uniqueXValues.length > 0 && uniqueXValues.every(value => {
      if (!value) return true; // Skip undefined/null
      
      // Attempt to parse as date
      if (value instanceof Date) return false; // Already a date, not categorical
      
      if (typeof value === 'string') {
        try {
          // Check for common date formats
          if (/^\d{4}-\d{2}-\d{2}/.test(value) || 
              /^\d{2}\/\d{2}\/\d{4}/.test(value) ||
              /^\w+\s\d{4}$/.test(value) || // Month Year 
              /^\d{4}$/.test(value)) {  // Just year
            const date = new Date(value);
            return isNaN(date.getTime()); // If invalid date, it's categorical
          }
          
          // Try to parse as a date - if invalid, it's categorical
          const date = new Date(value);
          return isNaN(date.getTime());
        } catch (e) {
          return true; // Parse error means it's categorical
        }
      }
      
      return true; // Default to categorical for non-string types
    });
    
    // Force categorical brush for certain chart types or when detected
    const shouldUseCategoricalBrush = isCategoricalOnly || 
                                    chartConfig.enableCategoricalBrush || 
                                    (chartConfig.chartType === 'bar' && uniqueXValues.length < 20);
    
    console.log('Processing brush data:', { 
      uniqueXValues: uniqueXValues.slice(0, 3), 
      isCategoricalOnly, 
      shouldUseCategoricalBrush 
    });
    
    if (shouldUseCategoricalBrush) {
      console.log('Creating categorical brush data');
      // For categorical data, create brush data that uses indices
      const valueField = typeof yField === 'string' ? yField : yField[0];
      
      // Sort unique categories alphabetically or numerically
      const sortedCategories = [...uniqueXValues].sort();
      
      // Create brush data with synthetic dates (one day apart)
      const baseDate = new Date();
      baseDate.setHours(0, 0, 0, 0); // Start of today
      
      const brushData: CategoryBrushPoint[] = sortedCategories
        .filter(category => category !== undefined && category !== null)
        .map((category, index) => {
          // Find the total value for this category
          const totalValue = data
            .filter(d => d[dateField] === category)
            .reduce((sum, curr) => sum + (Number(curr[valueField]) || 0), 0);
          
          // Create a date that's index days from the base date
          const date = new Date(baseDate);
          date.setDate(date.getDate() + index);
          
          return {
            date,
            value: totalValue,
            category: String(category) // Ensure category is a string
          };
        });
      
      console.log(`Created ${brushData.length} categorical brush points`);
      return brushData;
    }
    
    // Handle time series data
    console.log('Creating time series brush data');
    const valueField = typeof yField === 'string' ? yField : yField[0];
    
    // Handle different date formats
    const processDateValue = (dateValue: any) => {
      if (!dateValue) return null;
      
      // If it's just a year
      if (typeof dateValue === 'string' && /^\d{4}$/.test(dateValue)) {
        return new Date(`${dateValue}-01-01`);
      }
      
      // If it's a month and year (e.g., "Jan 2023" or "January 2023")
      if (typeof dateValue === 'string') {
        // Try to match month name and year
        const monthYearRegex = /^(\w+)\s(\d{4})$/;
        const match = dateValue.match(monthYearRegex);
        
        if (match) {
          const [_, monthStr, yearStr] = match;
          const year = parseInt(yearStr);
          
          // Convert month name to month index (0-11)
          let monthIndex = -1;
          
          // Check abbreviated month names
          const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          monthIndex = shortMonthNames.findIndex(m => 
            monthStr.toLowerCase().startsWith(m.toLowerCase())
          );
          
          // If not found, check full month names
          if (monthIndex === -1) {
            const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                                  'July', 'August', 'September', 'October', 'November', 'December'];
            monthIndex = fullMonthNames.findIndex(m => 
              monthStr.toLowerCase() === m.toLowerCase()
            );
          }
          
          // If we found a valid month and year, create a date
          if (monthIndex !== -1 && !isNaN(year)) {
            return new Date(year, monthIndex, 1);
          }
        }
      }
      
      // Otherwise just parse as a date
      try {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch (e) {
        return null;
      }
      
      return null;
    };
    
    // Group by date and sum values
    const aggregatedData = data.reduce<Record<string, number>>((acc, curr) => {
      const dateValue = curr[dateField];
      const date = processDateValue(dateValue);
      
      if (!date) {
        return acc;
      }
      
      // Use ISO string as the key
      const dateKey = date.toISOString();
      const value = Number(curr[valueField]) || 0;
      
      acc[dateKey] = (acc[dateKey] || 0) + value;
      return acc;
    }, {});
    
    // Convert to array for brush component
    const brushData: DateBrushPoint[] = Object.entries(aggregatedData).map(([dateKey, value]) => ({
      date: new Date(dateKey),
      value
    })).sort((a, b) => a.date.getTime() - b.date.getTime()); // Ensure dates are sorted
    
    console.log(`Created ${brushData.length} time series brush points`);
    return brushData;
  }, [data, xField, yField, chartConfig.enableCategoricalBrush, chartConfig.chartType]);

  // Get brush data
  const brushData = useMemo(() => processBrushData(), [processBrushData]);
  
  // Handle brush change
  const handleBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isBrushActive) {
        setBrushDomain(null);
        setIsBrushActive(false);
      }
      return;
    }
    
    const { x0, x1 } = domain;
    
    setBrushDomain([new Date(x0), new Date(x1)]);
    if (!isBrushActive) {
      setIsBrushActive(true);
    }
  }, [isBrushActive]);
  
  // Handle modal brush change
  const handleModalBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isModalBrushActive) {
        setModalBrushDomain(null);
        setIsModalBrushActive(false);
      }
      return;
    }
    
    const { x0, x1 } = domain;
    
    setModalBrushDomain([new Date(x0), new Date(x1)]);
    if (!isModalBrushActive) {
      setIsModalBrushActive(true);
    }
  }, [isModalBrushActive]);
  
  // Filter data based on brush domain
  useEffect(() => {
    // Only attempt to filter if we have brush data
    if (brushData.length === 0) {
      return;
    }
    
    // Get current active brush domain (either from modal or regular view)
    const activeDomain = isExpanded ? modalBrushDomain : brushDomain;
    const isBrushCurrentlyActive = isExpanded ? isModalBrushActive : isBrushActive;
    
    if (!isBrushCurrentlyActive || !activeDomain) {
      // If no active brush, use all data
      setFilteredData(data);
      return;
    }
    
    // For debugging
    console.log('Filtering data with brush domain:', activeDomain);
    console.log('First brush data item:', brushData[0]);
    console.log('First data item xKey:', data[0]?.[xKey], 'type:', typeof data[0]?.[xKey]);
    
    // Check if we have categorical brush data
    const isCategoricalBrush = 'category' in brushData[0];
    
    if (isCategoricalBrush) {
      // For categorical brushes, find which categories are in the selected range
      const [startDate, endDate] = activeDomain;
      
      console.log('Using categorical filtering');
      
      // Find index ranges for the selected dates
      const startIndex = brushData.findIndex(item => item.date >= startDate);
      const endIndex = brushData.findIndex(item => item.date > endDate);
      const lastIndex = endIndex === -1 ? brushData.length - 1 : endIndex - 1;
      
      // Get selected categories based on index range
      const selectedCategories = brushData
        .slice(startIndex, lastIndex + 1)
        .filter((item): item is CategoryBrushPoint => 'category' in item)
        .map(item => item.category);
      
      console.log('Selected categories:', selectedCategories);
      
      // Filter data to only include selected categories
      const filtered = data.filter(item => 
        selectedCategories.includes(item[xKey])
      );
      
      console.log(`Filtered from ${data.length} to ${filtered.length} items using categories`);
      setFilteredData(filtered);
    } else {
      // For date-based brushes, filter by date range
      // Helper function to convert various date formats to Date objects
      const parseDate = (dateValue: any): Date | null => {
        if (!dateValue) return null;
        
        // If it's already a Date object
        if (dateValue instanceof Date) return dateValue;
        
        // If it's a string, try to parse it
        if (typeof dateValue === 'string') {
          // Common date formats
          if (/^\d{4}-\d{2}-\d{2}/.test(dateValue) || /^\d{2}\/\d{2}\/\d{4}/.test(dateValue)) {
            const d = new Date(dateValue);
            if (!isNaN(d.getTime())) return d;
          }
          
          // "Jan 2023" or "January 2023" format
          if (/^\w+\s\d{4}$/.test(dateValue)) {
            // Extract month and year
            const parts = dateValue.split(' ');
            const month = parts[0];
            const year = parseInt(parts[1]);
            
            // Convert month name to number (0-11)
            const months = [
              'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
            ];
            
            let monthIndex = months.findIndex(m => 
              month.toLowerCase().startsWith(m.toLowerCase())
            );
            
            if (monthIndex >= 0) {
              return new Date(year, monthIndex, 1);
            }
          }
          
          // Just a year
          if (/^\d{4}$/.test(dateValue)) {
            return new Date(parseInt(dateValue), 0, 1);
          }
          
          // Try a direct parse as last resort
          try {
            const d = new Date(dateValue);
            if (!isNaN(d.getTime())) return d;
          } catch (e) {
            return null;
          }
        }
        
        return null;
      };
      
      console.log('Using date-based filtering');
      
      // Filter data by date range
      const filtered = data.filter(item => {
        const itemDateValue = item[xKey];
        if (!itemDateValue) return false;
        
        // Parse the date value
        const itemDate = parseDate(itemDateValue);
        if (!itemDate) return false;
        
        // Check if it's within the brush domain
        return itemDate >= activeDomain[0] && itemDate <= activeDomain[1];
      });
      
      console.log(`Filtered from ${data.length} to ${filtered.length} items using date range`);
      setFilteredData(filtered);
    }
  }, [
    data, 
    brushData, 
    brushDomain, 
    modalBrushDomain, 
    isBrushActive, 
    isModalBrushActive, 
    isExpanded, 
    xField,
    xKey
  ]);

  // Sync modal brush domain with main brush domain when modal opens
  useEffect(() => {
    if (isExpanded) {
      // When modal opens, sync the brush domains
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
    }
  }, [isExpanded, brushDomain, isBrushActive]);

  // Add state to track legend colors
  const [legendColorMap, setLegendColorMap] = useState<Record<string, string>>({});
  const prevLegendsRef = useRef<Array<{ id: string; label: string; color: string; value?: number }>>([]);

  // Update legend items based on the data
  useEffect(() => {
    if (isStackedMultiSeries || (isStacked && groupByField)) {
      // For stacked charts, create legend from field values or group values
      // First, use our existing color map or initialize a new one
      const colorMapToUse = externalColorMap || legendColorMap;
      const isNewColorMap = Object.keys(colorMapToUse).length === 0;
      let updatedColorMap = { ...colorMapToUse };
      
      const items = keys.map((key) => {
        // If we don't have a color for this key yet, assign one
        if (!updatedColorMap[key] && isNewColorMap) {
          updatedColorMap[key] = getColorByIndex(Object.keys(updatedColorMap).length);
        }
        
        // Calculate total for this group across all data points
        const total = chartData.reduce((sum, item) => {
          return sum + (Number(item[key]) || 0);
        }, 0);
        
        return {
          id: key,
          label: key,
          color: updatedColorMap[key] || groupColors[key] || getColorByIndex(0),
          value: total
        };
      });
      
      // Sort by value if this is the first time
      let sortedItems = [...items];
      if (isNewColorMap) {
        sortedItems.sort((a, b) => (b.value || 0) - (a.value || 0));
        
        // Update our color map with the sorted colors
        sortedItems.forEach((item, index) => {
          if (!updatedColorMap[item.label]) {
            updatedColorMap[item.label] = getColorByIndex(index);
          }
        });
      } else {
        // If we already have previous legends, maintain their order as much as possible
        const prevLegends = prevLegendsRef.current;
        const prevLabels = prevLegends.map(l => l.label);
        const newLabels = sortedItems.map(l => l.label);
        
        // Keep old labels (in their original order) and add new ones at the end
        const oldLabels = prevLabels.filter(label => newLabels.includes(label));
        const newOnlyLabels = newLabels.filter(label => !prevLabels.includes(label));
        const orderedLabels = [...oldLabels, ...newOnlyLabels];
        
        // Sort according to this order
        sortedItems.sort((a, b) => {
          const indexA = orderedLabels.indexOf(a.label);
          const indexB = orderedLabels.indexOf(b.label);
          return indexA - indexB;
        });
      }
      
      // Store the current items as previous for next update
      prevLegendsRef.current = sortedItems;
      
      // Update the color map if needed - only when there's an actual change
      const currentMapJSON = JSON.stringify(legendColorMap);
      const updatedMapJSON = JSON.stringify(updatedColorMap);
      
      if (currentMapJSON !== updatedMapJSON) {
        setLegendColorMap(updatedColorMap);
      }
      
      setLegendItems(sortedItems);
    } else if (isMultiSeries) {
      // For multi-series, create legend from y-axis fields
      // Similar approach as above, but for multi-series
      const colorMapToUse = externalColorMap || legendColorMap;
      const isNewColorMap = Object.keys(colorMapToUse).length === 0;
      let updatedColorMap = { ...colorMapToUse };
      
      const items = keys.map((key) => {
        // If we don't have a color for this key yet, assign one
        if (!updatedColorMap[key] && isNewColorMap) {
          updatedColorMap[key] = getColorByIndex(Object.keys(updatedColorMap).length);
        }
        
        return {
          id: key,
          label: key,
          color: updatedColorMap[key] || groupColors[key] || getColorByIndex(0)
        };
      });
      
      // Maintain order similar to stacked charts
      let sortedItems = [...items];
      if (!isNewColorMap) {
        const prevLegends = prevLegendsRef.current;
        const prevLabels = prevLegends.map(l => l.label);
        const newLabels = sortedItems.map(l => l.label);
        
        const oldLabels = prevLabels.filter(label => newLabels.includes(label));
        const newOnlyLabels = newLabels.filter(label => !prevLabels.includes(label));
        const orderedLabels = [...oldLabels, ...newOnlyLabels];
        
        sortedItems.sort((a, b) => {
          const indexA = orderedLabels.indexOf(a.label);
          const indexB = orderedLabels.indexOf(b.label);
          return indexA - indexB;
        });
      }
      
      // Store the current items as previous for next update
      prevLegendsRef.current = sortedItems;
      
      // Update the color map if needed - only when there's an actual change
      const currentMapJSON = JSON.stringify(legendColorMap);
      const updatedMapJSON = JSON.stringify(updatedColorMap);
      
      if (currentMapJSON !== updatedMapJSON) {
        setLegendColorMap(updatedColorMap);
      }
      
      setLegendItems(sortedItems);
    } else {
      // For regular bar charts, create legend from the single y-axis
      const colorMapToUse = externalColorMap || legendColorMap;
      const isNewColorMap = Object.keys(colorMapToUse).length === 0;
      let updatedColorMap = { ...colorMapToUse };
      
      // If we don't have a color for this key yet, assign one
      if (!updatedColorMap[yKey] && isNewColorMap) {
        updatedColorMap[yKey] = blue["500"];
      }
      
      setLegendItems([{
        id: yKey,
        label: yKey,
        color: updatedColorMap[yKey] || groupColors[yKey] || blue["500"]
      }]);
      
      // Store as previous
      prevLegendsRef.current = [{
        id: yKey,
        label: yKey,
        color: updatedColorMap[yKey] || groupColors[yKey] || blue["500"]
      }];
      
      // Update the color map if needed - only when there's an actual change
      const currentMapJSON = JSON.stringify(legendColorMap);
      const updatedMapJSON = JSON.stringify(updatedColorMap);
      
      if (currentMapJSON !== updatedMapJSON) {
        setLegendColorMap(updatedColorMap);
      }
    }
  }, [chartData, keys, groupColors, isStacked, isMultiSeries, groupByField, yKey, externalColorMap]);

  // Format date/labels for display to match DexRevenueChart
  const formatLabel = useCallback((label: string, isModal = false) => {
    if (!label) return '';
    
    // Convert label to string if it's not already
    const strLabel = String(label);
    
    // Check if it's likely a date
    if (/^\d{4}-\d{2}-\d{2}/.test(strLabel) || /^\d{2}\/\d{2}\/\d{4}/.test(strLabel)) {
      const d = new Date(strLabel);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { 
          month: 'short',
          year: 'numeric'
        });
      }
    }
    
    // For non-date labels in regular view, show shortened version with ellipsis
    if (!isModal && strLabel.length > 4) {
      return `${strLabel.substring(0, 3)}...`;
    }
    
    // For non-date labels in modal view, show longer but still truncate very long names
    if (isModal && strLabel.length > 10) {
      return `${strLabel.substring(0, 10)}...`;
    }
    
    return strLabel;
  }, []);

  // Calculate how many ticks to show based on available width (from DexRevenueChart)
  const calculateTickValues = useCallback((data: any[], innerWidth: number) => {
    // Always show all ticks for categorical data if there are 15 or fewer categories
    if (data.length <= 15) {
      return data.map(d => d[xKey]);
    }
    
    // For more categories, space them out
    const tickThreshold = innerWidth < 500 ? 6 : 12;
    const step = Math.ceil(data.length / (tickThreshold - 1));
    return data
      .filter((_, i) => i % step === 0 || i === data.length - 1)
      .map(d => d[xKey]);
  }, [xKey]);

  // Render chart content
  const renderChartContent = useCallback((chartWidth: number, chartHeight: number, isModal = false) => {
    // Show loading state
    if (loading) {
      return <div className="flex justify-center items-center h-full"><Loader size="sm" /></div>;
    }
    
    // Show error state with refresh button
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
    const margin = { top: 10, right: 15, bottom: 30, left: 40 };
    const innerWidth = chartWidth - margin.left - margin.right;
    const innerHeight = chartHeight - margin.top - margin.bottom;
    
    if (innerWidth <= 0 || innerHeight <= 0) return null;
    
    // Create scales
    const xScale = scaleBand<string>({
      domain: chartData.map(d => {
        // Handle multiple x fields by using the first one
        return d[xKey];
      }),
      range: [0, innerWidth],
      padding: 0.2, // Reduced padding to match DexRevenueChart
    });
    
    // Calculate the max value for the y-axis
    let yMax: number;
    
    if (isStacked) {
      // For stacked bar, sum all the values in each stack
      const stackTotals = chartData.map(d => 
        keys.reduce((sum, key) => sum + (Number(d[key]) || 0), 0)
      );
      yMax = Math.max(...stackTotals, 1); // Ensure at least 1 to avoid div by zero
    } 
    else if (isMultiSeries && !isStacked) {
      // For multi-series (not stacked), find max of all y values
      yMax = Math.max(...chartData.map(d => Number(d.y_value) || 0), 1);
    } 
    else {
      // For regular bar chart, just find the max y value
      yMax = Math.max(...chartData.map(d => Number(d[yKey]) || 0), 1);
    }
    
    const yScale = scaleLinear<number>({
      domain: [0, yMax * 1.1], // Add 10% padding
      range: [innerHeight, 0],
      nice: true,
      clamp: true,
    });

    // Color scale for groups when stacked or multi-series
    const colorScale = scaleOrdinal<string, string>({
      domain: keys,
      range: keys.map(key => groupColors[key] || getColorByIndex(0))
    });

    // Get tick values for x-axis
    const xTickValues = calculateTickValues(chartData, innerWidth);

    // Render bars with updated styling
    const renderBars = () => {
      if (isStackedMultiSeries) {
        return (
          chartData.map((d, i) => {
            const x = xScale(d[xKey]) || 0;
            
            // Create stack for this data point
            let barY = innerHeight;
            const stackedBars: React.ReactNode[] = [];
            
            // Generate bars for each key (y-axis field), sorted by value
            keys
              .filter(key => d[key] > 0)
              .sort((a, b) => d[a] - d[b]) // Sort ascending for proper stacking
              .forEach(key => {
                const value = d[key] || 0;
                const barHeight = innerHeight - yScale(value);
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
                    rx={2}
                  />
                );
              });
            
            return (
              <Group key={`month-${i}`}>
                {stackedBars}
              </Group>
            );
          })
        );
      } else if (isStacked && groupByField) {
        return (
          chartData.map((d, i) => {
            const x = xScale(d[xKey]) || 0;
            
            // Create stack for this data point
            let barY = innerHeight;
            const stackedBars: React.ReactNode[] = [];
            
            // Generate bars for each key, sorted by value
            keys
              .filter(key => d[key] > 0)
              .sort((a, b) => d[a] - d[b]) // Sort ascending for proper stacking
              .forEach(key => {
                const value = d[key] || 0;
                const barHeight = innerHeight - yScale(value);
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
                    rx={2}
                  />
                );
              });
            
            return (
              <Group key={`month-${i}`}>
                {stackedBars}
              </Group>
            );
          })
        );
      } else if (isMultiSeries) {
        return (
          chartData.map((d, i) => {
            const barWidth = xScale.bandwidth() / keys.length;
            const barHeight = innerHeight - yScale(Number(d.y_value) || 0);
            const barX = (xScale(d[xKey]) || 0) + ((i % keys.length) * barWidth);
            const barY = innerHeight - barHeight;
            
            const fieldName = d.y_field;
            const fieldColor = groupColors[fieldName];
            
            return (
              <Bar
                key={`bar-${i}`}
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill={fieldColor}
                opacity={tooltip.visible && tooltip.key === d[xKey] ? 1 : 0.8}
                rx={2}
              />
            );
          })
        );
      } else {
        // Render regular bars
        return (
          chartData.map((d, i) => {
            const barWidth = xScale.bandwidth();
            const barHeight = innerHeight - yScale(Number(d[yKey]) || 0);
            const barX = xScale(d[xKey]) || 0;
            const barY = innerHeight - barHeight;
            
            // Use a consistent color for standard bar charts
            // Only use the x-value based color if chart is configured for distinct colors
            let barColor;
            if (chartConfig.useDistinctColors) {
              barColor = groupColors[d[xKey]] || getColorByIndex(i % allColorsArray.length);
            } else {
              barColor = groupColors[yKey] || blue;
            }
            
            return (
              <Bar
                key={`bar-${i}`}
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill={barColor}
                opacity={tooltip.visible && tooltip.key === d[xKey] ? 1 : 0.8}
                rx={2}
              />
            );
          })
        );
      }
    };

    // Render the chart content
    return (
      <div 
        className="relative w-full h-full" 
        onMouseMove={(e) => handleMouseMove(e, isModal)}
        onMouseLeave={handleMouseLeave}
        ref={isModal ? modalChartRef : chartRef}
      >
        {/* Only show tooltip in the direct chart content for non-modal views */}
        {tooltip.visible && tooltip.items && !isModal && (
          <ChartTooltip
            title={formatLabel(tooltip.key, isModal)}
            items={tooltip.items}
            left={tooltip.left}
            top={tooltip.top}
            isModal={isModal}
          />
        )}
        
        <svg width={chartWidth} height={chartHeight}>
          <Group left={margin.left} top={margin.top}>
            {/* Y-axis grid lines - updated styling */}
            <GridRows
              scale={yScale}
              width={innerWidth}
              stroke="#1f2937"
              strokeOpacity={0.5}
              strokeDasharray="2,3"
            />
            
            {/* X-axis - updated styling */}
            <AxisBottom
              top={innerHeight}
              scale={xScale}
              stroke="#374151"
              strokeWidth={0.5}
              tickStroke="transparent"
              hideAxisLine={false}
              tickLength={0}
              tickValues={xTickValues}
              tickFormat={(value) => formatLabel(value, isModal)}
              tickLabelProps={() => ({
                fill: '#6b7280',
                fontSize: 11,
                fontWeight: 300,
                textAnchor: 'middle',
                dy: '0.5em'
              })}
            />
            
            {/* Y-axis - updated styling */}
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
            
            {/* Render bars */}
            {renderBars()}
          </Group>
        </svg>
      </div>
    );
  }, [chartData, keys, xKey, yKey, isStacked, isMultiSeries, formatLabel, loading, error, handleMouseMove, handleMouseLeave, formatValue, formatTickValue, groupColors, refreshData, tooltip.visible, tooltip.key, tooltip.items, modalChartRef, chartRef]);

  // When rendering the chart in expanded mode, use the content without the Modal wrapper
  // since the Modal is now handled by ChartRenderer
  if (isExpanded) {
    return (
      <div className="w-full h-full relative overflow-visible">
        {/* Chart with legends */}
        <div className="flex h-full">
          {/* Chart area - 90% width */}
          <div className="w-[90%] h-full pr-3 border-r border-gray-900">
            <div className="flex flex-col h-full">
              {/* Display tooltip at the container level for modal views */}
              {tooltip.visible && tooltip.items && (
                <div className="absolute z-50 top-0 left-0 right-0" style={{ pointerEvents: 'none' }}>
                  <ChartTooltip
                    title={formatLabel(tooltip.key, true)}
                    items={tooltip.items}
                    left={tooltip.left}
                    top={tooltip.top}
                    isModal={true}
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
              {brushData.length > 0 ? (
                <div className="h-[15%] w-full mt-2">
                  <BrushTimeScale
                    data={brushData}
                    activeBrushDomain={modalBrushDomain || brushDomain}
                    onBrushChange={handleModalBrushChange}
                    onClearBrush={() => {
                      setModalBrushDomain(null);
                      setIsModalBrushActive(false);
                    }}
                    getDate={(d) => d.date}
                    getValue={(d) => d.value}
                    lineColor="#60a5fa"
                    margin={{ top: 5, right: 15, bottom: 10, left: 40 }}
                    isModal={true}
                  />
                </div>
              ) : (
                <div className="h-[15%] w-full flex items-center justify-center text-gray-500 text-sm">
                  No brush data available
                </div>
              )}
            </div>
          </div>
          
          {/* Legend area - 10% width */}
          <div className="w-[10%] h-full pl-3 flex flex-col justify-start items-start">
            {loading ? (
              // Show loading state
              <>
                <LegendItem label="Loading..." color="#60a5fa" isLoading={true} />
                <LegendItem label="Loading..." color="#a78bfa" isLoading={true} />
                <LegendItem label="Loading..." color="#34d399" isLoading={true} />
              </>
            ) : (
              // Show legend items
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
                    tooltipText={item.value ? formatValue(item.value) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Normal (non-expanded) view with filters
  return (
    <div className="w-full h-full relative">
      {/* Filters section removed, now managed by dashboard-renderer */}
      
      <div className="h-[85%] w-full">
        <ParentSize debounceTime={10}>
          {({ width: parentWidth, height: parentHeight }) => 
            parentWidth > 0 && parentHeight > 0 
              ? renderChartContent(parentWidth, parentHeight, false)
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
            }}
            getDate={(d) => d.date}
            getValue={(d) => d.value}
            lineColor="#60a5fa"
            margin={{ top: 0, right: 15, bottom: 20, left: 40 }}
            isModal={false}
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

// Export a memoized version of the component to prevent unnecessary re-renders
export default React.memo(BarChartComponent, (prevProps, nextProps) => {
  // Only re-render if the data or config has actually changed
  const prevData = JSON.stringify(prevProps.data);
  const nextData = JSON.stringify(nextProps.data);
  const prevConfig = JSON.stringify(prevProps.chartConfig);
  const nextConfig = JSON.stringify(nextProps.chartConfig);
  
  return prevData === nextData && prevConfig === nextConfig;
}); 