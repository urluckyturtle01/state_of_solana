import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  // Add callback for modal filter updates
  onModalFilterUpdate?: (filters: Record<string, string>) => void;
}

// Add helper function at the top of the file
function getFieldFromYAxisConfig(field: string | YAxisConfig): string {
  return typeof field === 'string' ? field : field.field;
}

// Add utility function to detect if x-axis values are integers in order OR dates
function shouldLimitXAxisTicks(data: any[], xField: string): boolean {
  if (!data || data.length < 2) return false;
  
  const xValues = data.map(item => item[xField]);
  const firstValue = xValues[0];
  
  // Check if data contains dates
  if (typeof firstValue === 'string') {
    const isDateData = /^\d{4}-\d{2}-\d{2}/.test(firstValue) || 
                      /^\d{2}\/\d{2}\/\d{4}/.test(firstValue) ||
                      /^\d{1,2}-[A-Za-z]{3}-\d{4}/.test(firstValue) ||
                      /^[A-Za-z]{3}\s\d{4}$/.test(firstValue) || 
                      /^\d{4}$/.test(firstValue);
    
    if (isDateData) {
      return true; // Limit ticks for date data
    }
  }
  
  // Check if all x-axis values are integers in order
  const areAllIntegers = xValues.every(value => {
    const num = Number(value);
    return Number.isInteger(num) && !isNaN(num);
  });
  
  if (!areAllIntegers) return false; // Don't limit for text strings
  
  // Check if values are in order (ascending or descending)
  const numericValues = xValues.map(val => Number(val));
  const isAscending = numericValues.every((val, i) => i === 0 || val >= numericValues[i - 1]);
  const isDescending = numericValues.every((val, i) => i === 0 || val <= numericValues[i - 1]);
  
  return isAscending || isDescending; // Limit ticks for integer sequences
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
  preloadedData,
  onModalFilterUpdate
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
      console.log('ChartRenderer: Setting preloaded data for chart:', chartConfig.title);
      console.log('Time aggregation enabled:', chartConfig.additionalOptions?.enableTimeAggregation);
      console.log('Preloaded data length:', preloadedData.length);
      
      const isTimeAggregationEnabled = chartConfig.additionalOptions?.enableTimeAggregation;
      
      if (isTimeAggregationEnabled) {
        // For time aggregation charts, store preloadedData as rawData
        // and let the aggregation logic process it into data
        setRawData(preloadedData);
        console.log('ChartRenderer: Set rawData for time aggregation, length:', preloadedData.length);
        
        // Don't set data directly - let the time aggregation effect handle it
        // The time aggregation effect will process rawData into data based on current filter values
      } else {
        // For regular charts, set preloadedData as final data
        setData(preloadedData);
        console.log('ChartRenderer: Set data directly for non-time-aggregation chart');
      }
      
      setError(null);
    }
  }, [preloadedData, chartConfig.additionalOptions?.enableTimeAggregation, chartConfig.title]);

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
    // Check if this is a stacked chart with multiple y-fields but no groupBy field
    const isMultiYFieldStacked = chartConfig.isStacked && yFields.length > 1 && !groupByField;
    console.log('Time aggregation for stacked chart with groupBy:', isStackedWithGroupBy, 'groupBy field:', groupByField);
    console.log('Time aggregation for multi y-field stacked chart:', isMultiYFieldStacked, 'yFields count:', yFields.length);
    
    // Debug logging for the problematic case
    if (isMultiYFieldStacked) {
      console.log('🔧 MULTI Y-FIELD STACKED CHART DEBUG:', {
        chartTitle: chartConfig.title,
        timePeriod,
        yFields,
        rawDataSample: rawData.slice(0, 3),
        xField,
        isStacked: chartConfig.isStacked
      });
    }
    
    // Get percentage field configurations from chart config
    const percentageFieldConfigs = chartConfig.additionalOptions?.percentageFields || [];
    
    // Helper function to get the unit for a field from chart configuration
    const getFieldUnit = (fieldName: string): string | undefined => {
      // Check single y-axis unit
      if (typeof chartConfig.dataMapping.yAxis === 'string' && chartConfig.dataMapping.yAxis === fieldName) {
        return chartConfig.dataMapping.yAxisUnit;
      }
      
      // Check multi y-axis configurations
      if (Array.isArray(chartConfig.dataMapping.yAxis)) {
        for (const yAxisItem of chartConfig.dataMapping.yAxis) {
          if (typeof yAxisItem === 'object' && yAxisItem.field === fieldName) {
            return yAxisItem.unit;
          }
        }
      }
      
      return undefined;
    };
    
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
      // For stacked charts with multiple y-fields but no groupBy, use just time key (data will be properly aggregated)
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
      
      // Aggregate values - for cumulative data use max, for percentage data use weighted average, for additive data use sum
      yFields.forEach(field => {
        if (item[field] !== undefined && item[field] !== null) {
          const value = Number(item[field]) || 0;
          
          // Detect cumulative fields by name patterns - be more specific to avoid false positives
          const fieldLower = field.toLowerCase();
          const isCumulative = fieldLower.includes('cumulative') || 
                              (fieldLower.includes('supply') && !fieldLower.includes('revenue') && !fieldLower.includes('volume') && !fieldLower.includes('fees')) ||
                              fieldLower.includes('marketcap') ||
                              fieldLower.includes('market_cap') ||
                              fieldLower === 'total' ||  // Only exact 'total' field, not fields containing 'total'
                              fieldLower.endsWith('_total') ||  // Fields ending with _total
                              fieldLower.startsWith('total_supply') ||  // Total supply fields
                              fieldLower.startsWith('total_market'); // Total market fields
          
          // Debug logging for field classification in multi y-field stacked charts
          if (isMultiYFieldStacked && timePeriod !== 'D') {
            console.log(`🔧 Field classification for "${field}":`, {
              isCumulative,
              fieldLower,
              matchedPatterns: {
                cumulative: fieldLower.includes('cumulative'),
                supply: fieldLower.includes('supply') && !fieldLower.includes('revenue') && !fieldLower.includes('volume') && !fieldLower.includes('fees'),
                marketcap: fieldLower.includes('marketcap') || fieldLower.includes('market_cap'),
                exactTotal: fieldLower === 'total',
                endsWithTotal: fieldLower.endsWith('_total'),
                totalSupply: fieldLower.startsWith('total_supply'),
                totalMarket: fieldLower.startsWith('total_market')
              },
              value,
              aggregationMethod: isCumulative ? 'MAX' : 'SUM'
            });
          }
          
          // Check if this field is configured as a percentage field with source fields
          const percentageConfig = percentageFieldConfigs.find(config => config.field === field);
          
          // Check if this field has percentage unit (% symbol) - for standalone percentage fields
          const fieldUnit = getFieldUnit(field);
          const isStandalonePercentage = !percentageConfig && fieldUnit === '%';
          
          if (isCumulative) {
            // For cumulative data, use the maximum (latest) value in the period
            groupedData[groupKey][field] = Math.max(groupedData[groupKey][field], value);
          } else if (percentageConfig) {
            // For configured percentage fields, store numerator and denominator sums
            const numeratorValue = Number(item[percentageConfig.numeratorField]) || 0;
            const denominatorValue = Number(item[percentageConfig.denominatorField]) || 0;
            
            if (!groupedData[groupKey][`_${field}_numerator_sum`]) {
              groupedData[groupKey][`_${field}_numerator_sum`] = 0;
              groupedData[groupKey][`_${field}_denominator_sum`] = 0;
            }
            groupedData[groupKey][`_${field}_numerator_sum`] += numeratorValue;
            groupedData[groupKey][`_${field}_denominator_sum`] += denominatorValue;
          } else if (isStandalonePercentage) {
            // For standalone percentage fields (detected by % unit), use simple average
            if (!groupedData[groupKey][`_${field}_sum`]) {
              groupedData[groupKey][`_${field}_sum`] = 0;
              groupedData[groupKey][`_${field}_count`] = 0;
            }
            groupedData[groupKey][`_${field}_sum`] += value;
            groupedData[groupKey][`_${field}_count`] += 1;
          } else {
            // For additive data, sum the values
            groupedData[groupKey][field] += value;
          }
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
        // Calculate averages for percentage fields
        yFields.forEach(field => {
          // Check if this field is configured as a percentage field with source fields
          const percentageConfig = percentageFieldConfigs.find(config => config.field === field);
          
          // Check if this field has percentage unit (% symbol) - for standalone percentage fields
          const fieldUnit = getFieldUnit(field);
          const isStandalonePercentage = !percentageConfig && fieldUnit === '%';
          
          if (percentageConfig && item[`_${field}_denominator_sum`] > 0) {
            // Calculate weighted average for configured percentage field
            const numeratorSum = item[`_${field}_numerator_sum`];
            const denominatorSum = item[`_${field}_denominator_sum`];
            const weightedAverage = (numeratorSum / denominatorSum) * 100;
            item[field] = Number(weightedAverage.toFixed(2));
          } else if (isStandalonePercentage && item[`_${field}_count`] > 0) {
            // Calculate simple average for standalone percentage field (detected by % unit)
            const average = item[`_${field}_sum`] / item[`_${field}_count`];
            item[field] = Number(average.toFixed(2));
          }
        });
        
        // Remove internal fields after sorting and percentage calculations
        const fieldsToRemove = ['_count', '_firstDate'];
        yFields.forEach(field => {
          // Check if this field is configured as a percentage field with source fields
          const percentageConfig = percentageFieldConfigs.find(config => config.field === field);
          
          // Check if this field has percentage unit (% symbol) - for standalone percentage fields
          const fieldUnit = getFieldUnit(field);
          const isStandalonePercentage = !percentageConfig && fieldUnit === '%';
          
          if (percentageConfig) {
            fieldsToRemove.push(`_${field}_numerator_sum`, `_${field}_denominator_sum`);
          } else if (isStandalonePercentage) {
            fieldsToRemove.push(`_${field}_sum`, `_${field}_count`);
          }
        });
        
        const cleanItem = { ...item };
        fieldsToRemove.forEach(fieldToRemove => {
          delete cleanItem[fieldToRemove];
        });
        
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
    
    // Debug logging for multi y-field stacked charts
    if (isMultiYFieldStacked && aggregatedData.length > 0) {
      console.log(`🔧 MULTI Y-FIELD STACKED aggregation result (${timePeriod}):`, {
        totalRows: aggregatedData.length,
        uniqueTimeValues: [...new Set(aggregatedData.map(item => item[xField]))].length,
        yFields: yFields,
        sample: aggregatedData.slice(0, 3),
        firstItemFields: Object.keys(aggregatedData[0]),
        originalDataLength: rawData.length
      });
    }
    
    // Debug logging for quarterly data sorting
    if (timePeriod === 'Q' && aggregatedData.length > 0) {
      console.log('Quarterly aggregation result:', aggregatedData.map(item => item[xField]));
    }
    
          // console.log(`Aggregated to ${aggregatedData.length} data points for period ${timePeriod}`);
    return aggregatedData;
  };

  // Effect to initialize filters and apply default time aggregation
  useEffect(() => {
    console.log('=== FILTER INITIALIZATION EFFECT ===');
    console.log('Chart ID:', chartConfig.id);
    console.log('External filter values:', externalFilterValues);
    console.log('Current raw data length:', rawData.length);
    console.log('Current data length:', data.length);
    console.log('Time aggregation enabled:', chartConfig.additionalOptions?.enableTimeAggregation);
    console.log('Has preloaded data:', !!preloadedData && preloadedData.length > 0);
    
    // Always use external filter values when provided
    if (externalFilterValues) {
      console.log('Using external filter values, updating internal state');
      setInternalFilterValues(externalFilterValues);
      
      // For time aggregation enabled charts, apply aggregation with external filter values
      // BUT ONLY if we have rawData (don't trigger API calls)
      const isTimeAggregationEnabled = chartConfig.additionalOptions?.enableTimeAggregation;
      const timeFilterValue = externalFilterValues['timeFilter'];
      
      if (isTimeAggregationEnabled && timeFilterValue && rawData.length > 0) {
        console.log('ChartRenderer: Applying time aggregation with external filter:', timeFilterValue);
        
        const { xAxis, yAxis } = chartConfig.dataMapping;
        const xField = Array.isArray(xAxis) ? xAxis[0] : xAxis;
        
        let yFields: string[] = [];
        if (Array.isArray(yAxis)) {
          yFields = yAxis.map(field => getFieldFromYAxisConfig(field));
        } else {
          yFields = [getFieldFromYAxisConfig(yAxis)];
        }
        
        const aggregatedData = aggregateDataByTimePeriod(rawData, timeFilterValue, xField, yFields, chartConfig.dataMapping.groupBy);
        setData(aggregatedData);
        
        if (onDataLoaded) {
          onDataLoaded(aggregatedData);
        }
      }
      
      return;
    }

    const initialFilters: Record<string, string> = {};
    
    // Extract initial filter values from chart config
    if (chartConfig.additionalOptions?.filters) {
      // Set time filter - default to 'M' if available, otherwise first option
      if (chartConfig.additionalOptions.filters.timeFilter &&
          Array.isArray(chartConfig.additionalOptions.filters.timeFilter.options) &&
          chartConfig.additionalOptions.filters.timeFilter.options.length > 0) {
        const timeOptions = chartConfig.additionalOptions.filters.timeFilter.options;
        const defaultValue = timeOptions.includes('M') ? 'M' : timeOptions[0];
        initialFilters['timeFilter'] = defaultValue;
        console.log('Setting default time filter to:', defaultValue, 'from options:', timeOptions);
      }
      
      // Set currency filter
      if (chartConfig.additionalOptions.filters.currencyFilter &&
          Array.isArray(chartConfig.additionalOptions.filters.currencyFilter.options) &&
          chartConfig.additionalOptions.filters.currencyFilter.options.length > 0) {
        initialFilters['currencyFilter'] = chartConfig.additionalOptions.filters.currencyFilter.options[0];
        console.log('Setting default currency filter to:', initialFilters['currencyFilter']);
      }
      
      // Set display mode filter
      if (chartConfig.additionalOptions.filters.displayModeFilter &&
          Array.isArray(chartConfig.additionalOptions.filters.displayModeFilter.options) &&
          chartConfig.additionalOptions.filters.displayModeFilter.options.length > 0) {
        initialFilters['displayModeFilter'] = chartConfig.additionalOptions.filters.displayModeFilter.options[0];
        console.log('Setting default display mode filter to:', initialFilters['displayModeFilter']);
      }
    }
    
    console.log('Setting internal filter values to:', initialFilters);
    setInternalFilterValues(initialFilters);
    
    // For time aggregation enabled charts, trigger immediate re-aggregation when default filter is set
    const isTimeAggregationEnabled = chartConfig.additionalOptions?.enableTimeAggregation;
    const defaultTimeFilter = initialFilters['timeFilter'];
    
    console.log('Time aggregation check:', {
      isTimeAggregationEnabled,
      defaultTimeFilter,
      rawDataLength: rawData.length,
      hasChartMapping: !!chartConfig.dataMapping
    });
    
    if (isTimeAggregationEnabled && defaultTimeFilter && rawData.length > 0) {
      console.log('ChartRenderer: Applying time aggregation for default filter:', defaultTimeFilter);
      
      const { xAxis, yAxis } = chartConfig.dataMapping;
      const xField = Array.isArray(xAxis) ? xAxis[0] : xAxis;
      
      let yFields: string[] = [];
      if (Array.isArray(yAxis)) {
        yFields = yAxis.map(field => getFieldFromYAxisConfig(field));
      } else {
        yFields = [getFieldFromYAxisConfig(yAxis)];
      }
      
      console.log('Aggregating with fields:', { xField, yFields, groupBy: chartConfig.dataMapping.groupBy });
      const aggregatedData = aggregateDataByTimePeriod(rawData, defaultTimeFilter, xField, yFields, chartConfig.dataMapping.groupBy);
      console.log('Aggregation result:', aggregatedData.length, 'items, sample:', aggregatedData[0]);
      setData(aggregatedData);
      
      if (onDataLoaded) {
        onDataLoaded(aggregatedData);
      }
    } else if (isTimeAggregationEnabled && defaultTimeFilter && rawData.length === 0) {
      console.log('ChartRenderer: Time aggregation enabled with default filter, but no raw data yet. Will trigger when rawData loads.');
    }
  }, [chartConfig.id, externalFilterValues, rawData]);

  // Handle filter change
  const handleFilterChange = useCallback((key: string, value: string) => {
    console.log(`ChartRenderer: Filter changed: ${key} = ${value}`);
    
      const updatedFilters = {
      ...internalFilterValues,
      [key]: value
      };
      
        setInternalFilterValues(updatedFilters);
    
      if (onFilterChange) {
      onFilterChange(key, value);
      }
    
    if (isExpanded && onModalFilterUpdate) {
      onModalFilterUpdate(updatedFilters);
    }
  }, [internalFilterValues, onFilterChange, isExpanded, onModalFilterUpdate]);

  // Effect to handle client-side time aggregation when time filter changes or rawData becomes available
  useEffect(() => {
    const isTimeAggregationEnabled = chartConfig.additionalOptions?.enableTimeAggregation;
    const timeFilterValue = filterValues['timeFilter'];
    
    if (isTimeAggregationEnabled && timeFilterValue && rawData.length > 0) {
      console.log('ChartRenderer: Applying client-side time aggregation:', timeFilterValue);
      
      const { xAxis, yAxis } = chartConfig.dataMapping;
      const xField = Array.isArray(xAxis) ? xAxis[0] : xAxis;
      
      let yFields: string[] = [];
      if (Array.isArray(yAxis)) {
        yFields = yAxis.map(field => getFieldFromYAxisConfig(field));
      } else {
        yFields = [getFieldFromYAxisConfig(yAxis)];
      }
      
      try {
        const aggregatedData = aggregateDataByTimePeriod(
          rawData, 
          timeFilterValue, 
          xField, 
          yFields,
          chartConfig.dataMapping.groupBy ? getFieldFromYAxisConfig(chartConfig.dataMapping.groupBy) : undefined
        );
        
        console.log('ChartRenderer: Time aggregation completed:', {
          originalDataLength: rawData.length,
          aggregatedDataLength: aggregatedData.length,
          timePeriod: timeFilterValue
        });
        
        setData(aggregatedData);
      } catch (error) {
        console.error('ChartRenderer: Time aggregation failed:', error);
      }
    }
  }, [rawData, filterValues['timeFilter'], chartConfig.additionalOptions?.enableTimeAggregation]);

  // Additional effect to ensure data is processed when rawData first becomes available
  useEffect(() => {
    const isTimeAggregationEnabled = chartConfig.additionalOptions?.enableTimeAggregation;
    const timeFilterValue = filterValues['timeFilter'];
    
    // Only trigger if we have both rawData and a time filter, and current data is empty
    if (isTimeAggregationEnabled && timeFilterValue && rawData.length > 0 && data.length === 0) {
      console.log('ChartRenderer: rawData loaded, applying current filter:', timeFilterValue);
      
      const { xAxis, yAxis } = chartConfig.dataMapping;
      const xField = Array.isArray(xAxis) ? xAxis[0] : xAxis;
      
      let yFields: string[] = [];
      if (Array.isArray(yAxis)) {
        yFields = yAxis.map(field => getFieldFromYAxisConfig(field));
      } else {
        yFields = [getFieldFromYAxisConfig(yAxis)];
      }
      
      try {
        const aggregatedData = aggregateDataByTimePeriod(
          rawData, 
          timeFilterValue, 
          xField, 
          yFields,
          chartConfig.dataMapping.groupBy ? getFieldFromYAxisConfig(chartConfig.dataMapping.groupBy) : undefined
        );
        
        console.log('ChartRenderer: Initial rawData processing completed');
        setData(aggregatedData);
      } catch (error) {
        console.error('ChartRenderer: Initial rawData processing failed:', error);
      }
    }
  }, [rawData, filterValues['timeFilter'], data.length, chartConfig.additionalOptions?.enableTimeAggregation]);

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
    // PRIORITY CHECK: Handle preloaded data with field normalization - NO API CALLS
    if (preloadedData && preloadedData.length > 0) {
      console.log(`✅ PRELOADED DATA: ${chartConfig.title} (${preloadedData.length} rows) - SKIPPING ALL API CALLS`);
      
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
            console.log('Normalizing preloaded data field names...');
            normalizedData = preloadedData.map(item => {
              const normalizedItem = { ...item };
              
              // Normalize x-axis fields
              for (const field of xAxisFields) {
                const matchingField = findMatchingField(item, field);
                if (matchingField && matchingField !== field) {
                  normalizedItem[field] = item[matchingField];
                  console.log(`Normalized field: ${matchingField} -> ${field}`);
                }
              }
              
              // Normalize y-axis fields
              for (const field of yAxisFields) {
                const matchingField = findMatchingField(item, field);
                if (matchingField && matchingField !== field) {
                  normalizedItem[field] = item[matchingField];
                  console.log(`Normalized field: ${matchingField} -> ${field}`);
                }
              }
              
              // Normalize group by field if needed
              if (groupBy && (chartConfig.chartType.includes('stacked') || chartConfig.isStacked)) {
                const matchingGroupField = findMatchingField(item, groupBy);
                if (matchingGroupField && matchingGroupField !== groupBy) {
                  normalizedItem[groupBy] = item[matchingGroupField];
                  console.log(`Normalized field: ${matchingGroupField} -> ${groupBy}`);
                }
              }
              
              return normalizedItem;
            });
          }
          
          // Call onDataLoaded callback if provided
          if (onDataLoaded) {
            onDataLoaded(normalizedData);
          }
          
          // For time aggregation, store raw data and apply initial aggregation
          const isTimeAggregationEnabled = chartConfig.additionalOptions?.enableTimeAggregation;
          if (isTimeAggregationEnabled) {
            setRawData(normalizedData);
            console.log('Stored raw preloaded data for time aggregation');
            
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
            } else {
              setData(normalizedData);
            }
          } else {
            setData(normalizedData);
          }
          console.log('Preloaded data normalized and set successfully');
          
        } catch (error) {
          console.error('Error processing preloaded data:', error);
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
      setError(null);
      
      // Variable to hold our parsed data
      let parsedData: any[] = [];
      
      try {
        // Skip API call if using the same endpoint with the same mapping and no filter changes
        // For time aggregation charts, exclude time filter from cache key since it's client-side only
        const isTimeAggregationEnabled = chartConfig.additionalOptions?.enableTimeAggregation;
        let cacheFilterValues = filterValues;
        if (isTimeAggregationEnabled) {
          // Remove timeFilter from cache key for time aggregation charts
          cacheFilterValues = Object.fromEntries(
            Object.entries(filterValues).filter(([key]) => key !== 'timeFilter')
          );
        }
        const cacheKey = `${chartConfig.apiEndpoint}-${dataMappingKey}-${JSON.stringify(cacheFilterValues)}`;
        // Skip sessionStorage cache check if we have preloaded data - it's faster and more reliable
        const cachedData = (!preloadedData || preloadedData.length === 0) && !isFilterChanged 
          ? sessionStorage.getItem(cacheKey) 
          : null;
        
        if (cachedData) {
          console.log('Using sessionStorage cached data for', chartConfig.title);
          parsedData = JSON.parse(cachedData);
        } else {
          // Create URL with API key if provided
          let apiUrl;
          try {
            apiUrl = new URL(chartConfig.apiEndpoint);
            // Add API key to URL for both GET and POST requests
            if (chartConfig.apiKey) {
              // Check if the apiKey contains max_age parameter
              const apiKeyValue = chartConfig.apiKey.trim();
              
              if (apiKeyValue.includes('&max_age=')) {
                // Split by &max_age= and add each part separately
                const [baseApiKey, maxAgePart] = apiKeyValue.split('&max_age=');
                if (baseApiKey) {
                  apiUrl.searchParams.append('api_key', baseApiKey.trim());
                }
                if (maxAgePart) {
                  apiUrl.searchParams.append('max_age', maxAgePart.trim());
                }
              } else {
                // Just a regular API key
                apiUrl.searchParams.append('api_key', apiKeyValue);
              }
            }
          } catch (error) {
            throw new Error(`Invalid URL: ${chartConfig.apiEndpoint}`);
          }
          
          // Build parameters object for POST request based on filters
          const parameters: Record<string, any> = {};
          const filterConfig = chartConfig.additionalOptions?.filters;
          const hasFilters = filterConfig !== undefined;
          const isTimeAggregationEnabled = chartConfig.additionalOptions?.enableTimeAggregation;
          const isFieldSwitcherCurrency = filterConfig?.currencyFilter?.type === 'field_switcher';
          
          console.log('=== FILTER DEBUG INFO ===');
          console.log('Chart title:', chartConfig.title);
          console.log('Enable time aggregation:', isTimeAggregationEnabled);
          console.log('Filter config:', filterConfig);
          console.log('Filter values:', filterValues);
          console.log('Has filters:', hasFilters);
          
          if (hasFilters) {
            // Skip time filter parameter if time aggregation is enabled (client-side processing)
            if (filterConfig.timeFilter && filterValues['timeFilter'] && !isTimeAggregationEnabled) {
              parameters[filterConfig.timeFilter.paramName] = filterValues['timeFilter'];
              console.log(`Setting time filter: ${filterConfig.timeFilter.paramName}=${filterValues['timeFilter']}`);
            } else if (filterConfig.timeFilter && 
                     Array.isArray(filterConfig.timeFilter.options) && 
                     filterConfig.timeFilter.options.length > 0 && 
                     !isTimeAggregationEnabled) {
              parameters[filterConfig.timeFilter.paramName] = filterConfig.timeFilter.options[0];
              console.log(`Setting default time filter: ${filterConfig.timeFilter.paramName}=${filterConfig.timeFilter.options[0]}`);
            } else if (isTimeAggregationEnabled && filterConfig.timeFilter) {
              console.log('Skipping time filter parameter - using client-side time aggregation');
            }
            
            // Add currency filter parameter only if not field_switcher type
            if (filterConfig.currencyFilter && filterValues['currencyFilter'] && filterConfig.currencyFilter.type !== 'field_switcher') {
              parameters[filterConfig.currencyFilter.paramName] = filterValues['currencyFilter'];
              console.log(`Setting currency filter: ${filterConfig.currencyFilter.paramName}=${filterValues['currencyFilter']}`);
            } else if (filterConfig.currencyFilter && 
                     Array.isArray(filterConfig.currencyFilter.options) && 
                     filterConfig.currencyFilter.options.length > 0 &&
                     filterConfig.currencyFilter.type !== 'field_switcher') {
              parameters[filterConfig.currencyFilter.paramName] = filterConfig.currencyFilter.options[0];
              console.log(`Setting default currency filter: ${filterConfig.currencyFilter.paramName}=${filterConfig.currencyFilter.options[0]}`);
            } else if (filterConfig.currencyFilter?.type === 'field_switcher') {
              console.log('Skipping currency parameter for field_switcher type - fetching full data');
            }
            
            // Add display mode filter parameter (skip if time aggregation is enabled - client-side processing)
            if (filterConfig.displayModeFilter && filterValues['displayModeFilter'] && !isTimeAggregationEnabled) {
              parameters[filterConfig.displayModeFilter.paramName] = filterValues['displayModeFilter'];
              console.log(`Setting display mode filter: ${filterConfig.displayModeFilter.paramName}=${filterValues['displayModeFilter']}`);
            } else if (filterConfig.displayModeFilter && 
                     Array.isArray(filterConfig.displayModeFilter.options) && 
                     filterConfig.displayModeFilter.options.length > 0 &&
                     !isTimeAggregationEnabled) {
              parameters[filterConfig.displayModeFilter.paramName] = filterConfig.displayModeFilter.options[0];
              console.log(`Setting default display mode filter: ${filterConfig.displayModeFilter.paramName}=${filterConfig.displayModeFilter.options[0]}`);
            } else if (isTimeAggregationEnabled && filterConfig.displayModeFilter) {
              console.log('Skipping display mode filter parameter - using client-side processing with time aggregation');
            }
          }
          
          const hasParameters = Object.keys(parameters).length > 0;
          
          console.log('=== REQUEST DEBUG INFO ===');
          console.log('Parameters object:', parameters);
          console.log('Has parameters:', hasParameters);
          console.log('Request method will be:', hasParameters ? 'POST' : 'GET');
          
          // Set up fetch options
          const options: RequestInit = {
            method: hasParameters ? 'POST' : 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            cache: 'no-store', // Use no-store to ensure we always get fresh data
            signal, // Add abort signal
            // Add a longer timeout for slow connections
            ...{ timeout: 15000 }
          };
          
          // Add body with parameters for POST request
          if (hasParameters) {
            // Format exactly as in the cURL example: {"parameters":{"Date Part":"W"}}
            options.body = JSON.stringify({ parameters });
            console.log(`Fetching data with request body:`, options.body);
          }
          
          console.log(`Fetching data from: ${apiUrl.toString()} with method: ${options.method}`);
          
          // Fetch data from API with timeout and proper error handling
          const response = await fetch(apiUrl.toString(), options);
          
          console.log(`API response status: ${response.status} ${response.statusText}`);
          
          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
          }
          
          const result = await response.json();
          
          console.log(`API response structure:`, Object.keys(result));
          
          // Handle different API response formats
          console.log('Raw API response sample:', JSON.stringify(result, null, 2).substring(0, 500));
          
          // Format 1: Standard Redash format with query_result.data.rows
          if (result?.query_result?.data?.rows) {
            parsedData = result.query_result.data.rows;
            console.log(`Found ${parsedData.length} rows in Redash format`);
          } 
          // Format 2: Direct array response
          else if (Array.isArray(result)) {
            parsedData = result;
            console.log(`Found ${parsedData.length} rows in direct array format`);
          } 
          // Format 3: Data property containing array
          else if (result?.data && Array.isArray(result.data)) {
            parsedData = result.data;
            console.log(`Found ${parsedData.length} rows in data array format`);
          }
          // Format 4: Rows property containing array
          else if (result?.rows && Array.isArray(result.rows)) {
            parsedData = result.rows;
            console.log(`Found ${parsedData.length} rows in rows array format`);
          }
          // Format 5: Results property containing array
          else if (result?.results && Array.isArray(result.results)) {
            parsedData = result.results;
            console.log(`Found ${parsedData.length} rows in results array format`);
          }
          // Format 6: Check for error property
          else if (result?.error) {
            throw new Error(`API returned an error: ${result.error}`);
          }
          else {
            console.error('Unrecognized API response structure:', result);
            console.error('Available keys:', Object.keys(result));
            throw new Error('API response does not have a recognized structure');
          }
          
          // Log sample of parsed data for debugging
          if (parsedData.length > 0) {
            console.log('Parsed data sample:', {
              totalRows: parsedData.length,
              firstRow: parsedData[0],
              availableFields: Object.keys(parsedData[0])
            });
          }
          
          // Cache the result to prevent unnecessary fetches
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(parsedData));
          } catch (e) {
            console.warn('Failed to cache data:', e);
          }
          
          // Reset filter changed flag
          setIsFilterChanged(false);
        }
        
        // Process the data if we have any (either from API or fallback)
        if (parsedData.length > 0 && !signal.aborted) {
          // Log the data for debugging purposes
          console.log('Chart data successfully loaded:', parsedData.slice(0, 2));
          
          // Validate that we can access the required data fields
          try {
            const { xAxis, yAxis, groupBy } = chartConfig.dataMapping;
            const sampleItem = parsedData[0];

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
                throw new Error(`X-axis field "${field}" not found in data. Available fields: ${Object.keys(sampleItem).join(', ')}`);
              }
              if (findMatchingField(sampleItem, field) !== field) {
                needsNormalization = true;
              }
            }
            
            // Check y-axis fields
            for (const field of yAxisFields) {
              if (!fieldExists(sampleItem, field)) {
                throw new Error(`Y-axis field "${field}" not found in data. Available fields: ${Object.keys(sampleItem).join(', ')}`);
              }
              if (findMatchingField(sampleItem, field) !== field) {
                needsNormalization = true;
              }
            }
            
            // Check for group by field if this is a stacked chart
            if (groupBy && (chartConfig.chartType.includes('stacked') || chartConfig.isStacked)) {
              if (!fieldExists(sampleItem, groupBy)) {
                throw new Error(`Group By field "${groupBy}" not found in data. Available fields: ${Object.keys(sampleItem).join(', ')}`);
              }
              if (findMatchingField(sampleItem, groupBy) !== groupBy) {
                needsNormalization = true;
              }
            }
            
            // Normalize the data if needed
            if (needsNormalization) {
              parsedData = parsedData.map(item => {
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
            }
            
            // Call onDataLoaded callback if provided and component is still mounted
            if (onDataLoaded && !signal.aborted) {
              onDataLoaded(parsedData);
            }
            
            // Set data only if component is still mounted
            if (!signal.aborted) {
              // For time aggregation, store raw data and apply aggregation
              const isTimeAggregationEnabled = chartConfig.additionalOptions?.enableTimeAggregation;
              if (isTimeAggregationEnabled) {
                setRawData(parsedData);
                console.log('Stored raw API data for time aggregation');
                
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
                  
                                const aggregatedData = aggregateDataByTimePeriod(parsedData, timeFilterValue, xField, yFields, chartConfig.dataMapping.groupBy);
              setData(aggregatedData);
                } else {
              setData(parsedData);
                }
              } else {
                setData(parsedData);
              }
            }
          } catch (error) {
            if (!signal.aborted) {
              console.error('Error processing data:', error);
              setError(`Error processing data: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        }
      } catch (error) {
        // Only set error if the request wasn't cancelled and component is still mounted
        if (!signal.aborted) {
          console.error('Error fetching chart data:', error);
          
          // More detailed error messages based on error type
          let errorMessage: string;
          
          if (error instanceof Error) {
            // Network errors
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
              errorMessage = `Network error: Unable to reach the API. Check if the endpoint is accessible.`;
            }
            // CORS issues
            else if (error.message.includes('CORS')) {
              errorMessage = `CORS error: The API doesn't allow requests from this origin.`;
            } 
            // API validation errors (like 404, 500, etc.)
            else if (error.message.includes('API request failed with status')) {
              errorMessage = error.message;
            }
            // Default error message
            else {
              errorMessage = error.message;
            }
          } else {
            errorMessage = String(error);
          }
          
          // Use sample data as fallback
          parsedData = getSampleData(
            chartConfig.chartType, 
            chartConfig.dataMapping.groupBy
          );
          
          // Show a warning message but continue with fallback data
          setError(`Using fallback data: ${errorMessage}`);
          console.log('Using fallback data:', parsedData);
          
          // Set the data with the fallback
          if (!signal.aborted) {
            setData(parsedData);
          }
        }
      }
    };
    
    // Only fetch if we have a valid endpoint AND no preloaded data is available
    if (chartConfig.apiEndpoint && (!preloadedData || preloadedData.length === 0)) {
      console.log(`🌐 API CALL: Fetching data for ${chartConfig.title} - no preloaded data available`);
      fetchData();
    } else if (!chartConfig.apiEndpoint) {
      setError("No API endpoint provided");
    } else {
      console.log(`✅ NO API CALL: Skipping API fetch for ${chartConfig.title} - using preloaded data (${preloadedData?.length || 0} rows)`);
    }
    
    // Cleanup function to cancel pending requests when component unmounts
    return () => {
      controller.abort();
    };
  }, [
    // CRITICAL: When preloaded data exists, minimize dependencies to prevent API calls
    ...(preloadedData && preloadedData.length > 0 ? [
      // For preloaded data, only depend on chart config changes, NOT filters
      chartConfig.id,
      chartConfig.title,
      preloadedData.length
    ] : [
      // For API fetching, include all necessary dependencies
      chartConfig.apiEndpoint, 
      chartConfig.apiKey, 
      chartConfig.title, 
      JSON.stringify(chartConfig.dataMapping),
      (chartConfig.additionalOptions?.enableTimeAggregation || chartConfig.additionalOptions?.filters?.currencyFilter?.type === 'field_switcher')
        ? JSON.stringify(Object.fromEntries(Object.entries(filterValues).filter(([key]) => 
            key !== (chartConfig.additionalOptions?.enableTimeAggregation ? 'timeFilter' : '') && 
            key !== (chartConfig.additionalOptions?.filters?.currencyFilter?.type === 'field_switcher' ? 'currencyFilter' : '')
          )))
        : JSON.stringify(filterValues), 
      isFilterChanged
    ])
  ]);

  // Note: Removed cache clearing on mount as it was destroying performance
  // Temp file data should take precedence over cache anyway // Empty dependency array - only run on mount

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
    
    // Detect if x-axis values are integers in order OR dates to limit ticks to 7
    const xField = Array.isArray(chartConfig.dataMapping.xAxis) 
      ? chartConfig.dataMapping.xAxis[0] 
      : chartConfig.dataMapping.xAxis;
    const shouldLimitTicks = shouldLimitXAxisTicks(data, xField);
    
    const commonProps = {
      chartConfig,
      data,
      isExpanded,
      onCloseExpanded,
      colorMap: legendColorMap,
      filterValues,
      hiddenSeries,
      yAxisUnit,
      maxXAxisTicks: shouldLimitTicks ? 7 : undefined
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
            onModalFilterUpdate={onModalFilterUpdate}
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
            onModalFilterUpdate={onModalFilterUpdate}
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
          onModalFilterUpdate={onModalFilterUpdate}
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
          onModalFilterUpdate={onModalFilterUpdate}
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
          onModalFilterUpdate={onModalFilterUpdate}
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
          onModalFilterUpdate={onModalFilterUpdate}
        />;
        
      default:
        console.warn(`Unsupported chart type: ${chartConfig.chartType}`);
        return null;
    }
  }, [chartConfig, data, isExpanded, onCloseExpanded, legendColorMap, filterValues, hiddenSeries]);

  // Implement logic to extract the unit from yAxis when necessary
  const getYAxisUnit = (yAxis: string | YAxisConfig | (string | YAxisConfig)[]): string | undefined => {
    let specifiedUnit: string | undefined;
    
    // Check if we're using a dataMapping.yAxisUnit field (single field mode)
    if (chartConfig.dataMapping.yAxisUnit) {
      specifiedUnit = chartConfig.dataMapping.yAxisUnit;
    }
    // Handle single YAxisConfig (non-array)
    else if (typeof yAxis !== 'string' && !Array.isArray(yAxis)) {
      specifiedUnit = yAxis.unit;
    }
    // For array configurations with multiple fields, check if it's a single-field case
    else if (Array.isArray(yAxis) && yAxis.length === 1 && typeof yAxis[0] !== 'string') {
      specifiedUnit = (yAxis[0] as YAxisConfig).unit;
    }
    
    // If unit is specified in Y axis config, use that regardless of currency filter
    if (specifiedUnit) {
      return specifiedUnit;
    }
    
    // Only apply currency filter fallback for single-field charts
    // Multi-field charts (dual-axis, multi-series) handle their own unit logic per field
    const isMultiFieldChart = Array.isArray(yAxis) && yAxis.length > 1;
    const isDualAxisChart = chartConfig.chartType === 'dual-axis';
    
    if (!isMultiFieldChart && !isDualAxisChart) {
      // If no unit specified in Y axis for single-field charts, fall back to currency filter
      const currencyFilter = filterValues['currencyFilter'];
      if (currencyFilter) {
        return currencyFilter; // Use currency filter value as unit (USD, SOL, etc.)
      }
    }
    
    // For multi-field charts or when no fallback applies, return undefined
    // Let individual chart components handle their own unit logic
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