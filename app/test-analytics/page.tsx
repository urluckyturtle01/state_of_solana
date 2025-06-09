"use client";

import { useEffect, useState } from 'react';

export default function TestAnalyticsPage() {
  const [gaStatus, setGaStatus] = useState<{
    trackingId: string | null;
    gtagAvailable: boolean;
    dataLayerExists: boolean;
    lastPageView: string | null;
  }>({
    trackingId: null,
    gtagAvailable: false,
    dataLayerExists: false,
    lastPageView: null
  });

  useEffect(() => {
    // Check GA status after component mounts
    const checkGAStatus = () => {
      setGaStatus({
        trackingId: process.env.NEXT_PUBLIC_GA_TRACKING_ID || null,
        gtagAvailable: typeof window !== 'undefined' && !!window.gtag,
        dataLayerExists: typeof window !== 'undefined' && !!window.dataLayer,
        lastPageView: typeof window !== 'undefined' && window.dataLayer 
          ? JSON.stringify(window.dataLayer.slice(-3), null, 2) 
          : null
      });
    };

    // Check immediately and then every second for 5 seconds
    checkGAStatus();
    const interval = setInterval(checkGAStatus, 1000);
    setTimeout(() => clearInterval(interval), 5000);

    return () => clearInterval(interval);
  }, []);

  const testCustomEvent = () => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'test_button_click', {
        event_category: 'engagement',
        event_label: 'analytics_test_page',
        value: 1
      });
      alert('Custom event sent! Check console for details.');
      console.log('🎯 Custom event sent: test_button_click');
    } else {
      alert('gtag not available!');
    }
  };

  const testPageView = () => {
    if (typeof window !== 'undefined' && window.gtag && gaStatus.trackingId) {
      window.gtag('config', gaStatus.trackingId, {
        page_path: '/test-analytics',
        page_title: 'Analytics Test Page'
      });
      alert('Manual page view sent! Check console for details.');
      console.log('📊 Manual page view sent for /test-analytics');
    } else {
      alert('gtag or tracking ID not available!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Google Analytics Test Page</h1>
        
        <div className="bg-gray-900 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Analytics Status</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="font-medium">Tracking ID:</span>
              <span className={`px-2 py-1 rounded text-sm ${
                gaStatus.trackingId ? 'bg-green-600' : 'bg-red-600'
              }`}>
                {gaStatus.trackingId || 'NOT SET'}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="font-medium">gtag Function:</span>
              <span className={`px-2 py-1 rounded text-sm ${
                gaStatus.gtagAvailable ? 'bg-green-600' : 'bg-red-600'
              }`}>
                {gaStatus.gtagAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="font-medium">dataLayer:</span>
              <span className={`px-2 py-1 rounded text-sm ${
                gaStatus.dataLayerExists ? 'bg-green-600' : 'bg-red-600'
              }`}>
                {gaStatus.dataLayerExists ? 'EXISTS' : 'NOT EXISTS'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="space-y-4">
            <button
              onClick={testCustomEvent}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mr-4"
            >
              Send Test Event
            </button>
            <button
              onClick={testPageView}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
            >
              Send Manual Page View
            </button>
          </div>
        </div>

        {gaStatus.lastPageView && (
          <div className="bg-gray-900 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Recent dataLayer Events</h2>
            <pre className="bg-gray-800 p-4 rounded text-sm overflow-auto">
              {gaStatus.lastPageView}
            </pre>
          </div>
        )}

        <div className="bg-yellow-900 p-6 rounded-lg mt-8">
          <h2 className="text-xl font-semibold mb-4">Setup Instructions</h2>
          <div className="space-y-2 text-sm">
            <p>1. Create a <code className="bg-gray-800 px-2 py-1 rounded">.env.local</code> file in your project root</p>
            <p>2. Add: <code className="bg-gray-800 px-2 py-1 rounded">NEXT_PUBLIC_GA_TRACKING_ID=G-0B0M18WYT9</code></p>
            <p>3. Restart your development server</p>
            <p>4. On Vercel, add the same environment variable in your project settings</p>
          </div>
        </div>
      </div>
    </div>
  );
} 