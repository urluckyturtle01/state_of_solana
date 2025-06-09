"use client";

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import Script from 'next/script';

const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_TRACKING_ID;

// Check if we should track this page (exclude admin pages)
const shouldTrackPage = (pathname: string): boolean => {
  return !pathname.startsWith('/admin');
};

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: any) => void;
    dataLayer: any[];
  }
}

export const AnalyticsTracker: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Debug logging
  useEffect(() => {
    console.log('🔍 Analytics Debug Info:');
    console.log('- GA_TRACKING_ID:', GA_TRACKING_ID ? 'SET' : 'NOT SET');
    console.log('- Actual GA_TRACKING_ID:', GA_TRACKING_ID);
    console.log('- Current pathname:', pathname);
    console.log('- Should track page:', shouldTrackPage(pathname));
    console.log('- Window gtag available:', typeof window !== 'undefined' && !!window.gtag);
  }, [pathname]);

  // Track page views when pathname or search params change
  useEffect(() => {
    if (!GA_TRACKING_ID || !shouldTrackPage(pathname)) {
      console.log('❌ Skipping page tracking:', { hasTrackingId: !!GA_TRACKING_ID, shouldTrack: shouldTrackPage(pathname) });
      return;
    }

    const url = pathname + (searchParams ? `?${searchParams.toString()}` : '');
    
    console.log('📊 Attempting to track page view:', url);
    
    // Wait a bit for gtag to be available after script load
    const trackPageView = () => {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('config', GA_TRACKING_ID, {
          page_path: url,
          debug_mode: true // Enable debug mode for troubleshooting
        });
        console.log('✅ Page view tracked successfully for:', url);
      } else {
        console.log('⏳ gtag not available yet, retrying...');
        setTimeout(trackPageView, 100);
      }
    };

    trackPageView();
  }, [pathname, searchParams]);

  // Always render scripts if we have a tracking ID (don't make it conditional on current page)
  if (!GA_TRACKING_ID) {
    console.log('❌ No GA_TRACKING_ID found in environment variables');
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
        strategy="afterInteractive"
        onLoad={() => {
          console.log('🎯 Google Analytics script loaded successfully');
          console.log('🔍 gtag function available:', typeof window.gtag);
        }}
        onError={(e) => {
          console.error('❌ Failed to load Google Analytics script:', e);
        }}
      />
      <Script 
        id="google-analytics" 
        strategy="afterInteractive"
        onLoad={() => console.log('🚀 Google Analytics initialized')}
      >
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_TRACKING_ID}', {
            page_path: window.location.pathname,
            debug_mode: true,
            send_page_view: false // We'll manually send page views
          });
          console.log('🚀 Google Analytics initialized with ID: ${GA_TRACKING_ID}');
          console.log('🔍 dataLayer:', window.dataLayer);
        `}
      </Script>
    </>
  );
}; 