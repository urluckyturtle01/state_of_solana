"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ChartCard from "@/app/components/shared/ChartCard";
import DualAxisChart from "@/app/admin/components/charts/DualAxisChart";
import MultiSeriesLineBarChart from "@/app/admin/components/charts/MultiSeriesLineBarChart";
import StackedBarChart from "@/app/admin/components/charts/StackedBarChart";
import LegendItem from "@/app/components/shared/LegendItem";
import { useDashboards } from "@/app/contexts/DashboardContext";
import { getColorByIndex } from "@/app/utils/chartColors";
import { formatNumber } from "@/app/utils/formatters";
import DisplayModeFilter, { DisplayMode } from "@/app/components/shared/filters/DisplayModeFilter";
import React from "react";
import { useChartScreenshot } from "@/app/components/shared";

interface SavedChart {
  id: string;
  name: string;
  type: 'bar' | 'stacked' | 'dual' | 'line';
  description?: string;
  createdAt: Date;
  configuration: any;
  chartConfig: any;
  chartData: any[];
}

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  chartsCount: number;
  createdAt: Date;
  lastModified: Date;
  charts: SavedChart[];
}

interface Legend {
  id?: string;
  label: string;
  color: string;
  value?: number;
  shape?: 'circle' | 'square';
}

// Helper function to extract field name from YAxisConfig or use string directly
function getFieldName(field: string | any): string {
  return typeof field === 'string' ? field : field.field;
}

// Format currency for display
const formatCurrency = (value: number): string => {
  return formatNumber(value);
};

// Function to truncate text with ellipsis
const truncateLabel = (label: string, maxLength: number = 15): string => {
  if (label.length <= maxLength) return label;
  return label.substring(0, maxLength) + '...';
};

