"use client";

import React, { useEffect, useState } from 'react';
import { CounterConfig } from '../types';
import Counter from '../../components/shared/Counter';

// Define SVG icons for different counter types
const ICONS = {
  users: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ),
  revenue: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  chart: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
      />
    </svg>
  ),
  percent: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 7h6m0 10H9m3-3H9m1.5-3.5h1a2 2 0 012 2v5.5M9 4.5A2.5 2.5 0 0111.5 2h1A2.5 2.5 0 0115 4.5m-3 0v12m-1.5-2.5H9a2 2 0 01-2-2v-5.5M13.5 19.5h1a2.5 2.5 0 002.5-2.5v-1a2.5 2.5 0 00-2.5-2.5h-1a2.5 2.5 0 00-2.5 2.5v1a2.5 2.5 0 002.5 2.5z"
      />
    </svg>
  ),
  fire: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
      />
    </svg>
  ),
  globe: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

interface CounterRendererProps {
  counterConfig?: CounterConfig;
  chartConfig?: any; // ChartConfig with chartType: "counter"
  chartData?: any[]; // Pre-loaded chart data
  isLoading?: boolean;
}

// Add a global cache for counter data
const COUNTER_DATA_CACHE: Record<string, {
  data: any;
  rawResponse: any;
  timestamp: number;
  expiresIn: number; // expiration time in ms
}> = {};

// Increase default cache duration to 1 hour
const CACHE_DURATION = 60 * 60 * 1000;

// Track active requests to prevent duplicate concurrent requests
const ACTIVE_REQUESTS: Record<string, Promise<{ 
  value: number; 
  previousValue?: number; 
  error?: string; 
  rawResponse?: any 
}>> = {};

