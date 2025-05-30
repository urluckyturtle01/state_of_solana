"use client";

import { useState } from 'react';
import TabsNavigation, { Tab } from '../../components/shared/TabsNavigation';
import VisualizationModal from './VisualizationModal';
import AddToDashboardModal from './AddToDashboardModal';
import ChartCard from '@/app/components/shared/ChartCard';
import DualAxisChart from '@/app/admin/components/charts/DualAxisChart';
import MultiSeriesLineBarChart from '@/app/admin/components/charts/MultiSeriesLineBarChart';
import StackedBarChart from '@/app/admin/components/charts/StackedBarChart';
import LegendItem from '@/app/components/shared/LegendItem';
import DisplayModeFilter, { DisplayMode } from '@/app/components/shared/filters/DisplayModeFilter';
import { useDashboards } from '@/app/contexts/DashboardContext';
import { getColorByIndex } from '@/app/utils/chartColors';
import { formatNumber } from '@/app/utils/formatters';
import { useChartScreenshot } from '@/app/components/shared';

// API Configuration interface
interface ApiConfig {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  columns: string[];
  chartTitle?: string;
  apiKey?: string;
  additionalOptions?: any;
}

// Column data interface
interface ColumnData {
  apiId: string;
  apiName: string;
  columnName: string;
  data: any[];
  loading: boolean;
  error?: string;
}

