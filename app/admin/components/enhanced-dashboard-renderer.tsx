"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { getChartConfigsByPage, getCounterConfigsByPage, getTableConfigsByPage } from '../utils';
import { ChartConfig, CounterConfig, TableConfig } from '../types';
import dynamic from 'next/dynamic';

// Dynamic imports to avoid SSR issues
const DashboardRenderer = dynamic(() => import('./dashboard-renderer'), {
  ssr: false,
});

const CounterRenderer = dynamic(() => import('./CounterRenderer'), {
  ssr: false,
});

const TableRenderer = dynamic(() => import('./TableRenderer'), {
  ssr: false,
});

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

// Preload counter configurations for a page
const preloadCounterConfigs = async (pageId: string, forceRefresh = false): Promise<CounterConfig[]> => {
  // Map page IDs for backward compatibility 
  const compatPageId = (() => {
    // For legacy 'summary' page, determine which section we're in
    if (pageId === 'summary') {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (path.includes('/protocol-revenue/')) {
        return 'protocol-revenue-summary';
      } else if (path.includes('/dex/')) {
        return 'dex-summary';
      } else if (path.includes('/mev/')) {
        return 'mev-summary';
      }
    }
    
    // Check if we should also try to load from the legacy 'summary' page
    // This handles the case where we're using a new prefixed page ID but there are
    // existing counters with the old 'summary' ID
    if (typeof window !== 'undefined' && 
        (pageId === 'protocol-revenue-summary' || pageId === 'dex-summary' || pageId === 'mev-summary')) {
      const compatPage = localStorage.getItem('counters_compat_page');
      if (compatPage === 'summary') {
        console.log(`Found compatibility flag for 'summary', will load both ${pageId} and summary counters`);
        
        // Load summary counters in the background and merge them
        setTimeout(() => {
          getCounterConfigsByPage('summary').then(legacyCounters => {
            if (legacyCounters.length > 0) {
              console.log(`Found ${legacyCounters.length} legacy counters with 'summary' ID, adding to cache`);
              // Add to cache
              if (PAGE_COUNTERS_CACHE[pageId]) {
                const existingCache = PAGE_COUNTERS_CACHE[pageId];
                // Filter out any duplicates by ID
                const newCounters = legacyCounters.filter(
                  legacyCounter => !existingCache.counters.some(
                    existingCounter => existingCounter.id === legacyCounter.id
                  )
                );
                
                if (newCounters.length > 0) {
                  PAGE_COUNTERS_CACHE[pageId] = {
                    ...existingCache,
                    counters: [...existingCache.counters, ...newCounters]
                  };
                  console.log(`Added ${newCounters.length} unique legacy counters to cache`);
                }
              }
            }
          }).catch(err => console.error('Error loading legacy counters:', err));
        }, 500);
      }
    }
    
    return pageId;
  })();

  // Check if we need to force a refresh from localStorage flag
  if (typeof window !== 'undefined') {
    const needsRefresh = localStorage.getItem('counters_need_refresh') === 'true';
    const refreshedPage = localStorage.getItem('counters_refreshed_page');
    const refreshTime = parseInt(localStorage.getItem('counters_refresh_time') || '0', 10);
    
    // If localStorage indicates we need a refresh for this page, enable forceRefresh
    if ((needsRefresh && (refreshedPage === pageId || refreshedPage === compatPageId))) {
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
    
    // If we're doing a force refresh, clear in-memory cache too
    delete PAGE_COUNTERS_CACHE[pageId];
    // Clear cache for compatibility ID too if different
    if (compatPageId !== pageId) {
      delete PAGE_COUNTERS_CACHE[compatPageId];
    }
  }
  
  try {
    // Add a cache-busting query parameter when forcing refresh
    const cacheBuster = forceRefresh ? `?_t=${Date.now()}` : '';
    
    // Fetch counters for the page with retry mechanism
    let counters: CounterConfig[] = [];
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        // Fetch with the compatibility page ID
        counters = await getCounterConfigsByPage(compatPageId);
        
        // If using compatibility ID and we got no results, try with the original ID as fallback
        if (counters.length === 0 && compatPageId !== pageId) {
          console.log(`No counters found with compatibility ID ${compatPageId}, trying original ID ${pageId}`);
          counters = await getCounterConfigsByPage(pageId);
        }
        
        if (counters.length > 0 || retryCount === maxRetries) {
          break;
        }
        retryCount++;
        console.log(`No counters found on attempt ${retryCount}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay before retry
      } catch (error) {
        console.error(`Error fetching counters on attempt ${retryCount}:`, error);
        retryCount++;
        if (retryCount > maxRetries) break;
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay before retry
      }
    }
    
    // Log what we found
    if (counters.length > 0) {
      console.log(`Found ${counters.length} counters for page ${compatPageId !== pageId ? compatPageId + ' (compatibility ID)' : pageId}`);
    } else {
      console.warn(`No counters found for page ${pageId} after ${retryCount} attempts`);
    }
    
    // If we're doing a force refresh, clear localStorage cache too
    if (forceRefresh && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`counters_page_${pageId}`);
        console.log(`Cleared localStorage cache for page ${pageId}`);
        
        // Also clear cache for compatibility ID if different
        if (compatPageId !== pageId) {
          localStorage.removeItem(`counters_page_${compatPageId}`);
          console.log(`Cleared localStorage cache for compatibility page ${compatPageId}`);
        }
        
        // Also clear the refresh flag if it was for this page
        const refreshedPage = localStorage.getItem('counters_refreshed_page');
        if (refreshedPage === pageId || refreshedPage === compatPageId) {
          localStorage.setItem('counters_need_refresh', 'false');
          console.log('Cleared counters refresh flag after manual refresh');
        }
      } catch (e) {
        console.warn('Error clearing localStorage cache:', e);
      }
    }
    
    // Cache the counters for future use
    PAGE_COUNTERS_CACHE[pageId] = {
      counters,
      timestamp: Date.now(),
      expiresIn: COUNTER_CACHE_DURATION
    };
    
    return counters;
  } catch (error) {
    console.error(`Error preloading counters for page ${pageId}:`, error);
    
    // Return cached counters even if expired in case of error
    if (PAGE_COUNTERS_CACHE[pageId]) {
      return PAGE_COUNTERS_CACHE[pageId].counters;
    }
    
    return [];
  }
};

// Preload table configurations for a page
const preloadTableConfigs = async (pageId: string, forceRefresh = false): Promise<TableConfig[]> => {
  // Force refresh will skip cache check and fetch fresh data
  if (!forceRefresh) {
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
  }
  
  try {
    // Fetch tables for the page
    const tables = await getTableConfigsByPage(pageId);
    
    // If we're doing a force refresh, clear localStorage cache too
    if (forceRefresh && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`tables_page_${pageId}`);
        console.log(`Cleared localStorage cache for page ${pageId}`);
      } catch (e) {
        console.warn('Error clearing localStorage cache:', e);
      }
    }
    
    // Cache the tables for future use
    PAGE_TABLES_CACHE[pageId] = {
      tables,
      timestamp: Date.now(),
      expiresIn: TABLE_CACHE_DURATION
    };
    
    return tables;
  } catch (error) {
    console.error(`Error preloading tables for page ${pageId}:`, error);
    
    // Return cached tables even if expired in case of error
    if (PAGE_TABLES_CACHE[pageId]) {
      return PAGE_TABLES_CACHE[pageId].tables;
    }
    
    return [];
  }
};

export default function EnhancedDashboardRenderer({
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

  // Function to force refresh counters and tables
  const refreshData = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Add refresh button at the top right
  useEffect(() => {
    // Add a refresh button to the dashboard after 2 seconds
    const timer = setTimeout(() => {
      const dashboardHeader = document.querySelector('.dashboard-header');
      if (dashboardHeader && !document.getElementById('data-refresh-btn')) {
        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'data-refresh-btn';
        refreshBtn.className = 'ml-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-xs text-white';
        refreshBtn.textContent = 'Refresh Data';
        refreshBtn.onclick = refreshData;
        dashboardHeader.appendChild(refreshBtn);
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [refreshData]);

  // Load counters for the page
  const loadCounters = useCallback(async () => {
    if (!pageId) return;
    
    setIsLoadingCounters(true);
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
      
      setCounters(pageCounters || []);
    } catch (error) {
      console.error('Error loading counters:', error);
      setError('Failed to load counter data. Please try refreshing the page.');
    } finally {
      setIsLoadingCounters(false);
    }
  }, [pageId, overrideCounters, refreshTrigger]);
  
  // Load tables for the page
  const loadTables = useCallback(async () => {
    if (!pageId) return;
    
    setIsLoadingTables(true);
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
      
      setTables(pageTables || []);
    } catch (error) {
      console.error('Error loading tables:', error);
      setError('Failed to load table data. Please try refreshing the page.');
    } finally {
      setIsLoadingTables(false);
    }
  }, [pageId, overrideTables, refreshTrigger]);

  // Effect to load counter and table data when page changes or refresh is triggered
  useEffect(() => {
    loadCounters();
    loadTables();
  }, [loadCounters, loadTables]);

  // Render counter grid
  const renderCounters = () => {
    if (isLoadingCounters) {
      // Return null instead of empty grid container during loading
      return null;
    }

    if (counters.length === 0) {
      return null;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-0 mt-0">
        {counters.map((counter) => (
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
            <CounterRenderer counterConfig={counter} />
          </div>
        ))}
      </div>
    );
  };

  // Render tables grid
  const renderTables = () => {
    if (isLoadingTables) {
      // Return null during loading
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
            <TableRenderer tableConfig={table} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Render counters at the top */}
      {renderCounters()}
      
      
      
      {/* Render charts below tables */}
      <DashboardRenderer
        pageId={pageId}
        overrideCharts={overrideCharts}
        enableCaching={enableCaching}
      />
      {/* Render tables below counters */}
      {renderTables()}
      
      {/* Show error if any */}
      {error && (
        <div className="bg-red-900/20 border border-red-800/30 rounded-md p-4 mt-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
} 