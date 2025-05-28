"use client";

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ChartConfig, FilterOption } from '@/app/admin/types';
import ChartRenderer from '@/app/admin/components/ChartRenderer';

export default function SharedChartPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [chart, setChart] = useState<ChartConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChart = async () => {
      try {
        // Get chartId from params
        const chartId = params.chartId as string;
        if (!chartId) {
          setError('Chart ID is required');
          setIsLoading(false);
          return;
        }

        // Fetch chart config
        const response = await fetch(`/api/charts/${chartId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch chart: ${response.statusText}`);
        }

        const chartData = await response.json();
        setChart(chartData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chart');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChart();
  }, [params.chartId]);

  // Extract filter overrides from URL params
  const filterOverrides = {
    timeFilter: searchParams.get('timeFilter'),
    currencyFilter: searchParams.get('currencyFilter'),
    displayMode: searchParams.get('displayMode'),
  };

  // Helper function to update filter with override value
  const updateFilterWithOverride = (
    filter: FilterOption | undefined,
    overrideValue: string | null
  ): FilterOption | undefined => {
    if (!filter || !overrideValue) return filter;
    return {
      ...filter,
      activeValue: overrideValue,
    };
  };

  // Create modified chart config with filter overrides
  const modifiedChartConfig: ChartConfig | null = chart ? {
    ...chart,
    additionalOptions: {
      ...chart.additionalOptions,
      filters: {
        ...chart.additionalOptions?.filters,
        timeFilter: updateFilterWithOverride(
          chart.additionalOptions?.filters?.timeFilter,
          filterOverrides.timeFilter
        ),
        currencyFilter: updateFilterWithOverride(
          chart.additionalOptions?.filters?.currencyFilter,
          filterOverrides.currencyFilter
        ),
        displayModeFilter: updateFilterWithOverride(
          chart.additionalOptions?.filters?.displayModeFilter,
          filterOverrides.displayMode
        ),
      }
    }
  } : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading chart...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!modifiedChartConfig) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Chart not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-900 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-white mb-2">{modifiedChartConfig.title}</h1>
          {modifiedChartConfig.subtitle && (
            <p className="text-gray-400 mb-6">{modifiedChartConfig.subtitle}</p>
          )}
          
          <div className="h-[600px]">
            <ChartRenderer
              chartConfig={modifiedChartConfig}
              isExpanded={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 