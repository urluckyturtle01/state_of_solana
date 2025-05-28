"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ChartConfig, FilterOption } from '@/app/admin/types';
import ChartRenderer from '@/app/admin/components/ChartRenderer';
import TimeFilterSelector from '@/app/components/shared/filters/TimeFilter';
import CurrencyFilter from '@/app/components/shared/filters/CurrencyFilter';
import DisplayModeFilter, { DisplayMode } from '@/app/components/shared/filters/DisplayModeFilter';
import LegendItem from '@/app/components/shared/LegendItem';
import { getColorByIndex } from '@/app/utils/chartColors';
import { formatNumber } from '@/app/utils/formatters';
import Image from 'next/image';

// Helper function to check if chart is stacked
function isStackedBarChart(chart: ChartConfig): boolean {
  return chart.chartType === 'stacked-bar' || 
         (chart.chartType === 'bar' && chart.isStacked === true);
}

// Helper function to extract field name from YAxisConfig or use string directly
function getFieldName(field: string | any): string {
  return typeof field === 'string' ? field : field.field;
}

// Function to truncate text with ellipsis
const truncateLabel = (label: string, maxLength: number = 15): string => {
  if (label.length <= maxLength) return label;
  return label.substring(0, maxLength) + '...';
};

// Format currency for display
const formatCurrency = (value: number): string => {
  return formatNumber(value);
};

interface Legend {
  id?: string;
  label: string;
  color: string;
  value?: number;
  shape?: 'circle' | 'square';
}