// Modified fetchData function with caching
const fetchCounterData = async (
  apiEndpoint: string,
  apiKey?: string
): Promise<{ value: number; previousValue?: number; error?: string; rawResponse?: any }> => {
  try {
    // Create a cache key from the endpoint and API key
    const cacheKey = `${apiEndpoint}-${apiKey || ''}`;
    
    // Check if we have cached data that isn't expired
    if (COUNTER_DATA_CACHE[cacheKey]) {
      const cachedItem = COUNTER_DATA_CACHE[cacheKey];
      const now = Date.now();
      
      // Use cached data if not expired
      if (now - cachedItem.timestamp < cachedItem.expiresIn) {
        return {
          ...cachedItem.data,
          rawResponse: cachedItem.rawResponse
        };
      }
    }
    
    // Check if this request is already in progress
    if (cacheKey in ACTIVE_REQUESTS) {
      return ACTIVE_REQUESTS[cacheKey];
    }
    
    // If no valid cache or active request, fetch fresh data
    const url = new URL(apiEndpoint);
    
    // Add API key if provided
    if (apiKey) {
      // Check if the apiKey contains max_age parameter
      const apiKeyValue = apiKey.trim();
      
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
    
    const startTime = performance.now();
    
    // Create the fetch promise and store it in ACTIVE_REQUESTS
    const fetchPromise = (async () => {
      try {
        const response = await fetch(url.toString(), { cache: 'no-store' });
        const endTime = performance.now();
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Process the data based on the available format
        // Extract rows depending on the API response format
        let rows = [];
        if (data?.query_result?.data?.rows) {
          rows = data.query_result.data.rows;
        } else if (Array.isArray(data)) {
          rows = data;
        } else if (data?.data && Array.isArray(data.data)) {
          rows = data.data;
        } else if (data?.rows && Array.isArray(data.rows)) {
          rows = data.rows;
        } else if (data?.results && Array.isArray(data.results)) {
          rows = data.results;
        } else if (data?.error) {
          throw new Error(`API returned an error: ${data.error}`);
        } else {
          console.error('Unrecognized API response structure:', data);
          throw new Error('API response does not have a recognized structure');
        }
        
        // Use the first row from the API response and access the value using the valueField
        if (rows.length === 0) {
          throw new Error('API returned no data');
        }
        
        // Get the row at the specified index (default to first row if not specified)
        const rowIndex = 0; // We'll use the actual index from counterConfig when calling this function
        const row = rows[rowIndex];
        
        const result = {
          value: 0,
          previousValue: undefined as number | undefined,
        };
        
        // We'll extract the actual values when using this in the component
        // This is just placeholder data to complete the function
        if (row) {
          // Default to first numeric property in the row if not specified
          const numericKeys = Object.keys(row).filter(key => typeof row[key] === 'number');
          if (numericKeys.length > 0) {
            result.value = row[numericKeys[0]];
          }
        }
        
        // Store in cache for future use
        COUNTER_DATA_CACHE[cacheKey] = {
          data: result,
          rawResponse: data,
          timestamp: Date.now(),
          expiresIn: CACHE_DURATION
        };
        
        return {
          ...result,
          rawResponse: data
        };
      } finally {
        // Clear the active request once it's completed (whether successful or failed)
        delete ACTIVE_REQUESTS[cacheKey];
      }
    })();
    
    // Store the promise to reuse for concurrent requests
    ACTIVE_REQUESTS[cacheKey] = fetchPromise;
    
    return fetchPromise;
  } catch (error) {
    console.error('Error fetching counter data:', error);
    
    // Try to use cached data as fallback if available, even if expired
    const cacheKey = `${apiEndpoint}-${apiKey || ''}`;
    if (COUNTER_DATA_CACHE[cacheKey]) {
      return {
        ...COUNTER_DATA_CACHE[cacheKey].data,
        rawResponse: COUNTER_DATA_CACHE[cacheKey].rawResponse
      };
    }
    
    return {
      value: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// Add a prefetch mechanism for common counter endpoints
// This will start loading data even before components mount
export const prefetchCounterData = (apiEndpoint: string, apiKey?: string) => {
  if (!apiEndpoint) return;
  
  // Create a cache key
  const cacheKey = `${apiEndpoint}-${apiKey || ''}`;
  
  // Only prefetch if not already in cache or active requests
  if (!(cacheKey in COUNTER_DATA_CACHE) && !(cacheKey in ACTIVE_REQUESTS)) {
    // Start the fetch but don't await it - just store the promise
    fetchCounterData(apiEndpoint, apiKey).catch(err => {
      console.error(`Error prefetching counter data: ${err.message}`);
    });
  }
};

// Fetch and process counter data with specific field mapping
const fetchAndProcessCounter = async (counterConfig: CounterConfig): Promise<{
  value: number;
  previousValue?: number;
  error?: string;
}> => {
  try {
    // Fast path: Check if data is already in cache to avoid unnecessary processing
    const cacheKey = `${counterConfig.apiEndpoint}-${counterConfig.apiKey || ''}`;
    const cachedItem = COUNTER_DATA_CACHE[cacheKey];
    
    if (cachedItem) {
      const now = Date.now();
      if (now - cachedItem.timestamp < cachedItem.expiresIn) {
        // Process the cached data directly to get value and trend
        return processCounterData(counterConfig, cachedItem.rawResponse);
      }
    }
    
    // Get raw data from cache or initial fetch
    const fetchResult = await fetchCounterData(counterConfig.apiEndpoint, counterConfig.apiKey);
    
    // If we already have an error, return it
    if (fetchResult.error) {
      return fetchResult;
    }
    
    // Process the data
    return processCounterData(counterConfig, fetchResult.rawResponse);
  } catch (error) {
    console.error('Error processing counter data:', error);
    return {
      value: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// Separate function to process counter data
const processCounterData = (counterConfig: CounterConfig, result: any): {
  value: number;
  previousValue?: number;
  error?: string;
} => {
  try {
    // Extract data based on API response format
    let rows: any[] = [];
    if (result?.query_result?.data?.rows) {
      rows = result.query_result.data.rows;
    } else if (Array.isArray(result)) {
      rows = result;
    } else if (result?.data && Array.isArray(result.data)) {
      rows = result.data;
    } else if (result?.rows && Array.isArray(result.rows)) {
      rows = result.rows;
    } else if (result?.results && Array.isArray(result.results)) {
      rows = result.results;
    } else {
      throw new Error('API response does not have a recognized structure');
    }
    
    if (rows.length === 0) {
      throw new Error('No data returned from API');
    }
    
    // Get the row at the specified index (default to first row if out of bounds)
    // Support negative indices like Python: -1 = last, -2 = second-to-last
    let rowIndex = counterConfig.rowIndex || 0;
    if (rowIndex < 0) {
      rowIndex = rows.length + rowIndex;
    }
    rowIndex = Math.max(0, Math.min(rowIndex, rows.length - 1));
    
    const row = rows[rowIndex];
    
    if (!row) {
      throw new Error(`No data found at row index ${counterConfig.rowIndex}`);
    }
    
    // Extract specified value field
    const rawValue = row[counterConfig.valueField];
    if (rawValue === undefined || rawValue === null) {
      throw new Error(`Field "${counterConfig.valueField}" not found in response data`);
    }
    
    // Convert value to number or default to 0 if it's not a valid number
    const value = Number(rawValue);
    const numericValue = isNaN(value) ? 0 : value;
    
    // Extract trend value if configured
    let previousValue: number | undefined = undefined;
    if (counterConfig.trendConfig) {
      // Handle auto-calculated trend
      if (counterConfig.trendConfig.valueField === 'auto_calculate') {
        // Try to find a previous data point to calculate trend
        if (rows.length > 1) {
          // Attempt to determine if there's a date field we can use for sorting
          let dateField = null;
          const possibleDateFields = ['date', 'timestamp', 'time', 'period', 'day', 'created_at', 'updated_at', 'createdAt', 'updatedAt'];
          
          // Check if any of the common date field names exist in the data
          for (const field of possibleDateFields) {
            if (row[field] !== undefined) {
              dateField = field;
              break;
            }
          }
          
          if (dateField) {
            // Sort by date field to find previous entry
            const sortedRows = [...rows].sort((a, b) => {
              // Convert to date objects for comparison
              const dateA = new Date(a[dateField]);
              const dateB = new Date(b[dateField]);
              return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
            });
            
            // Find current row index in sorted array
            const currentIndex = sortedRows.findIndex(r => r[dateField] === row[dateField]);
            if (currentIndex !== -1 && currentIndex + 1 < sortedRows.length) {
              // Get previous row based on date
              const previousRow = sortedRows[currentIndex + 1];
              const previousValue = Number(previousRow[counterConfig.valueField]);
              const currentValue = numericValue;
              
              // Calculate percentage change
              if (!isNaN(previousValue) && previousValue !== 0) {
                const percentChange = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
                return {
                  value: numericValue,
                  previousValue: percentChange
                };
              }
            }
          } else {
            // If no date field found, use row index as fallback
            // Get previous row (be careful of the rowIndex)
            if (rowIndex > 0 && rowIndex < rows.length) {
              const previousRow = rows[rowIndex - 1];
              const previousValue = Number(previousRow[counterConfig.valueField]);
              const currentValue = numericValue;
              
              // Calculate percentage change
              if (!isNaN(previousValue) && previousValue !== 0) {
                const percentChange = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
                return {
                  value: numericValue,
                  previousValue: percentChange
                };
              }
            } else if (rows.length >= 2) {
              // If the specified row is first or out of bounds, try to use adjacent rows if available
              const currentRowIndex = Math.min(rowIndex, rows.length - 1);
              // Use the next row as previous if we're at the first row
              const previousRowIndex = (currentRowIndex === 0) ? 1 : Math.max(0, currentRowIndex - 1);
              
              const currentRow = rows[currentRowIndex];
              const previousRow = rows[previousRowIndex];
              
              const currentValue = Number(currentRow[counterConfig.valueField]);
              const previousValue = Number(previousRow[counterConfig.valueField]);
              
              // Calculate percentage change
              if (!isNaN(previousValue) && previousValue !== 0 && !isNaN(currentValue)) {
                const percentChange = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
                return {
                  value: numericValue,
                  previousValue: percentChange
                };
              }
            }
            
            // If we still couldn't calculate a trend, use a simple fallback
            // comparing the first two rows in the data
            if (rows.length >= 2 && rows[0] && rows[1]) {
              // Use the configured row index if valid, otherwise default to first row
              const currentRowIndex = counterConfig.rowIndex !== undefined && 
                                     counterConfig.rowIndex >= 0 && 
                                     counterConfig.rowIndex < rows.length 
                                     ? counterConfig.rowIndex : 0;
              
              // Try to get previous index, but if current is 0, use index 1 as "previous"
              const previousRowIndex = currentRowIndex === 0 ? 1 : currentRowIndex - 1;
              
              const currentValue = Number(rows[currentRowIndex][counterConfig.valueField]);
              const previousValue = Number(rows[previousRowIndex][counterConfig.valueField]);
              
              if (!isNaN(currentValue) && !isNaN(previousValue) && previousValue !== 0) {
                const percentChange = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
                return {
                  value: numericValue,
                  previousValue: percentChange
                };
              }
            }
          }
        }
        
        // If we couldn't calculate the trend, return without trend value
        return {
          value: numericValue,
          previousValue: undefined
        };
      } else if (counterConfig.trendConfig.valueField) {
        // Use the specified trend field
        const trendRawValue = row[counterConfig.trendConfig.valueField];
        if (trendRawValue !== undefined && trendRawValue !== null) {
          const parsedTrend = Number(trendRawValue);
          // Only set previousValue if it's a valid number
          if (!isNaN(parsedTrend)) {
            previousValue = parsedTrend;
          }
        }
      }
    }
    
    return {
      value: numericValue,
      previousValue
    };
  } catch (error) {
    console.error('Error processing counter data:', error);
    return {
      value: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// Add function to check if a counter is recently created (last 5 minutes)
const isRecentlyCreated = (counter: CounterConfig): boolean => {
  if (!counter.createdAt) return false;
  
  const createdTime = new Date(counter.createdAt).getTime();
  const currentTime = Date.now();
  const fiveMinutesInMs = 5 * 60 * 1000;
  
  return (currentTime - createdTime) < fiveMinutesInMs;
};

const CounterRenderer: React.FC<CounterRendererProps> = ({ 
  counterConfig,
  chartConfig,
  chartData,
  isLoading = false
}) => {
  const [value, setValue] = useState<string>("Loading...");
  const [trend, setTrend] = useState<{ value: number; label: string } | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'success' | 'error'>('loading');

  // Determine if we're using counterConfig or chartConfig
  const isChartMode = !!chartConfig;
  const hasChartData = chartData && chartData.length > 0;
  const config = counterConfig || chartConfig;

  // Debug logging
  useEffect(() => {
    console.log('=== CounterRenderer Props Changed ===');
    console.log('counterConfig:', counterConfig?.id);
    console.log('chartConfig:', chartConfig?.id);
    console.log('chartData:', chartData);
    console.log('isChartMode:', isChartMode);
    console.log('hasChartData:', hasChartData);
  }, [counterConfig, chartConfig, chartData, isChartMode, hasChartData]);

  // Separate effect to process chart data immediately when it arrives
  useEffect(() => {
    if (!chartConfig || !chartData || chartData.length === 0) {
      return;
    }

    console.log('🔵 PROCESSING CHART DATA NOW');
    console.log('Chart ID:', chartConfig.id);
    console.log('Data rows:', chartData.length);
    console.log('Full data:', JSON.stringify(chartData));

    // Support negative indices like Python: -1 = last, -2 = second-to-last
    let rowIndex = chartConfig.rowIndex || 0;
    if (rowIndex < 0) {
      rowIndex = chartData.length + rowIndex;
    }
    rowIndex = Math.max(0, Math.min(rowIndex, chartData.length - 1));
    
    const row = chartData[rowIndex];
    
    console.log('Row index:', chartConfig.rowIndex, 'Actual index:', rowIndex, 'Row:', JSON.stringify(row));

    if (!row) {
      setValue('NO ROW');
      setError('No row at index ' + chartConfig.rowIndex);
      return;
    }

    // Get field name
    const yAxis = chartConfig.dataMapping?.yAxis;
    let fieldName = '';
    
    if (Array.isArray(yAxis)) {
      const first = yAxis[0];
      fieldName = typeof first === 'string' ? first : first?.field || '';
    } else if (typeof yAxis === 'string') {
      fieldName = yAxis;
    }

    console.log('Field name:', fieldName);

    const rawValue = row[fieldName];
    console.log('Raw value from row:', rawValue);

    if (!rawValue && rawValue !== 0) {
      setValue('NO VALUE');
      setError(`Field ${fieldName} not found. Available: ${Object.keys(row).join(', ')}`);
      return;
    }

    const num = Number(rawValue);
    console.log('Converted to number:', num);

    // Format
    const prefix = chartConfig.prefix || '';
    const suffix = chartConfig.suffix || '';
    
    let formatted = '';
    if (num >= 1000000000000) {
      formatted = `${(num / 1000000000000).toFixed(1)}T`;
    } else if (num >= 1000000000) {
      formatted = `${(num / 1000000000).toFixed(1)}B`;
    } else if (num >= 1000000) {
      formatted = `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      formatted = `${(num / 1000).toFixed(1)}K`;
    } else {
      formatted = num.toFixed(0);
    }

    const final = `${prefix}${formatted}${suffix ? ' ' + suffix : ''}`;
    
    console.log('🟢 FINAL VALUE:', final);
    setValue(final);
    setLoadState('success');
    setError(null);
    
    // Calculate trend if trendConfig is present
    if (chartConfig.trendConfig && chartConfig.trendConfig.valueField === 'auto_calculate') {
      if (chartData.length >= 2 && rowIndex > 0) {
        // Compare current row (rowIndex) with previous row (rowIndex - 1)
        const previousRow = chartData[rowIndex - 1];
        const previousValue = Number(previousRow[fieldName]);
        
        if (!isNaN(previousValue) && previousValue !== 0) {
          const percentChange = ((num - previousValue) / Math.abs(previousValue)) * 100;
          setTrend({
            value: parseFloat(percentChange.toFixed(1)),
            label: chartConfig.trendConfig.label || 'vs. previous period'
          });
          console.log('🟢 TREND CALCULATED:', percentChange.toFixed(1) + '%');
        }
      }
    }

  }, [chartData, chartConfig]);

  // Clear cache for newly created counters to ensure they're displayed
  useEffect(() => {
    if (counterConfig && isRecentlyCreated(counterConfig)) {
      // Clear localStorage cache for this page
      if (typeof window !== 'undefined' && counterConfig.page) {
        try {
          localStorage.removeItem(`counters_page_${counterConfig.page}`);
        } catch (e) {
          console.warn('Error clearing localStorage cache:', e);
        }
      }
      
      // Clear in-memory cache for this endpoint
      const cacheKey = `${counterConfig.apiEndpoint}-${counterConfig.apiKey || ''}`;
      if (cacheKey in COUNTER_DATA_CACHE) {
        delete COUNTER_DATA_CACHE[cacheKey];
      }
      
      // Remove from active requests if present
      if (cacheKey in ACTIVE_REQUESTS) {
        delete ACTIVE_REQUESTS[cacheKey];
      }
    }
  }, [counterConfig]);

  // Start prefetching data as soon as component renders
  useEffect(() => {
    if (!isLoading && counterConfig?.apiEndpoint) {
      prefetchCounterData(counterConfig.apiEndpoint, counterConfig.apiKey);
    }
  }, [counterConfig?.apiEndpoint, counterConfig?.apiKey, isLoading]);

  // Get icon based on icon name in config
  const getIcon = () => {
    const iconName = counterConfig?.icon || chartConfig?.icon || 'chart';
    if (!ICONS[iconName as keyof typeof ICONS]) {
      // Default to chart icon if not specified or invalid
      return ICONS.chart;
    }
    return ICONS[iconName as keyof typeof ICONS];
  };

  // Fetch data from API when component mounts
  useEffect(() => {
    let isMounted = true;
    const loadCounterData = async () => {
      console.log('loadCounterData called:', { isLoading, isChartMode, hasChartData });
      
      if (isLoading) {
        console.log('Is loading, skipping');
        return;
      }

      try {
        setLoadState('loading');
        
        // If chart mode (data provided directly), process it immediately
        if (isChartMode && hasChartData) {
          console.log('=== COUNTER CHART MODE START ===');
          console.log('chartConfig:', JSON.stringify(chartConfig, null, 2));
          console.log('chartData length:', chartData!.length);
          console.log('chartData:', JSON.stringify(chartData, null, 2));
          
          // Extract value from chart data
          // Support negative indices like Python: -1 = last, -2 = second-to-last
          let rowIndex = chartConfig!.rowIndex || 0;
          console.log('Using rowIndex:', rowIndex);
          
          if (rowIndex < 0) {
            rowIndex = chartData!.length + rowIndex;
          }
          const actualIndex = Math.max(0, Math.min(rowIndex, chartData!.length - 1));
          console.log('Actual array index:', actualIndex);
          
          const row = chartData![actualIndex];
          
          if (!row) {
            console.error('ROW IS NULL/UNDEFINED');
            throw new Error('No data available in chart');
          }
          
          console.log('Selected row:', JSON.stringify(row, null, 2));
          
          // Extract field name from yAxis (handle both string and object formats)
          let valueField: string;
          const yAxis = chartConfig.dataMapping?.yAxis;
          
          if (Array.isArray(yAxis) && yAxis.length > 0) {
            const firstField = yAxis[0];
            valueField = typeof firstField === 'string' ? firstField : firstField.field;
          } else if (typeof yAxis === 'string') {
            valueField = yAxis;
          } else if (typeof yAxis === 'object' && yAxis !== null && 'field' in yAxis) {
            valueField = (yAxis as any).field;
          } else {
            throw new Error('No valueField specified in chart config');
          }
          
          console.log('Extracted valueField:', valueField);
          
          const rawValue = row[valueField];
          console.log('Raw value from data:', rawValue);
          
          if (rawValue === undefined || rawValue === null) {
            console.error('Available fields in row:', Object.keys(row));
            throw new Error(`Field "${valueField}" not found in data`);
          }
          
          const numericValue = Number(rawValue);
          if (isNaN(numericValue)) {
            throw new Error(`Value is not a number: ${rawValue}`);
          }
          
          // Format value with prefix and suffix
          const prefix = chartConfig.prefix || '';
          const suffix = chartConfig.suffix || '';
          
          let formattedValue = String(numericValue);
          if (numericValue >= 1000000000000) {
            formattedValue = `${(numericValue / 1000000000000).toFixed(1)}T`;
          } else if (numericValue >= 1000000000) {
            formattedValue = `${(numericValue / 1000000000).toFixed(1)}B`;
          } else if (numericValue >= 1000000) {
            formattedValue = `${(numericValue / 1000000).toFixed(1)}M`;
          } else if (numericValue >= 1000) {
            formattedValue = `${(numericValue / 1000).toFixed(1)}K`;
          } else {
            formattedValue = numericValue.toFixed(0);
          }
          
          const finalValue = `${prefix}${formattedValue}${suffix ? ' ' + suffix : ''}`;
          console.log('Setting counter value:', finalValue);
          setValue(finalValue);
          setLoadState('success');
          
          if (!isMounted) return;
          return;
        }
        
        // If in chart mode but no data yet
        if (isChartMode && !hasChartData) {
          // Check if we have an apiEndpoint to fall back to
          if (!chartConfig?.apiEndpoint) {
            // No apiEndpoint and no data yet - keep loading state
            console.log('Counter in chart mode, waiting for data to load...');
            return;
          }
          // If we have apiEndpoint, continue to fetch from API
          console.log('Counter in chart mode without data, falling back to apiEndpoint');
        }
        
        // Otherwise, fetch from API using traditional counter config or chart config
        let valueFieldForAPI = '';
        if (chartConfig?.dataMapping?.yAxis) {
          const yAxis = chartConfig.dataMapping.yAxis;
          if (Array.isArray(yAxis) && yAxis.length > 0) {
            const firstField = yAxis[0];
            valueFieldForAPI = typeof firstField === 'string' ? firstField : firstField.field;
          } else if (typeof yAxis === 'string') {
            valueFieldForAPI = yAxis;
          } else if (typeof yAxis === 'object' && yAxis !== null && 'field' in yAxis) {
            valueFieldForAPI = (yAxis as any).field;
          }
        }
        
        const configToUse = counterConfig || (chartConfig ? {
          ...chartConfig,
          valueField: valueFieldForAPI,
          rowIndex: chartConfig.rowIndex || 0,
          prefix: chartConfig.prefix || '',
          suffix: chartConfig.suffix || '',
        } : null);
        
        if (!configToUse) {
          throw new Error('Neither chart data nor valid config provided');
        }
        
        // Check if apiEndpoint is available
        if (!configToUse.apiEndpoint) {
          throw new Error('No data source available: Neither chartData nor apiEndpoint provided');
        }
        
        // Fetch data using our specialized function
        const startTime = performance.now();
        const result = await fetchAndProcessCounter(configToUse as CounterConfig);
        const endTime = performance.now();
        
        // If component was unmounted during the async operation, don't update state
        if (!isMounted) return;

        // Check for errors
        if (result.error) {
          throw new Error(result.error);
        }

        // Format value with prefix and suffix
        let formattedValue = String(result.value);
        
        // Format number if it's a numeric value
        if (!isNaN(Number(result.value))) {
          const num = Number(result.value);
          
          // Check if prefix indicates currency
          const isCurrency = configToUse?.prefix === '$' || configToUse?.prefix === '€' || configToUse?.prefix === '£';
          // Check if suffix indicates percentage
          const isPercentage = configToUse?.suffix === '%';
          
          if (isPercentage) {
            // For percentages, show 1 decimal place
            formattedValue = num.toFixed(1);
          } else if (isCurrency || num >= 1000) {
            // For currencies and large numbers, use compact notation
            if (num >= 1000000000000) {
              formattedValue = `${(num / 1000000000000).toFixed(1)}T`;
            } else if (num >= 1000000000) {
              formattedValue = `${(num / 1000000000).toFixed(1)}B`;
            } else if (num >= 1000000) {
              formattedValue = `${(num / 1000000).toFixed(1)}M`;
            } else if (num >= 1000) {
              formattedValue = `${(num / 1000).toFixed(1)}K`;
            } else {
              // For smaller numbers
              formattedValue = isCurrency ? num.toFixed(2) : num.toFixed(0);
            }
          } else {
            // For small numbers that aren't currency or percentage
            formattedValue = num.toLocaleString('en-US', { maximumFractionDigits: 1 });
          }
        }

        // Apply prefix and suffix
        if (typeof configToUse?.prefix === 'string' && configToUse.prefix !== '') {
          formattedValue = `${configToUse.prefix}${formattedValue}`;
        }
        if (typeof configToUse?.suffix === 'string' && configToUse.suffix !== '') {
          formattedValue = `${formattedValue} ${configToUse.suffix}`;
        }

        setValue(formattedValue);
        setLoadState('success');

        // Set trend if available - improve logging here
        if (configToUse?.trendConfig && result.previousValue !== undefined) {
          setTrend({
            value: parseFloat(result.previousValue.toFixed(1)), // Format to 1 decimal place
            label: configToUse.trendConfig.label || 'vs. previous period'
          });
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error loading counter data:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('Full error:', errorMsg);
        setError(`Error: ${errorMsg}`);
        setValue("0"); // Show 0 on error to match the screenshot
        setLoadState('error');
      }
    };

    loadCounterData();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [
    counterConfig?.apiEndpoint,
    counterConfig?.apiKey,
    counterConfig?.valueField,
    counterConfig?.rowIndex,
    counterConfig?.prefix,
    counterConfig?.suffix,
    counterConfig?.trendConfig,
    isLoading,
    isChartMode,
    hasChartData,
    chartData,
    chartConfig
  ]);

  console.log('=== CounterRenderer FINAL RENDER ===', { 
    hasError: !!error, 
    error, 
    value, 
    loadState,
    configTitle: config?.title,
    isChartMode,
    hasChartData
  });

  if (error) {
    console.error('=== SHOWING ERROR UI ===', error);
    return (
      <div className="bg-red-500/10 p-4 rounded-md border border-red-800/50">
        <h3 className="text-sm font-medium text-red-400">❌ Error Loading Counter</h3>
        <p className="mt-1 text-xs text-gray-300 font-mono">{error}</p>
        <p className="mt-2 text-xs text-gray-500">Chart ID: {config?.id}</p>
      </div>
    );
  }

  // Final value display logic
  const displayValue = loadState === 'loading' ? 'Loading...' : value || '0';
  
  console.log('=== CounterRenderer returning Counter component ===', {
    displayValue,
    originalValue: value,
    loadState
  });

  return (
    <Counter
      title={config?.title || 'Counter'}
      value={displayValue}
      trend={trend}
      icon={getIcon()}
      variant={config?.variant || "blue"}
      isLoading={isLoading || loadState === 'loading'}
      className={config?.width && config?.width > 1 ? "h-full" : ""}
    />
  );
};

export default CounterRenderer; 