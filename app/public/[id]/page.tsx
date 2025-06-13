"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import ChartCard from "@/app/components/shared/ChartCard";
import TextboxCard from "../../dashboards/components/TextboxCard";
import DualAxisChart from "@/app/admin/components/charts/DualAxisChart";
import MultiSeriesLineBarChart from "@/app/admin/components/charts/MultiSeriesLineBarChart";
import StackedBarChart from "@/app/admin/components/charts/StackedBarChart";
import LegendItem from "@/app/components/shared/LegendItem";
import { usePublicDashboard } from "@/app/hooks/usePublicDashboard";
import { getColorByIndex } from "@/app/utils/chartColors";
import { formatNumber } from "@/app/utils/formatters";
import DisplayModeFilter, { DisplayMode } from "@/app/components/shared/filters/DisplayModeFilter";
import React from "react";

interface SavedChart {
  id: string;
  name: string;
  type: 'bar' | 'stacked' | 'dual' | 'line';
  description?: string;
  createdAt: Date;
  configuration: any;
  chartConfig: any;
  chartData: any[];
  order?: number;
}

interface DashboardTextbox {
  id: string;
  content: string;
  width: 'half' | 'full';
  height?: number;
  createdAt: Date;
  order?: number;
}

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  chartsCount: number;
  createdAt: Date;
  lastModified: Date;
  charts: SavedChart[];
  textboxes: DashboardTextbox[];
  createdBy?: string;
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

export default function PublicDashboardPage() {
  const params = useParams();
  const dashboardId = params.id as string;
  const { dashboard, isLoading, error } = usePublicDashboard(dashboardId);

  // Debug logging
  useEffect(() => {
    if (dashboard) {
      console.log('🔍 Public dashboard loaded:', {
        id: dashboard.id,
        name: dashboard.name,
        createdBy: dashboard.createdBy,
        dashboardObject: dashboard
      });
    }
  }, [dashboard]);

  // Legend-related state
  const [legends, setLegends] = useState<Record<string, Legend[]>>({});
  const [legendColorMaps, setLegendColorMaps] = useState<Record<string, Record<string, string>>>({});
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, string[]>>({});

  // Display mode state for stacked charts
  const [displayModes, setDisplayModes] = useState<Record<string, DisplayMode>>({});

  // Expand state for charts
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  // Create combined items array for rendering - sort by order field
  const allItems = useMemo(() => {
    if (!dashboard) return [];
    
    // Combine and sort by order field
    const combined = [
      ...dashboard.charts.map((chart: SavedChart) => ({ ...chart, itemType: 'chart' as const })),
      ...dashboard.textboxes.map((textbox: DashboardTextbox) => ({ ...textbox, itemType: 'textbox' as const }))
    ];
    
    // Sort by order field, with fallback to creation date for items without order
    return combined.sort((a, b) => {
      const orderA = a.order !== undefined ? a.order : new Date(a.createdAt).getTime();
      const orderB = b.order !== undefined ? b.order : new Date(b.createdAt).getTime();
      return orderA - orderB;
    });
  }, [dashboard]);

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
        let fieldName: string;
        if (column.includes('_')) {
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
      
      let fieldName: string;
      if (isStacked) {
        fieldName = yField; // Keep original for stacked charts
      } else {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 border-t-2 border-r-2 border-blue-400/60 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-b-2 border-l-2 border-purple-400/80 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-gray-400 text-sm">Loading public dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-200 mb-2">Dashboard not found</h3>
          <p className="text-gray-400 text-sm mb-4">
            {error || "The dashboard you're looking for doesn't exist or is not publicly accessible."}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
          >
            Try again
          </button>
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
    <div className="min-h-screen bg-black text-white">
      {/* Public Dashboard Header */}
      <div className="border-b border-gray-800 bg-gray-950/50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-100">{dashboard.name}</h1>
              {dashboard.description && (
                <p className="text-gray-400 text-sm mt-1">{dashboard.description}</p>
              )}
              <p className="text-gray-500 text-xs mt-2">
                {dashboard.chartsCount} charts • Last modified {formatDate(dashboard.lastModified)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Created by {dashboard.createdBy || 'Unknown'}</p>
              <p className="text-xs text-gray-600">View Only</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {allItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {allItems.map((item) => (
              <div
                key={item.id}
                className={`${
                  item.itemType === 'textbox' && item.width === 'full' ? 'md:col-span-2' :
                  item.itemType === 'textbox' && item.width === 'half' ? 'md:col-span-1' :
                  item.itemType === 'chart' && (item.configuration?.width || 2) === 2 ? 'md:col-span-1' :
                  'md:col-span-2'
                }`}
              >
                {item.itemType === 'chart' ? (
                  <ChartCard
                    title={item.name}
                    description={item.description}
                    className="h-[460px]"
                    id={`chart-card-${item.id}`}
                    onExpandClick={() => handleExpandChart(item.id)}
                    isEditMode={false}
                    filterBar={
                      isStackedChart(item) ? (
                        <div className="flex flex-wrap gap-3 items-center">
                          <DisplayModeFilter
                            mode={displayModes[item.id] || 'absolute'}
                            onChange={(mode) => handleDisplayModeChange(item.id, mode)}
                          />
                        </div>
                      ) : undefined
                    }
                    legend={
                      <>
                        {legends[item.id] && legends[item.id].length > 0 ? (
                          legends[item.id].map(legend => (
                            <LegendItem 
                              key={legend.id || legend.label}
                              label={truncateLabel(legend.label)} 
                              color={legend.color} 
                              shape={legend.shape || 'square'}
                              tooltipText={legend.value ? formatCurrency(legend.value) : undefined}
                              onClick={() => handleLegendClick(item.id, legend.id || legend.label)}
                              inactive={(hiddenSeries[item.id] || []).includes(legend.id || legend.label)}
                            />
                          ))
                        ) : null}
                      </>
                    }
                  >
                    {renderChart(item)}
                  </ChartCard>
                ) : (
                  <TextboxCard
                    id={item.id}
                    content={item.content}
                    width={item.width}
                    height={item.height}
                    isEditMode={false}
                  />
                )}
              </div>
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
                <h3 className="text-lg font-medium text-gray-200 mb-2">No content yet</h3>
                <p className="text-gray-400 text-sm">
                  This dashboard is empty.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 