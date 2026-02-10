"use client";

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

// Google Analytics tracking ID - you'll need to replace this with your actual GA4 measurement ID
const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_TRACKING_ID;

// Check if we should track this page (exclude admin pages)
const shouldTrackPage = (pathname: string): boolean => {
  return !pathname.startsWith('/admin');
};

// Google Analytics gtag function
declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: any) => void;
  }
}

// Track page views
export const trackPageView = (url: string) => {
  if (!GA_TRACKING_ID || !shouldTrackPage(url)) return;
  
  window.gtag('config', GA_TRACKING_ID, {
    page_path: url,
  });
};

// Track custom events
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (!GA_TRACKING_ID) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

// Main Google Analytics component
const GoogleAnalytics = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_TRACKING_ID || !shouldTrackPage(pathname)) return;

    const url = pathname + searchParams.toString();
    trackPageView(url);
  }, [pathname, searchParams]);

  // Don't render anything for admin pages
  if (!GA_TRACKING_ID || !shouldTrackPage(pathname)) {
    return null;
  }

  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_TRACKING_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
};

export default GoogleAnalytics; 