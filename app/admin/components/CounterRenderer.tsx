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
  counterConfig: CounterConfig;
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
    const rowIndex = Math.min(counterConfig.rowIndex || 0, rows.length - 1);
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
  isLoading = false
}) => {
  const [value, setValue] = useState<string>("Loading...");
  const [trend, setTrend] = useState<{ value: number; label: string } | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'success' | 'error'>('loading');

  // Clear cache for newly created counters to ensure they're displayed
  useEffect(() => {
    if (isRecentlyCreated(counterConfig)) {
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
    if (!isLoading && counterConfig.apiEndpoint) {
      prefetchCounterData(counterConfig.apiEndpoint, counterConfig.apiKey);
    }
  }, [counterConfig.apiEndpoint, counterConfig.apiKey, isLoading]);

  // Get icon based on icon name in config
  const getIcon = () => {
    if (!counterConfig.icon || !ICONS[counterConfig.icon as keyof typeof ICONS]) {
      // Default to revenue icon if not specified or invalid
      return ICONS.chart;
    }
    return ICONS[counterConfig.icon as keyof typeof ICONS];
  };

  // Fetch data from API when component mounts
  useEffect(() => {
    let isMounted = true;
    const loadCounterData = async () => {
      if (isLoading) return;

      try {
        setLoadState('loading');
        
        // Fetch data using our specialized function
        const startTime = performance.now();
        const result = await fetchAndProcessCounter(counterConfig);
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
          const isCurrency = counterConfig.prefix === '$' || counterConfig.prefix === '€' || counterConfig.prefix === '£';
          // Check if suffix indicates percentage
          const isPercentage = counterConfig.suffix === '%';
          
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
        if (typeof counterConfig.prefix === 'string' && counterConfig.prefix !== '') {
          formattedValue = `${counterConfig.prefix}${formattedValue}`;
        }
        if (typeof counterConfig.suffix === 'string' && counterConfig.suffix !== '') {
          formattedValue = `${formattedValue} ${counterConfig.suffix}`;
        }

        setValue(formattedValue);
        setLoadState('success');

        // Set trend if available - improve logging here
        if (counterConfig.trendConfig && result.previousValue !== undefined) {
          setTrend({
            value: parseFloat(result.previousValue.toFixed(1)), // Format to 1 decimal place
            label: counterConfig.trendConfig.label || 'vs. previous period'
          });
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error loading counter data:', error);
        setError(`Error: ${error instanceof Error ? error.message : String(error)}`);
        setValue("Error");
        setLoadState('error');
      }
    };

    loadCounterData();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [
    counterConfig.apiEndpoint,
    counterConfig.apiKey,
    counterConfig.valueField,
    counterConfig.rowIndex,
    counterConfig.prefix,
    counterConfig.suffix,
    counterConfig.trendConfig,
    isLoading
  ]);

  if (error) {
    return (
      <div className="bg-red-500/10 p-4 rounded-md border border-red-800/20">
        <h3 className="text-sm font-medium text-red-400">Error Loading Counter</h3>
        <p className="mt-1 text-xs text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <Counter
      title={counterConfig.title}
      value={value}
      trend={trend}
      icon={getIcon()}
      variant={counterConfig.variant || "blue"}
      isLoading={isLoading || loadState === 'loading'}
      className={counterConfig.width && counterConfig.width > 1 ? "h-full" : ""}
    />
  );
};

export default CounterRenderer; 