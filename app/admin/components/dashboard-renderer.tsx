"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getChartConfigsByPage } from '../utils';
import ChartCard from '../../components/shared/ChartCard';
import LegendItem from '../../components/shared/LegendItem';
import { ChartConfig, YAxisConfig } from '../types';
import dynamic from 'next/dynamic';
import { getColorByIndex } from '../../utils/chartColors';
import { formatNumber } from '../../utils/formatters';
import Modal from '../../components/shared/Modal';
import TimeFilterSelector from '../../components/shared/filters/TimeFilter';
import CurrencyFilter from '../../components/shared/filters/CurrencyFilter';
import DisplayModeFilter, { DisplayMode } from '../../components/shared/filters/DisplayModeFilter';
import * as htmlToImage from 'html-to-image';
import Loader from '../../components/shared/Loader';

// Helper function to extract field name from YAxisConfig or use string directly
function getFieldName(field: string | YAxisConfig): string {
  return typeof field === 'string' ? field : field.field;
}

// Format currency for display
const formatCurrency = (value: number): string => {
  return formatNumber(value);
};

// Function to truncate text with ellipsis
const truncateLabel = (label: string, maxLength: number = 10): string => {
  if (label.length <= maxLength) return label;
  return label.substring(0, maxLength) + '...';
};

// Dynamic import for the ChartRenderer to avoid SSR issues
const ChartRenderer = dynamic(() => import('./ChartRenderer'), {
  ssr: false,
});

interface DashboardRendererProps {
  pageId: string;
  overrideCharts?: ChartConfig[]; // Add optional prop to override charts
  enableCaching?: boolean; // Add optional prop for enabling caching
}

interface Legend {
  label: string;
  color: string;
  value?: number;
}

// Increase cache duration to 30 minutes for better performance
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

// Lazily load the ChartRenderer component with dynamic import and prefetch
const MemoizedChartRenderer = React.memo(dynamic(() => import('./ChartRenderer'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center">
    <div className="w-5 h-5 bg-blue-400/20 rounded-full animate-pulse"></div>
  </div>
}));

// Optimization: preload charts by pageId for faster subsequent loads
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
    // Fetch charts from API with a shorter timeout for faster failure
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5-second timeout
    
    const charts = await getChartConfigsByPage(pageId);
    clearTimeout(timeoutId);
    
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

