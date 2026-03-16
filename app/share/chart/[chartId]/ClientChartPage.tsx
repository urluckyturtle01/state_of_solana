"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ChartConfig, FilterOption, YAxisConfig } from '@/app/admin/types';
import ChartRenderer from '@/app/admin/components/ChartRenderer';
import TimeFilterSelector from '@/app/components/shared/filters/TimeFilter';
import CurrencyFilter from '@/app/components/shared/filters/CurrencyFilter';
import DisplayModeFilter, { DisplayMode } from '@/app/components/shared/filters/DisplayModeFilter';
import LegendItem from '@/app/components/shared/LegendItem';
import { getColorByIndex, getValueOrderedColorMap } from '@/app/utils/chartColors';
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

// Filter y-axis fields by selected currency when chart has field_switcher currency filter
function applyCurrencyFilterToFields(
  yAxisFields: string[],
  chart: ChartConfig,
  filterValues: Record<string, string>
): string[] {
  const currencyFilter = chart.additionalOptions?.filters?.currencyFilter;
  const selectedCurrency = filterValues.currencyFilter;
  if (currencyFilter?.type !== 'field_switcher' || !currencyFilter.columnMappings || !selectedCurrency) {
    return yAxisFields;
  }
  const targetFields = currencyFilter.columnMappings[selectedCurrency];
  if (!targetFields) return yAxisFields;
  const targetFieldList = targetFields.split(',').map((f: string) => f.trim());
  const allCurrencyFields = new Set(
    Object.values(currencyFilter.columnMappings).flatMap((m: string) =>
      m.split(',').map((f: string) => f.trim())
    )
  );
  return yAxisFields.filter(field => {
    if (targetFieldList.includes(field)) return true;
    if (!allCurrencyFields.has(field)) return true; // Non-currency field, keep it
    return false;
  });
}

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

