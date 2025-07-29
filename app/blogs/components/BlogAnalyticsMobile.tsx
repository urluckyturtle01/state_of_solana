"use client";

import { useState, useEffect } from 'react';

interface BlogAnalyticsMobileProps {
  slug: string;
}

interface AnalyticsData {
  totalViews: number;
  totalReadTime: number;
  averageReadTime: number;
  formattedTotalReadTime: string;
  formattedAverageReadTime: string;
}

export default function BlogAnalyticsMobile({ slug }: BlogAnalyticsMobileProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Inline Analytics Button - Mobile Only */}
      <button
        onClick={toggleModal}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors bg-gray-500/10 text-gray-400 border-gray-500/20 hover:bg-gray-500/20 md:hidden"
        title="View analytics"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin"></div>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )}
        
      </button>

      {/* Bottom Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={closeModal}
          ></div>
          
          {/* Modal Content */}
          <div className="absolute bottom-0 left-0 right-0 bg-black border-t border-gray-800/60 rounded-t-2xl p-6 transform transition-transform duration-300 ease-out">
            {/* Handle Bar */}
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 bg-gray-700 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              
              
            </div>

            {/* Analytics Content */}
            {analytics && (
              <div className="grid grid-cols-3 gap-4">
                {/* Total Views */}
                <div className="flex flex-col items-center text-center p-4 bg-gray-900 rounded-lg">
                  <div className="flex items-center justify-center w-10 h-10 mb-2">
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <span className="text-md font-medium text-gray-300">{analytics.totalViews.toLocaleString()}</span>
                  <span className="text-xs text-gray-500">Views</span>
                </div>

                {/* Average Read Time */}
                <div className="flex flex-col items-center text-center p-4 bg-gray-900 rounded-lg">
                  <div className="flex items-center justify-center w-10 h-10 mb-2">
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-md font-medium text-gray-300">{analytics.formattedAverageReadTime}</span>
                  <span className="text-xs text-gray-500">Avg Read</span>
                </div>

                {/* Total Read Time */}
                <div className="flex flex-col items-center text-center p-4 bg-gray-900 rounded-lg">
                  <div className="flex items-center justify-center w-10 h-10 mb-2">
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <span className="text-md font-medium text-gray-300">{analytics.formattedTotalReadTime}</span>
                  <span className="text-xs text-gray-500">Total Read </span>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center py-8">
                <div className="w-6 h-6 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
} 