// Batch fetch function for more efficient API calls
const batchFetchChartData = async (charts: ChartConfig[], filterValues: Record<string, Record<string, string>>) => {
  // Create an array of promises for all charts
  const fetchPromises = charts.map(chart => {
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
    return fetchChartData(chart, chartFilters)
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
  
  // Wait for all fetches to complete
  return Promise.all(fetchPromises);
};

// Simplified fetch function to reduce overhead
const fetchChartData = async (chart: ChartConfig, chartFilters: Record<string, string>) => {
  const url = new URL(chart.apiEndpoint);
  if (chart.apiKey) {
    url.searchParams.append('api_key', chart.apiKey);
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
  const options: RequestInit = {
    method: hasParameters ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Priority': 'high'
    },
    // More aggressive caching strategy
    cache: 'force-cache',
    // Reduce priority of non-critical resources
    priority: 'high',
    // Use a shorter timeout for faster failure/recovery
    signal: AbortSignal.timeout(2000) // 2 second timeout
  };
  
  // Add body with parameters for POST request
  if (hasParameters) {
    options.body = JSON.stringify({ parameters });
  }
  
  // Fetch data from API with optimized options
  try {
    // Use fetch with aggressive timeout
    const response = await fetch(url.toString(), options);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Fast extraction of data with minimal processing
    let parsedData: any[] = [];
    
    // Extract data based on API response format with minimal code
    if (result?.query_result?.data?.rows) parsedData = result.query_result.data.rows;
    else if (Array.isArray(result)) parsedData = result;
    else if (result?.data && Array.isArray(result.data)) parsedData = result.data;
    else if (result?.rows && Array.isArray(result.rows)) parsedData = result.rows;
    else if (result?.results && Array.isArray(result.results)) parsedData = result.results;
    else if (result?.error) throw new Error(`API error: ${result.error}`);
    else {
      console.warn('Unknown response format:', Object.keys(result).join(','));
      throw new Error('Unrecognized API response');
    }
    
    // Cache the data
    const cacheKey = `${chart.id}-${chart.apiEndpoint}-${JSON.stringify(chartFilters)}`;
    CHART_DATA_CACHE[cacheKey] = {
      data: parsedData,
      timestamp: Date.now(),
      expiresIn: CACHE_DURATION
    };
    
    return parsedData;
  } catch (error) {
    // Always check cache as fallback on fetch error
    const cacheKey = `${chart.id}-${chart.apiEndpoint}-${JSON.stringify(chartFilters)}`;
    if (CHART_DATA_CACHE[cacheKey]) {
      console.log(`Using cached data as fallback for chart ${chart.id}`);
      return CHART_DATA_CACHE[cacheKey].data;
    }
    
    // Rethrow if no cache available
    throw error;
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

// Optimize loading perception with skeleton loader
const SkeletonChart = () => (
  <div className="animate-pulse w-full h-[310px] md:h-[360px] rounded-lg overflow-hidden opacity-70 bg-gradient-to-br from-gray-900/50 to-gray-800/80 flex flex-col p-4">
    <div className="flex flex-col gap-4 h-full">
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 border-t-2 border-r-2 border-blue-400/30 rounded-full animate-spin"></div>
          <div className="absolute inset-4 border-b-2 border-l-2 border-purple-400/50 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
        </div>
      </div>
      <div className="h-5 bg-gray-700/50 rounded w-3/4 mx-auto"></div>
      <div className="h-4 bg-gray-700/40 rounded w-1/2 mx-auto"></div>
    </div>
  </div>
);

// Fast UI rendering to improve loading perception
const ChartCardSkeleton = () => (
  <div className="md:h-[500px] h-auto bg-gray-900/20 backdrop-blur-md border border-gray-800/50 rounded-lg overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-800/50">
      <div className="h-6 bg-gray-700/50 rounded w-2/3"></div>
      <div className="h-4 bg-gray-700/30 rounded w-1/2 mt-2"></div>
    </div>
    <div className="p-4">
      <SkeletonChart />
    </div>
  </div>
);

export default function DashboardRenderer({ 
  pageId, 
  overrideCharts,
  enableCaching = true, // Default to true for better performance
}: DashboardRendererProps) {
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [expandedCharts, setExpandedCharts] = useState<Record<string, boolean>>({});
  const [downloadingCharts, setDownloadingCharts] = useState<Record<string, boolean>>({});
  const [screenshottingCharts, setScreenshottingCharts] = useState<Record<string, boolean>>({});
  const [legends, setLegends] = useState<Record<string, Legend[]>>({});
  
  // Add state for loading charts
  const [loadingCharts, setLoadingCharts] = useState<Record<string, boolean>>({});
  // Add state to track overall page loading
  const [isPageLoading, setIsPageLoading] = useState(true);
  
  // Add state for filter values
  const [filterValues, setFilterValues] = useState<Record<string, Record<string, string>>>({});
  const [chartData, setChartData] = useState<Record<string, any[]>>({});
  // Add state to track legend colors and order
  const [legendColorMaps, setLegendColorMaps] = useState<Record<string, Record<string, string>>>({});
  
  // Use ref to track if component is mounted to avoid memory leaks
  const isMounted = useRef(true);
  
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
  
  // Add downloadCSV function inside the component
  const downloadCSV = async (chart: ChartConfig) => {
    // Set loading state
    setDownloadingCharts(prev => ({ ...prev, [chart.id]: true }));
    
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
      setDownloadingCharts(prev => ({ ...prev, [chart.id]: false }));
    }
  };

  // Use effect to clean up ref on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Initialize charts with a useMemo to avoid recomputation
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

  // Load charts and data on mount
  useEffect(() => {
    setIsClient(true);
    setIsPageLoading(true);
    
    // Start showing content almost immediately, don't wait for data
    setTimeout(() => {
      if (isMounted.current) {
        setIsPageLoading(false);
      }
    }, 80); // Short timeout to allow React to process state updates

    async function loadCharts() {
      try {
        const loadedCharts = await initializeCharts();
        
        // Skip updates if component unmounted
        if (!isMounted.current) return;
        
        setCharts(loadedCharts);
        
        // Initialize all states in a single update batch
        const expandedState: Record<string, boolean> = {};
        const downloadingState: Record<string, boolean> = {};
        const screenshottingState: Record<string, boolean> = {};
        const initialLoadingState: Record<string, boolean> = {};
        const initialFilterValues: Record<string, Record<string, string>> = {};
        
        // Fast initialization in a single pass
        loadedCharts.forEach(chart => {
          expandedState[chart.id] = false;
          downloadingState[chart.id] = false;
          screenshottingState[chart.id] = false;
          initialLoadingState[chart.id] = true;
          
          // Initialize filter values for each chart
          if (chart.additionalOptions?.filters) {
            initialFilterValues[chart.id] = {};
            
            // Add timeFilter if available
            if (chart.additionalOptions.filters.timeFilter?.options?.length) {
              initialFilterValues[chart.id]['timeFilter'] = chart.additionalOptions.filters.timeFilter.options[0];
            }
            
            // Add currencyFilter if available
            if (chart.additionalOptions.filters.currencyFilter?.options?.length) {
              initialFilterValues[chart.id]['currencyFilter'] = chart.additionalOptions.filters.currencyFilter.options[0];
            }
            
            // Add displayModeFilter if available
            if (chart.additionalOptions.filters.displayModeFilter?.options?.length) {
              initialFilterValues[chart.id]['displayModeFilter'] = chart.additionalOptions.filters.displayModeFilter.options[0];
            }
          }
        });
        
        // Skip updates if component unmounted
        if (!isMounted.current) return;
        
        // Batch all state updates for better performance
        setExpandedCharts(expandedState);
        setDownloadingCharts(downloadingState);
        setScreenshottingCharts(screenshottingState);
        setLoadingCharts(initialLoadingState);
        setFilterValues(initialFilterValues);
        
        // Split chart loading into two groups - visible and below-fold
        const priorityCharts = loadedCharts.slice(0, 2); // First visible charts (likely in viewport)
        const remainingCharts = loadedCharts.slice(2);   // Below-fold charts (load later)
        
        // Load priority charts immediately
        if (priorityCharts.length > 0) {
          batchFetchChartData(priorityCharts, initialFilterValues)
            .then(results => {
              if (!isMounted.current) return;
              
              // Process all results at once
              const newChartData: Record<string, any[]> = {};
              
              results.forEach(result => {
                newChartData[result.chartId] = result.data;
                
                // Update loading state for each chart
                setLoadingCharts(prev => ({
                  ...prev,
                  [result.chartId]: false
                }));
              });
              
              // Update chart data all at once
              setChartData(prev => ({
                ...prev,
                ...newChartData
              }));
              
              // Update legends after a small delay to allow rendering to complete
              setTimeout(() => {
                if (isMounted.current) {
                  results.forEach(result => {
                    updateLegends(result.chartId, result.data);
                  });
                }
              }, 0);
            })
            .catch(error => {
              console.error('Error fetching priority chart data:', error);
              if (!isMounted.current) return;
              
              // Reset loading states for priority charts
              priorityCharts.forEach(chart => {
                setLoadingCharts(prev => ({
                  ...prev,
                  [chart.id]: false
                }));
              });
            });
        }
        
        // Load remaining charts with a small delay to prioritize visible content
        if (remainingCharts.length > 0) {
          setTimeout(() => {
            if (!isMounted.current) return;
            
            batchFetchChartData(remainingCharts, initialFilterValues)
              .then(results => {
                if (!isMounted.current) return;
                
                // Process all results at once
                const newChartData: Record<string, any[]> = {};
                
                results.forEach(result => {
                  newChartData[result.chartId] = result.data;
                  
                  // Update loading state for each chart
                  setLoadingCharts(prev => ({
                    ...prev,
                    [result.chartId]: false
                  }));
                });
                
                // Update chart data all at once
                setChartData(prev => ({
                  ...prev,
                  ...newChartData
                }));
                
                // Update legends after a small delay
                setTimeout(() => {
                  if (isMounted.current) {
                    results.forEach(result => {
                      updateLegends(result.chartId, result.data);
                    });
                  }
                }, 0);
              })
              .catch(error => {
                console.error('Error fetching remaining chart data:', error);
                if (!isMounted.current) return;
                
                // Reset loading states for remaining charts
                remainingCharts.forEach(chart => {
                  setLoadingCharts(prev => ({
                    ...prev,
                    [chart.id]: false
                  }));
                });
              });
          }, 100); // Small delay for remaining charts
        }
        
      } catch (error) {
        console.error(`Error loading charts for page ${pageId}:`, error);
        if (isMounted.current) {
          setIsPageLoading(false);
        }
      }
    }
    
    loadCharts();

    // Preload other commonly accessed pages in the background
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        // Common dashboards to preload
        const otherDashboards = ['transactions', 'accounts', 'economics'];
        // Only preload others, not the current one
        const dashboardsToPreload = otherDashboards.filter(id => id !== pageId);
        
        dashboardsToPreload.forEach((dashboardId, index) => {
          // Stagger preloading to avoid resource contention
          setTimeout(() => {
            preloadChartConfigs(dashboardId).catch(err => 
              console.log(`Background prefetch for ${dashboardId} failed silently`, err));
          }, index * 1000); // 1 second between each preload
        });
      }, 2000); // Start preloading 2 seconds after page load
    }
  }, [pageId, overrideCharts, initializeCharts]);

  // Simplified fetchChartDataWithFilters for individual chart updates
  const fetchChartDataWithFilters = async (chart: ChartConfig, skipLoadingState = false) => {
    try {
      if (!skipLoadingState && isMounted.current) {
        setLoadingCharts(prev => ({
          ...prev,
          [chart.id]: true
        }));
      }
      
      const chartFilters = filterValues[chart.id] || {};
      const cacheKey = `${chart.id}-${chart.apiEndpoint}-${JSON.stringify(chartFilters)}`;
      
      // Check cache if enabled
      if (enableCaching && CHART_DATA_CACHE[cacheKey]) {
        const cachedItem = CHART_DATA_CACHE[cacheKey];
        const now = Date.now();
        
        if (now - cachedItem.timestamp < cachedItem.expiresIn) {
          console.log(`Using cached data for chart ${chart.id}`);
          
          if (isMounted.current) {
            setChartData(prev => ({
              ...prev,
              [chart.id]: cachedItem.data
            }));
            
            updateLegends(chart.id, cachedItem.data);
            
            if (!skipLoadingState) {
              setLoadingCharts(prev => ({
                ...prev,
                [chart.id]: false
              }));
            }
          }
          
          return cachedItem.data;
        }
      }
      
      // Fetch fresh data
      const data = await fetchChartData(chart, chartFilters);
      
      // Skip updates if component unmounted
      if (!isMounted.current) return data;
      
      // Update state with fresh data
      setChartData(prev => ({
        ...prev,
        [chart.id]: data
      }));
      
      updateLegends(chart.id, data);
      
      if (!skipLoadingState) {
        setLoadingCharts(prev => ({
          ...prev,
          [chart.id]: false
        }));
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching data for chart ${chart.id}:`, error);
      
      // Skip updates if component unmounted
      if (!isMounted.current) return null;
      
      if (!skipLoadingState) {
        setLoadingCharts(prev => ({
          ...prev,
          [chart.id]: false
        }));
      }
      
      return null;
    }
  };

  const toggleChartExpanded = (chartId: string) => {
    setExpandedCharts(prev => ({
      ...prev,
      [chartId]: !prev[chartId]
    }));
  };

  // Handle screenshot capture for chart
  const captureChartScreenshot = async (chart: ChartConfig) => {
    try {
      // Set loading state
      setScreenshottingCharts(prev => ({ ...prev, [chart.id]: true }));
      console.log(`Starting screenshot capture for chart: ${chart.id}`);

      // Get the entire card element instead of just the chart container
      const cardElementId = `chart-card-${chart.id}`;
      console.log(`Looking for card element with ID: ${cardElementId}`);
      const cardElement = document.getElementById(cardElementId);
      
      if (!cardElement) {
        console.error(`Card element not found with ID: ${cardElementId}`);
        // Log all card IDs for debugging
        const allCardElements = document.querySelectorAll('[id^="chart-card-"]');
        console.log(`Found ${allCardElements.length} card elements:`, 
          Array.from(allCardElements).map(el => el.id));
        
        throw new Error(`Card element not found with ID: ${cardElementId}`);
      }
      
      console.log(`Found card element, dimensions: ${cardElement.offsetWidth}x${cardElement.offsetHeight}`);

      try {
        // Create a wrapper with solid background
        const wrapper = document.createElement('div');
        wrapper.style.position = 'fixed';
        wrapper.style.top = '0';
        wrapper.style.left = '0';
        wrapper.style.width = '100vw';
        wrapper.style.height = '100vh';
        wrapper.style.backgroundColor = '#121212';
        wrapper.style.zIndex = '-9999';
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.justifyContent = 'center';
        wrapper.style.padding = '20px';
        wrapper.style.boxSizing = 'border-box';
        wrapper.style.overflow = 'hidden';
        
        // Clone the element to avoid modifying the original
        const clone = cardElement.cloneNode(true) as HTMLElement;
        clone.style.position = 'relative';
        clone.style.width = `${cardElement.offsetWidth}px`;
        clone.style.height = `${cardElement.offsetHeight}px`;
        clone.style.backgroundColor = '#121212';
        clone.style.color = 'white';
        clone.style.border = '1px solid #333';
        clone.style.maxWidth = '100%';
        clone.style.maxHeight = '100%';

        // Hide the action buttons (camera, download, expand icons)
        const actionButtons = clone.querySelectorAll('button');
        actionButtons.forEach(button => {
          if (button.title === 'Take Screenshot' || button.title === 'Download CSV' || button.title === 'Expand Chart') {
            button.style.display = 'none';
          }
        });

        // Create a watermark with the TopLedger logo
        const watermark = document.createElement('div');
        watermark.style.position = 'absolute';
        watermark.style.top = '50%';
        watermark.style.left = '50%';
        watermark.style.transform = 'translate(-50%, -50%)';
        watermark.style.zIndex = '10';
        watermark.style.opacity = '0.30';
        watermark.style.pointerEvents = 'none';
        
        // Create the image element for the logo
        const logo = document.createElement('img');
        logo.src = 'https://topledger.xyz/assets/images/logo/topledger-full.svg?imwidth=384';
        logo.style.width = '200px';
        logo.style.height = 'auto';
        logo.style.filter = 'brightness(2)'; // Make the logo slightly brighter for visibility
        
        // Add the logo to the watermark
        watermark.appendChild(logo);
        
        // Append the clone to the wrapper
        wrapper.appendChild(clone);
        
        // Apply styles to fix transparency issues
        const fixTransparency = (element: HTMLElement) => {
          // Force background colors on elements that might be transparent
          if (element.tagName === 'DIV' || element.tagName === 'SPAN' || element.tagName === 'P') {
            // Get the computed style
            const style = window.getComputedStyle(element);
            
            // Check if the background is transparent or semi-transparent
            if (style.backgroundColor === 'transparent' || 
                style.backgroundColor.includes('rgba') ||
                style.backgroundColor === 'rgba(0, 0, 0, 0)') {
              element.style.backgroundColor = '#121212';
            }
            
            // Check text color to ensure contrast
            if (style.color === 'transparent' ||
                style.color.includes('rgba') ||
                style.color === 'rgba(0, 0, 0, 0)') {
              element.style.color = '#ffffff';  
            }
          }
          
          // Special handling for SVG elements
          if (element.tagName === 'svg' || element.tagName === 'SVG') {
            const svgElement = element as unknown as SVGElement;
            svgElement.style.backgroundColor = '#121212';
            // Ensure SVG paths and other elements are visible
            Array.from(svgElement.querySelectorAll('*')).forEach(node => {
              if (node instanceof SVGElement) {
                // Set stroke to ensure visibility
                if (!node.getAttribute('stroke') || node.getAttribute('stroke') === 'none') {
                  node.setAttribute('stroke', 'currentColor');
                }
                
                // Set fill if not already set
                if (!node.getAttribute('fill') || node.getAttribute('fill') === 'none') {
                  node.setAttribute('fill', 'currentColor');
                }
              }
            });
          }
          
          // Process child elements recursively
          Array.from(element.children).forEach(child => {
            if (child instanceof HTMLElement) {
              fixTransparency(child);
            }
          });
        };
        
        // Fix transparency issues in the clone
        fixTransparency(clone);

        // Add the watermark after fixing transparency issues
        clone.appendChild(watermark);
        
        // Add the wrapper to the DOM temporarily
        document.body.appendChild(wrapper);
        
        console.log('Starting image capture with html-to-image...');
        
        try {
          // Add a short delay to allow the DOM to update and logo to load
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Wait for the logo to load
          await new Promise((resolve, reject) => {
            if (logo.complete) {
              resolve(true);
            } else {
              logo.onload = () => resolve(true);
              logo.onerror = () => {
                console.error('Logo failed to load');
                // Continue without logo if it fails to load
                resolve(false);
              };
            }
          });
          
          // Use htmlToImage to capture the clone
          const dataUrl = await htmlToImage.toJpeg(clone, {
            quality: 0.95,
            backgroundColor: '#121212',
            width: cardElement.offsetWidth,
            height: cardElement.offsetHeight,
            style: {
              backgroundColor: '#121212'
            },
            pixelRatio: 2
          });
          
          console.log('Image captured successfully, creating download link');
          
          // Create download link
          const link = document.createElement('a');
          link.download = `${chart.title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.jpg`;
          link.href = dataUrl;
          link.click();
          
          console.log('Screenshot downloaded successfully');
        } finally {
          // Always clean up by removing the wrapper
          if (document.body.contains(wrapper)) {
            document.body.removeChild(wrapper);
          }
        }
      } catch (captureError) {
        console.error('Error during screenshot capture:', captureError);
        throw captureError;
      }
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to capture screenshot: ${errorMessage}`);
    } finally {
      // Clear loading state
      setScreenshottingCharts(prev => ({ ...prev, [chart.id]: false }));
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
    
    // Set loading state when filter changes
    setLoadingCharts(prev => ({
      ...prev,
      [chartId]: true
    }));
    
    // Update filter value
    setFilterValues(prev => ({
      ...prev,
      [chartId]: {
        ...prev[chartId],
        [filterType]: value
      }
    }));
    
    // Find the chart
    const chart = charts.find(c => c.id === chartId);
    if (!chart) return;
    
    // Fetch updated data with the new filter
    await fetchChartDataWithFilters(chart);
    
    // Reset loading state after fetch
    setLoadingCharts(prev => ({
      ...prev,
      [chartId]: false
    }));
  };
  
  // Generate legends for a chart based on its data and configuration
  const updateLegends = (chartId: string, data: any[]) => {
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
    let chartLegends: Legend[] = [];
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
          label: `${fieldName}`,
          color: colorMap[field] || getColorByIndex(allFields.indexOf(field)),
          value: fieldTotals[field] || 0
        };
      });
    }
    // First, we need to determine if this is truly a stacked chart with valid data
    else if (isValidStackedChart) {
      console.log("Processing as valid stacked chart with group by:", groupField);
      
      // For stacked charts, always use the group by field values for legends
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
      
      // Now create legend items using the color map
      chartLegends = uniqueGroups
        .filter(group => group !== null && group !== undefined)
        .map((group) => {
          const groupStr = String(group);
          return {
            label: groupStr,
            color: colorMap[groupStr] || getColorByIndex(Object.keys(colorMap).length),
            value: groupTotals[groupStr] || 0
          };
        });
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
          value
        };
      });
      
      console.log(`Generated ${chartLegends.length} legend items for pie chart`);
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
         data[0][xField].match(/^\d{4}-\d{2}-\d{2}/));
      
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
            
            newLabels.push(label);
            
            // Use consistent color from our map, or generate a new one if needed
            if (!colorMap[label] && isNewColorMap) {
              colorMap[label] = getColorByIndex(index);
            }
            
            return {
              label,
              color: colorMap[label] || getColorByIndex(index),
              value: total
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
          
          newLabels.push(label);
          
          // Use consistent color from our map, or generate a new one if needed
          if (!colorMap[label] && isNewColorMap) {
            colorMap[label] = getColorByIndex(0);
          }
          
          chartLegends = [{
            label,
            color: colorMap[label] || getColorByIndex(0),
            value: total
          }];
        }
      } else {
        // For non-date based charts, use data points as legend entries
        // Don't limit to just 5 items, show all of them for consistency with BarChart
        chartLegends = data
          .map((item, index) => {
            const label = String(item[xField]);
            newLabels.push(label);
            
            // Use consistent color from our map, or generate a new one if needed
            if (!colorMap[label] && isNewColorMap) {
              colorMap[label] = getColorByIndex(index);
            }
            
            return {
              label,
              color: colorMap[label] || getColorByIndex(index),
              value: Number(item[yAxisFields[0]]) || 0
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
  };

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
  }, [legendColorMaps, charts]);

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

  if (!isClient) {
    return null; // Return nothing during SSR
  }

  if (isPageLoading) {
    // Return skeleton UI instead of spinner for faster perceived performance
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
        {/* Add more skeleton cards to match common layouts */}
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
    );
  }

  if (charts.length === 0) {
    // Show a message if no charts are available
    return (
      <div className="w-full min-h-[300px] flex items-center justify-center">
        <p className="text-gray-400">No charts available for this page.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {charts.map((chart) => (
        <ChartCard 
          key={chart.id}
          title={chart.title}
          description={chart.subtitle}
          accentColor="blue"
          onExpandClick={() => toggleChartExpanded(chart.id)}
          onDownloadClick={() => downloadCSV(chart)}
          onScreenshotClick={() => captureChartScreenshot(chart)}
          isDownloading={downloadingCharts[chart.id]}
          isScreenshotting={screenshottingCharts[chart.id]}
          isLoading={loadingCharts[chart.id]}
          legendWidth="1/5"
          className="md:h-[500px] h-auto"
          id={`chart-card-${chart.id}`}
          
          // Add filter bar for regular chart view using ChartRenderer's filter props
          filterBar={
            // Show filter bar if there are filters OR if this is a stacked chart
            (chart.additionalOptions?.filters || isStackedBarChart(chart)) && (
            <div className="flex flex-wrap gap-3 items-center">
              {/* Time Filter */}
              {chart.additionalOptions?.filters?.timeFilter && (
                <TimeFilterSelector
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
                <CurrencyFilter
                  currency={filterValues[chart.id]?.['currencyFilter'] || chart.additionalOptions.filters.currencyFilter.options[0]}
                  options={chart.additionalOptions.filters.currencyFilter.options}
                  onChange={(value) => handleFilterChange(chart.id, 'currencyFilter', value)}
                />
              )}
              
              {/* Display Mode Filter - always show for stacked charts, or when explicitly configured */}
              {(isStackedBarChart(chart) || chart.additionalOptions?.filters?.displayModeFilter) && (
                <DisplayModeFilter
                  mode={filterValues[chart.id]?.['displayMode'] as DisplayMode || 'absolute'}
                  onChange={(value) => handleFilterChange(chart.id, 'displayMode', value)}
                />
              )}
            </div>
          )}
          
          legend={
            <>
              {legends[chart.id] && legends[chart.id].length > 0 ? (
                legends[chart.id].map(legend => (
                  <LegendItem 
                    key={legend.label}
                    label={truncateLabel(legend.label)} 
                    color={legend.color} 
                    shape="square"
                    tooltipText={legend.value ? formatCurrency(legend.value) : undefined}
                  />
                ))
              ) : (
                <LegendItem label="Loading..." color="#cccccc" isLoading={true} />
              )}
            </>
          }
        >
          <div 
            className="h-[310px] md:h-[360px] relative" 
            id={`chart-container-${chart.id}`}
            data-testid={`chart-container-${chart.id}`}
          >
            <MemoizedChartRenderer 
              chartConfig={chart} 
              onDataLoaded={(data: any[]) => {
                // Store initial data and update legends
                if (!chartData[chart.id]) {
                  setChartData(prev => ({
                    ...prev,
                    [chart.id]: data
                  }));
                }
                updateLegends(chart.id, data);
                
                // Set loading to false when data is loaded
                setLoadingCharts(prev => ({
                  ...prev,
                  [chart.id]: false
                }));
              }}
              isExpanded={expandedCharts[chart.id]}
              onCloseExpanded={() => toggleChartExpanded(chart.id)}
              // Pass filter values and handlers to ChartRenderer
              filterValues={filterValues[chart.id]}
              onFilterChange={(filterType, value) => handleFilterChange(chart.id, filterType, value)}
              // Pass the color map to ensure consistent colors
              colorMap={legendColorMaps[chart.id]}
              // Add a callback to receive colors from BarChart
              onColorsGenerated={(colorMap) => syncLegendColors(chart.id, colorMap)}
              // Pass loading state
              isLoading={loadingCharts[chart.id]}
            />
          </div>
        </ChartCard>
      ))}
    </div>
  );
} 