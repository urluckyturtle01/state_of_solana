"use client";

import React, { useState, useEffect } from 'react';
import { getChartConfigsByPage } from '../admin/utils';
import ChartCard from '../components/shared/ChartCard';
import LegendItem from '../components/shared/LegendItem';
import { ChartConfig } from '../admin/types';
import dynamic from 'next/dynamic';
import { getColorByIndex } from '../utils/chartColors';
import { formatNumber } from '../utils/formatters';
import Modal from '../components/shared/Modal';
import TimeFilterSelector from '../components/shared/filters/TimeFilter';
import CurrencyFilter from '../components/shared/filters/CurrencyFilter';
import DisplayModeFilter, { DisplayMode } from '../components/shared/filters/DisplayModeFilter';

// Format currency for display
const formatCurrency = (value: number): string => {
  return formatNumber(value);
};

// Dynamic import for the ChartRenderer to avoid SSR issues
const ChartRenderer = dynamic(() => import('../admin/components/ChartRenderer'), {
  ssr: false,
});

interface DashboardRendererProps {
  pageId: string;
}

interface Legend {
  label: string;
  color: string;
  value?: number;
}

export default function DashboardRenderer({ pageId }: DashboardRendererProps) {
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [expandedCharts, setExpandedCharts] = useState<Record<string, boolean>>({});
  const [downloadingCharts, setDownloadingCharts] = useState<Record<string, boolean>>({});
  const [legends, setLegends] = useState<Record<string, Legend[]>>({});
  
  // Add state for filter values
  const [filterValues, setFilterValues] = useState<Record<string, Record<string, string>>>({});
  const [chartData, setChartData] = useState<Record<string, any[]>>({});
  // Add state to track legend colors and order
  const [legendColorMaps, setLegendColorMaps] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    setIsClient(true);
    try {
      const pageCharts = getChartConfigsByPage(pageId);
      setCharts(pageCharts);
      
      // Initialize expanded and downloading states for each chart
      const expandedState: Record<string, boolean> = {};
      const downloadingState: Record<string, boolean> = {};
      const initialFilterValues: Record<string, Record<string, string>> = {};
      
      pageCharts.forEach(chart => {
        expandedState[chart.id] = false;
        downloadingState[chart.id] = false;
        
        // Initialize filter values for each chart
        if (chart.additionalOptions?.filters) {
          initialFilterValues[chart.id] = {};
          
          // Set initial time filter
          if (chart.additionalOptions.filters.timeFilter && 
              Array.isArray(chart.additionalOptions.filters.timeFilter.options) && 
              chart.additionalOptions.filters.timeFilter.options.length > 0) {
            initialFilterValues[chart.id]['timeFilter'] = chart.additionalOptions.filters.timeFilter.options[0];
          }
          
          // Set initial currency filter
          if (chart.additionalOptions.filters.currencyFilter && 
              Array.isArray(chart.additionalOptions.filters.currencyFilter.options) && 
              chart.additionalOptions.filters.currencyFilter.options.length > 0) {
            initialFilterValues[chart.id]['currencyFilter'] = chart.additionalOptions.filters.currencyFilter.options[0];
          }
          
          // Set initial display mode filter
          if (chart.additionalOptions.filters.displayModeFilter && 
              Array.isArray(chart.additionalOptions.filters.displayModeFilter.options) && 
              chart.additionalOptions.filters.displayModeFilter.options.length > 0) {
            initialFilterValues[chart.id]['displayModeFilter'] = chart.additionalOptions.filters.displayModeFilter.options[0];
          }
        }
      });
      
      setExpandedCharts(expandedState);
      setDownloadingCharts(downloadingState);
      setFilterValues(initialFilterValues);
    } catch (error) {
      console.error(`Error loading charts for page ${pageId}:`, error);
    }
  }, [pageId]);

  const toggleChartExpanded = (chartId: string) => {
    setExpandedCharts(prev => ({
      ...prev,
      [chartId]: !prev[chartId]
    }));
  };

  // Handle filter changes
  const handleFilterChange = async (chartId: string, filterType: string, value: string) => {
    console.log(`Filter changed for chart ${chartId}: ${filterType} = ${value}`);
    
    // Update filter value
    setFilterValues(prev => ({
      ...prev,
      [chartId]: {
        ...prev[chartId],
        [filterType]: value
      }
    }));
    
    // Find the chart
    const chart = charts.find(c => c.id === chartId);
    if (!chart) return;
    
    // Fetch updated data with the new filter
    await fetchChartDataWithFilters(chart);
  };
  
  // Fetch chart data with current filters
  const fetchChartDataWithFilters = async (chart: ChartConfig) => {
    try {
      // Get current filter values for this chart
      const chartFilters = filterValues[chart.id] || {};
      
      // Create URL with API key
      const url = new URL(chart.apiEndpoint);
      if (chart.apiKey) {
        url.searchParams.append('api_key', chart.apiKey);
      }
      
      // Build parameters object for POST request
      const parameters: Record<string, any> = {};
      const filterConfig = chart.additionalOptions?.filters;
      
      if (filterConfig) {
        // Add time filter parameter
        if (filterConfig.timeFilter && chartFilters['timeFilter']) {
          parameters[filterConfig.timeFilter.paramName] = chartFilters['timeFilter'];
        }
        
        // Add currency filter parameter
        if (filterConfig.currencyFilter && chartFilters['currencyFilter']) {
          parameters[filterConfig.currencyFilter.paramName] = chartFilters['currencyFilter'];
        }
        
        // Add display mode filter parameter
        if (filterConfig.displayModeFilter && chartFilters['displayModeFilter']) {
          parameters[filterConfig.displayModeFilter.paramName] = chartFilters['displayModeFilter'];
        }
      }
      
      // Set up request options
      const hasParameters = Object.keys(parameters).length > 0;
      const options: RequestInit = {
        method: hasParameters ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      };
      
      // Add body with parameters for POST request
      if (hasParameters) {
        options.body = JSON.stringify({ parameters });
        console.log(`Fetching data with parameters:`, parameters);
      }
      
      console.log(`Fetching data from: ${url.toString()} with method: ${options.method}`);
      
      // Fetch data from API
      const response = await fetch(url.toString(), options);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Process different API response formats
      let parsedData: any[] = [];
      
      // Redash format
      if (result?.query_result?.data?.rows) {
        parsedData = result.query_result.data.rows;
      } 
      // Direct array
      else if (Array.isArray(result)) {
        parsedData = result;
      } 
      // Data property
      else if (result?.data && Array.isArray(result.data)) {
        parsedData = result.data;
      }
      // Rows property
      else if (result?.rows && Array.isArray(result.rows)) {
        parsedData = result.rows;
      }
      // Results property
      else if (result?.results && Array.isArray(result.results)) {
        parsedData = result.results;
      }
      else if (result?.error) {
        throw new Error(`API returned an error: ${result.error}`);
      }
      else {
        console.error('Unrecognized API response structure:', result);
        throw new Error('API response does not have a recognized structure');
      }
      
      // Update chart data
      setChartData(prev => ({
        ...prev,
        [chart.id]: parsedData
      }));
      
      // Update legends
      updateLegends(chart.id, parsedData);
      
      return parsedData;
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return null;
    }
  };

  const downloadCSV = async (chart: ChartConfig) => {
    // Set loading state
    setDownloadingCharts(prev => ({ ...prev, [chart.id]: true }));
    
    try {
      // Create URL with API key if provided
      const url = new URL(chart.apiEndpoint);
      if (chart.apiKey) {
        url.searchParams.append('api_key', chart.apiKey);
      }
      
      // Add CSV format parameter if needed
      url.searchParams.append('format', 'csv');
      
      // Fetch data
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to download CSV: ${response.statusText}`);
      }
      
      // Get CSV data
      const csvData = await response.text();
      
      // Create a blob from the CSV data
      const blob = new Blob([csvData], { type: 'text/csv' });
      const downloadUrl = URL.createObjectURL(blob);
      
      // Create a temporary anchor element for the download
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${chart.title.replace(/\s+/g, '_').toLowerCase()}.csv`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      alert('Failed to download CSV. Please try again.');
    } finally {
      // Clear loading state
      setDownloadingCharts(prev => ({ ...prev, [chart.id]: false }));
    }
  };

  // Generate legends for a chart based on its data and configuration
  const updateLegends = (chartId: string, data: any[]) => {
    const chart = charts.find(c => c.id === chartId);
    if (!chart || !data || data.length === 0) return;
    
    console.log("Updating legends for chart:", {
      id: chartId,
      title: chart.title,
      chartType: chart.chartType,
      isStacked: chart.isStacked,
      groupBy: chart.dataMapping.groupBy,
      dataLength: data.length,
      sampleData: data.slice(0, 2)
    });
    
    // Get or initialize the legend color map for this chart
    let colorMap = legendColorMaps[chartId] || {};
    const isNewColorMap = Object.keys(colorMap).length === 0;
    
    // Different legend generation based on chart type
    let chartLegends: Legend[] = [];
    // Track new labels to ensure we keep consistent order
    const newLabels: string[] = [];
    
    // First, we need to determine if this is truly a stacked chart with valid data
    const isStackedConfig = chart.chartType.includes('stacked') || chart.isStacked === true;
    const hasGroupByField = !!chart.dataMapping.groupBy;
    const groupField = chart.dataMapping.groupBy || '';
    
    // Check if the groupBy field actually exists in the data
    const groupByFieldExists = data.length > 0 && groupField && data[0][groupField] !== undefined;
    
    // A chart is a valid stacked chart if it's configured as stacked AND has a groupBy field that exists in the data
    const isValidStackedChart = isStackedConfig && hasGroupByField && groupByFieldExists;
    
    console.log("Legend generation diagnosis:", {
      chartId,
      title: chart.title,
      isStackedConfig,
      hasGroupByField,
      groupField,
      groupByFieldExists,
      isValidStackedChart,
      dataLength: data.length,
      sampleFields: data.length > 0 ? Object.keys(data[0]).slice(0, 5) : []
    });
    
    if (isValidStackedChart) {
      console.log("Processing as valid stacked chart with group by:", groupField);
      
      // For stacked charts, always use the group by field values for legends
      // Get unique groups from the data
      const uniqueGroups = Array.from(new Set(data.map(item => item[groupField])));
      console.log("Unique groups found:", uniqueGroups);
      
      // Calculate total for each group for sorting and tooltips
      const yField = typeof chart.dataMapping.yAxis === 'string' ? 
        chart.dataMapping.yAxis : chart.dataMapping.yAxis[0];
      
      // Group totals for proper sorting
      const groupTotals: Record<string, number> = {};
      uniqueGroups.forEach(group => {
        if (group !== null && group !== undefined) {
          const groupStr = String(group);
          newLabels.push(groupStr);
          groupTotals[groupStr] = data
            .filter(item => item[groupField] === group)
            .reduce((sum, item) => sum + (Number(item[yField]) || 0), 0);
        }
      });
      console.log("Group totals:", groupTotals);
      
      // Create legend items, maintaining consistent color assignment
      // Sort by totals first (highest to lowest) if assigning colors for the first time
      if (isNewColorMap) {
        // Get sorted groups by their total value (highest first)
        const sortedGroups = Object.entries(groupTotals)
          .sort((a, b) => b[1] - a[1])
          .map(([group]) => group);
        
        // Assign colors to groups in order of their totals
        sortedGroups.forEach((group, index) => {
          if (!colorMap[group]) {
            colorMap[group] = getColorByIndex(index);
          }
        });
      }
      
      // Now create legend items using the color map
      chartLegends = uniqueGroups
        .filter(group => group !== null && group !== undefined)
        .map((group) => {
          const groupStr = String(group);
          return {
            label: groupStr,
            color: colorMap[groupStr] || getColorByIndex(Object.keys(colorMap).length),
            value: groupTotals[groupStr] || 0
          };
        });
    }
    // Then handle regular bar/line charts
    else if (chart.chartType === 'bar' || chart.chartType === 'line') {
      console.log("Processing as regular bar/line chart");
      // Check if this is a date-based chart (typically time series)
      const xField = typeof chart.dataMapping.xAxis === 'string' ? 
        chart.dataMapping.xAxis : chart.dataMapping.xAxis[0];
      const yField = typeof chart.dataMapping.yAxis === 'string' ? 
        chart.dataMapping.yAxis : chart.dataMapping.yAxis[0];
      
      const isDateBased = data.length > 0 && 
        (xField.toLowerCase().includes('date') || 
         xField.toLowerCase().includes('time') || 
         typeof data[0][xField] === 'string' && 
         data[0][xField].match(/^\d{4}-\d{2}-\d{2}/));
      
      if (isDateBased) {
        // For date-based charts, don't use dates as legend labels
        // Instead, use series names or y-axis field names
        
        // Check if we have multiple y-axis fields (multi-series)
        if (Array.isArray(chart.dataMapping.yAxis) && chart.dataMapping.yAxis.length > 1) {
          // For multi-series charts, use the y-axis field names as legends
          // Format the field names and assign colors
          chartLegends = chart.dataMapping.yAxis.map((field, index) => {
            // Calculate the total for this field across all data points
            const total = data.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
            
            // Format the field name to be more readable
            const label = field.replace(/_/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            
            newLabels.push(label);
            
            // Use consistent color from our map, or generate a new one if needed
            if (!colorMap[label] && isNewColorMap) {
              colorMap[label] = getColorByIndex(index);
            }
            
            return {
              label,
              color: colorMap[label] || getColorByIndex(index),
              value: total
            };
          });
        } else {
          // For single-series time charts, use a single legend entry with the chart title or y-axis name
          const total = data.reduce((sum, item) => sum + (Number(item[yField]) || 0), 0);
          const label = yField.replace(/_/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          
          newLabels.push(label);
          
          // Use consistent color from our map, or generate a new one if needed
          if (!colorMap[label] && isNewColorMap) {
            colorMap[label] = getColorByIndex(0);
          }
          
          chartLegends = [{
            label,
            color: colorMap[label] || getColorByIndex(0),
            value: total
          }];
        }
      } else {
        // For non-date based charts, use data points as legend entries
        // Don't limit to just 5 items, show all of them for consistency with BarChart
        chartLegends = data
          .map((item, index) => {
            const label = String(item[xField]);
            newLabels.push(label);
            
            // Use consistent color from our map, or generate a new one if needed
            if (!colorMap[label] && isNewColorMap) {
              colorMap[label] = getColorByIndex(index);
            }
            
            return {
              label,
              color: colorMap[label] || getColorByIndex(index),
              value: Number(item[yField]) || 0
            };
          });
      }
    }
    
    console.log("Generated legend items:", chartLegends);
    
    // Keep track of sorted order for consistent rendering
    if (isNewColorMap && chartLegends.length > 0) {
      // If this is the first time, remember the order of labels and their colors
      const newColorMap: Record<string, string> = {};
      chartLegends.forEach((legend, index) => {
        newColorMap[legend.label] = colorMap[legend.label] || getColorByIndex(index);
      });
      
      setLegendColorMaps(prev => ({
        ...prev,
        [chartId]: newColorMap
      }));
      
      console.log("Created new color map:", newColorMap);
    } else if (!isNewColorMap) {
      // If we already have a color map, maintain order from previous legend set
      const existingLegends = legends[chartId] || [];
      const existingLabels = existingLegends.map(l => l.label);
      
      // Sort the new legends to match the previous order as much as possible
      const oldLabels = existingLabels.filter(label => newLabels.includes(label));
      const newOnlyLabels = newLabels.filter(label => !existingLabels.includes(label));
      
      // Combine old labels (in original order) with new labels
      const orderedLabels = [...oldLabels, ...newOnlyLabels];
      
      // Sort the legends to match this order
      chartLegends.sort((a, b) => {
        const indexA = orderedLabels.indexOf(a.label);
        const indexB = orderedLabels.indexOf(b.label);
        return indexA - indexB;
      });
    }
    
    // No longer limiting the number of legend items
    // Update legends state
    setLegends(prev => ({
      ...prev,
      [chartId]: chartLegends
    }));
  };

  // Add a function to directly pass chart colors to ChartRenderer
  const syncLegendColors = (chartId: string, chartColorMap: Record<string, string>) => {
    setLegendColorMaps(prev => ({
      ...prev,
      [chartId]: chartColorMap
    }));
  };

  if (!isClient) {
    return null; // Return nothing during SSR
  }

  if (charts.length === 0) {
    return null; // Don't render anything if there are no charts
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {charts.map((chart) => (
        <ChartCard 
          key={chart.id}
          title={chart.title}
          description={chart.subtitle}
          accentColor="blue"
          onExpandClick={() => toggleChartExpanded(chart.id)}
          onDownloadClick={() => downloadCSV(chart)}
          isDownloading={downloadingCharts[chart.id]}
          legendWidth="1/5"
          
          // Add filter bar for regular chart view using ChartRenderer's filter props
          filterBar={chart.additionalOptions?.filters && (
            <div className="flex flex-wrap gap-3 items-center">
              {/* Time Filter */}
              {chart.additionalOptions.filters.timeFilter && (
                <TimeFilterSelector
                  value={filterValues[chart.id]?.['timeFilter'] || chart.additionalOptions.filters.timeFilter.options[0]}
                  onChange={(value) => handleFilterChange(chart.id, 'timeFilter', value)}
                  options={chart.additionalOptions.filters.timeFilter.options.map((value: string) => ({ 
                    value, 
                    label: value 
                  }))}
                />
              )}
              
              {/* Currency Filter */}
              {chart.additionalOptions.filters.currencyFilter && (
                <CurrencyFilter
                  currency={filterValues[chart.id]?.['currencyFilter'] || chart.additionalOptions.filters.currencyFilter.options[0]}
                  options={chart.additionalOptions.filters.currencyFilter.options}
                  onChange={(value) => handleFilterChange(chart.id, 'currencyFilter', value)}
                />
              )}
              
              {/* Display Mode Filter */}
              {chart.additionalOptions.filters.displayModeFilter && (
                <DisplayModeFilter
                  mode={filterValues[chart.id]?.['displayModeFilter'] as DisplayMode || chart.additionalOptions.filters.displayModeFilter.options[0] as DisplayMode}
                  onChange={(value) => handleFilterChange(chart.id, 'displayModeFilter', value)}
                />
              )}
            </div>
          )}
          
          legend={
            <>
              {legends[chart.id] && legends[chart.id].length > 0 ? (
                <div className="space-y-2 w-full overflow-y-auto max-h-[300px]
                  [&::-webkit-scrollbar]:w-1.5 
                  [&::-webkit-scrollbar-track]:bg-transparent 
                  [&::-webkit-scrollbar-thumb]:bg-gray-700/40
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
                  scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700/40">
                  {legends[chart.id].map(legend => (
                    <LegendItem 
                      key={legend.label}
                      label={legend.label} 
                      color={legend.color} 
                      shape="square"
                      tooltipText={legend.value ? formatCurrency(legend.value) : undefined}
                    />
                  ))}
                </div>
              ) : (
                <LegendItem label="Loading..." color="#cccccc" isLoading={true} />
              )}
            </>
          }
        >
          <div className="h-95">
            <ChartRenderer 
              chartConfig={chart} 
              onDataLoaded={(data: any[]) => {
                // Store initial data and update legends
                if (!chartData[chart.id]) {
                  setChartData(prev => ({
                    ...prev,
                    [chart.id]: data
                  }));
                }
                updateLegends(chart.id, data);
              }}
              isExpanded={expandedCharts[chart.id]}
              onCloseExpanded={() => toggleChartExpanded(chart.id)}
              // Pass filter values and handlers to ChartRenderer
              filterValues={filterValues[chart.id]}
              onFilterChange={(filterType, value) => handleFilterChange(chart.id, filterType, value)}
              // Pass the color map to ensure consistent colors
              colorMap={legendColorMaps[chart.id]}
              // Add a callback to receive colors from BarChart
              onColorsGenerated={(colorMap) => syncLegendColors(chart.id, colorMap)}
            />
          </div>
        </ChartCard>
      ))}
    </div>
  );
} 