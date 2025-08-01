"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getChartConfigsByPage } from '../utils';
import ChartCard from '../../components/shared/ChartCard';
import LegendItem from '../../components/shared/LegendItem';
import { ChartConfig, YAxisConfig } from '../types';
import dynamic from 'next/dynamic';
import { getColorByIndex } from '../../utils/chartColors';
import { formatNumber } from '../../utils/formatters';
import TimeFilterSelector from '../../components/shared/filters/TimeFilter';
import CurrencyFilter from '../../components/shared/filters/CurrencyFilter';
import DisplayModeFilter, { DisplayMode } from '../../components/shared/filters/DisplayModeFilter';


// Helper function to extract field name from YAxisConfig or use string directly
function getFieldName(field: string | YAxisConfig): string {
  return typeof field === 'string' ? field : field.field;
}

// Helper function to get default time filter value - prefer 'M' if available
const getDefaultTimeFilterValue = (timeFilterOptions: string[]): string => {
  return timeFilterOptions.includes('M') ? 'M' : timeFilterOptions[0];
};

// Format currency for display
const formatCurrency = (value: number): string => {
  return formatNumber(value);
};

// Function to truncate text with ellipsis
const truncateLabel = (label: string, maxLength: number = 15): string => {
  if (label.length <= maxLength) return label;
  return label.substring(0, maxLength) + '...';
};

// Remove the old dynamic import - using optimized one below

interface DashboardRendererProps {
  pageId: string;
  overrideCharts?: ChartConfig[]; // Add optional prop to override charts
  enableCaching?: boolean; // Add optional prop for enabling caching
  section?: string; // Optional section filter for sectioned pages
}

interface Legend {
  id?: string; // Add optional id field for raw field names
  label: string;
  color: string;
  value?: number;
  shape?: 'circle' | 'square';
}

// Increase parallel batch size for better performance
const PARALLEL_BATCH_SIZE = 8; // Increased from 4 to 8 charts at a time
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours (reduced from 4 hours)
const BACKGROUND_REFRESH_THRESHOLD = 60 * 60 * 1000; // 1 hour - only refresh if data is older than this

// Add a global cache for chart data - shared across all instances
const CHART_DATA_CACHE: Record<string, {
  data: any[];
  timestamp: number;
  expiresIn: number; // expiration time in ms
}> = {};

// Use a global object to cache page configurations - shared across all instances
const PAGE_CONFIG_CACHE: Record<string, {
  charts: ChartConfig[];
  timestamp: number;
  expiresIn: number;
}> = {};

// Optimized ChartRenderer with React.memo and dynamic import
const ChartRenderer = React.memo(dynamic(() => import('./ChartRenderer'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-64 w-full">
      <div className="w-6 h-6 border-2 border-t-blue-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
    </div>
  )
}));

// Enhanced preload charts with better parallel processing
const preloadChartConfigs = async (pageId: string): Promise<ChartConfig[]> => {
  // Check if we have cached charts for this page
  if (PAGE_CONFIG_CACHE[pageId]) {
    const cachedConfig = PAGE_CONFIG_CACHE[pageId];
    const now = Date.now();
    
    // Use cached charts if not expired
    if (now - cachedConfig.timestamp < cachedConfig.expiresIn) {
      console.log(`Using cached chart configs for page ${pageId}`);
      return Promise.resolve(cachedConfig.charts);
    }
  }
  
  try {
    // Try to fetch from temp file first, then fallback to API
    const charts = await getChartConfigsFromTempFile(pageId);
    
    // Cache the charts for future use
    PAGE_CONFIG_CACHE[pageId] = {
      charts,
      timestamp: Date.now(),
      expiresIn: CACHE_DURATION
    };
    
    return charts;
  } catch (error) {
    console.error(`Error preloading charts for page ${pageId}:`, error);
    
    // Return cached charts even if expired in case of error
    if (PAGE_CONFIG_CACHE[pageId]) {
      return PAGE_CONFIG_CACHE[pageId].charts;
    }
    
    return [];
  }
};

// Enhanced batch fetch function with improved parallel execution and error resilience
const batchFetchChartData = async (charts: ChartConfig[], filterValues: Record<string, Record<string, string>>, enableCaching: boolean) => {
  // Process all charts in parallel with larger batch sizes
  const chartPromises = charts.map(chart => {
    const chartFilters = filterValues[chart.id] || {};
    const cacheKey = `${chart.id}-${chart.apiEndpoint}-${JSON.stringify(chartFilters)}`;
    
    // Check cache first
    if (CHART_DATA_CACHE[cacheKey]) {
      const cachedItem = CHART_DATA_CACHE[cacheKey];
      const now = Date.now();
      
      // Use cached data if not expired
      if (now - cachedItem.timestamp < cachedItem.expiresIn) {
        return Promise.resolve({
          chartId: chart.id,
          data: cachedItem.data,
          fromCache: true
        });
      }
    }
    
    // Fetch from API if not in cache
    return fetchChartData(chart, chartFilters, enableCaching)
      .then(data => ({
        chartId: chart.id,
        data,
        fromCache: false
      }))
      .catch(error => {
        console.error(`Error fetching data for chart ${chart.id}:`, error);
        
        // Try to use cached data as fallback if available, even if expired
        if (CHART_DATA_CACHE[cacheKey]) {
          return {
            chartId: chart.id,
            data: CHART_DATA_CACHE[cacheKey].data,
            fromCache: true,
            error
          };
        }
        
        return {
          chartId: chart.id,
          data: [],
          error
        };
      });
  });
  
  // Wait for all chart data fetches to complete in parallel
  const allResults = await Promise.allSettled(chartPromises);
  
  // Process results and handle any failures
  return allResults.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`Failed to fetch data for chart ${charts[index].id}:`, result.reason);
      return {
        chartId: charts[index].id,
        data: [],
        error: result.reason
      };
    }
  });
};

// Simplified fetch function to reduce overhead
const fetchChartData = async (
  chart: ChartConfig, 
  chartFilters: Record<string, string>,
  cacheEnabled: boolean = true
) => {
  const cacheKey = `chart_data_${chart.id}_${chart.apiEndpoint}_${JSON.stringify(chartFilters)}`;
  
  // Skip localStorage check - temp files are faster and more reliable
  
  // Not in localStorage, try memory cache
  const memoryCacheKey = `${chart.id}-${chart.apiEndpoint}-${JSON.stringify(chartFilters)}`;
  if (CHART_DATA_CACHE[memoryCacheKey] && cacheEnabled) {
    const cachedItem = CHART_DATA_CACHE[memoryCacheKey];
    const now = Date.now();
    
    if (now - cachedItem.timestamp < cachedItem.expiresIn) {
      console.log(`Using memory cache for chart ${chart.id}`);
      
      // If data is less than 1 hour old, just return it
      if (now - cachedItem.timestamp < BACKGROUND_REFRESH_THRESHOLD) {
        return cachedItem.data;
      }
      
      // Otherwise refresh in background after returning cached data (only if older than 1 hour)
      setTimeout(() => {
        fetchFromApi(chart, chartFilters, memoryCacheKey, cacheEnabled).catch(console.error);
      }, 1000); // Increased delay to reduce immediate background processing
      
      return cachedItem.data;
    }
  }
  
  // No valid cache, fetch from API
  return fetchFromApi(chart, chartFilters, memoryCacheKey, cacheEnabled);
};

// Extract API fetch logic to reuse in background refresh with optimized timeouts
const fetchFromApi = async (
  chart: ChartConfig, 
  chartFilters: Record<string, string>, 
  cacheKey: string,
  cacheEnabled: boolean = true
): Promise<any[]> => {
  // Use performance monitoring
  const startTime = performance.now();
  
  try {
    const url = new URL(chart.apiEndpoint);
    if (chart.apiKey) {
      // Check if the apiKey contains max_age parameter
      const apiKeyValue = chart.apiKey.trim();
      
      if (apiKeyValue.includes('&max_age=')) {
        // Split by &max_age= and add each part separately
        const [baseApiKey, maxAgePart] = apiKeyValue.split('&max_age=');
        if (baseApiKey) {
          url.searchParams.append('api_key', baseApiKey.trim());
        }
        if (maxAgePart) {
          url.searchParams.append('max_age', maxAgePart.trim());
        }
      } else {
        // Just a regular API key
        url.searchParams.append('api_key', apiKeyValue);
      }
    }
    
    // Build parameters object for POST request
    const parameters: Record<string, any> = {};
    const filterConfig = chart.additionalOptions?.filters;
    
    if (filterConfig) {
      // Add all filter parameters
      if (filterConfig.timeFilter && chartFilters['timeFilter']) {
        parameters[filterConfig.timeFilter.paramName] = chartFilters['timeFilter'];
      }
      
      if (filterConfig.currencyFilter && chartFilters['currencyFilter']) {
        parameters[filterConfig.currencyFilter.paramName] = chartFilters['currencyFilter'];
      }
      
      if (filterConfig.displayModeFilter && chartFilters['displayModeFilter']) {
        parameters[filterConfig.displayModeFilter.paramName] = chartFilters['displayModeFilter'];
      }
    }
    
    // Set up request options with performance optimizations
    const hasParameters = Object.keys(parameters).length > 0;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // Reduced to 3s for faster failure and better UX
    
    const options: RequestInit = {
      method: hasParameters ? 'POST' : 'GET',
      headers: hasParameters ? {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      } : {
        'Accept': 'application/json'
      },
      // Use default caching to avoid CORS preflight issues
      cache: 'default',
      signal: controller.signal
    };
    
    // Add body with parameters for POST request
    if (hasParameters) {
      options.body = JSON.stringify({ parameters });
    }
    
    // Fetch data from API with optimized options
    console.log(`Fetching chart data from API: ${url.toString()}`);
    const response = await fetch(url.toString(), options);
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    const fetchTime = performance.now() - startTime;
    console.log(`Fetched chart data in ${fetchTime.toFixed(2)}ms`);
    
    // Fast extraction of data with minimal processing
    let parsedData: any[] = [];
    
    // Extract data based on API response format with minimal code
    console.log(`API response for chart ${chart.id}:`, {
      responseKeys: Object.keys(result),
      hasQueryResult: !!result?.query_result,
      hasData: !!result?.data,
      hasRows: !!result?.rows,
      hasResults: !!result?.results,
      isArray: Array.isArray(result)
    });
    
    if (result?.query_result?.data?.rows) {
      parsedData = result.query_result.data.rows;
      console.log(`Found ${parsedData.length} rows in Redash format for chart ${chart.id}`);
    }
    else if (Array.isArray(result)) {
      parsedData = result;
      console.log(`Found ${parsedData.length} rows in direct array format for chart ${chart.id}`);
    }
    else if (result?.data && Array.isArray(result.data)) {
      parsedData = result.data;
      console.log(`Found ${parsedData.length} rows in data array format for chart ${chart.id}`);
    }
    else if (result?.rows && Array.isArray(result.rows)) {
      parsedData = result.rows;
      console.log(`Found ${parsedData.length} rows in rows array format for chart ${chart.id}`);
    }
    else if (result?.results && Array.isArray(result.results)) {
      parsedData = result.results;
      console.log(`Found ${parsedData.length} rows in results array format for chart ${chart.id}`);
    }
    else if (result?.error) {
      throw new Error(`API error: ${result.error}`);
    }
    else {
      console.warn('Unknown response format:', Object.keys(result).join(','));
      console.warn('Full response sample:', JSON.stringify(result, null, 2).substring(0, 300));
      throw new Error('Unrecognized API response');
    }
    
    // Log sample of parsed data for debugging
    if (parsedData.length > 0) {
      console.log(`Parsed data sample for chart ${chart.id}:`, {
        totalRows: parsedData.length,
        firstRow: parsedData[0],
        availableFields: Object.keys(parsedData[0])
      });
    }
    
    // Cache the data in memory
    const memoryCacheKey = `${chart.id}-${chart.apiEndpoint}-${JSON.stringify(chartFilters)}`;
    const cacheExpiry = CACHE_DURATION;
    
    CHART_DATA_CACHE[memoryCacheKey] = {
      data: parsedData,
      timestamp: Date.now(),
      expiresIn: cacheExpiry
    };
    
    // Cache in localStorage for persistence across page refreshes
    if (typeof window !== 'undefined' && cacheEnabled) {
      // Use requestIdleCallback for non-blocking localStorage write
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
      try {
        const localStorageKey = `chart_data_${chart.id}_${chart.apiEndpoint}_${JSON.stringify(chartFilters)}`;
        localStorage.setItem(localStorageKey, JSON.stringify({
          data: parsedData,
          timestamp: Date.now(),
          expires: Date.now() + cacheExpiry,
          apiUrl: url.toString()
        }));
      } catch (e) {
        console.warn('Error caching to localStorage:', e);
          }
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          try {
            const localStorageKey = `chart_data_${chart.id}_${chart.apiEndpoint}_${JSON.stringify(chartFilters)}`;
            localStorage.setItem(localStorageKey, JSON.stringify({
              data: parsedData,
              timestamp: Date.now(),
              expires: Date.now() + cacheExpiry,
              apiUrl: url.toString()
            }));
          } catch (e) {
            console.warn('Error caching to localStorage:', e);
          }
        }, 0);
      }
    }
    
    return parsedData;
  } catch (error) {
    const fetchTime = performance.now() - startTime;
    console.error(`Error fetching chart data (${fetchTime.toFixed(2)}ms):`, error);
    
    // Always check both caches as fallback on fetch error
    
    // Try memory cache first
    const memoryCacheKey = `${chart.id}-${chart.apiEndpoint}-${JSON.stringify(chartFilters)}`;
    if (CHART_DATA_CACHE[memoryCacheKey]) {
      console.log(`Using memory cache as fallback for chart ${chart.id}`);
      return CHART_DATA_CACHE[memoryCacheKey].data;
    }
    
    // Try localStorage as last resort
    if (typeof window !== 'undefined') {
      try {
        const localStorageKey = `chart_data_${chart.id}_${chart.apiEndpoint}_${JSON.stringify(chartFilters)}`;
        const cachedData = localStorage.getItem(localStorageKey);
        
        if (cachedData) {
          const parsedCache = JSON.parse(cachedData);
          console.log(`Using localStorage as emergency fallback for chart ${chart.id}`);
          return parsedCache.data;
        }
      } catch (e) {
        console.warn('Error reading from localStorage:', e);
      }
    }
    
    // If all caches fail, return empty array instead of throwing
    console.warn(`No cache available for chart ${chart.id}, returning empty data`);
    return [];
  }
};

