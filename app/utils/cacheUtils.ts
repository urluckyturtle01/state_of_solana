/**
 * Cache utilities for managing localStorage and memory caches
 */

export interface CacheStats {
  totalEntries: number;
  clearedEntries: number;
  cachePatterns: string[];
}

/**
 * Clear all dashboard-related caches from localStorage
 */
export function clearAllDashboardCaches(): CacheStats {
  if (typeof window === 'undefined') {
    return { totalEntries: 0, clearedEntries: 0, cachePatterns: [] };
  }

  const keys = Object.keys(localStorage);
  let clearedCount = 0;
  const patterns: string[] = [];

  keys.forEach(key => {
    // Clear all types of cached data
    if (
      // Original cache patterns
      key.startsWith('tables_page_') || 
      key === 'all_tables' ||
      key.startsWith('counters_page_') || 
      key === 'all_counters' ||
      key.startsWith('charts_page_') || 
      key === 'all_charts' ||
      // Enhanced dashboard renderer cache patterns
      key.startsWith('edr_cache_') ||
      // Chart data cache patterns
      key.startsWith('chart_data_') ||
      // Temp file cache patterns
      key.startsWith('temp_chart_data_') ||
      key.startsWith('temp_chart_config_')
    ) {
      const pattern = key.split('_')[0] + '_*';
      if (!patterns.includes(pattern)) {
        patterns.push(pattern);
      }
      localStorage.removeItem(key);
      clearedCount++;
    }
  });

  console.log(`✅ Cache cleared: ${clearedCount} entries removed`);
  console.log(`📊 Cache patterns cleared: ${patterns.join(', ')}`);

  return {
    totalEntries: keys.length,
    clearedEntries: clearedCount,
    cachePatterns: patterns
  };
}

/**
 * Clear cache for a specific page
 */
export function clearPageCache(pageId: string): CacheStats {
  if (typeof window === 'undefined') {
    return { totalEntries: 0, clearedEntries: 0, cachePatterns: [] };
  }

  const keys = Object.keys(localStorage);
  let clearedCount = 0;
  const patterns: string[] = [];

  keys.forEach(key => {
    if (
      key.includes(pageId) && (
        key.startsWith('edr_cache_') ||
        key.startsWith('chart_data_') ||
        key.startsWith('temp_chart_data_') ||
        key.startsWith('temp_chart_config_') ||
        key.startsWith('tables_page_') ||
        key.startsWith('counters_page_') ||
        key.startsWith('charts_page_')
      )
    ) {
      const pattern = key.split('_')[0] + '_*';
      if (!patterns.includes(pattern)) {
        patterns.push(pattern);
      }
      localStorage.removeItem(key);
      clearedCount++;
    }
  });

  console.log(`✅ Page cache cleared for "${pageId}": ${clearedCount} entries removed`);

  return {
    totalEntries: keys.length,
    clearedEntries: clearedCount,
    cachePatterns: patterns
  };
}

/**
 * Detect potentially corrupted cache entries
 */
export function detectCorruptedCache(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const keys = Object.keys(localStorage);
  const corruptedKeys: string[] = [];

  keys.forEach(key => {
    if (key.startsWith('edr_cache_') || key.startsWith('chart_data_')) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          
          // Check for required cache structure
          if (key.startsWith('edr_cache_') && (!parsed.data || !parsed.timestamp || !parsed.expires)) {
            corruptedKeys.push(key);
          } else if (key.startsWith('chart_data_') && (!parsed.data || !parsed.timestamp)) {
            corruptedKeys.push(key);
          } else if (parsed.expires && parsed.expires < Date.now()) {
            // Mark expired entries
            corruptedKeys.push(key);
          }
        }
      } catch (e) {
        // Invalid JSON
        corruptedKeys.push(key);
      }
    }
  });

  if (corruptedKeys.length > 0) {
    console.warn(`⚠️ Found ${corruptedKeys.length} potentially corrupted cache entries:`, corruptedKeys);
  }

  return corruptedKeys;
}

/**
 * Auto-clean corrupted cache entries
 */
export function cleanCorruptedCache(): number {
  const corruptedKeys = detectCorruptedCache();
  
  corruptedKeys.forEach(key => {
    localStorage.removeItem(key);
  });

  if (corruptedKeys.length > 0) {
    console.log(`🧹 Auto-cleaned ${corruptedKeys.length} corrupted cache entries`);
  }

  return corruptedKeys.length;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  totalItems: number;
  dashboardCacheItems: number;
  estimatedSizeKB: number;
  oldestEntry?: Date;
  newestEntry?: Date;
} {
  if (typeof window === 'undefined') {
    return { totalItems: 0, dashboardCacheItems: 0, estimatedSizeKB: 0 };
  }

  const keys = Object.keys(localStorage);
  let dashboardCacheItems = 0;
  let estimatedSize = 0;
  let oldestTimestamp = Date.now();
  let newestTimestamp = 0;

  keys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      estimatedSize += (key.length + value.length) * 2; // Rough estimate in bytes

      if (
        key.startsWith('edr_cache_') ||
        key.startsWith('chart_data_') ||
        key.startsWith('temp_chart_') ||
        key.includes('_page_')
      ) {
        dashboardCacheItems++;

        try {
          const parsed = JSON.parse(value);
          if (parsed.timestamp) {
            oldestTimestamp = Math.min(oldestTimestamp, parsed.timestamp);
            newestTimestamp = Math.max(newestTimestamp, parsed.timestamp);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  });

  return {
    totalItems: keys.length,
    dashboardCacheItems,
    estimatedSizeKB: Math.round(estimatedSize / 1024),
    oldestEntry: oldestTimestamp < Date.now() ? new Date(oldestTimestamp) : undefined,
    newestEntry: newestTimestamp > 0 ? new Date(newestTimestamp) : undefined
  };
}

// Global functions for browser console debugging
if (typeof window !== 'undefined') {
  (window as any).clearDashboardCache = clearAllDashboardCaches;
  (window as any).clearPageCache = clearPageCache;
  (window as any).detectCorruptedCache = detectCorruptedCache;
  (window as any).cleanCorruptedCache = cleanCorruptedCache;
  (window as any).getCacheStats = getCacheStats;
} 