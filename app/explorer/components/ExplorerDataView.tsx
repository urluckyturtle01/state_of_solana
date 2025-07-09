"use client";

import { useState, useEffect } from 'react';
import TabsNavigation, { Tab } from '../../components/shared/TabsNavigation';
import VisualizationModal from './VisualizationModal';
import PrettyLoader from '@/app/components/shared/PrettyLoader';
import AddToDashboardModal from './AddToDashboardModal';
import ChartCard from '@/app/components/shared/ChartCard';
import DualAxisChart from '@/app/admin/components/charts/DualAxisChart';
import MultiSeriesLineBarChart from '@/app/admin/components/charts/MultiSeriesLineBarChart';
import StackedBarChart from '@/app/admin/components/charts/StackedBarChart';
import LegendItem from '@/app/components/shared/LegendItem';
import DisplayModeFilter, { DisplayMode } from '@/app/components/shared/filters/DisplayModeFilter';
import DataTable, { Column } from '@/app/components/shared/DataTable';
import { useUserData } from '@/app/contexts/UserDataContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { useDashboards } from '@/app/contexts/DashboardContext';
import { getColorByIndex } from '@/app/utils/chartColors';
import { formatNumber } from '@/app/utils/formatters';

import { PencilIcon } from '@heroicons/react/24/outline';

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
  createdAt: Date;
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
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
  const [selectedVisualizationForDashboard, setSelectedVisualizationForDashboard] = useState<SavedVisualization | null>(null);
  const [editingVisualization, setEditingVisualization] = useState<SavedVisualization | null>(null);
  
  // Use UserDataContext for user-specific data
  const { explorerData, addVisualization, updateVisualization, deleteVisualization, isLoading } = useUserData();
  const { isAuthenticated } = useAuth();
  const { addChartToDashboard } = useDashboards();
  const savedVisualizations = explorerData.savedVisualizations;

  // Debug logging for dashboard context
  useEffect(() => {
    console.log('🔍 Explorer: Dashboard context check');
    console.log('🔐 Is authenticated:', isAuthenticated);
    console.log('📊 addChartToDashboard function available:', !!addChartToDashboard);
  }, [isAuthenticated, addChartToDashboard]);

  // Legend-related state
  const [legends, setLegends] = useState<Record<string, Legend[]>>({});
  const [legendColorMaps, setLegendColorMaps] = useState<Record<string, Record<string, string>>>({});
  const [displayMode, setDisplayMode] = useState<DisplayMode>('absolute');
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);

  // Get table data
  const { headers, rows, needsDateMapping, apiGroups } = generateJoinedTableData();
  const selectedData = Object.values(columnData).filter(col => !col.loading && !col.error);
  const loadingColumns = Object.values(columnData).filter(col => col.loading);
  const errorColumns = Object.values(columnData).filter(col => col.error);

  // Screenshot functionality now handled directly in ChartCard

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
      
      // Check if the yField exists in the data, if not, try to find the actual field name
      let actualYField = yField;
      if (data[0] && !(yField in data[0])) {
        // Try to find a field that might be the cleaned version of yField
        const dataFields = Object.keys(data[0]);
        actualYField = dataFields.find(field => 
          field === yField || 
          field.includes(yField) || 
          yField.includes(field)
        ) || yField;
      }
      
      uniqueGroups.forEach(group => {
        if (group !== null && group !== undefined) {
          const groupStr = String(group);
          newLabels.push(groupStr);
          
          groupTotals[groupStr] = data
            .filter(item => item[groupField] === group)
            .reduce((sum, item) => sum + (Number(item[actualYField]) || 0), 0);
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
    else if (hasGroupBy && data[0]) {
      // GroupBy field not found with original name, try to find it in the data
      const dataFields = Object.keys(data[0]);
      let actualGroupField = groupField;
      
      // Try to find the actual group field in the data
      const possibleGroupField = dataFields.find(field => {
        // Check if this field contains the group values (not numeric values)
        const values = data.map(item => item[field]);
        const uniqueValues = new Set(values);
        return uniqueValues.size > 1 && uniqueValues.size < data.length * 0.5 && 
               !values.every(v => typeof v === 'number' || !isNaN(parseFloat(v)));
      });
      
      if (possibleGroupField) {
        actualGroupField = possibleGroupField;
        
        // Re-run the logic with the found field
        const uniqueGroups = Array.from(new Set(data.map(item => item[actualGroupField])));
        
        const groupTotals: Record<string, number> = {};
        const yField = configuration.yColumns[0];
        
        // Find the actual Y field
        let actualYField = dataFields.find(field => 
          field !== actualGroupField && 
          (typeof data[0][field] === 'number' || !isNaN(parseFloat(data[0][field])))
        ) || yField;
        
        uniqueGroups.forEach(group => {
          if (group !== null && group !== undefined) {
            const groupStr = String(group);
            newLabels.push(groupStr);
            
            groupTotals[groupStr] = data
              .filter(item => item[actualGroupField] === group)
              .reduce((sum, item) => sum + (Number(item[actualYField]) || 0), 0);
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
      } else {
        // Fallback to showing Y columns if we can't find group field
        configuration.yColumns.forEach((column: string, index: number) => {
          // Use display name logic from the multiple Y columns section
          let displayName: string;
          if (column.includes('_')) {
            const parts = column.split('_');
            if (parts.length >= 3) {
              displayName = parts.slice(-2).join('_');
            } else {
              displayName = parts[parts.length - 1];
            }
          } else {
            displayName = column;
          }
          
          const fieldId = column;
          newLabels.push(fieldId);
          
          if (isNewColorMap && !colorMap[fieldId]) {
            colorMap[fieldId] = getColorByIndex(index);
          }
          
          const total = data.reduce((sum, item) => sum + (Number(item[column]) || 0), 0);
          
          chartLegends.push({
            id: fieldId,
            label: displayName.replace(/_/g, ' ').split(' ').map((word: string) => 
              word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            color: colorMap[fieldId] || getColorByIndex(index),
            value: total,
            shape: 'square' as const
          });
        });
      }
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
        // For multiple Y columns, use a more intelligent field name extraction for display
        // but keep the original column name for data access
        let displayName: string;
        if (column.includes('_')) {
          // Take the last 2-3 parts to preserve meaning (e.g., "25th_percentile", "75th_percentile")
          const parts = column.split('_');
          if (parts.length >= 3) {
            displayName = parts.slice(-2).join('_'); // e.g., "25th_percentile"
          } else {
            displayName = parts[parts.length - 1]; // fallback to last part
          }
        } else {
          displayName = column;
        }
        
        // Use the original column name as the ID for data consistency
        const fieldId = column;
        
        newLabels.push(fieldId);
        
        if (isNewColorMap && !colorMap[fieldId]) {
          colorMap[fieldId] = getColorByIndex(index);
        }
        
        // Use the original column name to calculate total from actual data
        const total = data.reduce((sum, item) => sum + (Number(item[column]) || 0), 0);
        
        chartLegends.push({
          id: fieldId,
          label: displayName.replace(/_/g, ' ').split(' ').map((word: string) => 
            word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          color: colorMap[fieldId] || getColorByIndex(index),
          value: total,
          shape: 'square' as const
        });
      });
    }
    else {
      // Single series - create one legend entry
      const yField = configuration.yColumns[0];
      
      // For single series charts, use intelligent field name extraction for display
      // but keep the original column name for data access
      let displayName: string;
      if (isStacked) {
        displayName = yField; // Keep original for stacked charts
      } else {
        // Use intelligent extraction for non-stacked charts
        if (yField.includes('_')) {
          const parts = yField.split('_');
          if (parts.length >= 3) {
            displayName = parts.slice(-2).join('_'); // e.g., "25th_percentile"
          } else {
            displayName = parts[parts.length - 1]; // fallback to last part
          }
        } else {
          displayName = yField;
        }
      }
      
      // Use the original column name to calculate total from actual data
      const total = data.reduce((sum, item) => sum + (Number(item[yField]) || 0), 0);
      const label = displayName.replace(/_/g, ' ').split(' ').map((word: string) => 
        word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      
      // Use the original column name as the ID for data consistency
      const fieldId = yField;
      
      newLabels.push(fieldId);
      
      if (isNewColorMap && !colorMap[fieldId]) {
        colorMap[fieldId] = getColorByIndex(0);
      }
      
      chartLegends = [{
        id: fieldId,
        label,
        color: colorMap[fieldId] || getColorByIndex(0),
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
      const chartHidden = prev.includes(label) ? prev.filter(id => id !== label) : [...prev, label];
      return chartHidden;
    });
  };

  // Screenshot functionality now handled directly in ChartCard

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
      icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586l-2 2V6H5v12h7.586l-2 2H4a1 1 0 01-1-1V4z M19 7.414l-2 2V17a1 1 0 001 1h2V7.414z',
      closeable: false // Table tab is not closeable
    },
    ...savedVisualizations.map(viz => ({
      name: viz.name,
      path: '#',
      key: viz.id,
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      closeable: true // Visualization tabs are closeable
    })),
    { 
      name: '+ Add Visualization',
      path: '#',
      key: 'add-visualization',
      icon: 'M12 4v16m8-8H4',
      closeable: false // Add button is not closeable
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
    if (editingVisualization) {
      // Update existing visualization
      const updatedVisualization: SavedVisualization = {
        ...editingVisualization,
        name,
        description: configuration.description,
        configuration,
        chartConfig,
        chartData
      };
      
      updateVisualization(editingVisualization.id, updatedVisualization);
      setActiveTab(updatedVisualization.id);
      
      // Generate legends for the updated visualization
      updateLegends(updatedVisualization.id, chartData, configuration);
    } else {
      // Create new visualization
      const newVisualization: SavedVisualization = {
        id: `viz-${Date.now()}`,
        name,
        description: configuration.description,
        configuration,
        chartConfig,
        chartData,
        createdAt: new Date()
      };
      
      addVisualization(newVisualization);
      setActiveTab(newVisualization.id);
      
      // Generate legends for the new visualization
      updateLegends(newVisualization.id, chartData, configuration);
    }
    
    setIsVisualizationModalOpen(false);
    setEditingVisualization(null);
  };

  const handleDeleteVisualization = (visualizationId: string) => {
    if (window.confirm('Are you sure you want to delete this visualization?')) {
      // Use the context delete function which will trigger auto-save
      deleteVisualization(visualizationId);
      
      // If the deleted tab was active, switch to Table tab
      if (activeTab === visualizationId) {
        setActiveTab('table');
      }
      
      // Clean up related state
      setLegends(prev => {
        const updated = { ...prev };
        delete updated[visualizationId];
        return updated;
      });
      
      setLegendColorMaps(prev => {
        const updated = { ...prev };
        delete updated[visualizationId];
        return updated;
      });
    }
  };

  const renderVisualizationChart = (visualization: SavedVisualization) => {
    const { configuration, chartConfig, chartData } = visualization;
    
    const hasDualAxis = configuration.series?.some((s: any) => s.yAxis === 'right');
    const hasGroupBy = Boolean(configuration.groupBy && configuration.groupBy !== '');
    const hasMultipleYColumns = configuration.yColumns.length > 1;
    
    // Get hidden series and color map for this visualization
    const chartHiddenSeries = hiddenSeries.filter(id => !id.startsWith('series-'));
    const chartColorMap = legendColorMaps[visualization.id] || {};
    
    const commonProps = {
      chartConfig,
      data: chartData,
      height: 400,
      hiddenSeries: chartHiddenSeries,
      colorMap: chartColorMap,
      displayMode,
      isExpanded: false,
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
          onTabClose={handleDeleteVisualization}
        />
      </div>

      {activeTab === 'table' && (
        <>
          

          {/* Date Column Mapping UI for Multiple APIs */}
          {needsDateMapping && apiGroups && (
            <div className="p-4 border-b border-gray-800/50 bg-gray-900/10">
              <h4 className="text-sm font-regular text-blue-400/60 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Date Alignment Required
              </h4>
              <p className="text-xs text-gray-600 mb-3">
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
                      <div key={apiId} className="flex items-center space-x-3 text-xs text-green-700">
                        <div className="min-w-[120px]">{api.name}:</div>
                        <div>✓ Using selected date column</div>
                      </div>
                    );
                  }
                  
                  const potentialDateColumns = detectDateColumns(api, cols[0]?.data || []);
                  const availableColumns = [...new Set([...potentialDateColumns, ...api.columns])];
                  
                  return (
                    <div key={apiId} className="flex items-center space-x-3">
                      <div className="text-xs text-gray-600 min-w-[120px]">
                        {api.name}:
                      </div>
                      <select
                        className="text-xs bg-gray-900/40 border-[0.5px] border-gray-800/60 rounded px-1 py-1 text-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
              <div className="flex items-center space-x-2 text-sm text-blue-400/60">
                <PrettyLoader size="sm" />
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
            <div className="flex-1 flex flex-col">
              {/* Table */}
              <div className="flex-1 overflow-auto">
                <DataTable
                  columns={[
                    {
                      key: 'index',
                      header: '#',
                      render: (row: any) => <span className="text-gray-700">{row.index}</span>,
                      width: '60px',
                      sortable: false
                    },
                    ...headers.map((header): Column<any> => ({
                      key: header.key,
                      header: header.name,
                      render: (row: any) => (
                        <div className={`${
                          header.isDateColumn ? 'text-blue-300' : 'text-gray-400'
                        }`}>
                          {row[header.key] || '-'}
                        </div>
                      ),
                      sortable: true
                    }))
                  ]}
                  data={rows}
                  keyExtractor={(row: any) => `row-${row.index}`}
                  pagination={{
                    enabled: true,
                    rowsPerPage: 13
                  }}
                  variant="striped"
                  containerClassName="h-full"
                  className="h-full"
                  noDataMessage="No data available. Select columns from the left panel to explore data."
                />
              </div>

              {/* Footer Info */}
              <div className="px-4 py-3 border-t border-gray-800/50 bg-gray-950/30 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Total: {rows.length} rows
                </div>
                {headers.some(h => h.isDateColumn) && (
                  <div className="text-xs text-blue-400/70">
                    Data joined by matching dates across APIs
                  </div>
                )}
              </div>
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
                onExpandClick={() => {}}

                filterBar={
                  isStackedChart(visualization.configuration) ? (
                    <div className="flex flex-wrap gap-3 items-center">
                      <DisplayModeFilter
                        mode={displayMode}
                        onChange={(mode) => setDisplayMode(mode)}
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
                          inactive={hiddenSeries.includes(legend.id || legend.label)}
                        />
                      ))
                    ) : null}
                  </>
                }
              >
                {renderVisualizationChart(visualization)}
              </ChartCard>
            </div>
            
            {/* Action buttons */}
            <div className="px-4 pb-4 pt-2 flex-shrink-0 flex gap-2">
              <button
                onClick={() => {
                  setEditingVisualization(visualization);
                  setIsVisualizationModalOpen(true);
                }}
                className="flex-1 py-2 text-sm text-gray-500 bg-gray-900/20 hover:bg-gray-900/40 border border-gray-800/80 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <PencilIcon className="w-4 h-4" />
                Edit Chart
              </button>
              <button
                onClick={() => {
                  console.log('🖱️ Add to Dashboard button clicked');
                  console.log('📊 Current visualization:', visualization);
                  setSelectedVisualizationForDashboard(visualization);
                  setIsDashboardModalOpen(true);
                  console.log('🔄 Modal should open now');
                }}
                className="flex-1 py-2 text-sm text-gray-500 bg-gray-900/20 hover:bg-gray-900/40 border border-gray-800/80 rounded-lg transition-colors flex items-center justify-center gap-2"
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
        onClose={() => {
          setIsVisualizationModalOpen(false);
          setEditingVisualization(null);
        }}
        columnData={columnData}
        apis={apis}
        joinedTableData={{ headers, rows }}
        onSaveVisualization={handleSaveVisualization}
        editingVisualization={editingVisualization}
      />

      {/* Add to Dashboard Modal */}
      <AddToDashboardModal
        isOpen={isDashboardModalOpen}
        onClose={() => {
          setIsDashboardModalOpen(false);
          setSelectedVisualizationForDashboard(null);
        }}
        onAddToDashboard={(dashboardId) => {
          console.log('🎯 Explorer: Adding chart to dashboard:', dashboardId);
          console.log('📊 Selected visualization:', selectedVisualizationForDashboard);
          
          if (selectedVisualizationForDashboard) {
            // Create deep copies to ensure complete independence from Explorer visualization
            const chartForDashboard = {
              id: `chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID for dashboard
              name: selectedVisualizationForDashboard.name,
              type: selectedVisualizationForDashboard.configuration.chartType as 'bar' | 'stacked' | 'dual' | 'line',
              description: selectedVisualizationForDashboard.description || `Chart created from Explorer visualization`,
              createdAt: new Date(),
              // Deep copy all data structures to prevent shared references
              configuration: JSON.parse(JSON.stringify(selectedVisualizationForDashboard.configuration)),
              chartConfig: JSON.parse(JSON.stringify(selectedVisualizationForDashboard.chartConfig)),
              chartData: JSON.parse(JSON.stringify(selectedVisualizationForDashboard.chartData))
            };
            
            console.log('🔄 Chart being added with deep copies:', chartForDashboard);
            
            // Add the chart to the dashboard
            addChartToDashboard(dashboardId, chartForDashboard);
            
            console.log('✅ addChartToDashboard called');
          } else {
            console.log('❌ No selected visualization found');
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