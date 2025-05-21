"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { getChartConfigsByPage, getCounterConfigsByPage } from '../utils';
import { ChartConfig, CounterConfig } from '../types';
import dynamic from 'next/dynamic';

// Dynamic imports to avoid SSR issues
const DashboardRenderer = dynamic(() => import('./dashboard-renderer'), {
  ssr: false,
});

const CounterRenderer = dynamic(() => import('./CounterRenderer'), {
  ssr: false,
});

// Interface for component props
interface EnhancedDashboardRendererProps {
  pageId: string;
  overrideCharts?: ChartConfig[];
  overrideCounters?: CounterConfig[];
  enableCaching?: boolean;
}

// Cache durations
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Cache for counter configurations
const PAGE_COUNTERS_CACHE: Record<string, {
  counters: CounterConfig[];
  timestamp: number;
  expiresIn: number;
}> = {};

// Preload counter configurations for a page
const preloadCounterConfigs = async (pageId: string): Promise<CounterConfig[]> => {
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
  
  try {
    // Fetch counters for the page
    const counters = await getCounterConfigsByPage(pageId);
    
    // Cache the counters for future use
    PAGE_COUNTERS_CACHE[pageId] = {
      counters,
      timestamp: Date.now(),
      expiresIn: CACHE_DURATION
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

export default function EnhancedDashboardRenderer({
  pageId,
  overrideCharts,
  overrideCounters,
  enableCaching = true,
}: EnhancedDashboardRendererProps) {
  const [counters, setCounters] = useState<CounterConfig[]>([]);
  const [isLoadingCounters, setIsLoadingCounters] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load counters for the page
  const loadCounters = useCallback(async () => {
    if (!pageId) return;
    
    setIsLoadingCounters(true);
    setError(null);
    
    try {
      // Use override counters if provided, otherwise load from storage
      if (overrideCounters) {
        setCounters(overrideCounters);
      } else {
        const pageCounters = await preloadCounterConfigs(pageId);
        setCounters(pageCounters);
      }
    } catch (error) {
      console.error('Error loading counters:', error);
      setError('Failed to load counters. Please try again.');
    } finally {
      setIsLoadingCounters(false);
    }
  }, [pageId, overrideCounters]);

  // Load counters when pageId or overrideCounters change
  useEffect(() => {
    loadCounters();
  }, [loadCounters]);

  // Render counter grid
  const renderCounters = () => {
    if (isLoadingCounters) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4 mt-4">
          <div className="md:col-span-2 animate-pulse bg-gray-800 h-32 rounded-lg"></div>
          <div className="md:col-span-2 animate-pulse bg-gray-800 h-32 rounded-lg"></div>
          <div className="md:col-span-2 animate-pulse bg-gray-800 h-32 rounded-lg"></div>
        </div>
      );
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

  return (
    <div className="space-y-4">
      {/* Render counters at the top */}
      {renderCounters()}
      
      {/* Render charts below counters */}
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