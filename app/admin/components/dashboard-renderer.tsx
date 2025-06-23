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
import { useChartScreenshot } from '../../components/shared';

// Helper function to extract field name from YAxisConfig or use string directly
function getFieldName(field: string | YAxisConfig): string {
  return typeof field === 'string' ? field : field.field;
}

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
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

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

// Enhanced preload charts with better parallel processing and timing
const preloadChartConfigs = async (pageId: string): Promise<ChartConfig[]> => {
  const startTime = performance.now();
  console.log(`⏱️ [${pageId}] Starting chart config preload...`);
  
  // Check if we have cached charts for this page
  if (PAGE_CONFIG_CACHE[pageId]) {
    const cachedConfig = PAGE_CONFIG_CACHE[pageId];
    const now = Date.now();
    
    // Use cached charts if not expired
    if (now - cachedConfig.timestamp < cachedConfig.expiresIn) {
      const cacheTime = performance.now() - startTime;
      console.log(`⚡ [${pageId}] Using cached chart configs (${cacheTime.toFixed(2)}ms)`);
      return Promise.resolve(cachedConfig.charts);
    }
  }
  
  try {
    // Fetch charts from API with optimized timeout and parallel processing
    const fetchStartTime = performance.now();
    console.log(`🌐 [${pageId}] Fetching chart configs from API...`);
    
    // Create abort controller with aggressive timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`⏰ [${pageId}] Config API timeout after 2s, aborting...`);
      controller.abort();
    }, 2000); // Reduced from 5000ms to 2000ms for faster fallback
    
    try {
      // Use the optimized getChartConfigsByPage function
      const charts = await getChartConfigsByPage(pageId);
      clearTimeout(timeoutId);
      
      const fetchTime = performance.now() - fetchStartTime;
      console.log(`✅ [${pageId}] Chart configs fetched (${fetchTime.toFixed(2)}ms) - ${charts.length} charts`);
      
      // Cache the charts for future use
      PAGE_CONFIG_CACHE[pageId] = {
        charts,
        timestamp: Date.now(),
        expiresIn: CACHE_DURATION
      };
      
      const totalTime = performance.now() - startTime;
      console.log(`🎯 [${pageId}] Chart config preload complete (${totalTime.toFixed(2)}ms total)`);
      
      return charts;
    } catch (apiError) {
      clearTimeout(timeoutId);
      
      // If aborted due to timeout, try to get from cache or return fallback
      if (controller.signal.aborted) {
        console.warn(`⏰ [${pageId}] API timeout - checking for fallback options...`);
        
        // Check if we have expired cache that we can use
        if (PAGE_CONFIG_CACHE[pageId]) {
          const expiredCharts = PAGE_CONFIG_CACHE[pageId].charts;
          console.log(`🔄 [${pageId}] Using expired cache as fallback - ${expiredCharts.length} charts`);
          return expiredCharts;
        }
        
        // Try localStorage as final fallback
        if (typeof window !== 'undefined') {
          try {
            const storageKey = `solana-charts-${pageId}`;
            const storedCharts = localStorage.getItem(storageKey);
            if (storedCharts) {
              const cachedData = JSON.parse(storedCharts);
              if (cachedData.charts && Array.isArray(cachedData.charts)) {
                console.log(`💾 [${pageId}] Using localStorage fallback - ${cachedData.charts.length} charts`);
                return cachedData.charts;
              }
            }
          } catch (storageError) {
            console.warn(`Failed to read localStorage fallback:`, storageError);
          }
        }
        
        // Return empty array if no fallback available
        console.warn(`⚠️ [${pageId}] No fallback available, returning empty charts`);
        return [];
      }
      
      throw apiError; // Re-throw if not a timeout
    }
  } catch (error) {
    const errorTime = performance.now() - startTime;
    console.error(`❌ [${pageId}] Error preloading charts (${errorTime.toFixed(2)}ms):`, error);
    
    // Return cached charts even if expired in case of error
    if (PAGE_CONFIG_CACHE[pageId]) {
      console.log(`🔄 [${pageId}] Falling back to expired cache`);
      return PAGE_CONFIG_CACHE[pageId].charts;
    }
    
    // Try localStorage as final fallback
    if (typeof window !== 'undefined') {
      try {
        const storageKey = `solana-charts-${pageId}`;
        const storedCharts = localStorage.getItem(storageKey);
        if (storedCharts) {
          const cachedData = JSON.parse(storedCharts);
          if (cachedData.charts && Array.isArray(cachedData.charts)) {
            console.log(`💾 [${pageId}] Emergency localStorage fallback - ${cachedData.charts.length} charts`);
            return cachedData.charts;
          }
        }
      } catch (storageError) {
        console.warn(`Failed to read emergency localStorage fallback:`, storageError);
      }
    }
    
    return [];
  }
};