interface SavedVisualization {
  id: string;
  name: string;
  description?: string;
  configuration: any;
  chartConfig: any;
  chartData: any[];
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

interface ExplorerDataViewProps {
  apis: ApiConfig[];
  columnData: Record<string, ColumnData>;
  dateColumnMapping: Record<string, string>;
  onDateColumnMapping: (apiId: string, columnName: string) => void;
  generateJoinedTableData: () => {
    headers: any[];
    rows: any[];
    needsDateMapping: boolean;
    apiGroups?: Record<string, ColumnData[]>;
  };
  detectDateColumns: (api: ApiConfig, data: any[]) => string[];
}

const ExplorerDataView: React.FC<ExplorerDataViewProps> = ({
  apis,
  columnData,
  dateColumnMapping,
  onDateColumnMapping,
  generateJoinedTableData,
  detectDateColumns,
}) => {
  const [activeTab, setActiveTab] = useState('table');
  const [isVisualizationModalOpen, setIsVisualizationModalOpen] = useState(false);
  const [savedVisualizations, setSavedVisualizations] = useState<SavedVisualization[]>([]);
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
  const [selectedVisualizationForDashboard, setSelectedVisualizationForDashboard] = useState<SavedVisualization | null>(null);
  
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
  
  // Use dashboard context
  const { addChartToDashboard } = useDashboards();
  
  // Initialize screenshot functionality
  const { captureScreenshot } = useChartScreenshot();

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
      const yField = configuration.yColumns[0];
      
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
  const handleChartScreenshot = async (visualization: SavedVisualization) => {
    try {
      // Set loading state
      setScreenshottingCharts(prev => ({ ...prev, [visualization.id]: true }));
      
      // Create a chart config object for the screenshot
      const chartConfig = {
        ...visualization.chartConfig,
        id: visualization.id,
        title: visualization.name
      };
      
      // Use the screenshot capture hook
      const cardElementId = `chart-card-${visualization.id}`;
      await captureScreenshot(chartConfig, cardElementId);
      
    } catch (error) {
      console.error('Error capturing screenshot:', error);
    } finally {
      // Clear loading state
      setScreenshottingCharts(prev => ({ ...prev, [visualization.id]: false }));
    }
  };

  // Check if a chart is a stacked chart
  const isStackedChart = (configuration: any) => {
    const hasGroupBy = Boolean(configuration.groupBy && configuration.groupBy !== '');
    const hasMultipleYColumns = configuration.yColumns.length > 1;
    return hasGroupBy || (hasMultipleYColumns && configuration.chartType === 'stacked');
  };

  // Generate tabs based on saved visualizations
  const tabs: Tab[] = [
    { 
      name: 'Table',
      path: '#',
      key: 'table',
      icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586l-2 2V6H5v12h7.586l-2 2H4a1 1 0 01-1-1V4z M19 7.414l-2 2V17a1 1 0 001 1h2V7.414z'
    },
    ...savedVisualizations.map(viz => ({
      name: viz.name,
      path: '#',
      key: viz.id,
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
    })),
    { 
      name: '+ Add Visualization',
      path: '#',
      key: 'add-visualization',
      icon: 'M12 4v16m8-8H4'
    }
  ];

  const handleTabClick = (e: React.MouseEvent, tabKey: string) => {
    e.preventDefault();
    if (tabKey === 'add-visualization') {
      setIsVisualizationModalOpen(true);
    } else {
      setActiveTab(tabKey);
    }
  };

  const handleSaveVisualization = (name: string, configuration: any, chartConfig: any, chartData: any[]) => {
    const newVisualization: SavedVisualization = {
      id: `viz-${Date.now()}`,
      name,
      description: configuration.description,
      configuration,
      chartConfig,
      chartData
    };
    
    setSavedVisualizations(prev => [...prev, newVisualization]);
    setActiveTab(newVisualization.id);
    setIsVisualizationModalOpen(false);
    
    // Generate legends for the new visualization
    updateLegends(newVisualization.id, chartData, configuration);
  };

  const renderVisualizationChart = (visualization: SavedVisualization) => {
    const { configuration, chartConfig, chartData } = visualization;
    
    const hasDualAxis = configuration.series?.some((s: any) => s.yAxis === 'right');
    const hasGroupBy = Boolean(configuration.groupBy && configuration.groupBy !== '');
    const hasMultipleYColumns = configuration.yColumns.length > 1;
    
    // Get hidden series and color map for this visualization
    const chartHiddenSeries = hiddenSeries[visualization.id] || [];
    const chartColorMap = legendColorMaps[visualization.id] || {};
    
    // Get display mode for this chart (default to 'absolute')
    const displayMode = displayModes[visualization.id] || 'absolute';
    
    const commonProps = {
      chartConfig,
      data: chartData,
      height: 400,
      hiddenSeries: chartHiddenSeries,
      colorMap: chartColorMap,
      displayMode,
      isExpanded: expandedChart === visualization.id,
      onCloseExpanded: handleCloseExpanded
    };
    
    if (hasDualAxis) {
      return (
        <DualAxisChart
          {...commonProps}
        />
      );
    } else if (hasGroupBy || (hasMultipleYColumns && configuration.chartType === 'stacked')) {
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

  // Get selected column data
  const getSelectedColumnData = () => {
    return Object.values(columnData).filter(col => !col.loading && !col.error);
  };

  const { headers, rows, needsDateMapping, apiGroups } = generateJoinedTableData();
  const selectedData = getSelectedColumnData();
  const loadingColumns = Object.values(columnData).filter(col => col.loading);
  const errorColumns = Object.values(columnData).filter(col => col.error);

  const handleChartOptionClick = (chartType: string) => {
    if (chartType === 'bar') {
      setIsVisualizationModalOpen(true);
    }
  };

  if (selectedData.length === 0 && loadingColumns.length === 0 && errorColumns.length === 0) {
    return (
      <div className="flex-1 bg-gray-950/50 flex flex-col">
        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-gray-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-200 mb-2">Select columns to explore</h3>
            <p className="text-gray-400 text-sm">
              Choose columns from the APIs on the left to start exploring data and building visualizations
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-950/50 flex flex-col">
      {/* Tabs Navigation */}
      <div className="p-4 border-b border-gray-800/50">
        <TabsNavigation
          tabs={tabs}
          activeTab={activeTab}
          showDivider={false}
          onTabClick={handleTabClick}
        />
      </div>

      {activeTab === 'table' && (
        <>
          {/* Table Header */}
          <div className="p-4 border-b border-gray-800/50">
            <h3 className="text-sm font-medium text-gray-200 mb-2">Column Data</h3>
            <div className="flex flex-wrap gap-2">
              {Object.values(columnData).map((col) => (
                <div key={`${col.apiId}-${col.columnName}`} className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    col.loading ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    col.error && col.error.includes('No cached data available') ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                    col.error ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {col.columnName}
                  </span>
                  <span className="text-xs text-gray-500">({col.apiName})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Date Column Mapping UI for Multiple APIs */}
          {needsDateMapping && apiGroups && (
            <div className="p-4 border-b border-gray-800/50 bg-blue-900/20">
              <h4 className="text-sm font-medium text-blue-300 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Date Alignment Required
              </h4>
              <p className="text-xs text-blue-200 mb-3">
                To align data from multiple APIs, please specify which date column to use for each API that doesn't have a selected date column:
              </p>
              <div className="space-y-3">
                {Object.entries(apiGroups).map(([apiId, cols]) => {
                  const api = apis.find(a => a.id === apiId);
                  if (!api) return null;
                  
                  // Check if this API has a selected date column
                  const hasSelectedDateCol = cols.some(col => {
                    const potentialDateColumns = detectDateColumns(api, col.data);
                    return potentialDateColumns.includes(col.columnName);
                  });
                  
                  // Only show mapping for APIs that don't have a selected date column
                  if (hasSelectedDateCol) {
                    return (
                      <div key={apiId} className="flex items-center space-x-3 text-xs text-green-400">
                        <div className="min-w-[120px]">{api.name}:</div>
                        <div>✓ Using selected date column</div>
                      </div>
                    );
                  }
                  
                  const potentialDateColumns = detectDateColumns(api, cols[0]?.data || []);
                  const availableColumns = [...new Set([...potentialDateColumns, ...api.columns])];
                  
                  return (
                    <div key={apiId} className="flex items-center space-x-3">
                      <div className="text-xs text-gray-300 min-w-[120px]">
                        {api.name}:
                      </div>
                      <select
                        className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        value={dateColumnMapping[apiId] || ''}
                        onChange={(e) => onDateColumnMapping(apiId, e.target.value)}
                      >
                        <option value="">Select date column for alignment...</option>
                        {availableColumns.map(column => (
                          <option key={column} value={column}>
                            {column} {potentialDateColumns.includes(column) ? '📅' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loading States */}
          {loadingColumns.length > 0 && (
            <div className="p-4 border-b border-gray-800/50">
              <div className="flex items-center space-x-2 text-sm text-blue-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                <span>Loading {loadingColumns.length} column(s)...</span>
              </div>
            </div>
          )}

          {/* Error and Warning States */}
          {errorColumns.length > 0 && (
            <div className="p-4 border-b border-gray-800/50">
              {errorColumns.map((col) => {
                const isNoData = col.error?.includes('No cached data available');
                return (
                  <div key={`${col.apiId}-${col.columnName}`} className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      isNoData ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                      'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {col.columnName}
                    </span>
                    <span className="text-xs text-gray-500">({col.apiName})</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Data Table */}
          {selectedData.length > 0 && !needsDateMapping && (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-900/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 text-gray-300 font-medium">#</th>
                    {headers.map((header, index) => (
                      <th key={index} className={`text-left p-3 font-medium ${
                        header.isDateColumn ? 'text-blue-300 bg-blue-900/20' : 'text-gray-300'
                      }`}>
                        <div className="flex items-center space-x-1">
                          <span>{header.name}</span>
                          {header.isDateColumn && <span>📅</span>}
                        </div>
                        <div className="text-xs text-gray-500 font-normal">({header.apiName})</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} className="border-b border-gray-800/30 hover:bg-gray-800/20">
                      <td className="p-3 text-gray-500">{index + 1}</td>
                      {headers.map((header, colIndex) => (
                        <td key={colIndex} className={`p-3 ${
                          header.isDateColumn ? 'text-blue-300 bg-blue-900/10' : 'text-gray-300'
                        }`}>
                          {row[header.key] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 100 && (
                <div className="p-4 text-center text-xs text-gray-500">
                  Showing first 100 rows
                </div>
              )}
              {headers.some(h => h.isDateColumn) && (
                <div className="p-4 text-center text-xs text-blue-400">
                  💡 Data joined by matching dates across APIs
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Visualization tabs content */}
      {savedVisualizations.map(visualization => (
        activeTab === visualization.id && (
          <div key={visualization.id} className="flex-1 flex flex-col">
            <div className="flex-1 p-4 pb-0">
              <ChartCard
                title={visualization.name}
                description={visualization.description || `${visualization.configuration.chartType === 'dual' ? 'Dual Axis' : visualization.configuration.chartType === 'stacked' ? 'Stacked ' : ''}Chart`}
                className="h-[500px]"
                onExpandClick={() => handleExpandChart(visualization.id)}
                onScreenshotClick={() => handleChartScreenshot(visualization)}
                isScreenshotting={screenshottingCharts[visualization.id]}
                filterBar={
                  isStackedChart(visualization.configuration) ? (
                    <div className="flex flex-wrap gap-3 items-center">
                      <DisplayModeFilter
                        mode={displayModes[visualization.id] || 'absolute'}
                        onChange={(mode) => handleDisplayModeChange(visualization.id, mode)}
                      />
                    </div>
                  ) : undefined
                }
                legend={
                  <>
                    {legends[visualization.id] && legends[visualization.id].length > 0 ? (
                      legends[visualization.id].map(legend => (
                        <LegendItem 
                          key={legend.id || legend.label}
                          label={truncateLabel(legend.label)} 
                          color={legend.color} 
                          shape={legend.shape || 'square'}
                          tooltipText={legend.value ? formatCurrency(legend.value) : undefined}
                          onClick={() => handleLegendClick(visualization.id, legend.id || legend.label)}
                          inactive={(hiddenSeries[visualization.id] || []).includes(legend.id || legend.label)}
                        />
                      ))
                    ) : null}
                  </>
                }
              >
                {renderVisualizationChart(visualization)}
              </ChartCard>
            </div>
            
            {/* Add to Dashboard button */}
            <div className="px-4 pb-4 pt-2 flex-shrink-0">
              <button
                onClick={() => {
                  setSelectedVisualizationForDashboard(visualization);
                  setIsDashboardModalOpen(true);
                }}
                className="w-full py-2.5 text-sm text-gray-300 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add to Dashboard
              </button>
            </div>
          </div>
        )
      ))}

      {activeTab === 'add-visualization' && (
        <div className="flex-1 p-4">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-200 mb-4">Create Visualization</h3>
              <p className="text-gray-400 text-sm mb-6">
                Choose a chart type to visualize your selected data
              </p>
            </div>

            {/* Chart Type Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Bar Chart */}
              <div 
                onClick={() => setIsVisualizationModalOpen(true)}
                className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4 hover:border-blue-500/50 hover:bg-gray-800/50 cursor-pointer transition-all duration-200 group"
              >
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <h4 className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">Bar Chart</h4>
                    <p className="text-xs text-gray-500 mt-1">Compare values across categories</p>
                  </div>
                </div>
              </div>

              {/* Coming Soon Charts */}
              {[
                { name: 'Line Chart', description: 'Show trends over time' },
                { name: 'Pie Chart', description: 'Display proportions' },
                { name: 'Area Chart', description: 'Visualize cumulative data' }
              ].map((chart) => (
                <div 
                  key={chart.name}
                  className="bg-gray-900/30 border border-gray-700/30 rounded-lg p-4 opacity-50 cursor-not-allowed"
                >
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-12 h-12 bg-gray-700/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <h4 className="text-sm font-medium text-gray-400">{chart.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">{chart.description}</p>
                      <p className="text-xs text-gray-600 mt-1">Coming Soon</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Visualization Modal */}
      <VisualizationModal
        isOpen={isVisualizationModalOpen}
        onClose={() => setIsVisualizationModalOpen(false)}
        columnData={columnData}
        apis={apis}
        joinedTableData={{ headers, rows }}
        onSaveVisualization={handleSaveVisualization}
      />

      {/* Add to Dashboard Modal */}
      <AddToDashboardModal
        isOpen={isDashboardModalOpen}
        onClose={() => {
          setIsDashboardModalOpen(false);
          setSelectedVisualizationForDashboard(null);
        }}
        onAddToDashboard={(dashboardId) => {
          if (selectedVisualizationForDashboard) {
            // Convert SavedVisualization to SavedChart format for dashboard
            const chartForDashboard = {
              id: selectedVisualizationForDashboard.id,
              name: selectedVisualizationForDashboard.name,
              type: selectedVisualizationForDashboard.configuration.chartType as 'bar' | 'stacked' | 'dual' | 'line',
              description: selectedVisualizationForDashboard.description || `Chart created from Explorer visualization`,
              createdAt: new Date(),
              configuration: selectedVisualizationForDashboard.configuration,
              chartConfig: selectedVisualizationForDashboard.chartConfig,
              chartData: selectedVisualizationForDashboard.chartData
            };
            
            addChartToDashboard(dashboardId, chartForDashboard);
            console.log(`Successfully added "${selectedVisualizationForDashboard.name}" to dashboard ${dashboardId}`);
          }
          setIsDashboardModalOpen(false);
          setSelectedVisualizationForDashboard(null);
        }}
        chartName={selectedVisualizationForDashboard?.name || ''}
      />
    </div>
  );
};

export default ExplorerDataView;