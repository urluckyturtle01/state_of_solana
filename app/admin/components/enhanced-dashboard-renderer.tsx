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
  }
  
  try {
    // Fetch counters for the page
    const counters = await getCounterConfigsByPage(pageId);
    
    // If we're doing a force refresh, clear localStorage cache too
    if (forceRefresh && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`counters_page_${pageId}`);
        console.log(`Cleared localStorage cache for page ${pageId}`);
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
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4 mt-4">
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
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-6">
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
      
      {/* Render tables below counters */}
      {renderTables()}
      
      {/* Render charts below tables */}
      <DashboardRenderer
        pageId={pageId}
        overrideCharts={overrideCharts}
        enableCaching={enableCaching}
      />
      
      {/* Show error if any */}
      {error && (
        <div className="bg-red-900/20 border border-red-800/30 rounded-md p-4 mt-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
} 