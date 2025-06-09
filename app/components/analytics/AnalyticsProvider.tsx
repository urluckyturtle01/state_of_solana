"use client";

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import Script from 'next/script';

const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_TRACKING_ID;

// Check if we should track this page (exclude admin pages)
const shouldTrackPage = (pathname: string): boolean => {
  return !pathname.startsWith('/admin');
};

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Debug logging
  useEffect(() => {
    console.log('🔍 Analytics Debug Info:');
    console.log('- GA_TRACKING_ID:', GA_TRACKING_ID);
    console.log('- Current pathname:', pathname);
    console.log('- Should track page:', shouldTrackPage(pathname));
    console.log('- Environment check:', !!GA_TRACKING_ID && shouldTrackPage(pathname));
  }, [pathname]);

  useEffect(() => {
    if (!GA_TRACKING_ID || !shouldTrackPage(pathname)) return;

    const url = pathname + (searchParams ? `?${searchParams.toString()}` : '');
    
    console.log('📊 Tracking page view:', url);
    
    // Track page view
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', GA_TRACKING_ID, {
        page_path: url,
      });
      console.log('✅ Page view tracked successfully');
    }
  }, [pathname, searchParams]);

  return (
    <>
      {/* Only load Google Analytics if we have a tracking ID and not on admin pages */}
      {GA_TRACKING_ID && shouldTrackPage(pathname) && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
            strategy="afterInteractive"
            onLoad={() => console.log('🎯 Google Analytics script loaded')}
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_TRACKING_ID}', {
                page_path: window.location.pathname,
              });
              console.log('🚀 Google Analytics initialized with ID: ${GA_TRACKING_ID}');
            `}
          </Script>
        </>
      )}
      {children}
    </>
  );
};

export default AnalyticsProvider; 