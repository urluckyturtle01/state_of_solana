"use client";

import { useState, useEffect } from 'react';

interface BlogAnalyticsProps {
  slug: string;
}

interface AnalyticsData {
  totalViews: number;
  totalReadTime: number;
  averageReadTime: number;
  formattedTotalReadTime: string;
  formattedAverageReadTime: string;
}

export default function BlogAnalytics({ slug }: BlogAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`/api/blog-analytics/${slug}`);
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchAnalytics();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2 bg-gray-900/40 backdrop-blur-md border border-gray-800/60 rounded-lg p-6 shadow-lg">
        <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-2 bg-gray-900/40 backdrop-blur-md border border-gray-800/60 rounded-lg p-2 shadow-lg">
      
      
      <div className="flex flex-col items-center gap-2 text-center">
        {/* Total Views */}
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center w-8 h-8">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          
          <span className="text-[13px] font-medium text-gray-400">{analytics.totalViews.toLocaleString()}</span>
          <span className="text-[9px] text-gray-500 mt-0">Views</span>
        </div>

        <hr className="w-full border-gray-700/50" />

        {/* Average Read Time */}
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center w-8 h-8">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <span className="text-[13px] font-medium text-gray-400">{analytics.formattedAverageReadTime}</span>
          <span className="text-[9px] text-gray-500 mt-0">Avg Read</span>
        </div>

        <hr className="w-full border-gray-700/50" />

        {/* Total Read Time */}
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center w-8 h-8">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          
          <span className="text-[13px] font-medium text-gray-400">{analytics.formattedTotalReadTime}</span>
          <span className="text-[9px] text-gray-500 mt-0">Total Read</span>
        </div>
      </div>
    </div>
  );
} 