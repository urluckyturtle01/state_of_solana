"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getChartConfigsByPage, getCounterConfigsByPage, getTableConfigsByPage } from '../utils';
import { ChartConfig, CounterConfig, TableConfig } from '../types';
import dynamic from 'next/dynamic';
import PrettyLoader from '@/app/components/shared/PrettyLoader';

// Dynamic imports for better bundle splitting and performance
const DashboardRenderer = dynamic(() => import('./dashboard-renderer'), {
  ssr: false,
  loading: () => <ChartLoadingFallback />
});

const CounterRenderer = dynamic(() => import('./CounterRenderer'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-800/50 rounded-lg h-20 w-full"></div>
});

const TableRenderer = dynamic(() => import('./TableRenderer'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-800/50 rounded-lg h-40 w-full"></div>
});

// Simple loading fallback
const ChartLoadingFallback = () => (
  <div className="flex justify-center items-center h-64 w-full">
    <PrettyLoader size="sm" />
  </div>
);

// Interface for component props
interface EnhancedDashboardRendererProps {
  pageId: string;
  overrideCharts?: ChartConfig[];
  overrideCounters?: CounterConfig[];
  overrideTables?: TableConfig[];
  enableCaching?: boolean;
  section?: string; // Optional section filter for sectioned pages
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
        return Promise.resolve(cachedConfig.counters);
      }
    }
  } else {
    
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
        return Promise.resolve(cachedConfig.tables);
      }
    }
  } else {
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

// Optimized state interface for enhanced dashboard
interface EnhancedDashboardState {
  counters: CounterConfig[];
  tables: TableConfig[];
  isLoadingCounters: boolean;
  isLoadingTables: boolean;
  isInitialLoadComplete: boolean;
  error: string | null;
  refreshTrigger: number;
}

export default React.memo(function EnhancedDashboardRenderer({
  pageId,
  overrideCharts,
  overrideCounters,
  overrideTables,
  enableCaching = true,
  section,
}: EnhancedDashboardRendererProps) {
  // Consolidated state management
  const [state, setState] = useState<EnhancedDashboardState>({
    counters: [],
    tables: [],
    isLoadingCounters: true,
    isLoadingTables: true,
    isInitialLoadComplete: false,
    error: null,
    refreshTrigger: 0
  });
  
  // Track component mount state
  const isMountedRef = useRef(true);

  // Optimized state update helpers
  const updateState = useCallback((updates: Partial<EnhancedDashboardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Function to force refresh counters and tables
  const refreshData = useCallback(() => {
    updateState({ refreshTrigger: state.refreshTrigger + 1 });
  }, [state.refreshTrigger, updateState]);

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

  // Enhanced parallel loading of all component types
  const loadAllComponents = useCallback(async () => {
    if (!pageId) return;
    
    // Check for cached data for immediate display
    const cachedCounters = getFromLocalStorage<CounterConfig[]>(`counters_${pageId}`);
    const cachedTables = getFromLocalStorage<TableConfig[]>(`tables_${pageId}`);
    
    // Set cached data immediately if available and not refreshing
    if (!state.refreshTrigger) {
      if (cachedCounters) {
        updateState({
          counters: cachedCounters,
          isLoadingCounters: false
        });
      }
      
      if (cachedTables) {
        updateState({
          tables: cachedTables,
          isLoadingTables: false
        });
      }
    }
    
    // Start parallel loading of fresh data
    const loadPromises: Promise<any>[] = [];
    
    // Load counters
    if (overrideCounters) {
      loadPromises.push(Promise.resolve(overrideCounters));
    } else {
      loadPromises.push(preloadCounterConfigs(pageId, state.refreshTrigger > 0));
    }
    
    // Load tables
    if (overrideTables) {
      loadPromises.push(Promise.resolve(overrideTables));
    } else {
      loadPromises.push(preloadTableConfigs(pageId, state.refreshTrigger > 0));
    }
    
    // Execute all loads in parallel
    try {
      const [freshCounters, freshTables] = await Promise.all(loadPromises);
      
      if (isMountedRef.current) {
        // Batch update all states at once
        updateState({
          counters: freshCounters || [],
          tables: freshTables || [],
          isLoadingCounters: false,
          isLoadingTables: false,
          isInitialLoadComplete: true,
          error: null
        });
      }
    } catch (error) {
      console.error('Error loading components:', error);
      if (isMountedRef.current) {
        updateState({
          error: 'Failed to load some components. Please try refreshing the page.',
          isLoadingCounters: false,
          isLoadingTables: false,
          isInitialLoadComplete: true
        });
      }
    }
  }, [pageId, overrideCounters, overrideTables, state.refreshTrigger, updateState]);

  // Replace the individual load functions with the parallel loader
  useEffect(() => {
    loadAllComponents();
  }, [loadAllComponents]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Memoized counter rendering
  const renderCounters = useMemo(() => {
    // Only show skeleton if we're loading counters AND we expect to have counters
    if (state.isLoadingCounters && !state.isInitialLoadComplete && !overrideCounters) {
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

    if (state.counters.length === 0) {
      return null;
    }

    // Render all counters at once - no progressive rendering
    return (
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-0 mt-0">
        {state.counters.map((counter) => (
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
            <MemoizedCounterRenderer counterConfig={counter} />
          </div>
        ))}
      </div>
    );
  }, [state.counters, state.isLoadingCounters, state.isInitialLoadComplete, overrideCounters, pageId]);

  // Memoized table rendering with section filtering
  const renderTables = useMemo(() => {
    if (state.isLoadingTables && !state.isInitialLoadComplete) {
      // Return null during initial loading
      return null;
    }

    if (state.tables.length === 0) {
      return null;
    }

    // Filter tables by section if section is provided
    const filteredTables = section 
      ? state.tables.filter(table => table.additionalOptions?.section === section)
      : state.tables;

    if (filteredTables.length === 0) {
      return null;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-4 mb-4">
        {filteredTables.map((table) => (
          <div 
            key={table.id} 
            className={`col-span-1 ${
              table.width === 2 ? 'md:col-span-3' : // 1/2 width = 3 of 6 columns 
              'md:col-span-6' // Full width (width=3) = 6 of 6 columns
            }`}
          >
            <MemoizedTableRenderer tableConfig={table} />
          </div>
        ))}
      </div>
    );
  }, [state.tables, state.isLoadingTables, state.isInitialLoadComplete, section]);

  return (
    <div className="space-y-4">
      {/* Render counters at the top */}
      {renderCounters}
      
      {/* Render charts immediately without lazy loading */}
      <DashboardRenderer
        pageId={pageId}
        overrideCharts={overrideCharts}
        enableCaching={enableCaching}
        section={section}
      />
      
      {/* Render tables below charts */}
      {renderTables}
      
      {/* Show error if any */}
      {state.error && (
        <div className="bg-red-900/20 border border-red-800/30 rounded-md p-4 mt-4">
          <p className="text-red-400">{state.error}</p>
        </div>
      )}
    </div>
  );
}); 