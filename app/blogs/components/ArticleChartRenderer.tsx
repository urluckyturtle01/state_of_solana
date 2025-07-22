"use client";

import { useState, useEffect } from 'react';
import { ChartConfig } from '@/app/admin/types';
import DashboardRenderer from '@/app/admin/components/dashboard-renderer';

interface ArticleChartRendererProps {
  chartId: string;
  title?: string;
  description?: string;
}

export default function ArticleChartRenderer({ chartId, title, description }: ArticleChartRendererProps) {
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadChartConfig() {
      try {
        setLoading(true);
        setError(null);

        // Try to fetch the chart config from existing charts API
        const response = await fetch(`/api/charts/${chartId}`);
        
        if (!response.ok) {
          // If direct fetch fails, try to search through all chart configs
          const searchResponse = await fetch('/api/charts/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ chartId })
          });
          
          if (!searchResponse.ok) {
            throw new Error(`Chart with ID "${chartId}" not found`);
          }
          
          const chartData = await searchResponse.json();
          setChartConfig(chartData);
        } else {
          const chartData = await response.json();
          setChartConfig(chartData);
        }
      } catch (err) {
        console.error('Error loading chart config:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chart');
      } finally {
        setLoading(false);
      }
    }

    if (chartId) {
      loadChartConfig();
    }
  }, [chartId]);

  if (loading) {
    return (
      <div className="my-8">
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-t-blue-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading chart...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-8">
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-red-400 mb-2">Chart Error</p>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!chartConfig) {
    return (
      <div className="my-8">
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg h-[400px] flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400">Chart not found</p>
          </div>
        </div>
      </div>
    );
  }

  // Override the chart title, description, and width for full-width display in articles
  const finalChartConfig = {
    ...chartConfig,
    title: title || chartConfig.title,
    subtitle: description || chartConfig.subtitle,
    width: 4 // Force full width in blog articles (any value != 2 makes it full width)
  };

  return (
    <div className="my-12">
      <DashboardRenderer 
        pageId={`article-chart-${chartId}`}
        overrideCharts={[finalChartConfig]}
        enableCaching={true}
      />
    </div>
  );
} 