export default function SharedChartPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [chart, setChart] = useState<ChartConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [legends, setLegends] = useState<Legend[]>([]);
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const [legendColorMap, setLegendColorMap] = useState<Record<string, string>>({});

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

        // Initialize filter values from URL params or defaults
        const initialFilters: Record<string, string> = {};
        
        if (chartData.additionalOptions?.filters?.timeFilter) {
          initialFilters.timeFilter = searchParams.get('timeFilter') || 
            chartData.additionalOptions.filters.timeFilter.options[0];
        }
        
        if (chartData.additionalOptions?.filters?.currencyFilter) {
          initialFilters.currencyFilter = searchParams.get('currencyFilter') || 
            chartData.additionalOptions.filters.currencyFilter.options[0];
        }
        
        if (isStackedBarChart(chartData) || chartData.additionalOptions?.filters?.displayModeFilter) {
          initialFilters.displayMode = searchParams.get('displayMode') || 'absolute';
        }

        setFilterValues(initialFilters);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chart');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChart();
  }, [params.chartId, searchParams]);

  // Handle filter changes
  const handleFilterChange = useCallback((filterType: string, value: string) => {
    setFilterValues(prev => ({
      ...prev,
      [filterType]: value
    }));
  }, []);

  // Handle legend clicks to toggle series visibility
  const handleLegendClick = useCallback((label: string) => {
    setHiddenSeries(prev => {
      const newHidden = prev.includes(label)
        ? prev.filter(id => id !== label)
        : [...prev, label];
      return newHidden;
    });
  }, []);

  // Callback to receive colors from chart
  const syncLegendColors = useCallback((colorMap: Record<string, string>) => {
    if (!colorMap || Object.keys(colorMap).length === 0) return;
    setLegendColorMap(colorMap);
  }, []);

  // Callback to receive data and generate legends
  const handleDataLoaded = useCallback((data: any[]) => {
    if (!chart || !data || data.length === 0) return;

    console.log('Generating legends for chart:', {
      chartType: chart.chartType,
      dataLength: data.length,
      groupBy: chart.dataMapping.groupBy,
      sampleData: data.slice(0, 2)
    });

    // Generate legends based on chart type and data
    let chartLegends: Legend[] = [];
    
    // Check if this is a chart with groupBy field
    const hasGroupByField = !!chart.dataMapping.groupBy;
    const groupField = chart.dataMapping.groupBy || '';
    const groupByFieldExists = data.length > 0 && groupField && data[0][groupField] !== undefined;
    const isValidStackedChart = isStackedBarChart(chart) && hasGroupByField && groupByFieldExists;
    const hasGroupByWithRegularChart = !isStackedBarChart(chart) && hasGroupByField && groupByFieldExists && 
                                      (chart.chartType === 'bar' || chart.chartType === 'line');

    if (isValidStackedChart || hasGroupByWithRegularChart) {
      console.log('Processing as chart with groupBy:', groupField);
      // Use group by field values for legends
      const uniqueGroups = Array.from(new Set(data.map(item => item[groupField])));
      
      const yField = typeof chart.dataMapping.yAxis === 'string' ? 
        chart.dataMapping.yAxis : 
        Array.isArray(chart.dataMapping.yAxis) ? 
          getFieldName(chart.dataMapping.yAxis[0]) : 
          getFieldName(chart.dataMapping.yAxis);

      const groupTotals: Record<string, number> = {};
      uniqueGroups.forEach(group => {
        if (group !== null && group !== undefined) {
          const groupStr = String(group);
          groupTotals[groupStr] = data
            .filter(item => item[groupField] === group)
            .reduce((sum, item) => sum + (Number(item[yField]) || 0), 0);
        }
      });

      chartLegends = uniqueGroups
        .filter(group => group !== null && group !== undefined)
        .map((group, index) => {
          const groupStr = String(group);
          return {
            id: groupStr,
            label: groupStr,
            color: legendColorMap[groupStr] || getColorByIndex(index),
            value: groupTotals[groupStr] || 0,
            shape: 'square' as const
          };
        })
        .sort((a, b) => (b.value || 0) - (a.value || 0));
    } else if (chart.chartType === 'pie') {
      console.log('Processing as pie chart');
      // Handle pie charts
      const categoryField = typeof chart.dataMapping.xAxis === 'string' ? 
        chart.dataMapping.xAxis : chart.dataMapping.xAxis[0];
      const valueField = typeof chart.dataMapping.yAxis === 'string' ? 
        chart.dataMapping.yAxis : 
        Array.isArray(chart.dataMapping.yAxis) ? 
          getFieldName(chart.dataMapping.yAxis[0]) : 
          getFieldName(chart.dataMapping.yAxis);

      chartLegends = data
        .filter(item => item[categoryField] !== null && item[categoryField] !== undefined)
        .map((item, index) => {
          const label = String(item[categoryField]);
          const value = Number(item[valueField]) || 0;
          return {
            id: label,
            label,
            color: legendColorMap[label] || getColorByIndex(index),
            value,
            shape: 'square' as const
          };
        })
        .sort((a, b) => (b.value || 0) - (a.value || 0));
    } else if (chart.chartType === 'bar' || chart.chartType === 'line') {
      console.log('Processing as regular bar/line chart');
      // For regular charts without groupBy, check if it's a multi-series chart
      const xField = typeof chart.dataMapping.xAxis === 'string' ? 
        chart.dataMapping.xAxis : chart.dataMapping.xAxis[0];
      
      // Get field names from yAxis
      let yAxisFields: string[] = [];
      if (Array.isArray(chart.dataMapping.yAxis)) {
        yAxisFields = chart.dataMapping.yAxis.map(field => getFieldName(field));
      } else {
        yAxisFields = [getFieldName(chart.dataMapping.yAxis)];
      }

      // Check if this is a date-based chart
      const isDateBased = data.length > 0 && 
        (xField.toLowerCase().includes('date') || 
         xField.toLowerCase().includes('time') || 
         typeof data[0][xField] === 'string' && 
         data[0][xField].match(/^\d{4}-\d{2}-\d{2}/));

      if (isDateBased && yAxisFields.length > 1) {
        // Multi-series time chart - use y-axis field names as legends
        chartLegends = yAxisFields.map((field, index) => {
          const total = data.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
          const label = field.replace(/_/g, ' ')
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          return {
            id: field,
            label,
            color: legendColorMap[field] || getColorByIndex(index),
            value: total,
            shape: 'square' as const
          };
        });
      } else if (!isDateBased) {
        // Non-date based chart - use data points as legends (limited to prevent overcrowding)
        const maxLegendItems = 10;
        chartLegends = data
          .slice(0, maxLegendItems)
          .map((item, index) => {
            const label = String(item[xField]);
            const value = Number(item[yAxisFields[0]]) || 0;
            return {
              id: label,
              label,
              color: legendColorMap[label] || getColorByIndex(index),
              value,
              shape: 'square' as const
            };
          });
      }
    } else if (chart.chartType === 'area' || chart.chartType === 'stacked-area') {
      console.log('Processing as area chart');
      // Handle area charts similar to bar/line charts
      let yAxisFields: string[] = [];
      if (Array.isArray(chart.dataMapping.yAxis)) {
        yAxisFields = chart.dataMapping.yAxis.map(field => getFieldName(field));
      } else {
        yAxisFields = [getFieldName(chart.dataMapping.yAxis)];
      }

      if (yAxisFields.length > 1) {
        // Multi-series area chart
        chartLegends = yAxisFields.map((field, index) => {
          const total = data.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
          const label = field.replace(/_/g, ' ')
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          return {
            id: field,
            label,
            color: legendColorMap[field] || getColorByIndex(index),
            value: total,
            shape: 'square' as const
          };
        });
      }
    }

    console.log('Generated legends:', chartLegends);
    setLegends(chartLegends);
  }, [chart, legendColorMap]);

  // Also generate legends when color map changes
  useEffect(() => {
    if (chart && Object.keys(legendColorMap).length > 0) {
      console.log('Color map updated, regenerating legends');
      // Trigger legend generation with current data if available
      // This ensures legends appear even if onDataLoaded wasn't called yet
    }
  }, [legendColorMap, chart]);

  // Create modified chart config with filter overrides
  const modifiedChartConfig: ChartConfig | null = chart ? {
    ...chart,
    additionalOptions: {
      ...chart.additionalOptions,
      filters: {
        ...chart.additionalOptions?.filters,
        timeFilter: chart.additionalOptions?.filters?.timeFilter ? {
          ...chart.additionalOptions.filters.timeFilter,
          activeValue: filterValues.timeFilter || chart.additionalOptions.filters.timeFilter.activeValue
        } : undefined,
        currencyFilter: chart.additionalOptions?.filters?.currencyFilter ? {
          ...chart.additionalOptions.filters.currencyFilter,
          activeValue: filterValues.currencyFilter || chart.additionalOptions.filters.currencyFilter.activeValue
        } : undefined,
        displayModeFilter: chart.additionalOptions?.filters?.displayModeFilter ? {
          ...chart.additionalOptions.filters.displayModeFilter,
          activeValue: filterValues.displayMode || chart.additionalOptions.filters.displayModeFilter.activeValue
        } : undefined,
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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-0">

      {/* Top Ledger Logo - Above Container */}
      <div className="w-11/12 max-w-7xl mb-6 flex justify-between items-center">
        <div className="relative w-32 h-7 grayscale brightness-300 opacity-100">
          <Image
            src="https://topledger.xyz/assets/images/logo/topledger-full.svg?imwidth=384"
            alt="TopLedger Logo"
            fill
            style={{ objectFit: 'contain', objectPosition: 'left' }}
            priority
          />
        </div>
        
        {/* Top Ledger Research Button */}
        <a
          href="https://research.topledger.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-md transition-colors border border-gray-700/50 hover:border-gray-600"
        >
          <span>Top Ledger Research</span>
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
            />
          </svg>
        </a>
      </div>
         
        <div className="relative bg-black/80 border border-gray-900 rounded-xl p-4 w-11/12 max-w-7xl flex flex-col shadow-xl max-h-[90vh] overflow-y-auto">
          
          {/* Header section matching Modal design */}
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-900">
            <div>
              <h2 className="text-[16px] font-medium text-gray-100">{modifiedChartConfig.title}</h2>
              {modifiedChartConfig.subtitle && (
                <p className="text-gray-500 text-[12px] tracking-wide mt-1">{modifiedChartConfig.subtitle}</p>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          {(modifiedChartConfig.additionalOptions?.filters || isStackedBarChart(modifiedChartConfig)) && (
            <>
              <div className="flex flex-wrap gap-3 items-center mb-4">
                {/* Time Filter */}
                {modifiedChartConfig.additionalOptions?.filters?.timeFilter && (
                  <TimeFilterSelector
                    value={filterValues.timeFilter || modifiedChartConfig.additionalOptions.filters.timeFilter.options[0]}
                    onChange={(value) => handleFilterChange('timeFilter', value)}
                    options={modifiedChartConfig.additionalOptions.filters.timeFilter.options.map((value: string) => ({ 
                      value, 
                      label: value 
                    }))}
                  />
                )}
                
                {/* Currency Filter */}
                {modifiedChartConfig.additionalOptions?.filters?.currencyFilter && (
                  <CurrencyFilter
                    currency={filterValues.currencyFilter || modifiedChartConfig.additionalOptions.filters.currencyFilter.options[0]}
                    options={modifiedChartConfig.additionalOptions.filters.currencyFilter.options}
                    onChange={(value) => handleFilterChange('currencyFilter', value)}
                  />
                )}
                
                {/* Display Mode Filter */}
                {(isStackedBarChart(modifiedChartConfig) || modifiedChartConfig.additionalOptions?.filters?.displayModeFilter) && (
                  <DisplayModeFilter
                    mode={filterValues.displayMode as DisplayMode || 'absolute'}
                    onChange={(value) => handleFilterChange('displayMode', value)}
                  />
                )}
              </div>
              <div className="h-px bg-gray-900 w-full mb-4"></div>
            </>
          )}
          
          {/* Chart content area with legend */}
          <div className="flex-1 relative flex flex-col lg:flex-row">
            {/* Chart Area */}
            <div className={`flex-grow ${legends.length > 0 ? 'lg:pr-4 lg:border-r lg:border-gray-900' : ''} h-[300px] md:h-[500px] lg:h-[500px] relative`}>
              <ChartRenderer
                chartConfig={modifiedChartConfig}
                isExpanded={false}
                filterValues={filterValues}
                onFilterChange={handleFilterChange}
                colorMap={legendColorMap}
                onColorsGenerated={syncLegendColors}
                hiddenSeries={hiddenSeries}
                onDataLoaded={handleDataLoaded}
                preloadedData={[]}
              />
            </div>

            {/* Legend Area */}
            <div className="lg:w-1/6 mt-0 lg:mt-0 lg:pl-4 flex flex-col">
              <div className="h-px bg-gray-900 w-full lg:hidden mb-2"></div>
              <div className="flex-1 min-h-0">
                
                <div className="h-full overflow-y-auto
                  [&::-webkit-scrollbar]:w-1.5 
                  [&::-webkit-scrollbar-track]:bg-transparent 
                  [&::-webkit-scrollbar-thumb]:bg-gray-700/40
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
                  scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700/40">
                  <div className="flex flex-row lg:flex-col gap-2 lg:gap-2 pt-1 pb-0">
                    {legends.length > 0 ? (
                      legends.map(legend => (
                        <LegendItem 
                          key={legend.id || legend.label}
                          label={truncateLabel(legend.label)} 
                          color={legend.color} 
                          shape={legend.shape || 'square'}
                          tooltipText={legend.value ? formatCurrency(legend.value) : undefined}
                          onClick={() => handleLegendClick(legend.id || legend.label)}
                          inactive={hiddenSeries.includes(legend.id || legend.label)}
                        />
                      ))
                    ) : (
                      <div className="text-xs text-gray-500">No legends available</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-xs">
            Top Ledger © {new Date().getFullYear()}
          </p>
        </div>
    </div>
  );
} 