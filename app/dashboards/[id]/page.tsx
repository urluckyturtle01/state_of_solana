"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ChartCard from "@/app/components/shared/ChartCard";
import TextboxCard from "../components/TextboxCard";
import AddTextboxModal from "../components/AddTextboxModal";
import ConfirmationModal from "@/app/components/shared/ConfirmationModal";
import DualAxisChart from "@/app/admin/components/charts/DualAxisChart";
import MultiSeriesLineBarChart from "@/app/admin/components/charts/MultiSeriesLineBarChart";
import StackedBarChart from "@/app/admin/components/charts/StackedBarChart";
import LegendItem from "@/app/components/shared/LegendItem";
import { useDashboards } from "@/app/contexts/DashboardContext";
import { getColorByIndex } from "@/app/utils/chartColors";
import { formatNumber } from "@/app/utils/formatters";
import DisplayModeFilter, { DisplayMode } from "@/app/components/shared/filters/DisplayModeFilter";
import React from "react";


// Simple drag and drop interface
interface DragState {
  draggedIndex: number | null;
  dragOverIndex: number | null;
}

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
  const { getDashboard, reorderItems, deleteChart, deleteTextbox, addTextboxToDashboard, updateTextbox, dashboards } = useDashboards();

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

  // Modal state
  const [showTextboxModal, setShowTextboxModal] = useState(false);

  // Drag and drop state
  const [dragState, setDragState] = useState<DragState>({
    draggedIndex: null,
    dragOverIndex: null
  });

  // Delete confirmation modal states
  const [deleteChartModal, setDeleteChartModal] = useState<{
    isOpen: boolean;
    chart: SavedChart | null;
  }>({ isOpen: false, chart: null });
  
  const [deleteTextboxModal, setDeleteTextboxModal] = useState<{
    isOpen: boolean;
    textbox: DashboardTextbox | null;
  }>({ isOpen: false, textbox: null });

  // Screenshot functionality now handled directly in ChartCard

  const dashboard = useMemo(() => {
    console.log('🔍 Dashboard useMemo triggered, looking for dashboard:', dashboardId);
    const foundDashboard = getDashboard(dashboardId);
    console.log('📊 Found dashboard:', foundDashboard?.name, 'with', foundDashboard?.charts?.length || 0, 'charts');
    return foundDashboard;
  }, [dashboardId, dashboards]);

  // Listen for edit mode changes from a global source
  const [isEditMode, setIsEditMode] = useState(false);

  // Global edit mode listener
  useEffect(() => {
    const handleEditModeChange = (event: CustomEvent) => {
      setIsEditMode(event.detail.isEditMode);
      // Clear expanded chart when entering edit mode
      if (event.detail.isEditMode) {
        setExpandedChart(null);
      }
    };

    window.addEventListener('dashboardEditModeChange', handleEditModeChange as EventListener);
    
    return () => {
      window.removeEventListener('dashboardEditModeChange', handleEditModeChange as EventListener);
    };
  }, []);

  // Global textbox modal listener
  useEffect(() => {
    const handleTextboxModalChange = (event: CustomEvent) => {
      setShowTextboxModal(event.detail.showTextboxModal);
    };

    window.addEventListener('textboxModalChange', handleTextboxModalChange as EventListener);
    
    return () => {
      window.removeEventListener('textboxModalChange', handleTextboxModalChange as EventListener);
    };
  }, []);

  // Handle drag and drop with native HTML5 API
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isEditMode) {
      e.preventDefault();
      return;
    }
    setDragState({ draggedIndex: index, dragOverIndex: null });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isEditMode || dragState.draggedIndex === null) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (index !== dragState.dragOverIndex) {
      setDragState(prev => ({ ...prev, dragOverIndex: index }));
    }
  };

  const handleDragEnd = () => {
    const { draggedIndex, dragOverIndex } = dragState;
    
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex && dashboard) {
      reorderItems(dashboard.id, draggedIndex, dragOverIndex);
    }
    
    setDragState({ draggedIndex: null, dragOverIndex: null });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleDragEnd();
  };

  // Handle chart deletion
  const handleDeleteChart = (chartId: string) => {
    if (dashboard) {
      const chart = dashboard.charts.find(c => c.id === chartId);
      if (chart) {
        setDeleteChartModal({ isOpen: true, chart });
      }
    }
  };

  const confirmDeleteChart = () => {
    if (dashboard && deleteChartModal.chart) {
      deleteChart(dashboard.id, deleteChartModal.chart.id);
      setDeleteChartModal({ isOpen: false, chart: null });
    }
  };

  // Handle textbox deletion
  const handleDeleteTextbox = (textboxId: string) => {
    if (dashboard) {
      const textbox = dashboard.textboxes.find(t => t.id === textboxId);
      if (textbox) {
        setDeleteTextboxModal({ isOpen: true, textbox });
      }
    }
  };

  const confirmDeleteTextbox = () => {
    if (dashboard && deleteTextboxModal.textbox) {
      deleteTextbox(dashboard.id, deleteTextboxModal.textbox.id);
      setDeleteTextboxModal({ isOpen: false, textbox: null });
    }
  };

  // Handle textbox creation
  const handleAddTextbox = (content: string, width: 'half' | 'full') => {
    if (dashboard) {
      addTextboxToDashboard(dashboard.id, content, width);
    }
    setShowTextboxModal(false); // Close modal after adding textbox
  };

  // Handle modal close
  const handleCloseTextboxModal = () => {
    setShowTextboxModal(false);
  };

  // Handle textbox content change
  const handleTextboxContentChange = (textboxId: string, content: string) => {
    if (dashboard) {
      updateTextbox(dashboard.id, textboxId, { content });
    }
  };

  // Handle textbox height change
  const handleTextboxHeightChange = (textboxId: string, height: number) => {
    if (dashboard) {
      updateTextbox(dashboard.id, textboxId, { height });
    }
  };

  // Create combined items array for rendering - sort by order field
  const allItems = useMemo(() => {
    if (!dashboard) return [];
    
    // Combine and sort by order field
    const combined = [
      ...dashboard.charts.map(chart => ({ ...chart, itemType: 'chart' as const })),
      ...dashboard.textboxes.map(textbox => ({ ...textbox, itemType: 'textbox' as const }))
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
    if (!isEditMode) {
      setExpandedChart(chartId);
    }
  };

  const handleCloseExpanded = () => {
    setExpandedChart(null);
  };

  // Screenshot functionality now handled directly in ChartCard

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
      {/* Add Textbox Modal */}
      <AddTextboxModal
        isOpen={showTextboxModal}
        onClose={handleCloseTextboxModal}
        onSubmit={handleAddTextbox}
      />

      {/* Charts and Textboxes Grid */}
      {allItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 items-start">
          {allItems.map((item, index) => (
            <div
              key={item.id}
              draggable={isEditMode}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
              className={`transition-all duration-200 relative ${
                dragState.draggedIndex === index ? 'transform rotate-2 scale-105 z-50' : ''
              } ${
                item.itemType === 'textbox' && item.width === 'full' ? 'md:col-span-2' : ''
              }`}
            >
              {item.itemType === 'chart' ? (
                <ChartCard
                  title={item.name}
                  description={item.description}
                  className="h-[520px]"
                  id={`chart-card-${item.id}`}
                  onExpandClick={() => handleExpandChart(item.id)}
                  onDeleteClick={() => handleDeleteChart(item.id)}
                  isEditMode={isEditMode}
                  dragHandleProps={{}}
                  chartData={item.chartData}
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
                  isEditMode={isEditMode}
                  onDeleteClick={() => handleDeleteTextbox(item.id)}
                  onContentChange={(content) => handleTextboxContentChange(item.id, content)}
                  onHeightChange={(height) => handleTextboxHeightChange(item.id, height)}
                  dragHandleProps={{}}
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
              <p className="text-gray-400 text-sm mb-4">
                Start creating visualizations in the Explorer or add textboxes to this dashboard
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
      
      {/* Delete Chart Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteChartModal.isOpen}
        onClose={() => setDeleteChartModal({ isOpen: false, chart: null })}
        onConfirm={confirmDeleteChart}
        title="Delete Chart"
        message={deleteChartModal.chart ? `Are you sure you want to delete "${deleteChartModal.chart.name}"?\n\nThis action cannot be undone.` : ''}
        confirmText="Delete Chart"
        cancelText="Cancel"
        isDangerous={true}
      />

      {/* Delete Textbox Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteTextboxModal.isOpen}
        onClose={() => setDeleteTextboxModal({ isOpen: false, textbox: null })}
        onConfirm={confirmDeleteTextbox}
        title="Delete Textbox"
        message="Are you sure you want to delete this textbox?This action cannot be undone."
        confirmText="Delete Textbox"
        cancelText="Cancel"
        isDangerous={true}
      />
    </div>
  );
} 