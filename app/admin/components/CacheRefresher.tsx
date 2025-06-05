"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Component that monitors localStorage for cache refresh flags
 * and clears appropriate caches when needed.
 */
export default function CacheRefresher() {
  const pathname = usePathname();
  const [refreshed, setRefreshed] = useState(false);
  
  useEffect(() => {
    // Check for cache refresh flags
    if (typeof window !== 'undefined') {
      const needsRefresh = localStorage.getItem('counters_need_refresh');
      const refreshedPage = localStorage.getItem('counters_refreshed_page');
      const refreshTime = localStorage.getItem('counters_refresh_time');
      
      // Only process if we need a refresh and haven't done it yet
      if (needsRefresh === 'true' && !refreshed) {
        
        // Clear flag
        localStorage.removeItem('counters_need_refresh');
        
        // Check if refresh is still valid (within last 5 minutes)
        if (refreshTime) {
          const refreshTimeNum = parseInt(refreshTime, 10);
          const currentTime = Date.now();
          const fiveMinutes = 5 * 60 * 1000;
          
          if ((currentTime - refreshTimeNum) < fiveMinutes) {
            // Clear all counter caches
            const keysToRemove = [];
            
            // Find all counter-related localStorage items
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith('counters_page_') || key.includes('counter'))) {
                keysToRemove.push(key);
              }
            }
            
            // Remove all identified keys
            keysToRemove.forEach(key => {
              localStorage.removeItem(key);
            });
            
            // Force reload of the page if we're on the page that needs refreshing
            if (refreshedPage && pathname && pathname.includes(refreshedPage)) {
              window.location.reload();
            }
          }
        }
        
        setRefreshed(true);
      }
    }
  }, [pathname, refreshed]);

  // This component doesn't render anything
  return null;
} 