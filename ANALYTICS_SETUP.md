# Google Analytics Setup

This project includes Google Analytics 4 (GA4) tracking on all pages except admin pages.

## Configuration

1. **Get Your Google Analytics Tracking ID**
   - Go to [Google Analytics](https://analytics.google.com/)
   - Create a new GA4 property or use an existing one
   - Copy your Measurement ID (format: `G-XXXXXXXXXX`)

2. **Set Environment Variable**
   Add the following to your `.env.local` file:
   ```env
   NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX
   ```
   Replace `G-XXXXXXXXXX` with your actual Google Analytics Measurement ID.

3. **Verification**
   - Start your development server: `npm run dev`
   - Open your website in a browser
   - Check Google Analytics Real-time reports to see if tracking is working

## Features

### Automatic Page Tracking
- Tracks all page views automatically
- Excludes admin pages (`/admin/*`) from tracking
- Handles route changes in Next.js App Router

### Custom Event Tracking
The following utility functions are available for custom event tracking:

```typescript
import { 
  trackEvent, 
  trackButtonClick, 
  trackChartInteraction,
  trackDashboardAction,
  trackAuthEvent,
  trackDownload,
  trackSearch,
  trackNavigation 
} from '@/app/utils/analytics';

// Track button clicks
trackButtonClick('export-chart', 'dashboard-page');

// Track chart interactions
trackChartInteraction('bar-chart', 'hover');

// Track dashboard actions
trackDashboardAction('create', 'revenue-dashboard');

// Track authentication
trackAuthEvent('login', 'internal-password');

// Track file downloads
trackDownload('CSV', 'revenue-data.csv');

// Track search
trackSearch('solana revenue', 15);

// Track navigation
trackNavigation('/dashboard', '/projects/raydium');
```

## Privacy Considerations

- Admin pages (`/admin/*`) are completely excluded from tracking
- No personally identifiable information (PII) is tracked
- Only aggregated, anonymous usage data is collected
- Users can disable tracking through their browser settings

## Troubleshooting

### Tracking Not Working
1. Verify your `NEXT_PUBLIC_GA_TRACKING_ID` is set correctly
2. Check browser developer console for errors
3. Ensure you're not on an admin page (tracking is disabled there)
4. Check if ad blockers are interfering

### Testing in Development
- GA4 tracks development traffic by default
- Use Google Analytics Real-time reports to verify tracking
- Consider setting up separate GA4 properties for development and production

## Files Modified

- `app/layout.tsx` - Added AnalyticsProvider
- `app/components/analytics/AnalyticsProvider.tsx` - Main analytics component
- `app/components/analytics/GoogleAnalytics.tsx` - Alternative implementation
- `app/utils/analytics.ts` - Utility functions for custom tracking 