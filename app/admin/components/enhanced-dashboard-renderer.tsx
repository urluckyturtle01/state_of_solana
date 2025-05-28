"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { getChartConfigsByPage, getCounterConfigsByPage, getTableConfigsByPage } from '../utils';
import { ChartConfig, CounterConfig, TableConfig } from '../types';
import dynamic from 'next/dynamic';
import PrettyLoader from '@/app/components/shared/PrettyLoader';

// Lazy load components for better initial load performance
const DashboardRenderer = React.lazy(() => import('./dashboard-renderer'));
const CounterRenderer = React.lazy(() => import('./CounterRenderer'));
const TableRenderer = React.lazy(() => import('./TableRenderer'));

// Simple loading fallback
const ChartLoadingFallback = () => (
  <div className="flex justify-center items-center h-64 w-full">
    <div className="w-6 h-6 border-2 border-t-blue-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
  </div>
);

// Interface for component props
interface EnhancedDashboardRendererProps {
  pageId: string;
  overrideCharts?: ChartConfig[];
  overrideCounters?: CounterConfig[];
  overrideTables?: TableConfig[];
  enableCaching?: boolean;
}

// Cache durations
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const COUNTER_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for counters (reduced from 30 minutes)
const TABLE_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for tables

// Cache for counter configurations
const PAGE_COUNTERS_CACHE: Record<string, {
  counters: CounterConfig[];
  timestamp: number;
  expiresIn: number;
}> = {};

// Cache for table configurations
const PAGE_TABLES_CACHE: Record<string, {
  tables: TableConfig[];
  timestamp: number;
  expiresIn: number;
}> = {};

// Request deduplication for in-flight requests
const IN_FLIGHT_REQUESTS: Map<string, Promise<any>> = new Map();

// Enhanced cache with localStorage persistence
const persistToLocalStorage = <T,>(key: string, data: T, expiresIn: number) => {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      expires: Date.now() + expiresIn
    };
    localStorage.setItem(`edr_cache_${key}`, JSON.stringify(cacheEntry));
  } catch (e) {
    // Silently fail if localStorage is full
    console.warn('Failed to persist to localStorage:', e);
  }
};

const getFromLocalStorage = <T,>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(`edr_cache_${key}`);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    if (parsed.expires > Date.now()) {
      return parsed.data as T;
    }
    
    // Clean up expired entry
    localStorage.removeItem(`edr_cache_${key}`);
  } catch (e) {
    console.warn('Failed to read from localStorage:', e);
  }
  
  return null;
};

// Helper to deduplicate requests
const deduplicatedFetch = async <T,>(
  key: string,
  fetchFn: () => Promise<T>
): Promise<T> => {
  // If there's already a request in flight for this key, return it
  if (IN_FLIGHT_REQUESTS.has(key)) {
    return IN_FLIGHT_REQUESTS.get(key) as Promise<T>;
  }

  // Start new request and store the promise
  const promise = fetchFn().finally(() => {
    // Clean up after request completes
    IN_FLIGHT_REQUESTS.delete(key);
  });

  IN_FLIGHT_REQUESTS.set(key, promise);
  return promise;
};