export default function ClientChartPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [chart, setChart] = useState<(ChartConfig & { data?: any[] }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [legends, setLegends] = useState<Legend[]>([]);
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const [legendColorMap, setLegendColorMap] = useState<Record<string, string>>({});
  const [chartData, setChartData] = useState<any[]>([]);

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

        console.log('Fetching chart config for ID:', chartId);

        // Fetch chart config (sanitized for security)
        const response = await fetch(`/api/charts/${chartId}`);
        if (!response.ok) {
          let message = response.statusText;
          try {
            const errBody = await response.json();
            if (errBody?.error) message = errBody.error;
          } catch {
            // ignore JSON parse
          }
          if (response.status === 404) {
            throw new Error(`Chart not found. The chart ID "${chartId}" may not exist or may have been removed.`);
          }
          throw new Error(`Failed to fetch chart: ${message}`);
        }

        let chartData = await response.json();
        console.log('Chart config loaded (sanitized):', chartData.title);
        
        // Auto-detect dual-axis (same as dashboard) when yAxis has rightAxis: true
        const yAxis = chartData.dataMapping?.yAxis;
        if (Array.isArray(yAxis) && yAxis.length > 0 && typeof yAxis[0] === 'object') {
          const yAxisConfigs = yAxis as YAxisConfig[];
          const hasRightAxis = yAxisConfigs.some((c: YAxisConfig) => c.rightAxis === true);
          if (hasRightAxis && !chartData.dualAxisConfig) {
            const leftFields = yAxisConfigs.filter((c: YAxisConfig) => !c.rightAxis).map((c: YAxisConfig) => c.field);
            const rightFields = yAxisConfigs.filter((c: YAxisConfig) => c.rightAxis).map((c: YAxisConfig) => c.field);
            chartData = {
              ...chartData,
              chartType: 'dual-axis',
              dualAxisConfig: {
                leftAxisFields: leftFields,
                rightAxisFields: rightFields,
                leftAxisType: (yAxisConfigs.find((c: YAxisConfig) => !c.rightAxis)?.type || 'bar') as 'bar' | 'line',
                rightAxisType: (yAxisConfigs.find((c: YAxisConfig) => c.rightAxis)?.type || 'line') as 'bar' | 'line',
              },
            };
          }
        }
        
        // For share charts: DB charts may have data embedded; others use proxy
        if (!chartData.apiEndpoint) {
          if (chartData.data && chartData.data.length > 0) {
            console.log('Using preloaded data from DB for chart:', chartId);
          } else {
            chartData.apiEndpoint = `${window.location.origin}/api/chart-data/${chartId}`;
            chartData.apiKey = ''; // No key needed for proxy
            console.log('Using secure proxy for chart data:', chartData.apiEndpoint);
          }
          if (chartData.postApiConfig?.enabled && chartData.postApiConfig.parameterMappings) {
            console.log('POST API chart detected - URL parameters will be passed via ChartRenderer');
          }
        }
        
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
  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
    
    // Update URL params
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set(key, value);
    window.history.replaceState({}, '', `${window.location.pathname}?${newSearchParams}`);
  }, [searchParams]);

  // Handle legend click
  const handleLegendClick = useCallback((seriesId: string) => {
    setHiddenSeries(prev => {
      if (prev.includes(seriesId)) {
        return prev.filter(id => id !== seriesId);
      } else {
        return [...prev, seriesId];
      }
    });
  }, []);

  // Sync legend colors when chart renderer provides them
  const syncLegendColors = useCallback((colorMap: Record<string, string>) => {
    setLegendColorMap(colorMap);
  }, []);

  // Generate legends based on chart data
  const handleDataLoaded = useCallback((data: any[]) => {
    if (!chart || !data || data.length === 0) return;

    setChartData(data);
    console.log('Handling data loaded for chart:', chart.title);
    console.log('Chart type:', chart.chartType);
    console.log('Is stacked?', isStackedBarChart(chart));
    console.log('Data sample:', data[0]);

    let chartLegends: Legend[] = [];

    // Only generate legends for charts that benefit from them
    const chartType = chart.chartType;
    const shouldGenerateLegends = 
      isStackedBarChart(chart) || 
      chartType === 'pie' || 
      chartType === 'dual-axis' ||
      chartType === 'area' ||
      chartType === 'stacked-area' ||
      chartType === 'bar' ||
      chartType === 'line' ||
      (Array.isArray(chart.dataMapping.yAxis) && chart.dataMapping.yAxis.length > 1) ||
      !!chart.dataMapping.groupBy;

    if (shouldGenerateLegends) {
      console.log('Generating legends for chart type:', chart.chartType);

      if (isStackedBarChart(chart)) {
        console.log('Processing as stacked chart');
        // Handle stacked charts - two cases: groupBy (e.g. by DEX) or multi y-fields (e.g. success vs failed)
        const groupField = chart.dataMapping.groupBy;
        
        if (groupField) {
          const uniqueGroups = [...new Set(data.map(item => item[groupField]))];
          console.log('Unique groups found:', uniqueGroups);

          // Get the y-field for calculating totals
          const yField = Array.isArray(chart.dataMapping.yAxis) ? 
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
        } else {
          // Stacked chart with multiple y-axis fields (e.g. success vs failed, USD vs SOL)
          let yAxisFields: string[] = [];
          if (Array.isArray(chart.dataMapping.yAxis)) {
            yAxisFields = chart.dataMapping.yAxis.map((f: string | YAxisConfig) => getFieldName(f));
          } else {
            yAxisFields = [getFieldName(chart.dataMapping.yAxis)];
          }
          yAxisFields = applyCurrencyFilterToFields(yAxisFields, chart, filterValues);

          const fieldTotals: Record<string, number> = {};
          yAxisFields.forEach(field => {
            fieldTotals[field] = data.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
          });
          const valueOrderedColors = getValueOrderedColorMap(
            yAxisFields.filter(f => (fieldTotals[f] ?? 0) > 0.001),
            (f) => fieldTotals[f] ?? 0,
            legendColorMap
          );
          chartLegends = yAxisFields
            .filter(field => (fieldTotals[field] ?? 0) > 0.001)
            .map((field, index) => {
              const label = field.replace(/_/g, ' ')
                .split(' ')
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
              return {
                id: field,
                label,
                color: valueOrderedColors[field] || getColorByIndex(index),
                value: fieldTotals[field] || 0,
                shape: 'square' as const
              };
            })
            .sort((a, b) => (b.value || 0) - (a.value || 0));
        }
      } else if (chart.chartType === 'dual-axis' && chart.dualAxisConfig) {
        console.log('Processing as dual-axis chart');
        let leftFields = chart.dualAxisConfig.leftAxisFields || [];
        let rightFields = chart.dualAxisConfig.rightAxisFields || [];
        leftFields = applyCurrencyFilterToFields(leftFields, chart, filterValues);
        rightFields = applyCurrencyFilterToFields(rightFields, chart, filterValues);
        const allFields = [...leftFields, ...rightFields];
        const fieldTotals: Record<string, number> = {};
        allFields.forEach(field => {
          fieldTotals[field] = data.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
        });
        const valueOrderedColors = getValueOrderedColorMap(
          allFields.filter(f => (fieldTotals[f] ?? 0) > 0.001),
          (f) => fieldTotals[f] ?? 0,
          legendColorMap
        );
        chartLegends = allFields
          .filter(field => (fieldTotals[field] ?? 0) > 0.001)
          .map(field => {
            const isRightAxis = rightFields.includes(field);
            const label = field.replace(/_/g, ' ')
              .split(' ')
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            return {
              id: field,
              label,
              color: valueOrderedColors[field] || getColorByIndex(0),
              value: fieldTotals[field] || 0,
              shape: (isRightAxis ? 'circle' : 'square') as 'circle' | 'square'
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
        const xField = typeof chart.dataMapping.xAxis === 'string' ? 
          chart.dataMapping.xAxis : chart.dataMapping.xAxis[0];
        
        // Get field names from yAxis
        let yAxisFields: string[] = [];
        if (Array.isArray(chart.dataMapping.yAxis)) {
          yAxisFields = chart.dataMapping.yAxis.map(field => getFieldName(field));
        } else {
          yAxisFields = [getFieldName(chart.dataMapping.yAxis)];
        }
        yAxisFields = applyCurrencyFilterToFields(yAxisFields, chart, filterValues);

        // Handle groupBy (multi-series by group, e.g. Cumulative Volume By Dex)
        const groupField = chart.dataMapping.groupBy;
        if (groupField) {
          const uniqueGroups = [...new Set(data.map(item => item[groupField]))].filter(g => g != null);
          const yField = yAxisFields[0];
          const groupTotals: Record<string, number> = {};
          uniqueGroups.forEach(group => {
            const groupStr = String(group);
            groupTotals[groupStr] = data
              .filter(item => (item[groupField]?.toString() || 'Unknown') === groupStr)
              .reduce((sum, item) => sum + (Number(item[yField]) || 0), 0);
          });
          const validGroups = uniqueGroups.filter(g => (groupTotals[String(g)] ?? 0) > 0.001).map(g => String(g));
          const valueOrderedColors = getValueOrderedColorMap(validGroups, (g) => groupTotals[g] ?? 0, legendColorMap);
          chartLegends = validGroups
            .map((groupStr) => ({
              id: groupStr,
              label: groupStr,
              color: valueOrderedColors[groupStr] || getColorByIndex(0),
              value: groupTotals[groupStr] || 0,
              shape: 'circle' as const
            }))
            .sort((a, b) => (b.value || 0) - (a.value || 0));
        } else {
        // For regular charts without groupBy, check if it's a multi-series chart
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
        } else if (isDateBased && yAxisFields.length === 1) {
          // Single series time chart - use the y-axis field name as legend
          const field = yAxisFields[0];
          const total = data.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
          const label = field.replace(/_/g, ' ')
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          chartLegends = [{
            id: field,
            label,
            color: legendColorMap[field] || getColorByIndex(0),
            value: total,
            shape: 'square' as const
          }];
        }
        }
      } else if (chart.chartType === 'area' || chart.chartType === 'stacked-area') {
        console.log('Processing as area chart');
        let yAxisFields: string[] = [];
        if (Array.isArray(chart.dataMapping.yAxis)) {
          yAxisFields = chart.dataMapping.yAxis.map(field => getFieldName(field));
        } else {
          yAxisFields = [getFieldName(chart.dataMapping.yAxis)];
        }
        yAxisFields = applyCurrencyFilterToFields(yAxisFields, chart, filterValues);

        const getFieldTotal = (f: string) => data.reduce((sum, item) => sum + (Number(item[f]) || 0), 0);
        const valueOrderedColors = getValueOrderedColorMap(yAxisFields, getFieldTotal, legendColorMap);
        const formatLabel = (field: string) =>
          field.replace(/_/g, ' ')
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        if (yAxisFields.length > 1) {
          chartLegends = yAxisFields
            .filter(f => (getFieldTotal(f) ?? 0) > 0.001)
            .map((field) => ({
              id: field,
              label: formatLabel(field),
              color: valueOrderedColors[field] || getColorByIndex(0),
              value: getFieldTotal(field),
              shape: 'square' as const
            }))
            .sort((a, b) => (b.value || 0) - (a.value || 0));
        } else if (yAxisFields.length === 1) {
          const field = yAxisFields[0];
          const total = getFieldTotal(field);
          if (total > 0.001) {
            chartLegends = [{
              id: field,
              label: formatLabel(field),
              color: valueOrderedColors[field] || getColorByIndex(0),
              value: total,
              shape: 'square' as const
            }];
          }
        }
      }
    }

    console.log('Generated legends:', chartLegends);
    setLegends(chartLegends);
  }, [chart, legendColorMap, filterValues]);

  // Regenerate legends when currency filter changes (so legend shows only USD or only SOL items)
  useEffect(() => {
    if (chart && chartData.length > 0) {
      handleDataLoaded(chartData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only regenerate when currency filter changes
  }, [filterValues.currencyFilter]);

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
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <div className="text-red-500 text-center max-w-md mb-6">{error}</div>
        <a
          href="https://research.topledger.xyz"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          ← Back to Research
        </a>
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
                preloadedData={(chart?.data as any[]) || []}
                urlParams={searchParams}
              />
            </div>

            {/* Legend Area - fixed height, scrollable when many items */}
            <div className="lg:w-1/6 mt-0 lg:mt-0 lg:pl-4 flex flex-col">
              <div className="h-px bg-gray-900 w-full lg:hidden mb-2"></div>
              <div className="max-h-[280px] lg:max-h-[480px] min-h-0 flex flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto
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