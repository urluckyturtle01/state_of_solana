import React, { useEffect, useState } from 'react';
import { ChartConfig, YAxisConfig } from '../types';

import dynamic from 'next/dynamic';
import ChartLoading from './shared/LazyChartWrapper';
import Modal from '../../components/shared/Modal';

// Parallel dynamic imports for all chart components to preload them simultaneously
const SimpleBarChart = dynamic(() => import('./charts/SimpleBarChart'), {
  ssr: false,
  loading: () => <ChartLoading />
});

const StackedBarChart = dynamic(() => import('./charts/StackedBarChart'), {
  ssr: false,
  loading: () => <ChartLoading />
});

const DualAxisChart = dynamic(() => import('./charts/DualAxisChart'), {
  ssr: false,
  loading: () => <ChartLoading />
});

const MultiSeriesLineBarChart = dynamic(() => import('./charts/MultiSeriesLineBarChart'), {
  ssr: false,
  loading: () => <ChartLoading />
});

const PieChart = dynamic(() => import('./charts/PieChart'), {
  ssr: false,
  loading: () => <ChartLoading />
});

const SimpleAreaChart = dynamic(() => import('./charts/SimpleAreaChart'), {
  ssr: false,
  loading: () => <ChartLoading />
});

// Import filter components
import TimeFilterSelector from '../../components/shared/filters/TimeFilter';
import CurrencyFilter from '../../components/shared/filters/CurrencyFilter';
import DisplayModeFilter, { DisplayMode } from '../../components/shared/filters/DisplayModeFilter';

interface ChartRendererProps {
  chartConfig: ChartConfig;
  onDataLoaded?: (data: any[]) => void;
  isExpanded?: boolean;
  onCloseExpanded?: () => void;
  // New props for filter handling
  onFilterChange?: (filterType: string, value: string) => void;
  filterValues?: Record<string, string>;
  // Add colorMap prop for legend color consistency
  colorMap?: Record<string, string>;
  // Add callback to report generated colors back to parent
  onColorsGenerated?: (colorMap: Record<string, string>) => void;
  // Add loading state prop
  isLoading?: boolean;
  hiddenSeries?: string[];
  // Add prop to pass pre-loaded data
  preloadedData?: any[];
}

// Add helper function at the top of the file
function getFieldFromYAxisConfig(field: string | YAxisConfig): string {
  return typeof field === 'string' ? field : field.field;
}