// Add isStackedBarChart function back
function isStackedBarChart(chart: ChartConfig): boolean {
  return chart.chartType === 'stacked-bar' || 
         (chart.chartType === 'bar' && chart.isStacked === true);
}

// Add SessionStorage utils to persist state between page navigations
const SessionStorageCache = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    try {
      const value = sessionStorage.getItem(`dashboard_${key}`);
      return value ? JSON.parse(value) : null;
    } catch (e) {
      console.warn('Failed to get from sessionStorage:', e);
      return null;
    }
  },
  
  setItem: (key: string, value: any) => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(`dashboard_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('Failed to set to sessionStorage:', e);
    }
  }
};

// Memoized components for better performance
const MemoizedChartCard = React.memo(ChartCard);
const MemoizedLegendItem = React.memo(LegendItem);
const MemoizedTimeFilterSelector = React.memo(TimeFilterSelector);
const MemoizedCurrencyFilter = React.memo(CurrencyFilter);
const MemoizedDisplayModeFilter = React.memo(DisplayModeFilter);

// Modified function to load charts from temp files
async function getChartConfigsFromTempFile(pageId: string): Promise<ChartConfig[]> {
  try {
    console.log(`Getting charts for page from temp file: ${pageId}`);
    
    // Fetch the chart config from temp API route
    const response = await fetch(`/api/temp-configs/${pageId}`);
    
    if (!response.ok) {
      console.warn(`Temp file not found for page ${pageId}, falling back to API`);
      // Fallback to original function
      return await getChartConfigsByPage(pageId);
    }
    
    const pageConfig = await response.json();
    console.log(`Loaded ${pageConfig.charts?.length || 0} charts from temp file for page: ${pageId}`);
    
    return pageConfig.charts || [];
  } catch (error) {
    console.warn(`Error loading from temp file for page ${pageId}, falling back to API:`, error);
    // Fallback to original function
    return await getChartConfigsByPage(pageId);
  }
}

// Function to load compressed chart data (aggregation removed)
async function getCachedChartDataFromTempFile(pageId: string, filterValues?: Record<string, string>): Promise<Record<string, any[]>> {
  try {
    console.log(`🚀 TEMP DATA FETCH: Getting chart data for page: ${pageId}`);
    
    // Try compressed API route first
    const startTime = performance.now();
    let response = await fetch(`/api/temp-data-compressed/${pageId}`);
    
    if (!response.ok) {
      console.log(`🔄 TEMP DATA FETCH: Compressed data not available for page ${pageId} (${response.status}), falling back to uncompressed`);
      response = await fetch(`/api/temp-data/${pageId}`);
    }
    
    if (!response.ok) {
      console.warn(`❌ TEMP DATA FETCH: No temp data found for page ${pageId} (${response.status})`);
      return {};
    }
    
    const fetchTime = performance.now() - startTime;
    console.log(`✅ TEMP DATA FETCH: Loaded data for page ${pageId} in ${fetchTime.toFixed(2)}ms`);
    
    const pageData = await response.json();
    const chartDataMap: Record<string, any[]> = {};
    
    // Convert cached data to the format expected by the dashboard
    if (pageData.charts && Array.isArray(pageData.charts)) {
      pageData.charts.forEach((chartResult: any) => {
        if (chartResult.success && chartResult.data) {
          chartDataMap[chartResult.chartId] = chartResult.data;
          console.log(`✅ TEMP DATA: Chart ${chartResult.chartId} loaded with ${chartResult.data.length} rows`);
        } else {
          console.warn(`❌ TEMP DATA: Chart ${chartResult.chartId} failed or has no data`, chartResult);
        }
      });
    } else {
      console.warn(`❌ TEMP DATA: Invalid page data format for ${pageId}:`, Object.keys(pageData));
    }
    
    console.log(`✅ TEMP DATA RESULT: Loaded ${Object.keys(chartDataMap).length} charts from page: ${pageId}`);
    
    return chartDataMap;
  } catch (error) {
    console.error(`❌ TEMP DATA ERROR: Failed to load data for page ${pageId}:`, error);
    return {};
  }
}

export default function DashboardRenderer({ 
  pageId, 
  overrideCharts,
  enableCaching = true,
  section,
}: DashboardRendererProps) {
  // Optimized state management - group related states
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [allChartsLoaded, setAllChartsLoaded] = useState(false);
  
  // Consolidated chart-specific states
  const [chartStates, setChartStates] = useState<Record<string, {
    expanded: boolean;
    downloading: boolean;
    screenshotting: boolean;
    loading: boolean;
  }>>({});
  
  // Data and display states
  const [chartData, setChartData] = useState<Record<string, any[]>>({});
  const [filterValues, setFilterValues] = useState<Record<string, Record<string, string>>>({});
  
  // Track modal filter values separately for expanded charts
  const [modalFilterValues, setModalFilterValues] = useState<Record<string, Record<string, string>>>({});
  const [legends, setLegends] = useState<Record<string, Legend[]>>({});
  const [legendColorMaps, setLegendColorMaps] = useState<Record<string, Record<string, string>>>({});
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, string[]>>({});
  
  // Helper getters for accessing chart states
  const getChartState = useCallback((chartId: string, key: keyof { expanded: boolean; downloading: boolean; screenshotting: boolean; loading: boolean }) => {
    return chartStates[chartId]?.[key] ?? false;
  }, [chartStates]);
  
  // Legacy state getters for compatibility
  const expandedCharts = useMemo(() => {
    const result: Record<string, boolean> = {};
    Object.entries(chartStates).forEach(([chartId, state]) => {
      result[chartId] = state.expanded;
    });
    return result;
  }, [chartStates]);
  
  const downloadingCharts = useMemo(() => {
    const result: Record<string, boolean> = {};
    Object.entries(chartStates).forEach(([chartId, state]) => {
      result[chartId] = state.downloading;
    });
    return result;
  }, [chartStates]);
  
  const screenshottingCharts = useMemo(() => {
    const result: Record<string, boolean> = {};
    Object.entries(chartStates).forEach(([chartId, state]) => {
      result[chartId] = state.screenshotting;
    });
    return result;
  }, [chartStates]);
  
  const loadingCharts = useMemo(() => {
    const result: Record<string, boolean> = {};
    Object.entries(chartStates).forEach(([chartId, state]) => {
      result[chartId] = state.loading;
    });
    return result;
  }, [chartStates]);
  
  // Use ref to track if component is mounted to avoid memory leaks
  const isMounted = useRef(true);
  
  // Create wrapper functions with access to enableCaching prop
  const wrappedFetchChartData = useCallback((chart: ChartConfig, chartFilters: Record<string, string>) => {
    return fetchChartData(chart, chartFilters, enableCaching);
  }, [enableCaching]);
  
  const wrappedBatchFetchChartData = useCallback((charts: ChartConfig[], filters: Record<string, Record<string, string>>) => {
    return batchFetchChartData(charts, filters, enableCaching);
  }, [enableCaching]);

  // Helper function to transform chart config based on currency field-switching
  const transformChartConfigForCurrency = useCallback((chart: ChartConfig, selectedCurrency: string): ChartConfig => {
    const currencyFilter = chart.additionalOptions?.filters?.currencyFilter;
    
    // Only transform if this is a field-switcher type currency filter
    if (!currencyFilter || currencyFilter.type !== 'field_switcher' || !currencyFilter.columnMappings) {
      return chart;
    }
    
    const targetColumn = currencyFilter.columnMappings[selectedCurrency];
    if (!targetColumn) {
      console.warn(`No column mapping found for currency: ${selectedCurrency}`);
      return chart;
    }
    
    console.log(`Transforming chart ${chart.id} for currency ${selectedCurrency} -> column ${targetColumn}`);
    
    // Create a new chart config with transformed data mapping
    const transformedChart = { 
      ...chart,
      // Deep clone additionalOptions to update the active currency filter value
      additionalOptions: {
        ...chart.additionalOptions,
        filters: chart.additionalOptions?.filters ? {
          ...chart.additionalOptions.filters,
          currencyFilter: chart.additionalOptions.filters.currencyFilter ? {
            ...chart.additionalOptions.filters.currencyFilter,
            activeValue: selectedCurrency
          } : undefined
        } : undefined
      }
    };
    
    // For stacked charts with multiple y-fields, we need to replace all currency-related fields
    // with the single field for the selected currency
    if (Array.isArray(chart.dataMapping.yAxis)) {
      // Check if yAxis contains currency-related fields
      const currencyFields = Object.values(currencyFilter.columnMappings);
      const hasCurrencyFields = (chart.dataMapping.yAxis as any[]).some(field => {
        const fieldName = typeof field === 'string' ? field : field.field;
        return currencyFields.includes(fieldName);
      });
      
      if (hasCurrencyFields) {
        // Replace all currency fields with the selected one
        const nonCurrencyFields = (chart.dataMapping.yAxis as any[]).filter(field => {
          const fieldName = typeof field === 'string' ? field : field.field;
          return !currencyFields.includes(fieldName);
        });
        
        // Add the selected currency field
        const selectedField = typeof chart.dataMapping.yAxis[0] === 'string' 
          ? targetColumn 
          : { ...(chart.dataMapping.yAxis[0] as any), field: targetColumn };
        
        transformedChart.dataMapping = {
          ...chart.dataMapping,
          yAxis: [selectedField, ...nonCurrencyFields]
        };
      }
    } else if (typeof chart.dataMapping.yAxis === 'string') {
      // Single y-axis field - check if it's a currency field and replace it
      const currencyFields = Object.values(currencyFilter.columnMappings);
      if (currencyFields.includes(chart.dataMapping.yAxis)) {
        transformedChart.dataMapping = {
          ...chart.dataMapping,
          yAxis: targetColumn
        };
      }
    }
    
    return transformedChart;
  }, []);
  
  // Screenshot functionality now handled directly in ChartCard
  
  // Helper function to convert data to CSV format
  const convertDataToCsv = (data: any[], chart: ChartConfig, timeFilter?: string, displayMode?: string): string => {
    if (!data || data.length === 0) {
      return '';
    }
    
    // Extract headers from first row
    const headers = Object.keys(data[0]);
    
    // Generate CSV content
    let csvData = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
    
    // Add data rows
    data.forEach(row => {
      const rowValues = headers.map(header => {
        const value = row[header];
        
        // Handle different value types
        if (value === null || value === undefined) {
          return '';
        } else if (typeof value === 'string') {
          // Escape double quotes by doubling them
          return `"${value.replace(/"/g, '""')}"`;
        } else if (typeof value === 'number') {
          // Format percentage values with % symbol if needed
          const isPercentMode = displayMode === 'percent';
          const isStacked = isStackedBarChart(chart);
          if (isPercentMode && isStacked) {
            return `${value.toFixed(2)}%`;
          }
          return value;
        } else {
          // For complex objects or arrays, stringify
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
      });
      
      csvData += rowValues.join(',') + '\n';
    });
    
    return csvData;
  };
  
  // Optimized helper functions for chart state management
  const updateChartState = useCallback((chartId: string, updates: Partial<{ expanded: boolean; downloading: boolean; screenshotting: boolean; loading: boolean }>) => {
    setChartStates(prev => ({
      ...prev,
      [chartId]: { ...prev[chartId], ...updates }
    }));
  }, []);

  const batchUpdateChartStates = useCallback((updates: Record<string, Partial<{ expanded: boolean; downloading: boolean; screenshotting: boolean; loading: boolean }>>) => {
    setChartStates(prev => {
      const newStates = { ...prev };
      Object.entries(updates).forEach(([chartId, chartUpdates]) => {
        newStates[chartId] = { ...newStates[chartId], ...chartUpdates };
      });
      return newStates;
    });
  }, []);

  const initializeChartState = useCallback((chartId: string) => {
    setChartStates(prev => ({
      ...prev,
      [chartId]: {
        ...prev[chartId], // Keep any existing overrides first
        expanded: prev[chartId]?.expanded ?? false,
        downloading: prev[chartId]?.downloading ?? false,
        screenshotting: prev[chartId]?.screenshotting ?? false,
        loading: prev[chartId]?.loading ?? true
      }
    }));
  }, []);

  // Add downloadCSV function inside the component
  const downloadCSV = useCallback(async (chart: ChartConfig) => {
    // Set loading state
    updateChartState(chart.id, { downloading: true });
    
    try {
      // Get the current data for this chart from our state
      const currentData = chartData[chart.id];
      
      // Get current filter values for this chart
      const chartFilters = filterValues[chart.id] || {};
      const timeFilter = chartFilters['timeFilter'];
      const displayMode = chartFilters['displayMode']; // Get display mode from filters
      
      // Create a blob with the data
      const csvData = convertDataToCsv(currentData, chart, timeFilter, displayMode);
      const blob = new Blob([csvData], { type: 'text/csv' });
      const downloadUrl = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = downloadUrl;
      
      // Determine time period text for filename
      let timePeriodText = '';
      if (timeFilter) {
        switch (timeFilter.toUpperCase()) {
          case 'D': timePeriodText = 'daily'; break;
          case 'W': timePeriodText = 'weekly'; break;
          case 'M': timePeriodText = 'monthly'; break;
          case 'Q': timePeriodText = 'quarterly'; break;
          case 'Y': timePeriodText = 'yearly'; break;
          default: timePeriodText = timeFilter.toLowerCase();
        }
      }
      
      // Get current date for filename
      const dateStr = new Date().toISOString().split('T')[0];
      // Include display mode in filename if it's percentage mode
      const displayModeText = displayMode === 'percent' ? '_percentage' : '';
      // Include time period in filename if available
      const filename = timePeriodText 
        ? `${chart.title.replace(/\s+/g, '_').toLowerCase()}${displayModeText}_${timePeriodText}_${dateStr}.csv`
        : `${chart.title.replace(/\s+/g, '_').toLowerCase()}${displayModeText}_${dateStr}.csv`;
      a.download = filename;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      alert('Failed to download CSV. Please try again.');
    } finally {
      // Clear loading state
      updateChartState(chart.id, { downloading: false });
    }
  }, [chartData, filterValues, updateChartState]);

  // Use effect to clean up ref on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Enhanced initialization with better parallel loading
  const initializeCharts = useMemo(() => async () => {
    if (overrideCharts) {
      return overrideCharts;
    }
    
    try {
      const loadedCharts = await preloadChartConfigs(pageId);
      return loadedCharts;
    } catch (error) {
      console.error(`Error loading charts for page ${pageId}:`, error);
      return [];
    }
  }, [pageId, overrideCharts]);

  // Optimized load charts and data with enhanced parallel processing
  useEffect(() => {
    setIsClient(true);
    let mounted = true;

    async function loadCharts() {
      try {
        // Start loading charts config immediately
        const loadedCharts = await initializeCharts();
        
        if (!mounted) return;
        
        setCharts(loadedCharts);
        
        // Initialize chart states in batch
        const initialChartStates: Record<string, Partial<{ expanded: boolean; downloading: boolean; screenshotting: boolean; loading: boolean }>> = {};
        let initialChartData: Record<string, any[]> = {};
        
        loadedCharts.forEach(chart => {
          initialChartStates[chart.id] = { loading: true };
          initialChartData[chart.id] = [];
        });
        
        // Try to load cached compressed data first for instant display
        const cachedData = await getCachedChartDataFromTempFile(pageId);
        
        if (Object.keys(cachedData).length > 0) {
          console.log(`🚀 INSTANT DISPLAY: Using ${Object.keys(cachedData).length} charts from temp files (${loadedCharts.length} total charts)`);
          console.log(`🚀 Cached chart IDs: ${Object.keys(cachedData).join(', ')}`);
          
          // Merge cached data with initial data
          initialChartData = { ...initialChartData, ...cachedData };
          
          // Update loading states for charts that have cached data
          Object.keys(cachedData).forEach(chartId => {
            initialChartStates[chartId] = { loading: false };
          });
          
          // Set charts as loaded for cached ones
          setChartData(initialChartData);
          batchUpdateChartStates(initialChartStates);
          
          // Show the page immediately with compressed data
          setIsPageLoading(false);
          setAllChartsLoaded(Object.keys(cachedData).length === loadedCharts.length);
        } else {
          // No cached data, show loading states
          batchUpdateChartStates(initialChartStates);
          setChartData(initialChartData);
        }
        
        // Now fetch fresh data in the background for charts that need updates
        const chartsToRefresh = loadedCharts.filter(chart => {
          const hasCachedData = cachedData[chart.id] && cachedData[chart.id].length > 0;
          if (!hasCachedData) {
            console.log(`🔄 Chart ${chart.id} needs refresh - no temp data available`);
            return true;
          }
          
          // Skip all background refresh if temp data exists - prioritize speed over freshness
          console.log(`✅ TEMP DATA EXISTS: Chart ${chart.id} has temp data (${cachedData[chart.id].length} rows) - completely skipping API calls`);
          return false;
        });
        
        if (chartsToRefresh.length > 0) {
          console.log(`🔄 Loading ${chartsToRefresh.length} charts without cached data`);
          
          // Set loading states only for charts that truly need data (no cache available)
          const refreshingStates: Record<string, Partial<{ expanded: boolean; downloading: boolean; screenshotting: boolean; loading: boolean }>> = {};
          chartsToRefresh.forEach(chart => {
            refreshingStates[chart.id] = { loading: true };
          });
          batchUpdateChartStates(refreshingStates);
          
          // Start parallel data loading for charts that need refresh
          // Use current filter values for data loading
          console.log('Dashboard: Using current filter values for data loading:', filterValues);
          const dataLoadPromise = wrappedBatchFetchChartData(chartsToRefresh, filterValues);
          
          // Process results as they come in
          const results = await dataLoadPromise;
          
          if (!mounted) return;
              
          // Process all results in batch
          const newChartData: Record<string, any[]> = { ...initialChartData };
          const loadingUpdates: Record<string, Partial<{ expanded: boolean; downloading: boolean; screenshotting: boolean; loading: boolean }>> = {};
              
          results.forEach(result => {
            newChartData[result.chartId] = result.data || [];
            loadingUpdates[result.chartId] = { loading: false };
            
            // Legends will be updated automatically via useEffect when chartData changes
          });
          
          // Batch update all chart data and loading states
          setChartData(newChartData);
          batchUpdateChartStates(loadingUpdates);
          
          // Mark all charts as loaded
          const allLoaded = Object.values(loadingUpdates).every(update => !update.loading);
          setAllChartsLoaded(allLoaded);
          
          if (allLoaded) {
            setIsPageLoading(false);
            console.log(`✅ All missing charts loaded (cached charts displayed immediately)`);
          }
        }
        
      } catch (error) {
        console.error(`Error loading charts for page ${pageId}:`, error);
        if (mounted) {
          setIsPageLoading(false);
        }
      }
    }
    
    loadCharts();
    
    return () => {
      mounted = false;
    };
  }, [pageId, overrideCharts, initializeCharts, wrappedBatchFetchChartData, batchUpdateChartStates]);

  // Separate effect for filter initialization - runs after charts are loaded
  useEffect(() => {
    if (charts.length === 0) return; // Wait for charts to be loaded
    
    console.log('=== DASHBOARD FILTER INITIALIZATION EFFECT ===');
    console.log('Number of charts to initialize filters for:', charts.length);
    
    const initialFilterValues: Record<string, Record<string, string>> = {};
    let hasAnyFilters = false;
    
    charts.forEach(chart => {
      const chartFilters: Record<string, string> = {};
      
      console.log(`Checking filters for chart: ${chart.title}`);
      
      // Initialize filters from chart config
      if (chart.additionalOptions?.filters) {
        // Set time filter - default to 'M' if available, otherwise first option
        if (chart.additionalOptions.filters.timeFilter &&
            Array.isArray(chart.additionalOptions.filters.timeFilter.options) &&
            chart.additionalOptions.filters.timeFilter.options.length > 0) {
          const defaultValue = getDefaultTimeFilterValue(chart.additionalOptions.filters.timeFilter.options);
          chartFilters['timeFilter'] = defaultValue;
          hasAnyFilters = true;
          console.log(`Setting default time filter for ${chart.title}: ${defaultValue}`);
        }
        
        // Set currency filter
        if (chart.additionalOptions.filters.currencyFilter &&
            Array.isArray(chart.additionalOptions.filters.currencyFilter.options) &&
            chart.additionalOptions.filters.currencyFilter.options.length > 0) {
          chartFilters['currencyFilter'] = chart.additionalOptions.filters.currencyFilter.options[0];
          hasAnyFilters = true;
          console.log(`Setting default currency filter for ${chart.title}: ${chartFilters['currencyFilter']}`);
        }
        
        // Set display mode filter
        if (chart.additionalOptions.filters.displayModeFilter &&
            Array.isArray(chart.additionalOptions.filters.displayModeFilter.options) &&
            chart.additionalOptions.filters.displayModeFilter.options.length > 0) {
          chartFilters['displayModeFilter'] = chart.additionalOptions.filters.displayModeFilter.options[0];
          hasAnyFilters = true;
          console.log(`Setting default display mode filter for ${chart.title}: ${chartFilters['displayModeFilter']}`);
        }
        
        // Set display mode for stacked charts (always default to 'absolute')
        if (isStackedBarChart(chart)) {
          chartFilters['displayMode'] = 'absolute';
          hasAnyFilters = true;
          console.log(`Setting default display mode for stacked chart ${chart.title}: absolute`);
        }
      }
      
      if (Object.keys(chartFilters).length > 0) {
        initialFilterValues[chart.id] = chartFilters;
        console.log(`✅ Filters initialized for ${chart.title}:`, chartFilters);
      }
    });
    
    // Only update filter values if we have filters to set and they're different from current
    if (hasAnyFilters) {
      setFilterValues(prev => {
        // Merge with existing filter values, but only set defaults if not already set
        const newFilterValues = { ...prev };
        
        Object.entries(initialFilterValues).forEach(([chartId, chartFilters]) => {
          if (!newFilterValues[chartId]) {
            newFilterValues[chartId] = chartFilters;
          } else {
            // Only set default values for filters that don't exist yet
            Object.entries(chartFilters).forEach(([filterType, defaultValue]) => {
              if (!newFilterValues[chartId][filterType]) {
                newFilterValues[chartId][filterType] = defaultValue;
              }
            });
          }
        });
        
        console.log('=== DASHBOARD FILTER INITIALIZATION COMPLETE ===');
        console.log('Filter values updated:', newFilterValues);
        
        return newFilterValues;
      });
    }
  }, [charts]); // Only depend on charts, not filterValues to avoid infinite loops

  // Simplified fetchChartDataWithFilters for individual chart updates
  const fetchChartDataWithFilters = useCallback(async (chart: ChartConfig, skipLoadingState = false) => {
    try {
      // Check if we already have temp data for this chart - if so, skip API call
      const hasExistingData = chartData[chart.id] && chartData[chart.id].length > 0;
      const isTimeAggregationEnabled = chart.additionalOptions?.enableTimeAggregation;
      const isFieldSwitchingCurrency = chart.additionalOptions?.filters?.currencyFilter?.type === 'field_switcher';
      
      if (hasExistingData && (isTimeAggregationEnabled || isFieldSwitchingCurrency)) {
        console.log(`✅ SKIP API: Chart ${chart.id} has temp data and uses client-side processing - no API call needed`);
        return chartData[chart.id];
      }
      
      if (!skipLoadingState && isMounted.current) {
        updateChartState(chart.id, { loading: true });
      }
      
      const chartFilters = filterValues[chart.id] || {};
      const cacheKey = `${chart.id}-${chart.apiEndpoint}-${JSON.stringify(chartFilters)}`;
      
      // Use wrappedFetchChartData which has access to enableCaching
      // First check cache
      if (CHART_DATA_CACHE[cacheKey] && enableCaching) {
        const cachedItem = CHART_DATA_CACHE[cacheKey];
        const now = Date.now();
        
        if (now - cachedItem.timestamp < cachedItem.expiresIn) {
          console.log(`Using cached data for chart ${chart.id}`);
          
          if (isMounted.current) {
            setChartData(prev => ({
              ...prev,
              [chart.id]: cachedItem.data
            }));
            
            // Legends will be updated via useEffect when chartData changes
            
            if (!skipLoadingState) {
              updateChartState(chart.id, { loading: false });
            }
          }
          
          return cachedItem.data;
        }
      }
      
      // Fetch fresh data using wrapper function with enableCaching
      const data = await wrappedFetchChartData(chart, chartFilters);
      
      // Skip updates if component unmounted
      if (!isMounted.current) return data;
      
      // Update state with fresh data
      setChartData(prev => ({
        ...prev,
        [chart.id]: data
      }));
      
      // Legends will be updated via useEffect when chartData changes
      
      if (!skipLoadingState) {
        updateChartState(chart.id, { loading: false });
      }

      return data;
    } catch (error) {
      console.error(`Error fetching data for chart ${chart.id}:`, error);
      
      // Skip updates if component unmounted
      if (!isMounted.current) return null;
      
      if (!skipLoadingState) {
        updateChartState(chart.id, { loading: false });
      }
      
      return null;
    }
  }, [enableCaching, filterValues, isMounted, setChartData, updateChartState, wrappedFetchChartData]);

  const toggleChartExpanded = (chartId: string) => {
    const isCurrentlyExpanded = getChartState(chartId, 'expanded');
    
    if (!isCurrentlyExpanded) {
      // Chart is being expanded - initialize modal filter values
      const currentFilters = filterValues[chartId] || {};
      setModalFilterValues(prev => ({
        ...prev,
        [chartId]: { ...currentFilters }
      }));
      console.log(`Initializing modal filters for chart ${chartId}:`, currentFilters);
    } else {
      // Chart is being collapsed - clean up modal filter values
      setModalFilterValues(prev => {
        const newModalFilters = { ...prev };
        delete newModalFilters[chartId];
        return newModalFilters;
      });
      console.log(`Cleaning up modal filters for chart ${chartId}`);
    }
    
    updateChartState(chartId, { expanded: !isCurrentlyExpanded });
  };

  // Screenshot functionality now handled directly in ChartCard


  // Handle filter changes
  const handleFilterChange = async (chartId: string, filterType: string, value: string) => {
    console.log('Dashboard filter change:', { chartId, filterType, value });
    
    const chart = charts.find(c => c.id === chartId);
    if (!chart) {
      console.error('Chart not found for ID:', chartId);
      return;
    }
    
    // Check if this is a field-switching currency filter
    const isFieldSwitchingCurrency = filterType === 'currencyFilter' && 
      chart.additionalOptions?.filters?.currencyFilter?.type === 'field_switcher';
    
    // For time aggregation enabled charts, handle ALL filter changes client-side
    const isTimeAggregationEnabled = chart.additionalOptions?.enableTimeAggregation;
    const isStackedChart = isStackedBarChart(chart);
    
    // Update filter values
    setFilterValues(prev => ({
      ...prev,
      [chartId]: {
        ...prev[chartId],
        [filterType]: value
      }
    }));
    
    if (isTimeAggregationEnabled || (isStackedChart && filterType === 'displayMode') || isFieldSwitchingCurrency) {
      console.log(`Dashboard: Client-side filter processing for ${
        isTimeAggregationEnabled ? 'time aggregation' : 
        isStackedChart && filterType === 'displayMode' ? 'stacked chart' : 
        'field-switching currency'
      } - NO API CALL`);
      
      // No API call needed - ChartRenderer handles time aggregation, StackedBarChart handles displayMode, 
      // and field-switching is handled during rendering
      return;
    }

    console.log('Dashboard: Server-side filter processing - will trigger API call');
    
    // Set loading state when filter changes (for non-time-aggregation cases)
    updateChartState(chartId, { loading: true });

    // Fetch updated data with the new filter (only for non-time-aggregation cases)
    await fetchChartDataWithFilters(chart);
    
    // Reset loading state after fetch
    updateChartState(chartId, { loading: false });
  };

  // Add function to determine if a field is rendered as a line
  const isLineType = (chart: ChartConfig, fieldName: string): boolean => {
    if (!chart || !chart.dataMapping || !chart.dataMapping.yAxis) return false;
    
    // For MultiSeriesLineBarChart, check YAxisConfig
    if (chart.chartType === 'bar' || chart.chartType === 'line') {
      const yAxis = chart.dataMapping.yAxis;
      
      if (Array.isArray(yAxis)) {
        // Find the matching field in the array
        const field = yAxis.find(f => typeof f === 'string' ? f === fieldName : f.field === fieldName);
        
        // Check if it's a YAxisConfig with type='line'
        return typeof field !== 'string' && field?.type === 'line';
      } else if (typeof yAxis !== 'string') {
        // Single YAxisConfig
        return yAxis.field === fieldName && yAxis.type === 'line';
      }
    }
    
    // Default to false (bar charts, etc)
    return chart.chartType === 'line';
  };

  // Generate legends for a chart based on its data and configuration
  const updateLegends = useCallback((chartId: string, data: any[]) => {
    const chart = charts.find(c => c.id === chartId);
    if (!chart || !data || data.length === 0) return;
    
    console.log("Updating legends for chart:", {
      id: chartId,
      title: chart.title,
      chartType: chart.chartType,
      isStacked: chart.isStacked,
      groupBy: chart.dataMapping.groupBy,
      dataLength: data.length,
      sampleData: data.slice(0, 2)
    });
    
    // Get or initialize the legend color map for this chart
    let colorMap = legendColorMaps[chartId] || {};
    const isNewColorMap = Object.keys(colorMap).length === 0;
    
    // Different legend generation based on chart type
    let chartLegends: (Legend & { shape?: 'circle' | 'square' })[] = [];
    // Track new labels to ensure we keep consistent order
    const newLabels: string[] = [];
    
    // First, check if this is a dual-axis chart
    const isDualAxis = chart.chartType === 'dual-axis' && chart.dualAxisConfig;

    // Define variables needed for stacked chart logic
    const isStackedConfig = chart.chartType.includes('stacked') || chart.isStacked === true;
    const hasGroupByField = !!chart.dataMapping.groupBy;
    const groupField = chart.dataMapping.groupBy || '';

    // Check if the groupBy field actually exists in the data
    const groupByFieldExists = data.length > 0 && groupField && data[0][groupField] !== undefined;

    // A chart is a valid stacked chart if it's configured as stacked AND has a groupBy field that exists in the data
    const isValidStackedChart = isStackedConfig && hasGroupByField && groupByFieldExists;
    
    // Check if we have a groupBy field with regular bar/line chart (not stacked)
    // This is important for MultiSeriesLineBarChart with groupBy
    const hasGroupByWithRegularChart = !isStackedConfig && hasGroupByField && groupByFieldExists && 
                                      (chart.chartType === 'bar' || chart.chartType === 'line');

    if (isDualAxis && chart.dualAxisConfig) {
      console.log("Processing as dual axis chart");
      
      // For dual axis charts, create separate legends for left and right axes
      const leftAxisFields = chart.dualAxisConfig.leftAxisFields;
      const rightAxisFields = chart.dualAxisConfig.rightAxisFields;
      
      // Apply currency field filtering before processing fields
      let filteredLeftAxisFields = leftAxisFields;
      let filteredRightAxisFields = rightAxisFields;
      
      // Check for currency field filtering
      const currencyFilter = chart.additionalOptions?.filters?.currencyFilter;
      const selectedCurrency = (filterValues[chartId] || {})['currencyFilter'];
      
      if (currencyFilter?.type === 'field_switcher' && currencyFilter.columnMappings && selectedCurrency) {
        console.log('Applying currency field filtering to dual axis chart legends:', {
          selectedCurrency,
          columnMappings: currencyFilter.columnMappings
        });
        
        const currencyFields = Object.values(currencyFilter.columnMappings);
        const targetFields = currencyFilter.columnMappings[selectedCurrency];
        
        if (targetFields) {
          const targetFieldList = targetFields.split(',').map(f => f.trim());
          
          // Filter left axis fields
          filteredLeftAxisFields = leftAxisFields.filter(field => {
            // Include if it's a target field for the selected currency
            if (targetFieldList.includes(field)) {
              return true;
            }
            // Include if it's not a currency field at all
            if (!currencyFields.some(mapping => {
              const mappingFields = mapping.split(',').map(f => f.trim());
              return mappingFields.includes(field);
            })) {
              return true;
            }
            return false;
          });
          
          // Filter right axis fields
          filteredRightAxisFields = rightAxisFields.filter(field => {
            // Include if it's a target field for the selected currency
            if (targetFieldList.includes(field)) {
              return true;
            }
            // Include if it's not a currency field at all
            if (!currencyFields.some(mapping => {
              const mappingFields = mapping.split(',').map(f => f.trim());
              return mappingFields.includes(field);
            })) {
              return true;
            }
            return false;
          });
        }
      }
      
      // Process all filtered fields from both axes
      const allFields = [...filteredLeftAxisFields, ...filteredRightAxisFields];
      
      // Calculate totals for each field for tooltips
      const fieldTotals: Record<string, number> = {};
      
      allFields.forEach(field => {
        fieldTotals[field] = data.reduce((sum, item) => 
          sum + (Number(item[field]) || 0), 0);
        
        newLabels.push(field);
        
        // Assign colors if creating a new color map
        if (isNewColorMap && !colorMap[field]) {
          // Left axis fields get blue-ish colors, right axis fields get purple-ish colors
          const isRightAxis = filteredRightAxisFields.includes(field);
          const index = isRightAxis 
            ? filteredRightAxisFields.indexOf(field)
            : filteredLeftAxisFields.indexOf(field);
          
          colorMap[field] = isRightAxis 
            ? getColorByIndex(index + filteredLeftAxisFields.length) // Offset to avoid color conflicts
            : getColorByIndex(index);
        }
      });
      
      // Create legend items for all fields - show API field names as-is
      // Filter out fields with zero or near-zero total values
      chartLegends = allFields
        .filter(field => {
          const totalValue = fieldTotals[field] || 0;
          // Filter out fields with zero or very small values (to handle floating point precision)
          return Math.abs(totalValue) > 0.001;
        })
        .map(field => {
          const isRightAxis = filteredRightAxisFields.includes(field);
          
          return {
            id: field, // Add the raw field name as id
            label: field, // Show API field name as-is without formatting
            color: colorMap[field] || getColorByIndex(allFields.indexOf(field)),
            value: fieldTotals[field] || 0,
            // Determine shape based on axis (typically lines for right axis)
            shape: isRightAxis ? 'circle' as const : 'square' as const
          };
        }).sort((a, b) => b.value - a.value); // Sort by value in descending order
    }
    // First, we need to determine if this is truly a stacked chart with valid data
    // OR a regular chart with groupBy - both need to display the group items in legends
    else if (isValidStackedChart || hasGroupByWithRegularChart) {
      console.log("Processing as chart with group by:", groupField);
      
      // Always use the group by field values for legends when groupBy is present
      // Get unique groups from the data
      const uniqueGroups = Array.from(new Set(data.map(item => item[groupField])));
      console.log("Unique groups found:", uniqueGroups);
      
      // Calculate total for each group for sorting and tooltips
      const yField = typeof chart.dataMapping.yAxis === 'string' ? 
        chart.dataMapping.yAxis : 
        Array.isArray(chart.dataMapping.yAxis) ? 
          getFieldName(chart.dataMapping.yAxis[0]) : 
          getFieldName(chart.dataMapping.yAxis);
      
      // Group totals for proper sorting
      const groupTotals: Record<string, number> = {};
      uniqueGroups.forEach(group => {
        if (group !== null && group !== undefined) {
          const groupStr = String(group);
          newLabels.push(groupStr);
          
          // Get the actual field name if yField is a YAxisConfig
          const yFieldName = typeof chart.dataMapping.yAxis === 'string' ? 
            chart.dataMapping.yAxis : 
            (Array.isArray(chart.dataMapping.yAxis) ? 
              getFieldName(chart.dataMapping.yAxis[0]) : 
              getFieldName(chart.dataMapping.yAxis));
          
          groupTotals[groupStr] = data
            .filter(item => item[groupField] === group)
            .reduce((sum, item) => sum + (Number(item[yFieldName]) || 0), 0);
        }
      });
      console.log("Group totals:", groupTotals);
      
      // Create legend items, maintaining consistent color assignment
      // Sort by totals first (highest to lowest) if assigning colors for the first time
      if (isNewColorMap) {
        // Get sorted groups by their total value (highest first)
        const sortedGroups = Object.entries(groupTotals)
          .sort((a, b) => b[1] - a[1])
          .map(([group]) => group);
        
        // Assign colors to groups in order of their totals
        sortedGroups.forEach((group, index) => {
          if (!colorMap[group]) {
            colorMap[group] = getColorByIndex(index);
          }
        });
      }
      
      // Check if we should show line shape for some groups (for MultiSeriesLineBarChart with groupBy)
      const shouldUseLineShape = !isStackedConfig && 
        Array.isArray(chart.dataMapping.yAxis) && 
        chart.dataMapping.yAxis.length === 1 && 
        typeof chart.dataMapping.yAxis[0] !== 'string' && 
        chart.dataMapping.yAxis[0].type === 'line';
      
      // Now create legend items using the color map
      // Filter out groups with zero or near-zero total values
      chartLegends = uniqueGroups
        .filter(group => group !== null && group !== undefined)
        .filter(group => {
          const totalValue = groupTotals[String(group)] || 0;
          // Filter out groups with zero or very small values (to handle floating point precision)
          return Math.abs(totalValue) > 0.001;
        })
        .map((group) => {
          const groupStr = String(group);
          return {
            label: groupStr,
            color: colorMap[groupStr] || getColorByIndex(Object.keys(colorMap).length),
            value: groupTotals[groupStr] || 0,
            // Use circle shape for line type displays, determined by parent chart config
            shape: shouldUseLineShape ? 'circle' as const : 'square' as const
          };
        })
        .sort((a, b) => b.value - a.value); // Sort by value in descending order
    }
    // Handle pie charts
    else if (chart.chartType === 'pie') {
      console.log("Processing as pie chart");
      
      // For pie charts, use the category field (usually xAxis) for labels
      // and the value field (usually yAxis) for values
      const categoryField = typeof chart.dataMapping.xAxis === 'string' ? 
        chart.dataMapping.xAxis : chart.dataMapping.xAxis[0];
        
      // Get the value field name
      const valueField = typeof chart.dataMapping.yAxis === 'string' ? 
        chart.dataMapping.yAxis : 
        Array.isArray(chart.dataMapping.yAxis) ? 
          getFieldName(chart.dataMapping.yAxis[0]) : 
          getFieldName(chart.dataMapping.yAxis);
      
      // Create legends for each pie segment
      let pieItems = data
        .filter(item => item[categoryField] !== null && item[categoryField] !== undefined)
        .map((item, index) => {
          const label = String(item[categoryField]);
          const value = Number(item[valueField]) || 0;
          
          return { label, value, index };
        });
      
      // Sort by value (highest first) for better readability
      pieItems.sort((a, b) => b.value - a.value);
      
      // Limit to top 10 segments if there are many categories
      const MAX_PIE_SEGMENTS = 30;
      if (pieItems.length > MAX_PIE_SEGMENTS) {
        console.log(`Limiting pie chart to top ${MAX_PIE_SEGMENTS} segments (from ${pieItems.length} total)`);
        pieItems = pieItems.slice(0, MAX_PIE_SEGMENTS);
      }
      
      // Generate legends with appropriate colors
      // Filter out pie segments with zero or near-zero values
      chartLegends = pieItems
        .filter(item => {
          const totalValue = item.value || 0;
          // Filter out items with zero or very small values (to handle floating point precision)
          return Math.abs(totalValue) > 0.001;
        })
        .map((item, index) => {
          const { label, value } = item;
          newLabels.push(label);
          
          // Assign colors if creating a new color map
          if (isNewColorMap && !colorMap[label]) {
            colorMap[label] = getColorByIndex(index);
          }
          
          return {
            label,
            color: colorMap[label] || getColorByIndex(index),
            value,
            // Pie charts always use square/block shape
            shape: 'square' as const
          };
        });
      
      console.log(`Generated ${chartLegends.length} legend items for pie chart`);
    }
    // Handle area and stacked-area charts
    else if (chart.chartType === 'area' || chart.chartType === 'stacked-area') {
      console.log("Processing as area chart");
      
      // Check if this is a date-based chart (typically time series)
      const xField = typeof chart.dataMapping.xAxis === 'string' ? 
        chart.dataMapping.xAxis : chart.dataMapping.xAxis[0];
      
      // Get field names from yAxis which could be strings or YAxisConfig objects
      let yAxisFields: string[] = [];
      if (Array.isArray(chart.dataMapping.yAxis)) {
        yAxisFields = chart.dataMapping.yAxis.map(field => getFieldName(field));
      } else {
        yAxisFields = [getFieldName(chart.dataMapping.yAxis)];
      }
      
      // Apply currency field filtering
      const currencyFilter = chart.additionalOptions?.filters?.currencyFilter;
      const selectedCurrency = (filterValues[chartId] || {})['currencyFilter'];
      
      if (currencyFilter?.type === 'field_switcher' && currencyFilter.columnMappings && selectedCurrency) {
        console.log('Applying currency field filtering to area chart legends:', {
          selectedCurrency,
          columnMappings: currencyFilter.columnMappings,
          originalFields: yAxisFields
        });
        
        const currencyFields = Object.values(currencyFilter.columnMappings);
        const targetFields = currencyFilter.columnMappings[selectedCurrency];
        
        if (targetFields) {
          const targetFieldList = targetFields.split(',').map(f => f.trim());
          
          // Filter yAxis fields
          yAxisFields = yAxisFields.filter(field => {
            // Include if it's a target field for the selected currency
            if (targetFieldList.includes(field)) {
              return true;
            }
            // Include if it's not a currency field at all
            if (!currencyFields.some(mapping => {
              const mappingFields = mapping.split(',').map(f => f.trim());
              return mappingFields.includes(field);
            })) {
              return true;
            }
            return false;
          });
          
          console.log('Filtered yAxisFields for area chart:', yAxisFields);
        }
      }
      
      const isDateBased = data.length > 0 && 
        (xField.toLowerCase().includes('date') || 
         xField.toLowerCase().includes('time') || 
         typeof data[0][xField] === 'string' && 
         (data[0][xField].match(/^\d{4}-\d{2}-\d{2}/) ||
          data[0][xField].match(/^\d{4}-\d{2}$/) || // Monthly format: 2024-01
          data[0][xField].match(/^\d{4}-Q[1-4]$/) || // Quarterly format: 2024-Q1
          data[0][xField].match(/^\d{4}$/)) || // Yearly format: 2024
         chart.additionalOptions?.enableTimeAggregation) // Always treat time-aggregated charts as date-based
      
      if (isDateBased) {
        // For date-based area charts, use series names or y-axis field names
        
        // Check if we have multiple y-axis fields (multi-series)
        if (Array.isArray(chart.dataMapping.yAxis) && chart.dataMapping.yAxis.length > 1) {
          // For multi-series area charts, use the y-axis field names as legends - show API names as-is
          // Filter out fields with zero or near-zero total values
          chartLegends = yAxisFields
            .filter(field => {
              // Calculate the total for this field across all data points
              const total = data.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
              // Filter out fields with zero or very small values (to handle floating point precision)
              return Math.abs(total) > 0.001;
            })
            .map((field, index) => {
              // Calculate the total for this field across all data points
              const total = data.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
              
              newLabels.push(field); // Use raw field name
              
              // Use consistent color from our map, or generate a new one if needed
              if (!colorMap[field] && isNewColorMap) {
                colorMap[field] = getColorByIndex(index);
              }
              
              return {
                id: field, // Add the raw field name as id
                label: field, // Show API field name as-is without formatting
                color: colorMap[field] || getColorByIndex(index),
                value: total,
                shape: 'square' as const // Area charts use square shapes
              };
            });
        } else {
          // For single-series area charts, use a single legend entry with the y-axis name - show API name as-is
          const yFieldName = getFieldName(yAxisFields[0]);
          const total = data.reduce((sum, item) => sum + (Number(item[yFieldName]) || 0), 0);
          
          // Only create legend if the total value is non-zero
          if (Math.abs(total) > 0.001) {
            newLabels.push(yFieldName); // Use raw field name
            
            // Use consistent color from our map, or generate a new one if needed
            if (!colorMap[yFieldName] && isNewColorMap) {
              colorMap[yFieldName] = getColorByIndex(0);
            }
            
            chartLegends = [{
              id: yFieldName, // Add the raw field name as id
              label: yFieldName, // Show API field name as-is without formatting
              color: colorMap[yFieldName] || getColorByIndex(0),
              value: total,
              shape: 'square' as const // Area charts use square shapes
            }];
          } else {
            chartLegends = []; // No legend if no data
          }
        }
              } else {
          // For non-date based area charts, use data points as legend entries
          // Filter out items with zero or near-zero values
          chartLegends = data
            .filter(item => {
              const value = Number(item[yAxisFields[0]]) || 0;
              // Filter out items with zero or very small values (to handle floating point precision)
              return Math.abs(value) > 0.001;
            })
            .map((item, index) => {
              const label = String(item[xField]);
              const id = label; // For non-date based, id and label are the same
              newLabels.push(id);
              
              // Use consistent color from our map, or generate a new one if needed
              if (!colorMap[id] && isNewColorMap) {
                colorMap[id] = getColorByIndex(index);
              }
              
              return {
                id,
                label,
                color: colorMap[id] || getColorByIndex(index),
                value: Number(item[yAxisFields[0]]) || 0,
                shape: 'square' as const // Area charts use square shapes
              };
            });
        }
      
      console.log(`Generated ${chartLegends.length} legend items for area chart`);
    }
    // Then handle regular bar/line charts
    else if (chart.chartType === 'bar' || chart.chartType === 'line') {
      console.log("Processing as regular bar/line chart");
      // Check if this is a date-based chart (typically time series)
      const xField = typeof chart.dataMapping.xAxis === 'string' ? 
        chart.dataMapping.xAxis : chart.dataMapping.xAxis[0];
      
      // Get field names from yAxis which could be strings or YAxisConfig objects
      let yAxisFields: string[] = [];
      if (Array.isArray(chart.dataMapping.yAxis)) {
        yAxisFields = chart.dataMapping.yAxis.map(field => getFieldName(field));
      } else {
        yAxisFields = [getFieldName(chart.dataMapping.yAxis)];
      }
      
      // Apply currency field filtering
      const currencyFilter = chart.additionalOptions?.filters?.currencyFilter;
      const selectedCurrency = (filterValues[chartId] || {})['currencyFilter'];
      
      if (currencyFilter?.type === 'field_switcher' && currencyFilter.columnMappings && selectedCurrency) {
        console.log('Applying currency field filtering to bar/line chart legends:', {
          selectedCurrency,
          columnMappings: currencyFilter.columnMappings,
          originalFields: yAxisFields
        });
        
        const currencyFields = Object.values(currencyFilter.columnMappings);
        const targetFields = currencyFilter.columnMappings[selectedCurrency];
        
        if (targetFields) {
          const targetFieldList = targetFields.split(',').map(f => f.trim());
          
          // Filter yAxis fields
          yAxisFields = yAxisFields.filter(field => {
            // Include if it's a target field for the selected currency
            if (targetFieldList.includes(field)) {
              return true;
            }
            // Include if it's not a currency field at all
            if (!currencyFields.some(mapping => {
              const mappingFields = mapping.split(',').map(f => f.trim());
              return mappingFields.includes(field);
            })) {
              return true;
            }
            return false;
          });
          
          console.log('Filtered yAxisFields for bar/line chart:', yAxisFields);
        }
      }
      
      const isDateBased = data.length > 0 && 
        (xField.toLowerCase().includes('date') || 
         xField.toLowerCase().includes('time') || 
         typeof data[0][xField] === 'string' && 
         (data[0][xField].match(/^\d{4}-\d{2}-\d{2}/) ||
          data[0][xField].match(/^\d{4}-\d{2}$/) || // Monthly format: 2024-01
          data[0][xField].match(/^\d{4}-Q[1-4]$/) || // Quarterly format: 2024-Q1
          data[0][xField].match(/^\d{4}$/)) || // Yearly format: 2024
         chart.additionalOptions?.enableTimeAggregation) // Always treat time-aggregated charts as date-based
      
      if (isDateBased) {
        // For date-based charts, don't use dates as legend labels
        // Instead, use series names or y-axis field names
        
        // Check if we have multiple y-axis fields (multi-series)
        if (Array.isArray(chart.dataMapping.yAxis) && chart.dataMapping.yAxis.length > 1) {
          // For multi-series charts, use the y-axis field names as legends - show API names as-is
          // Filter out fields with zero or near-zero total values
          chartLegends = yAxisFields
            .filter(field => {
              // Calculate the total for this field across all data points
              const total = data.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
              // Filter out fields with zero or very small values (to handle floating point precision)
              return Math.abs(total) > 0.001;
            })
            .map((field, index) => {
              // Calculate the total for this field across all data points
              const total = data.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
              
              newLabels.push(field); // Use raw field name
              
              // Use consistent color from our map, or generate a new one if needed
              if (!colorMap[field] && isNewColorMap) {
                colorMap[field] = getColorByIndex(index);
              }
              
              return {
                id: field, // Add the raw field name as id
                label: field, // Show API field name as-is without formatting
                color: colorMap[field] || getColorByIndex(index),
                value: total,
                shape: isLineType(chart, field) ? 'circle' as const : 'square' as const
              };
            });
        } else {
          // For single-series time charts, use a single legend entry with the y-axis name - show API name as-is
          const yFieldName = getFieldName(yAxisFields[0]);
          const total = data.reduce((sum, item) => sum + (Number(item[yFieldName]) || 0), 0);
          
          // Only create legend if the total value is non-zero
          if (Math.abs(total) > 0.001) {
            newLabels.push(yFieldName); // Use raw field name
            
            // Use consistent color from our map, or generate a new one if needed
            if (!colorMap[yFieldName] && isNewColorMap) {
              colorMap[yFieldName] = getColorByIndex(0);
            }
            
            // Determine if this field should be rendered as a line
            const isLine = isLineType(chart, yFieldName);
            
            chartLegends = [{
              id: yFieldName, // Add the raw field name as id
              label: yFieldName, // Show API field name as-is without formatting
              color: colorMap[yFieldName] || getColorByIndex(0),
              value: total,
              shape: isLine ? 'circle' as const : 'square' as const
            }];
          } else {
            chartLegends = []; // No legend if no data
          }
        }
      } else {
        // For non-date based charts, determine if we should show y-axis field or data points
        // For simple single-series charts, show the y-axis field name
        // For multi-series charts or when there are distinct categories to distinguish, show data points
        
        const isMultiSeries = Array.isArray(chart.dataMapping.yAxis) && chart.dataMapping.yAxis.length > 1;
        const hasGroupBy = !!chart.dataMapping.groupBy;
        
        if (isMultiSeries) {
          // Multi-series chart - show y-axis field names as legends
          // Filter out fields with zero or near-zero total values
          chartLegends = yAxisFields
            .filter(field => {
              // Calculate the total for this field across all data points
              const total = data.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
              // Filter out fields with zero or very small values (to handle floating point precision)
              return Math.abs(total) > 0.001;
            })
            .map((field, index) => {
              // Calculate the total for this field across all data points
              const total = data.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
              
              newLabels.push(field); // Use raw field name
              
              // Use consistent color from our map, or generate a new one if needed
              if (!colorMap[field] && isNewColorMap) {
                colorMap[field] = getColorByIndex(index);
              }
              
              // Determine if this field should be rendered as a line
              const isLine = isLineType(chart, field);
              
              return {
                id: field, // Add the raw field name as id
                label: field, // Show API field name as-is without formatting
                color: colorMap[field] || getColorByIndex(index),
                value: total,
                shape: isLine ? 'circle' as const : 'square' as const
              };
            });
        } else if (!hasGroupBy) {
          // Simple single-series chart without groupBy - show y-axis field name
          const yFieldName = getFieldName(yAxisFields[0]);
          const total = data.reduce((sum, item) => sum + (Number(item[yFieldName]) || 0), 0);
          
          // Only create legend if the total value is non-zero
          if (Math.abs(total) > 0.001) {
            newLabels.push(yFieldName); // Use raw field name
            
            // Use consistent color from our map, or generate a new one if needed
            if (!colorMap[yFieldName] && isNewColorMap) {
              colorMap[yFieldName] = getColorByIndex(0);
            }
            
            // Determine if this field should be rendered as a line
            const isLine = isLineType(chart, yFieldName);
            
            chartLegends = [{
              id: yFieldName, // Add the raw field name as id
              label: yFieldName, // Show API field name as-is without formatting
              color: colorMap[yFieldName] || getColorByIndex(0),
              value: total,
              shape: isLine ? 'circle' as const : 'square' as const
            }];
          } else {
            chartLegends = []; // No legend if no data
          }
        } else {
          // Chart with groupBy but not stacked - show individual data points
          // Filter out items with zero or near-zero values
          chartLegends = data
            .filter(item => {
              const value = Number(item[yAxisFields[0]]) || 0;
              // Filter out items with zero or very small values (to handle floating point precision)
              return Math.abs(value) > 0.001;
            })
            .map((item, index) => {
              const label = String(item[xField]);
              const id = label; // For non-date based, id and label are the same
              newLabels.push(id);
              
              // Use consistent color from our map, or generate a new one if needed
              if (!colorMap[id] && isNewColorMap) {
                colorMap[id] = getColorByIndex(index);
              }
              
              return {
                id,
                label,
                color: colorMap[id] || getColorByIndex(index),
                value: Number(item[yAxisFields[0]]) || 0,
                // Bar chart series are always squares
                shape: chart.chartType === 'line' ? 'circle' as const : 'square' as const
              };
            });
        }
      }
    }
    
    console.log("Generated legend items:", chartLegends);
    
    // Keep track of sorted order for consistent rendering
    if (isNewColorMap && chartLegends.length > 0) {
      // If this is the first time, remember the order of labels and their colors
      const newColorMap: Record<string, string> = {};
      chartLegends.forEach((legend, index) => {
        newColorMap[legend.label] = colorMap[legend.label] || getColorByIndex(index);
      });
      
      setLegendColorMaps(prev => ({
        ...prev,
        [chartId]: newColorMap
      }));
      
      console.log("Created new color map:", newColorMap);
    } else if (!isNewColorMap) {
      // If we already have a color map, maintain order from previous legend set
      const existingLegends = legends[chartId] || [];
      const existingLabels = existingLegends.map(l => l.label);
      
      // Sort the new legends to match the previous order as much as possible
      const oldLabels = existingLabels.filter(label => newLabels.includes(label));
      const newOnlyLabels = newLabels.filter(label => !existingLabels.includes(label));
      
      // Combine old labels (in original order) with new labels
      const orderedLabels = [...oldLabels, ...newOnlyLabels];
      
      // Sort the legends to match this order
      chartLegends.sort((a, b) => {
        const indexA = orderedLabels.indexOf(a.label);
        const indexB = orderedLabels.indexOf(b.label);
        return indexA - indexB;
      });
    }
    
    // No longer limiting the number of legend items
    // Update legends state
    setLegends(prev => ({
      ...prev,
      [chartId]: chartLegends
    }));
  }, [charts, legendColorMaps, filterValues]);

  // Add a function to directly pass chart colors to ChartRenderer
  const syncLegendColors = useCallback((chartId: string, chartColorMap: Record<string, string>) => {
    if (!chartColorMap || Object.keys(chartColorMap).length === 0) return;
    
    // Find the chart
    const chart = charts.find(c => c.id === chartId);
    
    console.log(`Received colors for chart ${chartId}:`, {
      chartType: chart?.chartType,
      colorMapSize: Object.keys(chartColorMap).length,
      colorMap: chartColorMap
    });
    
    // Compare with existing color map to prevent unnecessary updates
    const existingColorMap = legendColorMaps[chartId] || {};
    if (JSON.stringify(existingColorMap) === JSON.stringify(chartColorMap)) {
      return;
    }
    
    setLegendColorMaps(prev => ({
      ...prev,
      [chartId]: chartColorMap
    }));
    
    // Also generate legends using the received color map and current chart data
    const currentData = chartData[chartId];
    if (chart && currentData && currentData.length > 0) {
      console.log(`Generating legends for ${chart.chartType} chart ${chartId} with received colors`);
      
      // Create legends based on the color map received from the chart
      const chartLegends: (Legend & { shape?: 'circle' | 'square' })[] = Object.entries(chartColorMap).map(([label, color]) => {
        // Calculate total value for this legend item
        let value = 0;
        
        // For area charts, try to calculate the total value
        if (chart.chartType === 'area' || chart.chartType === 'stacked-area') {
          // Get the y-axis field name
          const yField = typeof chart.dataMapping.yAxis === 'string' ? 
            chart.dataMapping.yAxis : 
            Array.isArray(chart.dataMapping.yAxis) ? 
              getFieldName(chart.dataMapping.yAxis[0]) : 
              getFieldName(chart.dataMapping.yAxis);
          
          // If this is a multi-series chart, the label might be a field name
          if (Array.isArray(chart.dataMapping.yAxis) && chart.dataMapping.yAxis.length > 1) {
            // Convert label back to field name (reverse the formatting)
            const fieldName = label.toLowerCase().replace(/\s+/g, '_');
            value = currentData.reduce((sum, item) => sum + (Number(item[fieldName]) || 0), 0);
          } else {
            // Single series - use the y-axis field
            value = currentData.reduce((sum, item) => sum + (Number(item[yField]) || 0), 0);
          }
        }
        
        return {
          label,
          color,
          value: value || 0,
          shape: 'square' as const // Area charts use square shapes
        };
      });
      
      // Sort by value (highest first)
      chartLegends.sort((a, b) => {
        const aValue = a.value ?? 0;
        const bValue = b.value ?? 0;
        return bValue - aValue;
      });
      
      console.log(`Generated ${chartLegends.length} legend items from color map:`, chartLegends);
      
      // Update legends state
      setLegends(prev => ({
        ...prev,
        [chartId]: chartLegends
      }));
    }
  }, [legendColorMaps, charts, chartData]);

  // Handle modal filter value updates from expanded charts
  const handleModalFilterUpdate = useCallback((chartId: string, newModalFilters: Record<string, string>) => {
    console.log('Dashboard: Updating modal filter values for chart', chartId, newModalFilters);
    setModalFilterValues(prev => ({
      ...prev,
      [chartId]: newModalFilters
    }));
  }, []);

  // Inside the render method, after setting state, we need to prepare charts with filter callbacks
  // The existing charts array will be updated to include the onFilterChange callback for each chart
  useEffect(() => {
    if (charts.length > 0) {
      // Create a new array with the onFilterChange callback added to each chart
      const updatedCharts = charts.map(chart => ({
        ...chart,
        // Add the onFilterChange callback that will be called when filters change in the modal
        onFilterChange: (updatedFilters: Record<string, string>) => {
          console.log(`Filter changed from modal for chart ${chart.id}:`, updatedFilters);
          
          // Update our filter state with the new values from the modal
          setFilterValues(prev => ({
            ...prev,
            [chart.id]: {
              ...prev[chart.id],
              ...updatedFilters
            }
          }));
          
          // Fetch updated data with the new filters
          fetchChartDataWithFilters({
            ...chart,
            additionalOptions: {
              ...chart.additionalOptions,
              filters: {
                ...chart.additionalOptions?.filters,
                // Update active values to match the filters from the modal
                timeFilter: chart.additionalOptions?.filters?.timeFilter ? {
                  ...chart.additionalOptions.filters.timeFilter,
                  activeValue: updatedFilters.timeFilter || chart.additionalOptions.filters.timeFilter.activeValue
                } : undefined,
                currencyFilter: chart.additionalOptions?.filters?.currencyFilter ? {
                  ...chart.additionalOptions.filters.currencyFilter,
                  activeValue: updatedFilters.currencyFilter || chart.additionalOptions.filters.currencyFilter.activeValue
                } : undefined,
                displayModeFilter: chart.additionalOptions?.filters?.displayModeFilter ? {
                  ...chart.additionalOptions.filters.displayModeFilter,
                  activeValue: updatedFilters.displayMode || chart.additionalOptions.filters.displayModeFilter.activeValue
                } : undefined
              }
            }
          });
        }
      }));
      
      // Update the charts state with the new callback-enabled charts
      setCharts(updatedCharts);
    }
  }, [charts.length]); // Only run when charts array length changes (initial load)

  // When chart data changes, ensure legends are updated for all charts
  useEffect(() => {
    Object.entries(chartData).forEach(([chartId, data]) => {
      if (data && data.length > 0) {
        // Find the chart
        const chart = charts.find(c => c.id === chartId);
        if (chart) {
          console.log(`Updating legends for ${chart.chartType} chart ${chartId} with ${data.length} data points`);
          updateLegends(chartId, data);
        }
      }
    });
  }, [chartData, charts]);

  // Add session storage hydration (immediately after setting isClient)
  useEffect(() => {
    setIsClient(true);
    
    // Check session storage for previously loaded data to instantly populate UI
    if (typeof window !== 'undefined') {
      const previousCharts = SessionStorageCache.getItem(`charts_${pageId}`);
      const previousData = SessionStorageCache.getItem(`chartData_${pageId}`);
      const previousLegends = SessionStorageCache.getItem(`legends_${pageId}`);
      
      // If we have cached data, show it immediately while fresh data loads
      if (previousCharts && previousData) {
        console.log('Using session cache for immediate UI rendering');
        // Immediately render charts from session storage for instant feedback
        setCharts(previousCharts);
        setChartData(previousData);
        
        if (previousLegends) {
          setLegends(previousLegends);
        }
        
        // Important: Don't skip loading fresh data, but show UI immediately
        setIsPageLoading(false);
      }
    }
    
    // Continue with normal loading...
    // ... existing code
  }, [pageId]);

  // Save to session storage when data changes for fast subsequent page loads
  useEffect(() => {
    if (Object.keys(chartData).length > 0 && charts.length > 0) {
      SessionStorageCache.setItem(`charts_${pageId}`, charts);
      SessionStorageCache.setItem(`chartData_${pageId}`, chartData);
      SessionStorageCache.setItem(`legends_${pageId}`, legends);
    }
  }, [chartData, charts, legends, pageId]);

  // Add handler to toggle series visibility
  const handleLegendClick = useCallback((chartId: string, label: string) => {
    console.log('Dashboard handleLegendClick:', { chartId, label });
    setHiddenSeries(prev => {
      const chartHidden = prev[chartId] || [];
      const newHidden = chartHidden.includes(label)
        ? chartHidden.filter(id => id !== label)
        : [...chartHidden, label];
      
      console.log('Updated hiddenSeries for chart', chartId, ':', newHidden);
      
      return {
        ...prev,
        [chartId]: newHidden
      };
    });
  }, []);

  // Add after handleLegendClick

  const handleLegendDoubleClick = useCallback((chartId: string, fieldId: string) => {
    setHiddenSeries(prev => {
      const currentHidden = prev[chartId] || [];
      const allKeys = legends[chartId]?.map(l => l.id || l.label) || [];
      if (allKeys.length === 0) return prev;

      if (currentHidden.length === allKeys.length - 1 && !currentHidden.includes(fieldId)) {
        // Restore all
        return { ...prev, [chartId]: [] };
      } else {
        // Isolate this series
        return { ...prev, [chartId]: allKeys.filter(f => f !== fieldId) };
      }
    });
  }, [legends]);

  // Section filter for enhanced-dashboard-renderer compatibility
  const filteredCharts = useMemo(() => {
    if (!section) return charts;
    return charts.filter(chart => chart.section === section);
  }, [charts, section]);

  // Transform charts based on current filter values for field-switching
  const transformedCharts = useMemo(() => {
    return filteredCharts.map(chart => {
      const currencyFilter = chart.additionalOptions?.filters?.currencyFilter;
      const selectedCurrency = (filterValues[chart.id] || {})['currencyFilter'];
      
      // Only transform if this is a field-switcher type with a selected currency
      if (currencyFilter?.type === 'field_switcher' && selectedCurrency && currencyFilter.columnMappings) {
        const currentData = chartData[chart.id];
        if (currentData && currentData.length > 0) {
          return transformChartConfigForCurrency(chart, selectedCurrency);
        }
      }
      
      return chart;
    });
  }, [filteredCharts, filterValues, chartData, transformChartConfigForCurrency]);

  // Memoize onDataLoaded callbacks for all charts to prevent recreating them
  const onDataLoadedCallbacks = useMemo(() => {
    const callbacks: Record<string, (data: any[]) => void> = {};
    
    filteredCharts.forEach(chart => {
      callbacks[chart.id] = (data: any[]) => {
        // Store initial data and update legends
        if (!chartData[chart.id] || chartData[chart.id].length === 0) {
          setChartData(prev => ({
            ...prev,
            [chart.id]: data
          }));
          updateLegends(chart.id, data);
        }
        
        // Set loading to false when data is loaded
        updateChartState(chart.id, { loading: false });
      };
    });
    
    return callbacks;
  }, [filteredCharts, chartData, updateLegends, updateChartState]);

  // Batch functions for chart state updates

  if (!isClient) {
    return null; // Return nothing during SSR
  }

  // Don't show page loading if we already have data from session storage
  if (isPageLoading && Object.keys(chartData).length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-200px)] bg-black">
        <div className="relative w-18 h-18">
          {/* Outer spinning ring */}
          <div className="absolute inset-0 border-t-2 border-r-2 border-blue-400/60 rounded-full animate-spin"></div>
          
          {/* Middle spinning ring - reverse direction */}
          <div className="absolute inset-2 border-b-2 border-l-2 border-purple-400/80 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
          
          {/* Inner pulse */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 bg-teal-400 rounded-full animate-pulse"></div>
          </div>
        </div>
        
        
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {transformedCharts.map((chart) => (
        <div 
          key={chart.id}
          className={`${(chart.width || 2) === 2 ? 'md:col-span-1' : 'md:col-span-2'}`}
        >
          <MemoizedChartCard 
          title={chart.title}
          description={chart.subtitle}
          accentColor="blue"
          onExpandClick={() => toggleChartExpanded(chart.id)}
          onDownloadClick={() => downloadCSV(chart)}
          isDownloading={downloadingCharts[chart.id]}
          isLoading={false}
          legendWidth="1/5"
          className="md:h-[500px] h-auto"
          id={`chart-card-${chart.id}`}
          chart={chart}
          filterValues={filterValues[chart.id]}
          
          // Add filter bar for regular chart view using ChartRenderer's filter props
          filterBar={
            // Show filter bar if there are filters OR if this is a stacked chart
            (chart.additionalOptions?.filters || isStackedBarChart(chart)) && (
            <div className="flex flex-wrap gap-3 items-center">
              {/* Time Filter */}
                              {chart.additionalOptions?.filters?.timeFilter && (
                  <MemoizedTimeFilterSelector
                    value={filterValues[chart.id]?.['timeFilter'] || getDefaultTimeFilterValue(chart.additionalOptions.filters.timeFilter.options)}
                    onChange={(value) => handleFilterChange(chart.id, 'timeFilter', value)}
                    options={chart.additionalOptions.filters.timeFilter.options.map((value: string) => ({ 
                      value, 
                      label: value 
                    }))}
                />
              )}
              
              {/* Currency Filter */}
              {chart.additionalOptions?.filters?.currencyFilter && (
                <MemoizedCurrencyFilter
                  currency={(filterValues[chart.id] || {})['currencyFilter'] || chart.additionalOptions.filters.currencyFilter.activeValue || chart.additionalOptions.filters.currencyFilter.options[0]}
                  options={chart.additionalOptions.filters.currencyFilter.options}
                  onChange={(value) => handleFilterChange(chart.id, 'currencyFilter', value)}
                />
              )}
              
              {/* Display Mode Filter - always show for stacked charts, or when explicitly configured */}
              {(isStackedBarChart(chart) || chart.additionalOptions?.filters?.displayModeFilter) && (
                <MemoizedDisplayModeFilter
                  mode={filterValues[chart.id]?.['displayMode'] as DisplayMode || 'absolute'}
                  onChange={(value) => handleFilterChange(chart.id, 'displayMode', value)}
                  disabled={
                    // Disable for stacked charts with negative values
                    isStackedBarChart(chart) && 
                    chartData[chart.id]?.some((item: any) => {
                      // For stacked bar charts with a group by field
                      if (chart.dataMapping.groupBy) {
                        // Check if any value is negative
                        const yField = typeof chart.dataMapping.yAxis === 'string' ?
                          chart.dataMapping.yAxis :
                          Array.isArray(chart.dataMapping.yAxis) ?
                            getFieldName(chart.dataMapping.yAxis[0]) :
                            getFieldName(chart.dataMapping.yAxis);
                        return Number(item[yField]) < 0;
                      }
                      // For stacked bar charts with multiple y fields
                      else if (Array.isArray(chart.dataMapping.yAxis) && chart.dataMapping.yAxis.length > 1) {
                        return chart.dataMapping.yAxis.some(field => {
                          const fieldName = typeof field === 'string' ? field : field.field;
                          return Number(item[fieldName]) < 0;
                        });
                      }
                      return false;
                    })
                  }
                />
              )}
            </div>
          )}
          
          legend={
            <>
              {legends[chart.id] && legends[chart.id].length > 0 ? (
                legends[chart.id].map(legend => (
                    <MemoizedLegendItem 
                      key={legend.id || legend.label}
                      label={truncateLabel(legend.label)} 
                      color={legend.color} 
                      shape={legend.shape || 'square'}
                      tooltipText={legend.value ? formatCurrency(legend.value) : undefined}
                      onClick={() => handleLegendClick(chart.id, legend.id || legend.label)}
                      onDoubleClick={() => handleLegendDoubleClick(chart.id, legend.id || legend.label)}
                      inactive={(hiddenSeries[chart.id] || []).includes(legend.id || legend.label)}
                    />
                ))
              ) : null}
            </>
          }
        >
          <div 
            className="h-[310px] md:h-[360px] relative" 
            id={`chart-container-${chart.id}`}
            data-testid={`chart-container-${chart.id}`}
          >
            <ChartRenderer 
              key={chart.id}
              chartConfig={chart}
              preloadedData={chartData[chart.id] || []}
              onDataLoaded={onDataLoadedCallbacks[chart.id]}
              isExpanded={expandedCharts[chart.id]}
              onCloseExpanded={() => toggleChartExpanded(chart.id)}
              filterValues={expandedCharts[chart.id] && modalFilterValues[chart.id] ? modalFilterValues[chart.id] : (filterValues[chart.id] || {})}
              onFilterChange={(filterType, value) => {
                // Check if this chart is in modal mode
                const isModal = expandedCharts[chart.id];
                
                // Handle individual filter changes from ChartRenderer's internal calls
                if (typeof filterType === 'string' && typeof value === 'string') {
                  if (isModal) {
                    // For modal charts, update modal filter values instead
                    handleModalFilterUpdate(chart.id, { [filterType]: value });
                  } else {
                    handleFilterChange(chart.id, filterType, value);
                  }
                } else if (typeof filterType === 'object' && filterType !== null && !value) {
                  // Handle filter changes from chart components
                  const newFilters = filterType as Record<string, string>;
                  const currentFilters = isModal ? 
                    (modalFilterValues[chart.id] || filterValues[chart.id] || {}) : 
                    (filterValues[chart.id] || {});
                  const filterKeys = Object.keys(newFilters);
                  
                  // Check if this is a single time filter change for time aggregation charts
                  const isTimeAggregationEnabled = chart.additionalOptions?.enableTimeAggregation;
                  const isSingleTimeFilter = filterKeys.length === 1 && filterKeys[0] === 'timeFilter' && isTimeAggregationEnabled;
                  
                  if (isSingleTimeFilter) {
                    // Handle single time filter change - this should be client-side only
                    console.log(`Dashboard: Single time filter change for time aggregation chart - client-side only (modal: ${isModal})`);
                    const [key, newValue] = Object.entries(newFilters)[0];
                    if (currentFilters[key] !== newValue) {
                      if (isModal) {
                        // Update modal filter values for expanded charts
                        handleModalFilterUpdate(chart.id, { [key]: newValue });
                      } else {
                        // Update regular filter values without triggering API call
                        setFilterValues(prev => ({
                          ...prev,
                          [chart.id]: {
                            ...prev[chart.id],
                            [key]: newValue
                          }
                        }));
                      }
                    }
                  } else {
                    // Handle other filter changes or bulk updates
                    console.log(`Dashboard: Bulk filter change or non-time filter (modal: ${isModal})`);
                    Object.entries(newFilters).forEach(([key, newValue]) => {
                      if (currentFilters[key] !== newValue) {
                        if (isModal) {
                          // For modal charts, always use modal filter update
                          handleModalFilterUpdate(chart.id, { [key]: newValue });
                        } else {
                          // For regular charts, may trigger API calls
                          handleFilterChange(chart.id, key, newValue);
                        }
                      }
                    });
                  }
                } else {
                  console.warn('Unexpected onFilterChange call:', { filterType, value });
                }
              }}
              colorMap={legendColorMaps[chart.id]}
              onColorsGenerated={(colorMap) => syncLegendColors(chart.id, colorMap)}
              hiddenSeries={hiddenSeries[chart.id] || []}
              isLoading={loadingCharts[chart.id] || false}
              onModalFilterUpdate={expandedCharts[chart.id] ? (filters) => handleModalFilterUpdate(chart.id, filters) : undefined}
            />
          </div>
        </MemoizedChartCard>
        </div>
      ))}
    </div>
  );
} 