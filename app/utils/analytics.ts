// Google Analytics tracking utilities

const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_TRACKING_ID;

// Check if we should track this page (exclude admin pages)
export const shouldTrackPage = (pathname: string): boolean => {
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
  
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      page_path: url,
    });
  }
};

// Track custom events
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (!GA_TRACKING_ID) return;
  
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Track button clicks
export const trackButtonClick = (buttonName: string, location?: string) => {
  trackEvent('click', 'button', `${buttonName}${location ? ` - ${location}` : ''}`);
};

// Track chart interactions
export const trackChartInteraction = (chartType: string, action: string) => {
  trackEvent(action, 'chart_interaction', chartType);
};

// Track dashboard usage
export const trackDashboardAction = (action: string, dashboardName?: string) => {
  trackEvent(action, 'dashboard', dashboardName);
};

// Track authentication events
export const trackAuthEvent = (action: 'login' | 'logout' | 'signup', method?: string) => {
  trackEvent(action, 'authentication', method);
};

// Track file downloads or exports
export const trackDownload = (fileType: string, fileName?: string) => {
  trackEvent('download', 'file', `${fileType}${fileName ? ` - ${fileName}` : ''}`);
};

// Track search events
export const trackSearch = (searchTerm: string, resultCount?: number) => {
  trackEvent('search', 'site_search', searchTerm, resultCount);
};

// Track navigation events
export const trackNavigation = (fromPage: string, toPage: string) => {
  trackEvent('navigate', 'internal_link', `${fromPage} -> ${toPage}`);
}; 