// Preload counter configurations for a page with deduplication
const preloadCounterConfigs = async (pageId: string, forceRefresh = false): Promise<CounterConfig[]> => {
  const cacheKey = `counters_${pageId}`;
  
  // Check if we need to force a refresh from localStorage flag
  if (typeof window !== 'undefined') {
    const needsRefresh = localStorage.getItem('counters_need_refresh') === 'true';
    const refreshedPage = localStorage.getItem('counters_refreshed_page');
    const refreshTime = parseInt(localStorage.getItem('counters_refresh_time') || '0', 10);
    
    // If localStorage indicates we need a refresh for this page, enable forceRefresh
    if ((needsRefresh && refreshedPage === pageId)) {
      console.log(`Force refreshing counter configs for page ${pageId} due to localStorage flag`);
      forceRefresh = true;
      
      // Check if the flag is too old (more than 5 minutes)
      const now = Date.now();
      if (now - refreshTime > 5 * 60 * 1000) {
        // Clear the flag since it's too old
        localStorage.setItem('counters_need_refresh', 'false');
      }
    }
  }
  
  // Force refresh will skip cache check and fetch fresh data
  if (!forceRefresh) {
    // Check localStorage first for instant loading
    const localStorageData = getFromLocalStorage<CounterConfig[]>(cacheKey);
    if (localStorageData) {
      console.log(`Using localStorage cache for counter configs ${pageId}`);
      // Update in-memory cache too
      PAGE_COUNTERS_CACHE[pageId] = {
        counters: localStorageData,
        timestamp: Date.now(),
        expiresIn: COUNTER_CACHE_DURATION
      };
      return localStorageData;
    }
    
    // Check if we have cached counters for this page
    if (PAGE_COUNTERS_CACHE[pageId]) {
      const cachedConfig = PAGE_COUNTERS_CACHE[pageId];
      const now = Date.now();
      
      // Use cached counters if not expired
      if (now - cachedConfig.timestamp < cachedConfig.expiresIn) {
        console.log(`Using cached counter configs for page ${pageId}`);
        return Promise.resolve(cachedConfig.counters);
      }
    }
  } else {
    console.log(`Force refreshing counter configs for page ${pageId}`);
    
    // If we're doing a force refresh, clear caches
    delete PAGE_COUNTERS_CACHE[pageId];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`edr_cache_${cacheKey}`);
    }
  }
  
  // Use deduplication for the actual fetch
  return deduplicatedFetch(cacheKey, async () => {
    try {
      const counters = await getCounterConfigsByPage(pageId);
      
      // Cache the counters for future use
      PAGE_COUNTERS_CACHE[pageId] = {
        counters,
        timestamp: Date.now(),
        expiresIn: COUNTER_CACHE_DURATION
      };
      
      // Persist to localStorage
      persistToLocalStorage(cacheKey, counters, COUNTER_CACHE_DURATION);
      
      return counters;
    } catch (error) {
      console.error(`Error preloading counters for page ${pageId}:`, error);
      
      // Return cached counters even if expired in case of error
      if (PAGE_COUNTERS_CACHE[pageId]) {
        return PAGE_COUNTERS_CACHE[pageId].counters;
      }
      
      return [];
    }
  });
};

// Preload table configurations for a page with deduplication
const preloadTableConfigs = async (pageId: string, forceRefresh = false): Promise<TableConfig[]> => {
  const cacheKey = `tables_${pageId}`;
  
  // Force refresh will skip cache check and fetch fresh data
  if (!forceRefresh) {
    // Check localStorage first for instant loading
    const localStorageData = getFromLocalStorage<TableConfig[]>(cacheKey);
    if (localStorageData) {
      console.log(`Using localStorage cache for table configs ${pageId}`);
      // Update in-memory cache too
      PAGE_TABLES_CACHE[pageId] = {
        tables: localStorageData,
        timestamp: Date.now(),
        expiresIn: TABLE_CACHE_DURATION
      };
      return localStorageData;
    }
    
    // Check if we have cached tables for this page
    if (PAGE_TABLES_CACHE[pageId]) {
      const cachedConfig = PAGE_TABLES_CACHE[pageId];
      const now = Date.now();
      
      // Use cached tables if not expired
      if (now - cachedConfig.timestamp < cachedConfig.expiresIn) {
        console.log(`Using cached table configs for page ${pageId}`);
        return Promise.resolve(cachedConfig.tables);
      }
    }
  } else {
    console.log(`Force refreshing table configs for page ${pageId}`);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`edr_cache_${cacheKey}`);
    }
  }
  
  // Use deduplication for the actual fetch
  return deduplicatedFetch(cacheKey, async () => {
    try {
      const tables = await getTableConfigsByPage(pageId);
      
      // Cache the tables for future use
      PAGE_TABLES_CACHE[pageId] = {
        tables,
        timestamp: Date.now(),
        expiresIn: TABLE_CACHE_DURATION
      };
      
      // Persist to localStorage
      persistToLocalStorage(cacheKey, tables, TABLE_CACHE_DURATION);
      
      return tables;
    } catch (error) {
      console.error(`Error preloading tables for page ${pageId}:`, error);
      
      // Return cached tables even if expired in case of error
      if (PAGE_TABLES_CACHE[pageId]) {
        return PAGE_TABLES_CACHE[pageId].tables;
      }
      
      return [];
    }
  });
};

// Memoized Counter component for better performance
const MemoizedCounterRenderer = React.memo(CounterRenderer, (prevProps, nextProps) => {
  return prevProps.counterConfig.id === nextProps.counterConfig.id &&
         JSON.stringify(prevProps.counterConfig) === JSON.stringify(nextProps.counterConfig);
});

// Memoized Table component for better performance  
const MemoizedTableRenderer = React.memo(TableRenderer, (prevProps, nextProps) => {
  return prevProps.tableConfig.id === nextProps.tableConfig.id &&
         JSON.stringify(prevProps.tableConfig) === JSON.stringify(nextProps.tableConfig);
});

