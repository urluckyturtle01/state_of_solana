"use client";

import { useEffect, useRef } from 'react';

interface BlogAnalyticsTrackerProps {
  slug: string;
}

export default function BlogAnalyticsTracker({ slug }: BlogAnalyticsTrackerProps) {
  const startTimeRef = useRef<number>(Date.now());
  const sessionIdRef = useRef<string>('');
  const hasTrackedViewRef = useRef<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate unique session ID
  useEffect(() => {
    sessionIdRef.current = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Track initial view and reading time
  useEffect(() => {
    if (!slug || hasTrackedViewRef.current) return;

    const trackAnalytics = async (readTime: number) => {
      try {
        await fetch('/api/blog-analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            slug,
            readTime,
            sessionId: sessionIdRef.current,
          }),
        });
      } catch (error) {
        console.error('Error tracking analytics:', error);
      }
    };

    // Track initial view
    trackAnalytics(0);
    hasTrackedViewRef.current = true;

    // Update read time every 10 seconds
    intervalRef.current = setInterval(() => {
      const currentReadTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      trackAnalytics(currentReadTime);
    }, 10000);

    // Track final read time when user leaves
    const handleBeforeUnload = () => {
      const finalReadTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      // Use sendBeacon for more reliable tracking on page unload
      if (navigator.sendBeacon) {
        const data = new FormData();
        data.append('slug', slug);
        data.append('readTime', finalReadTime.toString());
        data.append('sessionId', sessionIdRef.current);
        
        navigator.sendBeacon('/api/blog-analytics/track', data);
      } else {
        trackAnalytics(finalReadTime);
      }
    };

    // Track when user becomes inactive/leaves page
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const currentReadTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
        trackAnalytics(currentReadTime);
      } else {
        // Reset start time when user becomes active again
        startTimeRef.current = Date.now();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Final tracking on component unmount
      const finalReadTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      trackAnalytics(finalReadTime);
    };
  }, [slug]);

  return null; // This component doesn't render anything
} 