// Enhanced batch fetch function with improved parallel execution and error resilience
const batchFetchChartData = async (charts: ChartConfig[], filterValues: Record<string, Record<string, string>>, enableCaching: boolean) => {
  const batchStartTime = performance.now();
  console.log(`⏱️ Starting batch data fetch for ${charts.length} charts...`);
  
  // Process all charts in parallel with larger batch sizes
  const chartPromises = charts.map((chart, index) => {
    const chartStartTime = performance.now();
    const chartFilters = filterValues[chart.id] || {};
    const cacheKey = `${chart.id}-${chart.apiEndpoint}-${JSON.stringify(chartFilters)}`;
    
    console.log(`🔍 [${index + 1}/${charts.length}] Processing chart: ${chart.title}`);
    
    // Check cache first
    if (CHART_DATA_CACHE[cacheKey]) {
      const cachedItem = CHART_DATA_CACHE[cacheKey];
      const now = Date.now();
      
      // Use cached data if not expired
      if (now - cachedItem.timestamp < cachedItem.expiresIn) {
        const cacheTime = performance.now() - chartStartTime;
        console.log(`⚡ [${chart.title}] Using cached data (${cacheTime.toFixed(2)}ms)`);
        return Promise.resolve({
          chartId: chart.id,
          data: cachedItem.data,
          fromCache: true,
          loadTime: cacheTime
        });
      }
    }
    
    // Fetch from API if not in cache
    console.log(`🌐 [${chart.title}] Fetching from API...`);
    return fetchChartData(chart, chartFilters, enableCaching)
      .then(data => {
        const loadTime = performance.now() - chartStartTime;
        console.log(`✅ [${chart.title}] API data loaded (${loadTime.toFixed(2)}ms) - ${data?.length || 0} rows`);
        return {
          chartId: chart.id,
          data,
          fromCache: false,
          loadTime
        };
      })
      .catch(error => {
        const errorTime = performance.now() - chartStartTime;
        console.error(`❌ [${chart.title}] Error fetching data (${errorTime.toFixed(2)}ms):`, error);
        
        // Try to use cached data as fallback if available, even if expired
        if (CHART_DATA_CACHE[cacheKey]) {
          console.log(`🔄 [${chart.title}] Using expired cache as fallback`);
          return {
            chartId: chart.id,
            data: CHART_DATA_CACHE[cacheKey].data,
            fromCache: true,
            error,
            loadTime: errorTime
          };
        }
        
        return {
          chartId: chart.id,
          data: [],
          error,
          loadTime: errorTime
        };
      });
  });
  
  // Wait for all chart data fetches to complete in parallel
  const allResults = await Promise.allSettled(chartPromises);
  
  const batchTime = performance.now() - batchStartTime;
  console.log(`🎯 Batch data fetch complete (${batchTime.toFixed(2)}ms total)`);
  
  // Process results and handle any failures
  const processedResults = allResults.map((result, index) => {
    if (result.status === 'fulfilled') {
      const chartResult = result.value;
      console.log(`📊 [${charts[index].title}] Result: ${chartResult.fromCache ? 'cached' : 'fresh'} data, ${chartResult.loadTime?.toFixed(2)}ms`);
      return chartResult;
    } else {
      console.error(`💥 [${charts[index].title}] Failed to fetch data:`, result.reason);
      return {
        chartId: charts[index].id,
        data: [],
        error: result.reason,
        loadTime: 0
      };
    }
  });
  
  // Summary statistics
  const totalLoadTime = processedResults.reduce((sum, result) => sum + (result.loadTime || 0), 0);
  const cachedCount = processedResults.filter(r => r.fromCache).length;
  const errorCount = processedResults.filter(r => (r as any).error).length;
  
  console.log(`📈 Batch Summary: ${charts.length} charts, ${cachedCount} cached, ${errorCount} errors, ${totalLoadTime.toFixed(2)}ms cumulative, ${batchTime.toFixed(2)}ms wall time`);
  
  return processedResults;
};