export default React.memo(function EnhancedDashboardRenderer({
  pageId,
  overrideCharts,
  overrideCounters,
  overrideTables,
  enableCaching = true,
}: EnhancedDashboardRendererProps) {
  const [counters, setCounters] = useState<CounterConfig[]>([]);
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [isLoadingCounters, setIsLoadingCounters] = useState<boolean>(true);
  const [isLoadingTables, setIsLoadingTables] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Add a refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  
  // Track component mount state
  const isMountedRef = useRef(true);
  
  // Track if initial load is complete
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  
  // Progressive rendering state - render components in batches
  const [renderBatch, setRenderBatch] = useState(0);
  const BATCH_SIZE = 6; // Increase batch size for faster rendering

  // Function to force refresh counters and tables
  const refreshData = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Prefetch configuration data on component mount - reduce delay
  useEffect(() => {
    // Prefetch next likely pages
    const prefetchRelatedPages = async () => {
      // Common navigation patterns - prefetch related pages
      const relatedPages = ['network-usage', 'summary', 'protocol-revenue-summary', 'dex-summary'];
      
      // Prefetch in background after a smaller delay
      setTimeout(() => {
        relatedPages.forEach(page => {
          if (page !== pageId) {
            // Prefetch configs in background
            preloadCounterConfigs(page).catch(() => {});
            preloadTableConfigs(page).catch(() => {});
          }
        });
      }, 500); // Reduced from 2000ms to 500ms
    };
    
    if (typeof window !== 'undefined') {
      prefetchRelatedPages();
    }
  }, [pageId]);

  // Optimized load counters with request batching
  const loadCounters = useCallback(async () => {
    if (!pageId) return;
    
    // Check if we already have data in memory/localStorage
    const cachedData = getFromLocalStorage<CounterConfig[]>(`counters_${pageId}`);
    if (cachedData && !refreshTrigger) {
      // Set data immediately from cache
      setCounters(cachedData);
      setIsLoadingCounters(false);
      setIsInitialLoadComplete(true);
      
      // Still fetch fresh data in background - but with immediate execution
      Promise.resolve().then(() => {
        preloadCounterConfigs(pageId, false).then(freshData => {
          if (isMountedRef.current && JSON.stringify(freshData) !== JSON.stringify(cachedData)) {
            setCounters(freshData);
          }
        }).catch(() => {});
      });
      
      return;
    }
    
    // Only show loading on initial load, not refreshes
    if (!isInitialLoadComplete) {
      setIsLoadingCounters(true);
    }
    setError(null);
    
    try {
      // Use provided override counters or load from page config
      let pageCounters: CounterConfig[];
      
      if (overrideCounters) {
        pageCounters = overrideCounters;
      } else {
        // Load counters for the page, with force refresh if triggered
        pageCounters = await preloadCounterConfigs(pageId, refreshTrigger > 0);
      }
      
      if (isMountedRef.current) {
        setCounters(pageCounters || []);
        // Start progressive rendering
        setRenderBatch(0);
      }
    } catch (error) {
      console.error('Error loading counters:', error);
      if (isMountedRef.current) {
        setError('Failed to load counter data. Please try refreshing the page.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingCounters(false);
        setIsInitialLoadComplete(true);
      }
    }
  }, [pageId, overrideCounters, refreshTrigger, isInitialLoadComplete]);
  
  // Optimized load tables with request batching
  const loadTables = useCallback(async () => {
    if (!pageId) return;
    
    // Check if we already have data in memory/localStorage
    const cachedData = getFromLocalStorage<TableConfig[]>(`tables_${pageId}`);
    if (cachedData && !refreshTrigger) {
      // Set data immediately from cache
      setTables(cachedData);
      setIsLoadingTables(false);
      
      // Still fetch fresh data in background - but with immediate execution
      Promise.resolve().then(() => {
        preloadTableConfigs(pageId, false).then(freshData => {
          if (isMountedRef.current && JSON.stringify(freshData) !== JSON.stringify(cachedData)) {
            setTables(freshData);
          }
        }).catch(() => {});
      });
      
      return;
    }
    
    // Only show loading on initial load
    if (!isInitialLoadComplete) {
      setIsLoadingTables(true);
    }
    setError(null);
    
    try {
      // Use provided override tables or load from page config
      let pageTables: TableConfig[];
      
      if (overrideTables) {
        pageTables = overrideTables;
      } else {
        // Load tables for the page, with force refresh if triggered
        pageTables = await preloadTableConfigs(pageId, refreshTrigger > 0);
      }
      
      // Log the tables for debugging
      console.log(`Loaded ${pageTables?.length || 0} tables for page ${pageId}:`, pageTables);
      
      if (isMountedRef.current) {
        setTables(pageTables || []);
      }
    } catch (error) {
      console.error('Error loading tables:', error);
      if (isMountedRef.current) {
        setError('Failed to load table data. Please try refreshing the page.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingTables(false);
      }
    }
  }, [pageId, overrideTables, refreshTrigger, isInitialLoadComplete]);

  // Effect to load counter and table data when page changes or refresh is triggered
  useEffect(() => {
    // Load data in parallel
    Promise.all([
      loadCounters(),
      loadTables()
    ]);
  }, [loadCounters, loadTables]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Progressive rendering - increment batch after minimal delay
  useEffect(() => {
    if (counters.length > 0 && renderBatch * BATCH_SIZE < counters.length) {
      // Use requestAnimationFrame for smoother rendering
      const frameId = requestAnimationFrame(() => {
        setRenderBatch(prev => prev + 1);
      });
      
      return () => cancelAnimationFrame(frameId);
    }
  }, [counters.length, renderBatch]);

  // Memoized counter rendering with progressive loading
  const renderCounters = useMemo(() => {
    // Only show skeleton if we're loading counters AND we expect to have counters
    if (isLoadingCounters && !isInitialLoadComplete && !overrideCounters) {
      // Check if this page typically has counters by checking cache or previous data
      const cachedCounters = getFromLocalStorage<CounterConfig[]>(`counters_${pageId}`);
      const hasCachedCounters = cachedCounters && cachedCounters.length > 0;
      
      // Only show skeleton if we have reason to believe there will be counters
      if (hasCachedCounters) {
        return (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-0 mt-0">
            {[...Array(3)].map((_, i) => (
              <div key={`skeleton-${i}`} className="col-span-1 md:col-span-2">
                <div className="bg-gray-900/20 border border-gray-800/50 rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-700/50 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        );
      }
    }

    if (counters.length === 0) {
      return null;
    }

    // Progressive rendering - only render up to current batch
    const countersToRender = counters.slice(0, (renderBatch + 1) * BATCH_SIZE);

    return (
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-0 mt-0">
        {countersToRender.map((counter) => (
          <div 
            key={counter.id} 
            className={`col-span-1 ${
              counter.width === 1 ? 'md:col-span-2' : // 1/3 width = 2 of 6 columns
              counter.width === 2 ? 'md:col-span-3' : // 1/2 width = 3 of 6 columns
              counter.width === 3 ? 'md:col-span-6' : // Full width = 6 of 6 columns
              counter.width === 4 ? 'md:col-span-6' : // Fallback for old value
              'md:col-span-2' // Default to 1/3 width
            }`}
          >
            <Suspense fallback={
              <div className="bg-gray-900/20 border border-gray-800/50 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-700/50 rounded w-1/2"></div>
              </div>
            }>
              <MemoizedCounterRenderer counterConfig={counter} />
            </Suspense>
          </div>
        ))}
      </div>
    );
  }, [counters, isLoadingCounters, isInitialLoadComplete, renderBatch, overrideCounters, pageId]);

  // Memoized table rendering
  const renderTables = useMemo(() => {
    if (isLoadingTables && !isInitialLoadComplete) {
      // Return null during initial loading
      return null;
    }

    if (tables.length === 0) {
      return null;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-4 mb-4">
        {tables.map((table) => (
          <div 
            key={table.id} 
            className={`col-span-1 ${
              table.width === 2 ? 'md:col-span-3' : // 1/2 width = 3 of 6 columns 
              'md:col-span-6' // Full width (width=3) = 6 of 6 columns
            }`}
          >
            <Suspense fallback={
              <div className="bg-gray-900/20 border border-gray-800/50 rounded-lg p-4 h-64 animate-pulse">
                <div className="h-4 bg-gray-700/50 rounded w-1/4 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-700/50 rounded w-full"></div>
                  <div className="h-3 bg-gray-700/50 rounded w-full"></div>
                  <div className="h-3 bg-gray-700/50 rounded w-full"></div>
                </div>
              </div>
            }>
              <MemoizedTableRenderer tableConfig={table} />
            </Suspense>
          </div>
        ))}
      </div>
    );
  }, [tables, isLoadingTables, isInitialLoadComplete]);

  return (
    <div className="space-y-4">
      {/* Render counters at the top */}
      {renderCounters}
      
      {/* Render charts immediately without lazy loading */}
      <Suspense fallback={null}>
        <DashboardRenderer
          pageId={pageId}
          overrideCharts={overrideCharts}
          enableCaching={enableCaching}
        />
      </Suspense>
      
      {/* Render tables below charts */}
      {renderTables}
      
      {/* Show error if any */}
      {error && (
        <div className="bg-red-900/20 border border-red-800/30 rounded-md p-4 mt-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}); 