const ChartRenderer = React.memo<ChartRendererProps>(({ 
  chartConfig, 
  onDataLoaded,
  isExpanded = false, 
  onCloseExpanded,
  onFilterChange,
  filterValues: externalFilterValues,
  colorMap: externalColorMap,
  onColorsGenerated,
  isLoading = false,
  hiddenSeries = [],
  preloadedData
}) => {
  const [data, setData] = useState<any[]>(preloadedData || []);
  const [rawData, setRawData] = useState<any[]>([]); // Store raw data for time aggregation
  const [error, setError] = useState<string | null>(null);
  // Use internal or external filter values based on what's provided
  const [internalFilterValues, setInternalFilterValues] = useState<Record<string, string>>({});
  const [isFilterChanged, setIsFilterChanged] = useState(false);
  // Add state to track legend colors, use external if provided
  const [legendColorMap, setLegendColorMap] = useState<Record<string, string>>(externalColorMap || {});
  
  // Update data when preloadedData changes
  useEffect(() => {
    if (preloadedData && preloadedData.length > 0) {
      setData(preloadedData);
      setError(null);
    }
  }, [preloadedData]);

  // Update legendColorMap when externalColorMap changes
  useEffect(() => {
    if (externalColorMap) {
      setLegendColorMap(externalColorMap);
    }
  }, [externalColorMap]);

  // Add effect to forward legend colors to parent component
  useEffect(() => {
    if (onColorsGenerated && Object.keys(legendColorMap).length > 0) {
      // Check if this is actually a new color map from what we got externally
      const externalMapStr = JSON.stringify(externalColorMap || {});
      const currentMapStr = JSON.stringify(legendColorMap);
      
      // Only trigger the callback if the maps are different
      if (externalMapStr !== currentMapStr) {
        onColorsGenerated(legendColorMap);
      }
    }
  }, [legendColorMap, onColorsGenerated, externalColorMap]);

  // Determine whether to use internal or external filter values
  const filterValues = externalFilterValues || internalFilterValues;

  // Helper function to find a matching field with flexible matching
  const findMatchingField = (obj: any, fieldName: string): string | null => {
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
  };

  // Client-side time aggregation function
  const aggregateDataByTimePeriod = (rawData: any[], timePeriod: string, xField: string, yFields: string[], groupByField?: string): any[] => {
    if (!rawData || rawData.length === 0) return [];
    
          // console.log(`Aggregating ${rawData.length} data points by time period: ${timePeriod}`);
    
    // Check if this is a stacked chart with groupBy field
    const isStackedWithGroupBy = groupByField && chartConfig.isStacked;
    console.log('Time aggregation for stacked chart with groupBy:', isStackedWithGroupBy, 'groupBy field:', groupByField);
    
    // Group data by the appropriate time period (and groupBy field if stacked)
    const groupedData: Record<string, any> = {};
    
    rawData.forEach(item => {
      const dateValue = item[xField];
      if (!dateValue) return;
      
      let timeGroupKey: string;
      const date = new Date(dateValue);
      
      switch (timePeriod) {
        case 'D': // Daily - use as is
          timeGroupKey = dateValue;
          break;
        case 'W': // Weekly - group by week start (Monday), keep YYYY-MM-DD format
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay() + 1); // Monday
          timeGroupKey = weekStart.toISOString().split('T')[0];
          break;
        case 'M': // Monthly - use first day of month, keep YYYY-MM-DD format
          timeGroupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
          break;
        case 'Q': // Quarterly - use first day of quarter, keep YYYY-MM-DD format
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          const quarterStartMonth = (quarter - 1) * 3 + 1; // Q1->1, Q2->4, Q3->7, Q4->10
          timeGroupKey = `${date.getFullYear()}-${String(quarterStartMonth).padStart(2, '0')}-01`;
          break;
        case 'Y': // Yearly - use first day of year, keep YYYY-MM-DD format
          timeGroupKey = `${date.getFullYear()}-01-01`;
          break;
        default:
          timeGroupKey = dateValue;
      }
      
      // For stacked charts with groupBy, create composite key: time + groupBy value
      // For non-stacked charts, use just the time key
      let groupKey: string;
      if (isStackedWithGroupBy) {
        const groupValue = String(item[groupByField]);
        groupKey = `${timeGroupKey}|${groupValue}`;
      } else {
        groupKey = timeGroupKey;
      }
      
      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          [xField]: timeGroupKey, // Always use time value for x-axis
          _count: 0,
          _firstDate: date
        };
        
        // For stacked charts with groupBy, preserve the groupBy field
        if (isStackedWithGroupBy) {
          groupedData[groupKey][groupByField] = item[groupByField];
        }
        
        // Initialize all numeric fields to 0
        yFields.forEach(field => {
          groupedData[groupKey][field] = 0;
        });
      }
      
      // Sum the values for aggregation
      yFields.forEach(field => {
        if (item[field] !== undefined && item[field] !== null) {
          groupedData[groupKey][field] += Number(item[field]) || 0;
        }
      });
      
      groupedData[groupKey]._count++;
      
      // Keep the earliest date for sorting
      if (date < groupedData[groupKey]._firstDate) {
        groupedData[groupKey]._firstDate = date;
      }
    });
    
    // Convert back to array and sort by date, then by group if stacked
    const aggregatedData = Object.values(groupedData)
      .sort((a, b) => {
        // First sort by time
        const timeCompare = a._firstDate.getTime() - b._firstDate.getTime();
        if (timeCompare !== 0) return timeCompare;
        
        // If times are equal and this is stacked with groupBy, sort by group value
        if (isStackedWithGroupBy && groupByField) {
          const groupA = String(a[groupByField]);
          const groupB = String(b[groupByField]);
          return groupA.localeCompare(groupB);
        }
        
        return 0;
      })
      .map(item => {
        // Remove internal fields after sorting
        const { _count, _firstDate, ...cleanItem } = item;
        return cleanItem;
      });
    
    // Debug logging for stacked chart aggregation
    if (isStackedWithGroupBy && aggregatedData.length > 0) {
      console.log(`Stacked chart aggregation result (${timePeriod}):`, {
        totalRows: aggregatedData.length,
        uniqueTimeValues: [...new Set(aggregatedData.map(item => item[xField]))].length,
        uniqueGroupValues: [...new Set(aggregatedData.map(item => item[groupByField]))].length,
        sample: aggregatedData.slice(0, 3)
      });
    }
    
    // Debug logging for quarterly data sorting
    if (timePeriod === 'Q' && aggregatedData.length > 0) {
      console.log('Quarterly aggregation result:', aggregatedData.map(item => item[xField]));
    }
    
          // console.log(`Aggregated to ${aggregatedData.length} data points for period ${timePeriod}`);
    return aggregatedData;
  };

  // Initialize filter values from chart config
  useEffect(() => {
    // Only initialize internal filters if external ones aren't provided
    if (externalFilterValues) return;
    
    const initialFilters: Record<string, string> = {};
    
    // Extract initial filter values from chart config
    if (chartConfig.additionalOptions?.filters) {
      // Set time filter
      if (chartConfig.additionalOptions.filters.timeFilter &&
          Array.isArray(chartConfig.additionalOptions.filters.timeFilter.options) &&
          chartConfig.additionalOptions.filters.timeFilter.options.length > 0) {
        initialFilters['timeFilter'] = chartConfig.additionalOptions.filters.timeFilter.options[0];
      }
      
      // Set currency filter
      if (chartConfig.additionalOptions.filters.currencyFilter &&
          Array.isArray(chartConfig.additionalOptions.filters.currencyFilter.options) &&
          chartConfig.additionalOptions.filters.currencyFilter.options.length > 0) {
        initialFilters['currencyFilter'] = chartConfig.additionalOptions.filters.currencyFilter.options[0];
      }
      
      // Set display mode filter
      if (chartConfig.additionalOptions.filters.displayModeFilter &&
          Array.isArray(chartConfig.additionalOptions.filters.displayModeFilter.options) &&
          chartConfig.additionalOptions.filters.displayModeFilter.options.length > 0) {
        initialFilters['displayModeFilter'] = chartConfig.additionalOptions.filters.displayModeFilter.options[0];
      }
    }
    
    setInternalFilterValues(initialFilters);
  }, [chartConfig.id, externalFilterValues]);

  // Handle filter change
  const handleFilterChange = (filterType: string, value: string) => {
    console.log(`ChartRenderer filter changed: ${filterType} = ${value}`);
    
    // For time aggregation enabled charts, handle time filter changes immediately
    const isTimeAggregationEnabled = chartConfig.additionalOptions?.enableTimeAggregation;
    
    if (isTimeAggregationEnabled && filterType === 'timeFilter') {
      console.log('ChartRenderer: Immediate time filter processing for time aggregation');
      
      // Update internal state immediately
      const updatedFilters = {
        ...(externalFilterValues || internalFilterValues),
        [filterType]: value
      };
      
      if (!externalFilterValues) {
        setInternalFilterValues(updatedFilters);
        setIsFilterChanged(true);
      }
      
      // Trigger immediate re-aggregation if we have raw data
      if (rawData.length > 0) {
        const { xAxis, yAxis } = chartConfig.dataMapping;
        const xField = Array.isArray(xAxis) ? xAxis[0] : xAxis;
        
        let yFields: string[] = [];
        if (Array.isArray(yAxis)) {
          yFields = yAxis.map(field => getFieldFromYAxisConfig(field));
        } else {
          yFields = [getFieldFromYAxisConfig(yAxis)];
        }
        
        console.log('ChartRenderer: Applying immediate time aggregation with filter:', value);
        const aggregatedData = aggregateDataByTimePeriod(rawData, value, xField, yFields, chartConfig.dataMapping.groupBy);
        setData(aggregatedData);
        
        // Call onDataLoaded callback immediately
        if (onDataLoaded) {
          onDataLoaded(aggregatedData);
        }
      }
      
      // Also call external handler if provided
      if (onFilterChange) {
        onFilterChange(filterType, value);
      }
    } else if (isTimeAggregationEnabled && (filterType === 'displayModeFilter' || filterType === 'displayMode')) {
      console.log('ChartRenderer: Display mode filter for time aggregation - pass-through only');
      
      // For time aggregation charts, displayMode changes should only update state for StackedBarChart
      // No re-aggregation needed, just pass through the filter value
      if (!externalFilterValues) {
        setInternalFilterValues(prev => ({
          ...prev,
          [filterType]: value
        }));
      }
      
      // Call external handler if provided
      if (onFilterChange) {
        onFilterChange(filterType, value);
      }
    } else {
      // Standard filter handling for non-time filters (including displayMode)
      console.log(`ChartRenderer: Standard filter processing for ${filterType}:`, value);
      
      // Update internal state immediately for UI responsiveness
      if (!externalFilterValues) {
      setInternalFilterValues(prev => ({
        ...prev,
        [filterType]: value
      }));
      setIsFilterChanged(true);
    }
      
      // Call external handler if provided
      if (onFilterChange) {
        onFilterChange(filterType, value);
      }
    }
  };

  // Effect to handle client-side time aggregation when time filter changes
  useEffect(() => {
    const isTimeAggregationEnabled = chartConfig.additionalOptions?.enableTimeAggregation;
    const timeFilterValue = filterValues['timeFilter'];
    
    console.log('ChartRenderer time aggregation effect triggered:', {
      isTimeAggregationEnabled,
      timeFilterValue,
      rawDataLength: rawData.length,
      hasFilterValues: !!filterValues
    });
    
    if (isTimeAggregationEnabled && timeFilterValue && rawData.length > 0) {
      console.log('ChartRenderer: Applying client-side time aggregation:', timeFilterValue);
      
      // Get field mappings
      const { xAxis, yAxis } = chartConfig.dataMapping;
      const xField = Array.isArray(xAxis) ? xAxis[0] : xAxis;
      
      // Extract y-field names
      let yFields: string[] = [];
      if (Array.isArray(yAxis)) {
        yFields = yAxis.map(field => getFieldFromYAxisConfig(field));
      } else {
        yFields = [getFieldFromYAxisConfig(yAxis)];
      }
      
      // Apply time aggregation
      const aggregatedData = aggregateDataByTimePeriod(rawData, timeFilterValue, xField, yFields, chartConfig.dataMapping.groupBy);
      console.log('ChartRenderer: Time aggregation complete, setting data:', aggregatedData.length, 'items');
      setData(aggregatedData);
      
      // Call onDataLoaded callback if provided
      if (onDataLoaded) {
        onDataLoaded(aggregatedData);
      }
    }
  }, [filterValues['timeFilter'], rawData, chartConfig, onDataLoaded]);

  // Sample data to use when API fails
  const getSampleData = (chartType: string, groupByField?: string) => {
    // Basic sample data for bar charts
    if (chartType.includes('bar')) {
      if (chartType.includes('stacked') && groupByField) {
        // Sample data for stacked bar charts
        return [
          { platform: 'Raydium', segment: 'DEX', protocol_revenue: 1250000 },
          { platform: 'Raydium', segment: 'Lending', protocol_revenue: 350000 },
          { platform: 'Raydium', segment: 'NFT', protocol_revenue: 75000 },
          { platform: 'Orca', segment: 'DEX', protocol_revenue: 980000 },
          { platform: 'Orca', segment: 'Lending', protocol_revenue: 120000 },
          { platform: 'Orca', segment: 'Liquid Staking', protocol_revenue: 420000 },
          { platform: 'Drift', segment: 'DEX', protocol_revenue: 750000 },
          { platform: 'Drift', segment: 'Perpetuals', protocol_revenue: 890000 },
          { platform: 'Marinade', segment: 'Liquid Staking', protocol_revenue: 1100000 },
          { platform: 'Marinade', segment: 'Lending', protocol_revenue: 120000 }
        ];
      }
      
      // Regular bar chart
      return [
        { platform: 'Raydium', protocol_revenue: 1750000, volume: 12500000, users: 45000 },
        { platform: 'Orca', protocol_revenue: 1380000, volume: 9800000, users: 32000 },
        { platform: 'Drift', protocol_revenue: 1640000, volume: 11200000, users: 28000 },
        { platform: 'Marinade', protocol_revenue: 1220000, volume: 5400000, users: 56000 },
        { platform: 'Jupiter', protocol_revenue: 2100000, volume: 18600000, users: 78000 },
        { platform: 'Solend', protocol_revenue: 840000, volume: 4200000, users: 22000 }
      ];
    }
    
    // Time series data (previously for line charts, now as a fallback)
    if (chartType === 'line' || chartType.includes('time')) {
      return [
        { date: '2023-01-01', protocol_revenue: 980000, cumulative_revenue: 980000 },
        { date: '2023-02-01', protocol_revenue: 1250000, cumulative_revenue: 2230000 },
        { date: '2023-03-01', protocol_revenue: 1420000, cumulative_revenue: 3650000 },
        { date: '2023-04-01', protocol_revenue: 1650000, cumulative_revenue: 5300000 },
        { date: '2023-05-01', protocol_revenue: 2100000, cumulative_revenue: 7400000 },
        { date: '2023-06-01', protocol_revenue: 1850000, cumulative_revenue: 9250000 }
      ];
    }
    
    // Default data
    return [
      { x: 'A', y: 100 },
      { x: 'B', y: 200 },
      { x: 'C', y: 150 },
      { x: 'D', y: 300 },
      { x: 'E', y: 250 }
    ];
  };

  // Fetch data from API when component mounts or filters change
  useEffect(() => {
    const effectStartTime = performance.now();
    console.log(`📊 [ChartRenderer-${chartConfig.title}] Starting data fetch effect...`);
    
    // Handle preloaded data with field normalization
    if (preloadedData && preloadedData.length > 0) {
      const preloadStartTime = performance.now();
      console.log(`⚡ [ChartRenderer-${chartConfig.title}] Processing preloaded data (${preloadedData.length} rows)...`);
      
      // Apply the same field normalization logic as for API data
      const normalizePreloadedData = () => {
        try {
          const { xAxis, yAxis, groupBy } = chartConfig.dataMapping;
          const sampleItem = preloadedData[0];

          // Normalize arrays and strings for processing
          const xAxisFields = Array.isArray(xAxis) ? xAxis : [xAxis];
          let yAxisFields: string[] = [];
          
          // Extract field names from yAxis which could be strings or YAxisConfig objects
          if (Array.isArray(yAxis)) {
            yAxisFields = yAxis.map(field => getFieldFromYAxisConfig(field));
          } else {
            yAxisFields = [getFieldFromYAxisConfig(yAxis)];
          }
          
          // Check and normalize fields if needed
          let needsNormalization = false;
          
          // Check if the required fields exist
          const fieldExists = (item: any, field: string) => {
            return !!findMatchingField(item, field);
          };
          
          // Check x-axis fields
          for (const field of xAxisFields) {
            if (!fieldExists(sampleItem, field)) {
              console.error(`X-axis field "${field}" not found in preloaded data. Available fields: ${Object.keys(sampleItem).join(', ')}`);
              setError(`X-axis field "${field}" not found in data. Available fields: ${Object.keys(sampleItem).join(', ')}`);
              return;
            }
            if (findMatchingField(sampleItem, field) !== field) {
              needsNormalization = true;
            }
          }
          
          // Check y-axis fields
          for (const field of yAxisFields) {
            if (!fieldExists(sampleItem, field)) {
              console.error(`Y-axis field "${field}" not found in preloaded data. Available fields: ${Object.keys(sampleItem).join(', ')}`);
              setError(`Y-axis field "${field}" not found in data. Available fields: ${Object.keys(sampleItem).join(', ')}`);
              return;
            }
            if (findMatchingField(sampleItem, field) !== field) {
              needsNormalization = true;
            }
          }
          
          // Check for group by field if this is a stacked chart
          if (groupBy && (chartConfig.chartType.includes('stacked') || chartConfig.isStacked)) {
            if (!fieldExists(sampleItem, groupBy)) {
              console.error(`Group By field "${groupBy}" not found in preloaded data. Available fields: ${Object.keys(sampleItem).join(', ')}`);
              setError(`Group By field "${groupBy}" not found in data. Available fields: ${Object.keys(sampleItem).join(', ')}`);
              return;
            }
            if (findMatchingField(sampleItem, groupBy) !== groupBy) {
              needsNormalization = true;
            }
          }
          
          // Normalize the data if needed
          let normalizedData = preloadedData;
          if (needsNormalization) {
            const normalizeStartTime = performance.now();
            console.log(`🔄 [ChartRenderer-${chartConfig.title}] Normalizing field names...`);
            normalizedData = preloadedData.map(item => {
              const normalizedItem = { ...item };
              
              // Normalize x-axis fields
              for (const field of xAxisFields) {
                const matchingField = findMatchingField(item, field);
                if (matchingField && matchingField !== field) {
                  normalizedItem[field] = item[matchingField];
                }
              }
              
              // Normalize y-axis fields
              for (const field of yAxisFields) {
                const matchingField = findMatchingField(item, field);
                if (matchingField && matchingField !== field) {
                  normalizedItem[field] = item[matchingField];
                }
              }
              
              // Normalize group by field if needed
              if (groupBy && (chartConfig.chartType.includes('stacked') || chartConfig.isStacked)) {
                const matchingGroupField = findMatchingField(item, groupBy);
                if (matchingGroupField && matchingGroupField !== groupBy) {
                  normalizedItem[groupBy] = item[matchingGroupField];
                }
              }
              
              return normalizedItem;
            });
            
            const normalizeTime = performance.now() - normalizeStartTime;
            console.log(`✅ [ChartRenderer-${chartConfig.title}] Field normalization complete (${normalizeTime.toFixed(2)}ms)`);
          }
          
          // Call onDataLoaded callback if provided
          if (onDataLoaded) {
            onDataLoaded(normalizedData);
          }
          
          // For time aggregation, store raw data and apply initial aggregation
          const isTimeAggregationEnabled = chartConfig.additionalOptions?.enableTimeAggregation;
          if (isTimeAggregationEnabled) {
            const aggregationStartTime = performance.now();
            console.log(`⏰ [ChartRenderer-${chartConfig.title}] Applying time aggregation...`);
            
            setRawData(normalizedData);
            
            // Apply initial time aggregation if filter is set
            const timeFilterValue = filterValues['timeFilter'];
            if (timeFilterValue) {
              const { xAxis, yAxis } = chartConfig.dataMapping;
              const xField = Array.isArray(xAxis) ? xAxis[0] : xAxis;
              
              let yFields: string[] = [];
              if (Array.isArray(yAxis)) {
                yFields = yAxis.map(field => getFieldFromYAxisConfig(field));
              } else {
                yFields = [getFieldFromYAxisConfig(yAxis)];
              }
              
              const aggregatedData = aggregateDataByTimePeriod(normalizedData, timeFilterValue, xField, yFields, chartConfig.dataMapping.groupBy);
              setData(aggregatedData);
              
              const aggregationTime = performance.now() - aggregationStartTime;
              console.log(`✅ [ChartRenderer-${chartConfig.title}] Time aggregation complete (${aggregationTime.toFixed(2)}ms) - ${aggregatedData.length} rows`);
            } else {
              setData(normalizedData);
            }
          } else {
            setData(normalizedData);
          }
          
          const preloadTime = performance.now() - preloadStartTime;
          const totalEffectTime = performance.now() - effectStartTime;
          console.log(`✅ [ChartRenderer-${chartConfig.title}] Preloaded data processed (${preloadTime.toFixed(2)}ms) - Total effect time: ${totalEffectTime.toFixed(2)}ms`);
          
        } catch (error) {
          const errorTime = performance.now() - effectStartTime;
          console.error(`❌ [ChartRenderer-${chartConfig.title}] Error processing preloaded data (${errorTime.toFixed(2)}ms):`, error);
          setError(`Error processing preloaded data: ${error instanceof Error ? error.message : String(error)}`);
        }
      };
      
      normalizePreloadedData();
      return;
    }
    
    // Create a stringified version of the data mapping for dependency comparison
    const dataMappingKey = JSON.stringify({
      xAxis: chartConfig.dataMapping.xAxis,
      yAxis: chartConfig.dataMapping.yAxis,
      groupBy: chartConfig.dataMapping.groupBy
    });
    
    // Create an AbortController to cancel fetch requests when component unmounts
    const controller = new AbortController();
    const signal = controller.signal;
    
    const fetchData = async () => {
      const apiStartTime = performance.now();
      console.log(`🌐 [ChartRenderer-${chartConfig.title}] Starting API data fetch...`);
      
      try {
        setError(null);
        
        // Prepare filters for the request
        const fetchFiltersStartTime = performance.now();
        console.log(`🔍 [ChartRenderer-${chartConfig.title}] Preparing filters...`);
        
        const cleanFilters = Object.fromEntries(
          Object.entries(filterValues).filter(([_, value]) => {
            return value !== null && value !== undefined && value !== '';
          })
        );
        
        const fetchFiltersTime = performance.now() - fetchFiltersStartTime;
        console.log(`✅ [ChartRenderer-${chartConfig.title}] Filters prepared (${fetchFiltersTime.toFixed(2)}ms) - ${Object.keys(cleanFilters).length} filters`);
        
        // Make the API request
        const requestStartTime = performance.now();
        console.log(`📡 [ChartRenderer-${chartConfig.title}] Making API request to ${chartConfig.apiEndpoint}...`);
        
        const response = await fetch(chartConfig.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanFilters),
          signal: controller.signal,
        });
        
        const requestTime = performance.now() - requestStartTime;
        console.log(`✅ [ChartRenderer-${chartConfig.title}] API request complete (${requestTime.toFixed(2)}ms) - Status: ${response.status}`);
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        // Parse response data
        const parseStartTime = performance.now();
        console.log(`📝 [ChartRenderer-${chartConfig.title}] Parsing response data...`);
        
        const responseData = await response.json();
        
        const parseTime = performance.now() - parseStartTime;
        console.log(`✅ [ChartRenderer-${chartConfig.title}] Response parsed (${parseTime.toFixed(2)}ms) - ${responseData?.length || 0} rows`);
        
        // Call onDataLoaded callback if provided
        if (onDataLoaded) {
          onDataLoaded(responseData);
        }
        
        // Process data for time aggregation if enabled
        const isTimeAggregationEnabled = chartConfig.additionalOptions?.enableTimeAggregation;
        if (isTimeAggregationEnabled) {
          const aggregationStartTime = performance.now();
          console.log(`⏰ [ChartRenderer-${chartConfig.title}] Processing time aggregation...`);
          
          setRawData(responseData);
          
          // Apply time aggregation if filter is set
          const timeFilterValue = filterValues['timeFilter'];
          if (timeFilterValue) {
            const { xAxis, yAxis } = chartConfig.dataMapping;
            const xField = Array.isArray(xAxis) ? xAxis[0] : xAxis;
            
            let yFields: string[] = [];
            if (Array.isArray(yAxis)) {
              yFields = yAxis.map(field => getFieldFromYAxisConfig(field));
            } else {
              yFields = [getFieldFromYAxisConfig(yAxis)];
            }
            
            const aggregatedData = aggregateDataByTimePeriod(responseData, timeFilterValue, xField, yFields, chartConfig.dataMapping.groupBy);
            setData(aggregatedData);
            
            const aggregationTime = performance.now() - aggregationStartTime;
            console.log(`✅ [ChartRenderer-${chartConfig.title}] Time aggregation complete (${aggregationTime.toFixed(2)}ms) - ${aggregatedData.length} rows`);
          } else {
            setData(responseData);
          }
        } else {
          setData(responseData);
        }
        
        const totalApiTime = performance.now() - apiStartTime;
        const totalEffectTime = performance.now() - effectStartTime;
        
        console.log(`🎯 [ChartRenderer-${chartConfig.title}] API DATA FETCH COMPLETE!`);
        console.log(`⏱️ [ChartRenderer-${chartConfig.title}] API TIMING BREAKDOWN:`);
        console.log(`   🔍 Filter Prep: ${fetchFiltersTime.toFixed(2)}ms (${(fetchFiltersTime/totalApiTime*100).toFixed(1)}%)`);
        console.log(`   📡 Request: ${requestTime.toFixed(2)}ms (${(requestTime/totalApiTime*100).toFixed(1)}%)`);
        console.log(`   📝 Parse: ${parseTime.toFixed(2)}ms (${(parseTime/totalApiTime*100).toFixed(1)}%)`);
        console.log(`   🏁 API Total: ${totalApiTime.toFixed(2)}ms`);
        console.log(`   🏁 Effect Total: ${totalEffectTime.toFixed(2)}ms`);
        
      } catch (error: any) {
        const errorTime = performance.now() - apiStartTime;
        const totalEffectTime = performance.now() - effectStartTime;
        
        if (error.name === 'AbortError') {
          console.log(`🛑 [ChartRenderer-${chartConfig.title}] Request aborted (${errorTime.toFixed(2)}ms)`);
          return;
        }
        
        console.error(`💥 [ChartRenderer-${chartConfig.title}] API error (${errorTime.toFixed(2)}ms, total effect: ${totalEffectTime.toFixed(2)}ms):`, error);
        setError(`Error fetching data: ${error.message || 'Unknown error'}`);
      }
    };
    
    // Only fetch if we have a valid endpoint
    if (chartConfig.apiEndpoint) {
      fetchData();
    } else {
      setError("No API endpoint provided");
    }
    
    // Cleanup function to cancel pending requests when component unmounts
    return () => {
      controller.abort();
    };
  }, [
    chartConfig.apiEndpoint, 
    chartConfig.apiKey, 
    chartConfig.title, 
    JSON.stringify(chartConfig.dataMapping), 
    // For time aggregation charts, exclude time filter from dependencies
    chartConfig.additionalOptions?.enableTimeAggregation 
      ? JSON.stringify(Object.fromEntries(Object.entries(filterValues).filter(([key]) => key !== 'timeFilter')))
      : JSON.stringify(filterValues), 
    isFilterChanged
  ]);

  // Memoize the chart rendering to prevent unnecessary re-renders
  const renderChart = React.useCallback(() => {
    console.log("=== CHART RENDER DEBUG ===");
    console.log("Rendering chart with config:", {
      chartType: chartConfig.chartType,
      isStacked: chartConfig.isStacked,
      title: chartConfig.title,
      xAxis: chartConfig.dataMapping.xAxis,
      yAxis: chartConfig.dataMapping.yAxis,
      groupBy: chartConfig.dataMapping.groupBy
    });
    console.log("Data length:", data.length);
    console.log("First data item:", data[0]);
    
    // Get the unit from the chart config for use with all chart types
    const yAxisUnit = getYAxisUnit(chartConfig.dataMapping.yAxis);
    
    const commonProps = {
      chartConfig,
      data,
      isExpanded,
      onCloseExpanded,
      colorMap: legendColorMap,
      filterValues,
      hiddenSeries,
      yAxisUnit
    };
    
    switch (chartConfig.chartType) {
      case 'line':
      case 'bar':
        // For bar charts, check if stacked mode is enabled FIRST
        if (chartConfig.chartType === 'bar' && chartConfig.isStacked) {
          console.log("=== DECISION: Using StackedBarChart for stacked mode ===");
          return <StackedBarChart 
            {...commonProps}
            displayMode={filterValues['displayMode'] as DisplayMode || 'absolute'}
            onFilterChange={(newFilters: Record<string, string>) => {
              // Apply the filter changes
              Object.entries(newFilters).forEach(([key, value]) => {
                handleFilterChange(key, value);
              });
            }}
          />;
        }
        
        // Then check for multi-series (array) configurations
        if (chartConfig.dataMapping.yAxis && Array.isArray(chartConfig.dataMapping.yAxis)) {
          console.log("=== DECISION: Using MultiSeriesLineBarChart for array yAxis ===");
          return <MultiSeriesLineBarChart 
            {...commonProps}
            onFilterChange={(newFilters: Record<string, string>) => {
              // Apply the filter changes
              Object.entries(newFilters).forEach(([key, value]) => {
                handleFilterChange(key, value);
              });
            }}
          />;
        }
        
        // For simple bar charts (single field, not stacked)
        console.log("=== DECISION: Using SimpleBarChart ===");
        return <SimpleBarChart 
          {...commonProps}
          onFilterChange={(newFilters: Record<string, string>) => {
            // Apply the filter changes
            Object.entries(newFilters).forEach(([key, value]) => {
              handleFilterChange(key, value);
            });
          }}
        />;
        
      case 'dual-axis': // Handle dual-axis with the enhanced BarChart
        return <DualAxisChart 
          {...commonProps}
          onFilterChange={(newFilters: Record<string, string>) => {
            // Apply the filter changes
            Object.entries(newFilters).forEach(([key, value]) => {
              handleFilterChange(key, value);
            });
          }}
        />;
        
      case 'pie':
        return <PieChart 
          {...commonProps}
          onFilterChange={(newFilters: Record<string, string>) => {
            // Apply the filter changes
            Object.entries(newFilters).forEach(([key, value]) => {
              handleFilterChange(key, value);
            });
          }}
        />;
        
      case 'area':
      case 'stacked-area':
        return <SimpleAreaChart 
          {...commonProps}
          isStacked={chartConfig.chartType === 'stacked-area'}
          onFilterChange={(newFilters: Record<string, string>) => {
            console.log('ChartRenderer: SimpleAreaChart filter change callback triggered:', newFilters);
            // Apply the filter changes
            Object.entries(newFilters).forEach(([key, value]) => {
              console.log(`ChartRenderer: Processing filter from SimpleAreaChart: ${key} = ${value}`);
              handleFilterChange(key, value);
            });
          }}
        />;
        
      default:
        console.warn(`Unsupported chart type: ${chartConfig.chartType}`);
        return null;
    }
  }, [chartConfig, data, isExpanded, onCloseExpanded, legendColorMap, filterValues, hiddenSeries]);

  // Implement logic to extract the unit from yAxis when necessary
  const getYAxisUnit = (yAxis: string | YAxisConfig | (string | YAxisConfig)[]): string | undefined => {
    // Check if we're using a dataMapping.yAxisUnit field (single field mode)
    if (chartConfig.dataMapping.yAxisUnit) {
      return chartConfig.dataMapping.yAxisUnit;
    }
    
    // Otherwise try to get unit from YAxisConfig objects if available
    if (Array.isArray(yAxis) && yAxis.length > 0 && typeof yAxis[0] !== 'string') {
      return (yAxis[0] as YAxisConfig).unit;
    }
    
    // Handle single YAxisConfig
    if (typeof yAxis !== 'string' && !Array.isArray(yAxis)) {
      return yAxis.unit;
    }
    
    // No unit specified
    return undefined;
  };

  if (error) {
    console.log("=== ERROR STATE ===", error);
    console.log("Data available despite error:", data.length);
    
    // Don't return early if we have data to show
    if (data.length === 0) {
      return (
        <div className="p-4 rounded-md">
          <div className="flex">
            
          </div>
        </div>
      );
    }
    
  
  }

  // Render expanded modal view if isExpanded is true
  if (isExpanded) {
    return (
      <Modal 
        isOpen={isExpanded} 
        onClose={onCloseExpanded || (() => {})} 
        title={chartConfig.title}
        subtitle={chartConfig.subtitle}
        isLoading={isLoading}
      >
        <div className="h-[70vh] w-full relative">
          {/* Add filter controls in modal */}
          {chartConfig.additionalOptions?.filters && (
            <div className="flex flex-wrap gap-3 items-center mb-4 px-2">
              {/* Time Filter */}
              {chartConfig.additionalOptions.filters.timeFilter && (
                <TimeFilterSelector
                  value={filterValues['timeFilter'] || chartConfig.additionalOptions.filters.timeFilter.options[0]}
                  onChange={(value) => handleFilterChange('timeFilter', value)}
                  options={chartConfig.additionalOptions.filters.timeFilter.options.map((value: string) => ({ 
                    value, 
                    label: value 
                  }))}
                />
              )}
              
              {/* Currency Filter */}
              {chartConfig.additionalOptions.filters.currencyFilter && (
                <CurrencyFilter
                  currency={filterValues['currencyFilter'] || chartConfig.additionalOptions.filters.currencyFilter.options[0]}
                  options={chartConfig.additionalOptions.filters.currencyFilter.options}
                  onChange={(value) => handleFilterChange('currencyFilter', value)}
                />
              )}
              
              {/* Display Mode Filter */}
              {chartConfig.additionalOptions.filters.displayModeFilter && (
                <DisplayModeFilter
                  mode={filterValues['displayModeFilter'] as DisplayMode || chartConfig.additionalOptions.filters.displayModeFilter.options[0] as DisplayMode}
                  onChange={(value) => handleFilterChange('displayModeFilter', value)}
                />
              )}
            </div>
          )}
          
          {/* Chart container with proper containment */}
          <div className="h-full w-full">
            {renderChart()}
          </div>
        </div>
      </Modal>
    );
  }

  // Render the regular chart
  return renderChart();
});

export default ChartRenderer; 