// Simplified fetch function to reduce overhead
const fetchChartData = async (
  chart: ChartConfig, 
  chartFilters: Record<string, string>,
  cacheEnabled: boolean = true
) => {
  const cacheKey = `chart_data_${chart.id}_${chart.apiEndpoint}_${JSON.stringify(chartFilters)}`;
  
  // First try to get from localStorage for instant rendering
  if (typeof window !== 'undefined' && cacheEnabled) {
    try {
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        const parsedCache = JSON.parse(cachedData);
        const now = Date.now();
        
        if (parsedCache.expires > now) {
          console.log(`Using localStorage cache for chart ${chart.id}`);
          
          // Update memory cache too
          const memoryCacheKey = `${chart.id}-${chart.apiEndpoint}-${JSON.stringify(chartFilters)}`;
          CHART_DATA_CACHE[memoryCacheKey] = {
            data: parsedCache.data,
            timestamp: parsedCache.timestamp,
            expiresIn: parsedCache.expires - parsedCache.timestamp
          };
          
          // If data is less than 5 minutes old, just return it
          if (now - parsedCache.timestamp < 5 * 60 * 1000) {
            return parsedCache.data;
          }
          
          // Otherwise refresh in background after returning cached data
          setTimeout(() => {
            fetchFromApi(chart, chartFilters, cacheKey, cacheEnabled).catch(console.error);
          }, 100);
          
          return parsedCache.data;
        }
      }
    } catch (e) {
      console.warn('Error reading from localStorage:', e);
      // Continue to API fetch on error
    }
  }
  
  // Not in localStorage, try memory cache
  const memoryCacheKey = `${chart.id}-${chart.apiEndpoint}-${JSON.stringify(chartFilters)}`;
  if (CHART_DATA_CACHE[memoryCacheKey] && cacheEnabled) {
    const cachedItem = CHART_DATA_CACHE[memoryCacheKey];
    const now = Date.now();
    
    if (now - cachedItem.timestamp < cachedItem.expiresIn) {
      console.log(`Using memory cache for chart ${chart.id}`);
      
      // If data is less than 5 minutes old, just return it
      if (now - cachedItem.timestamp < 5 * 60 * 1000) {
        return cachedItem.data;
      }
      
      // Otherwise refresh in background after returning cached data
      setTimeout(() => {
        fetchFromApi(chart, chartFilters, memoryCacheKey, cacheEnabled).catch(console.error);
      }, 500);
      
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
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Reduced from 8s to 5s for faster failure
    
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
  
  // Initialize screenshot functionality
  const { captureScreenshot } = useChartScreenshot();
  
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
      return await preloadChartConfigs(pageId);
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
      const totalStartTime = performance.now();
      console.log(`🚀 [${pageId}] Starting dashboard load sequence...`);
      
      try {
        // Phase 1: Load chart configurations
        const configStartTime = performance.now();
        console.log(`📋 [${pageId}] Phase 1: Loading chart configurations...`);
        
        const loadedCharts = await initializeCharts();
        
        const configTime = performance.now() - configStartTime;
        console.log(`✅ [${pageId}] Phase 1 complete (${configTime.toFixed(2)}ms) - ${loadedCharts.length} charts loaded`);
        
        if (!mounted) return;
        
        // Phase 2: Initialize chart states
        const stateInitStartTime = performance.now();
        console.log(`⚙️ [${pageId}] Phase 2: Initializing chart states...`);
        
        setCharts(loadedCharts);
        
        // Initialize chart states in batch
        const initialChartStates: Record<string, Partial<{ expanded: boolean; downloading: boolean; screenshotting: boolean; loading: boolean }>> = {};
        const initialChartData: Record<string, any[]> = {};
        
        loadedCharts.forEach(chart => {
          initialChartStates[chart.id] = { loading: true };
          initialChartData[chart.id] = [];
        });
        
        // Batch update all states at once
        batchUpdateChartStates(initialChartStates);
        setChartData(initialChartData);
        
        const stateInitTime = performance.now() - stateInitStartTime;
        console.log(`✅ [${pageId}] Phase 2 complete (${stateInitTime.toFixed(2)}ms) - States initialized for ${loadedCharts.length} charts`);
        
        // Phase 3: Load chart data in parallel
        const dataLoadStartTime = performance.now();
        console.log(`📊 [${pageId}] Phase 3: Loading chart data in parallel...`);
        
        const dataLoadPromise = wrappedBatchFetchChartData(loadedCharts, filterValues);
        
        // Process results as they come in
        const results = await dataLoadPromise;
        
        const dataLoadTime = performance.now() - dataLoadStartTime;
        console.log(`✅ [${pageId}] Phase 3 complete (${dataLoadTime.toFixed(2)}ms) - Data loaded for ${results.length} charts`);
        
        if (!mounted) return;
            
        // Phase 4: Process results and update UI
        const uiUpdateStartTime = performance.now();
        console.log(`🎨 [${pageId}] Phase 4: Updating UI with loaded data...`);
        
        // Process all results in batch
        const newChartData: Record<string, any[]> = {};
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
        }
        
        const uiUpdateTime = performance.now() - uiUpdateStartTime;
        console.log(`✅ [${pageId}] Phase 4 complete (${uiUpdateTime.toFixed(2)}ms) - UI updated`);
        
        // Final summary
        const totalTime = performance.now() - totalStartTime;
        console.log(`🎯 [${pageId}] DASHBOARD LOAD COMPLETE!`);
        console.log(`⏱️ [${pageId}] TIMING BREAKDOWN:`);
        console.log(`   📋 Config Load: ${configTime.toFixed(2)}ms (${(configTime/totalTime*100).toFixed(1)}%)`);
        console.log(`   ⚙️ State Init: ${stateInitTime.toFixed(2)}ms (${(stateInitTime/totalTime*100).toFixed(1)}%)`);
        console.log(`   📊 Data Load: ${dataLoadTime.toFixed(2)}ms (${(dataLoadTime/totalTime*100).toFixed(1)}%)`);
        console.log(`   🎨 UI Update: ${uiUpdateTime.toFixed(2)}ms (${(uiUpdateTime/totalTime*100).toFixed(1)}%)`);
        console.log(`   🏁 TOTAL: ${totalTime.toFixed(2)}ms`);
        
      } catch (error) {
        const errorTime = performance.now() - totalStartTime;
        console.error(`💥 [${pageId}] Error loading charts (${errorTime.toFixed(2)}ms):`, error);
        if (mounted) {
          setIsPageLoading(false);
        }
      }
    }
    
    loadCharts();
    
    return () => {
      mounted = false;
    };
  }, [pageId, overrideCharts, initializeCharts, wrappedBatchFetchChartData, filterValues, batchUpdateChartStates]);

  // Simplified fetchChartDataWithFilters for individual chart updates
  const fetchChartDataWithFilters = useCallback(async (chart: ChartConfig, skipLoadingState = false) => {
    try {
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
    updateChartState(chartId, { expanded: !getChartState(chartId, 'expanded') });
  };

  // Handle screenshot capture for chart using the new ChartScreenshot component
  const handleChartScreenshot = async (chart: ChartConfig) => {
    try {
      // Set loading state
      updateChartState(chart.id, { screenshotting: true });
      
      // Use the screenshot capture hook
      const cardElementId = `chart-card-${chart.id}`;
      await captureScreenshot(chart, cardElementId);
      
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      // Error handling is already done in the hook
    } finally {
      // Clear loading state
      updateChartState(chart.id, { screenshotting: false });
    }
  };

  // Handle filter changes
  const handleFilterChange = async (chartId: string, filterType: string, value: string) => {
    console.log(`Filter changed for chart ${chartId}: ${filterType} = ${value}`);
    
    // Use a function reference to prevent infinite loops
    if (filterValues[chartId]?.[filterType] === value) {
      // Skip update if the value hasn't changed
      return;
    }
    
    // Find the chart first to check time aggregation
    const chart = charts.find(c => c.id === chartId);
    if (!chart) return;
    
    // Check if this chart has time aggregation enabled
    const isTimeAggregationEnabled = chart.additionalOptions?.enableTimeAggregation;
    const isTimeFilterChange = filterType === 'timeFilter';
    const isDisplayModeFilterChange = filterType === 'displayModeFilter' || filterType === 'displayMode';
    
    // Skip API calls for time aggregation enabled charts for both timeFilter AND displayModeFilter
    if (isTimeAggregationEnabled && (isTimeFilterChange || isDisplayModeFilterChange)) {
      console.log(`Dashboard-renderer: Skipping API call for time aggregation chart ${chartId}, ${filterType}: ${value}`);
      
      // Update filter value only (ChartRenderer will handle the data processing)
      setFilterValues(prev => ({
        ...prev,
        [chartId]: {
          ...prev[chartId],
          [filterType]: value
        }
      }));
      
      // No API call needed - ChartRenderer handles time aggregation and StackedBarChart handles displayMode client-side
      return;
    }
    
    // Set loading state when filter changes (for non-time-aggregation cases)
    updateChartState(chartId, { loading: true });
    
    // Update filter value
    setFilterValues(prev => ({
      ...prev,
      [chartId]: {
        ...prev[chartId],
        [filterType]: value
      }
    }));
    
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
      
      // Process all fields from both axes
      const allFields = [...leftAxisFields, ...rightAxisFields];
      
      // Calculate totals for each field for tooltips
      const fieldTotals: Record<string, number> = {};
      
      allFields.forEach(field => {
        fieldTotals[field] = data.reduce((sum, item) => 
          sum + (Number(item[field]) || 0), 0);
        
        newLabels.push(field);
        
        // Assign colors if creating a new color map
        if (isNewColorMap && !colorMap[field]) {
          // Left axis fields get blue-ish colors, right axis fields get purple-ish colors
          const isRightAxis = rightAxisFields.includes(field);
          const index = isRightAxis 
            ? rightAxisFields.indexOf(field)
            : leftAxisFields.indexOf(field);
          
          colorMap[field] = isRightAxis 
            ? getColorByIndex(index + leftAxisFields.length) // Offset to avoid color conflicts
            : getColorByIndex(index);
        }
      });
      
      // Create legend items for all fields
      chartLegends = allFields.map(field => {
        const isRightAxis = rightAxisFields.includes(field);
        const fieldName = field.replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        return {
          id: field, // Add the raw field name as id
          label: `${fieldName}`,
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
      chartLegends = uniqueGroups
        .filter(group => group !== null && group !== undefined)
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
      chartLegends = pieItems.map((item, index) => {
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
          // For multi-series area charts, use the y-axis field names as legends
          chartLegends = yAxisFields.map((field, index) => {
            // Calculate the total for this field across all data points
            const total = data.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
            
            // Format the field name to be more readable
            const label = field.replace(/_/g, ' ')
              .split(' ')
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            
            newLabels.push(field); // Use raw field name instead of formatted label
            
            // Use consistent color from our map, or generate a new one if needed
            if (!colorMap[field] && isNewColorMap) { // Use field instead of label
              colorMap[field] = getColorByIndex(index);
            }
            
            return {
              id: field, // Add the raw field name as id
              label,
              color: colorMap[field] || getColorByIndex(index), // Use field instead of label
              value: total,
              shape: 'square' as const // Area charts use square shapes
            };
          });
        } else {
          // For single-series area charts, use a single legend entry with the y-axis name
          const yFieldName = getFieldName(yAxisFields[0]);
          const total = data.reduce((sum, item) => sum + (Number(item[yFieldName]) || 0), 0);
          const label = yFieldName.replace(/_/g, ' ')
              .split(' ')
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          
          newLabels.push(yFieldName); // Use raw field name instead of formatted label
          
          // Use consistent color from our map, or generate a new one if needed
          if (!colorMap[yFieldName] && isNewColorMap) { // Use field instead of label
            colorMap[yFieldName] = getColorByIndex(0);
          }
          
          chartLegends = [{
            id: yFieldName, // Add the raw field name as id
            label,
            color: colorMap[yFieldName] || getColorByIndex(0), // Use field instead of label
            value: total,
            shape: 'square' as const // Area charts use square shapes
          }];
        }
      } else {
        // For non-date based area charts, use data points as legend entries
        chartLegends = data
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
          // For multi-series charts, use the y-axis field names as legends
          // Format the field names and assign colors
          chartLegends = yAxisFields.map((field, index) => {
            // Calculate the total for this field across all data points
            const total = data.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
            
            // Format the field name to be more readable
            const label = field.replace(/_/g, ' ')
              .split(' ')
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            
            newLabels.push(field); // Use raw field name instead of formatted label
            
            // Use consistent color from our map, or generate a new one if needed
            if (!colorMap[field] && isNewColorMap) { // Use field instead of label
              colorMap[field] = getColorByIndex(index);
            }
            
            // Determine if this field should be rendered as a line
            const isLine = isLineType(chart, field);
            
            return {
              id: field, // Add the raw field name as id
              label,
              color: colorMap[field] || getColorByIndex(index), // Use field instead of label
              value: total,
              shape: isLine ? 'circle' as const : 'square' as const
            };
          });
        } else {
          // For single-series time charts, use a single legend entry with the chart title or y-axis name
          const yFieldName = getFieldName(yAxisFields[0]);
          const total = data.reduce((sum, item) => sum + (Number(item[yFieldName]) || 0), 0);
          const label = yFieldName.replace(/_/g, ' ')
              .split(' ')
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          
          newLabels.push(yFieldName); // Use raw field name instead of formatted label
          
          // Use consistent color from our map, or generate a new one if needed
          if (!colorMap[yFieldName] && isNewColorMap) { // Use field instead of label
            colorMap[yFieldName] = getColorByIndex(0);
          }
          
          // Determine if this field should be rendered as a line
          const isLine = isLineType(chart, yFieldName);
          
          chartLegends = [{
            id: yFieldName, // Add the raw field name as id
            label,
            color: colorMap[yFieldName] || getColorByIndex(0), // Use field instead of label
            value: total,
            shape: isLine ? 'circle' as const : 'square' as const
          }];
        }
      } else {
        // For non-date based charts, use data points as legend entries
        // Don't limit to just 5 items, show all of them for consistency with BarChart
        chartLegends = data
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
  }, [charts, legendColorMaps]);

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

  // Filter charts by section if specified - must be before conditional returns
  const filteredCharts = useMemo(() => {
    if (!section) return charts;
    return charts.filter(chart => chart.section === section);
  }, [charts, section]);

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

  // Add listener for background chart config updates
  useEffect(() => {
    if (!isClient) return;
    
    const handleChartConfigsUpdated = (event: CustomEvent) => {
      const { pageId: updatedPageId, charts: updatedCharts } = event.detail;
      
      if (updatedPageId === pageId) {
        console.log(`🔄 [Config Load] Background config update received for page ${pageId} - ${updatedCharts.length} charts`);
        
        // Only update if we currently have no charts or fewer charts
        if (charts.length === 0 || updatedCharts.length > charts.length) {
          console.log(`✅ [Config Load] Applying background config update`);
          setCharts(updatedCharts);
          
          // Re-initialize states for new charts
          const initialChartStates: Record<string, Partial<{ expanded: boolean; downloading: boolean; screenshotting: boolean; loading: boolean }>> = {};
          const initialChartData: Record<string, any[]> = {};
          
                     updatedCharts.forEach((chart: ChartConfig) => {
             if (!getChartState(chart.id, 'loading')) {
               initialChartStates[chart.id] = { loading: true };
               initialChartData[chart.id] = [];
             }
           });
          
          if (Object.keys(initialChartStates).length > 0) {
            batchUpdateChartStates(initialChartStates);
            setChartData(prev => ({ ...prev, ...initialChartData }));
            
            // Load data for new charts
            wrappedBatchFetchChartData(updatedCharts, filterValues).then(results => {
              const newChartData: Record<string, any[]> = {};
              const loadingUpdates: Record<string, Partial<{ expanded: boolean; downloading: boolean; screenshotting: boolean; loading: boolean }>> = {};
              
              results.forEach(result => {
                newChartData[result.chartId] = result.data || [];
                loadingUpdates[result.chartId] = { loading: false };
              });
              
              setChartData(prev => ({ ...prev, ...newChartData }));
              batchUpdateChartStates(loadingUpdates);
            }).catch(error => {
              console.error('Error loading data for updated charts:', error);
            });
          }
        }
      }
    };
    
    window.addEventListener('chartConfigsUpdated', handleChartConfigsUpdated as EventListener);
    
    return () => {
      window.removeEventListener('chartConfigsUpdated', handleChartConfigsUpdated as EventListener);
    };
  }, [isClient, pageId, charts.length, getChartState, batchUpdateChartStates, setChartData, wrappedBatchFetchChartData, filterValues]);

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
      {filteredCharts.map((chart) => (
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
          onScreenshotClick={() => handleChartScreenshot(chart)}
          isDownloading={downloadingCharts[chart.id]}
          isScreenshotting={screenshottingCharts[chart.id]}
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
                  value={filterValues[chart.id]?.['timeFilter'] || chart.additionalOptions.filters.timeFilter.options[0]}
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
                  currency={filterValues[chart.id]?.['currencyFilter'] || chart.additionalOptions.filters.currencyFilter.options[0]}
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
              chartConfig={chart} 
              preloadedData={chartData[chart.id] || []}
              onDataLoaded={onDataLoadedCallbacks[chart.id]}
              isExpanded={expandedCharts[chart.id]}
              onCloseExpanded={() => toggleChartExpanded(chart.id)}
              // Pass filter values and handlers to ChartRenderer
              filterValues={filterValues[chart.id]}
              onFilterChange={(filterType, value) => handleFilterChange(chart.id, filterType, value)}
              // Pass the color map to ensure consistent colors
              colorMap={legendColorMaps[chart.id]}
              // Add a callback to receive colors from BarChart
              onColorsGenerated={(colorMap) => syncLegendColors(chart.id, colorMap)}
              // Pass hidden series to ChartRenderer
              hiddenSeries={hiddenSeries[chart.id] || []}
              // Pass loading state
              isLoading={loadingCharts[chart.id] || false}
            />
          </div>
        </MemoizedChartCard>
        </div>
      ))}
    </div>
  );
} 