export default function DashboardPage() {
  const params = useParams();
  const dashboardId = params.id as string;
  const { getDashboard } = useDashboards();

  // Legend-related state
  const [legends, setLegends] = useState<Record<string, Legend[]>>({});
  const [legendColorMaps, setLegendColorMaps] = useState<Record<string, Record<string, string>>>({});
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, string[]>>({});

  // Display mode state for stacked charts
  const [displayModes, setDisplayModes] = useState<Record<string, DisplayMode>>({});

  // Expand state for charts
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  // Screenshot state for charts
  const [screenshottingCharts, setScreenshottingCharts] = useState<Record<string, boolean>>({});

  // Initialize screenshot functionality
  const { captureScreenshot } = useChartScreenshot();

  const dashboard = useMemo(() => {
    return getDashboard(dashboardId);
  }, [dashboardId, getDashboard]);

  // Generate legends for a chart based on its data and configuration
  const updateLegends = (chartId: string, data: any[], configuration: any) => {
    if (!data || data.length === 0 || !configuration) return;
    
    // Get or initialize the legend color map for this chart
    let colorMap = legendColorMaps[chartId] || {};
    const isNewColorMap = Object.keys(colorMap).length === 0;
    
    let chartLegends: Legend[] = [];
    const newLabels: string[] = [];
    
    const hasGroupBy = Boolean(configuration.groupBy && configuration.groupBy !== '');
    const groupField = configuration.groupBy || '';
    const isStacked = configuration.chartType === 'stacked';
    const isDual = configuration.chartType === 'dual';
    
    if (hasGroupBy && data[0] && data[0][groupField] !== undefined) {
      // Chart with groupBy - show group values in legend
      const uniqueGroups = Array.from(new Set(data.map(item => item[groupField])));
      
      const groupTotals: Record<string, number> = {};
      const yField = configuration.yColumns[0];
      
      uniqueGroups.forEach(group => {
        if (group !== null && group !== undefined) {
          const groupStr = String(group);
          newLabels.push(groupStr);
          
          groupTotals[groupStr] = data
            .filter(item => item[groupField] === group)
            .reduce((sum, item) => sum + (Number(item[yField]) || 0), 0);
        }
      });
      
      // Assign colors if new color map
      if (isNewColorMap) {
        const sortedGroups = Object.entries(groupTotals)
          .sort((a, b) => b[1] - a[1])
          .map(([group]) => group);
        
        sortedGroups.forEach((group, index) => {
          if (!colorMap[group]) {
            colorMap[group] = getColorByIndex(index);
          }
        });
      }
      
      chartLegends = uniqueGroups
        .filter(group => group !== null && group !== undefined)
        .map(group => {
          const groupStr = String(group);
          return {
            id: groupStr,
            label: groupStr,
            color: colorMap[groupStr] || getColorByIndex(Object.keys(colorMap).length),
            value: groupTotals[groupStr] || 0,
            shape: 'square' as const
          };
        })
        .sort((a, b) => (b.value || 0) - (a.value || 0));
    }
    else if (isDual && configuration.series) {
      // Dual axis chart - show series in legend
      configuration.series.forEach((series: any, index: number) => {
        // Use the same intelligent field name extraction
        let fieldName: string;
        if (series.dataKey.includes('_')) {
          const parts = series.dataKey.split('_');
          if (parts.length >= 3) {
            fieldName = parts.slice(-2).join('_'); // e.g., "25th_percentile"
          } else {
            fieldName = parts[parts.length - 1]; // fallback to last part
          }
        } else {
          fieldName = series.dataKey;
        }
        
        newLabels.push(fieldName);
        
        if (isNewColorMap && !colorMap[fieldName]) {
          colorMap[fieldName] = series.color || getColorByIndex(index);
        }
        
        const total = data.reduce((sum, item) => sum + (Number(item[fieldName]) || 0), 0);
        
        chartLegends.push({
          id: fieldName,
          label: fieldName.replace(/_/g, ' ').split(' ').map((word: string) => 
            word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          color: colorMap[fieldName] || series.color || getColorByIndex(index),
          value: total,
          shape: series.yAxis === 'right' ? 'circle' as const : 'square' as const
        });
      });
    }
    else if (configuration.yColumns && configuration.yColumns.length > 1) {
      // Multiple Y columns - show each column in legend
      configuration.yColumns.forEach((column: string, index: number) => {
        // For multiple Y columns, use a more intelligent field name extraction
        // that preserves uniqueness and meaning
        let fieldName: string;
        if (column.includes('_')) {
          // Take the last 2-3 parts to preserve meaning (e.g., "25th_percentile", "75th_percentile")
          const parts = column.split('_');
          if (parts.length >= 3) {
            fieldName = parts.slice(-2).join('_'); // e.g., "25th_percentile"
          } else {
            fieldName = parts[parts.length - 1]; // fallback to last part
          }
        } else {
          fieldName = column;
        }
        
        newLabels.push(fieldName);
        
        if (isNewColorMap && !colorMap[fieldName]) {
          colorMap[fieldName] = getColorByIndex(index);
        }
        
        const total = data.reduce((sum, item) => sum + (Number(item[fieldName]) || 0), 0);
        
        chartLegends.push({
          id: fieldName,
          label: fieldName.replace(/_/g, ' ').split(' ').map((word: string) => 
            word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          color: colorMap[fieldName] || getColorByIndex(index),
          value: total,
          shape: 'square' as const
        });
      });
    }
    else {
      // Single series - create one legend entry
      const yField = configuration.yColumns?.[0] || 'value';
      
      // For single series charts, use intelligent field name extraction for consistency with chart data
      let fieldName: string;
      if (isStacked) {
        fieldName = yField; // Keep original for stacked charts
      } else {
        // Use intelligent extraction for non-stacked charts
        if (yField.includes('_')) {
          const parts = yField.split('_');
          if (parts.length >= 3) {
            fieldName = parts.slice(-2).join('_'); // e.g., "25th_percentile"
          } else {
            fieldName = parts[parts.length - 1]; // fallback to last part
          }
        } else {
          fieldName = yField;
        }
      }
      
      const total = data.reduce((sum, item) => sum + (Number(item[fieldName]) || 0), 0);
      const label = fieldName.replace(/_/g, ' ').split(' ').map((word: string) => 
        word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      
      newLabels.push(fieldName);
      
      if (isNewColorMap && !colorMap[fieldName]) {
        colorMap[fieldName] = getColorByIndex(0);
      }
      
      chartLegends = [{
        id: fieldName,
        label,
        color: colorMap[fieldName] || getColorByIndex(0),
        value: total,
        shape: 'square' as const
      }];
    }
    
    // Update color map if new
    if (isNewColorMap) {
      setLegendColorMaps(prev => ({
        ...prev,
        [chartId]: colorMap
      }));
    }
    
    // Update legends
    setLegends(prev => ({
      ...prev,
      [chartId]: chartLegends
    }));
  };

  // Handle legend click to toggle series visibility
  const handleLegendClick = (chartId: string, label: string) => {
    setHiddenSeries(prev => {
      const chartHidden = prev[chartId] || [];
      const newHidden = chartHidden.includes(label)
        ? chartHidden.filter(id => id !== label)
        : [...chartHidden, label];
      
      return {
        ...prev,
        [chartId]: newHidden
      };
    });
  };

  // Handle display mode change for stacked charts
  const handleDisplayModeChange = (chartId: string, mode: DisplayMode) => {
    setDisplayModes(prev => ({
      ...prev,
      [chartId]: mode
    }));
  };

  // Handle chart expand/collapse
  const handleExpandChart = (chartId: string) => {
    setExpandedChart(chartId);
  };

  const handleCloseExpanded = () => {
    setExpandedChart(null);
  };

  // Handle chart screenshot
  const handleChartScreenshot = async (chart: SavedChart) => {
    try {
      // Set loading state
      setScreenshottingCharts(prev => ({ ...prev, [chart.id]: true }));
      
      // Create a chart config object for the screenshot
      const screenshotChartConfig = {
        ...chart.chartConfig,
        id: chart.id,
        title: chart.name
      };
      
      // Use the screenshot capture hook
      const cardElementId = `chart-card-${chart.id}`;
      await captureScreenshot(screenshotChartConfig, cardElementId);
      
    } catch (error) {
      console.error('Error capturing screenshot:', error);
    } finally {
      // Clear loading state
      setScreenshottingCharts(prev => ({ ...prev, [chart.id]: false }));
    }
  };

  // Check if a chart is a stacked chart
  const isStackedChart = (chart: SavedChart) => {
    const hasGroupBy = Boolean(chart.configuration.groupBy && chart.configuration.groupBy !== '');
    const hasMultipleYColumns = chart.configuration.yColumns?.length > 1;
    return hasGroupBy || (hasMultipleYColumns && chart.configuration.chartType === 'stacked') || chart.type === 'stacked';
  };

  const renderChart = (chart: SavedChart) => {
    const { configuration, chartConfig, chartData } = chart;
    
    const hasDualAxis = configuration.series?.some((s: any) => s.yAxis === 'right') || chart.type === 'dual';
    const hasGroupBy = Boolean(configuration.groupBy && configuration.groupBy !== '');
    const hasMultipleYColumns = configuration.yColumns?.length > 1;
    
    // Get hidden series and color map for this chart
    const chartHiddenSeries = hiddenSeries[chart.id] || [];
    const chartColorMap = legendColorMaps[chart.id] || {};
    
    // Get display mode for this chart (default to 'absolute')
    const displayMode = displayModes[chart.id] || 'absolute';
    
    const commonProps = {
      chartConfig,
      data: chartData,
      height: 300,
      hiddenSeries: chartHiddenSeries,
      colorMap: chartColorMap,
      displayMode,
      isExpanded: expandedChart === chart.id,
      onCloseExpanded: handleCloseExpanded
    };
    
    if (hasDualAxis) {
      return (
        <DualAxisChart
          {...commonProps}
        />
      );
    } else if (hasGroupBy || (hasMultipleYColumns && configuration.chartType === 'stacked') || chart.type === 'stacked') {
      return (
        <StackedBarChart
          {...commonProps}
        />
      );
    } else {
      return (
        <MultiSeriesLineBarChart
          {...commonProps}
        />
      );
    }
  };

  // Generate legends when dashboard loads
  useEffect(() => {
    if (dashboard && dashboard.charts.length > 0) {
      dashboard.charts.forEach(chart => {
        if (chart.chartData && chart.chartData.length > 0) {
          updateLegends(chart.id, chart.chartData, chart.configuration);
        }
      });
    }
  }, [dashboard]);

  if (!dashboard) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-200 mb-2">Dashboard not found</h3>
          <p className="text-gray-400 text-sm mb-4">
            The dashboard you're looking for doesn't exist or has been removed.
          </p>
          <Link 
            href="/dashboards"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Back to Dashboards
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboards"
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-semibold text-gray-100">{dashboard.name}</h1>
          </div>
          {dashboard.description && (
            <p className="text-gray-400 text-sm ml-8">{dashboard.description}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-gray-500 ml-8">
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>{dashboard.chartsCount} charts</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Last modified {formatDate(dashboard.lastModified)}</span>
            </div>
          </div>
        </div>

        {/* Dashboard Actions */}
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-md transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Chart
          </button>
          <button className="px-3 py-1.5 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-md transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      {dashboard.charts.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {dashboard.charts.map(chart => (
            <ChartCard
              key={chart.id}
              title={chart.name}
              description={chart.description}
              className="h-[460px]"
              id={`chart-card-${chart.id}`}
              onExpandClick={() => handleExpandChart(chart.id)}
              onScreenshotClick={() => handleChartScreenshot(chart)}
              isScreenshotting={screenshottingCharts[chart.id]}
              filterBar={
                isStackedChart(chart) ? (
                  <div className="flex flex-wrap gap-3 items-center">
                    <DisplayModeFilter
                      mode={displayModes[chart.id] || 'absolute'}
                      onChange={(mode) => handleDisplayModeChange(chart.id, mode)}
                    />
                  </div>
                ) : undefined
              }
              legend={
                <>
                  {legends[chart.id] && legends[chart.id].length > 0 ? (
                    legends[chart.id].map(legend => (
                      <LegendItem 
                        key={legend.id || legend.label}
                        label={truncateLabel(legend.label)} 
                        color={legend.color} 
                        shape={legend.shape || 'square'}
                        tooltipText={legend.value ? formatCurrency(legend.value) : undefined}
                        onClick={() => handleLegendClick(chart.id, legend.id || legend.label)}
                        inactive={(hiddenSeries[chart.id] || []).includes(legend.id || legend.label)}
                      />
                    ))
                  ) : null}
                </>
              }
            >
              {renderChart(chart)}
            </ChartCard>
          ))}
          
          
        </div>
      ) : (
        /* Empty State */
        <div className="flex items-center justify-center h-[400px] border-2 border-dashed border-gray-800 rounded-lg">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gray-800/50 rounded-lg flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-200 mb-2">No charts yet</h3>
              <p className="text-gray-400 text-sm mb-4">
                Start creating visualizations in the Explorer and add them to this dashboard
              </p>
              <Link 
                href="/explorer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Go to Explorer
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 