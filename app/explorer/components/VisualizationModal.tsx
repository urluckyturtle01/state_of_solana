"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/app/components/shared/Modal';
import ChartCard from '@/app/components/shared/ChartCard';
import DualAxisChart from '@/app/admin/components/charts/DualAxisChart';
import MultiSeriesLineBarChart from '@/app/admin/components/charts/MultiSeriesLineBarChart';
import StackedBarChart from '@/app/admin/components/charts/StackedBarChart';
import LegendItem from '@/app/components/shared/LegendItem';
import { ChartConfig, ChartType, YAxisConfig } from '@/app/admin/types';
import { getColorByIndex } from '@/app/utils/chartColors';
import { formatNumber } from '@/app/utils/formatters';
import DisplayModeFilter, { DisplayMode } from '@/app/components/shared/filters/DisplayModeFilter';
import { useChartScreenshot } from '@/app/components/shared';

interface VisualizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  columnData: Record<string, any>;
  apis: any[];
  joinedTableData: {
    headers: any[];
    rows: any[];
  };
  onSaveVisualization: (name: string, configuration: ChartConfiguration, chartConfig: ChartConfig, chartData: any[]) => void;
}

interface SeriesConfig {
  id: string;
  label: string;
  yAxis: 'left' | 'right';
  type: 'bar' | 'line';
  order: number;
}

interface ChartConfiguration {
  name: string;
  description: string;
  type: ChartType;
  chartType: 'simple' | 'stacked' | 'dual';
  isHorizontal: boolean;
  xColumn: string;
  yColumns: string[];
  groupBy: string;
  series: SeriesConfig[];
  colors: Record<string, string>;
}

interface Legend {
  id?: string;
  label: string;
  color: string;
  value?: number;
  shape?: 'circle' | 'square';
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

const VisualizationModal: React.FC<VisualizationModalProps> = ({
  isOpen,
  onClose,
  columnData,
  apis,
  joinedTableData,
  onSaveVisualization
}) => {
  const [activeTab, setActiveTab] = useState('General');
  const [configuration, setConfiguration] = useState<ChartConfiguration>({
    name: 'Chart',
    description: '',
    type: 'bar',
    chartType: 'simple',
    isHorizontal: false,
    xColumn: '',
    yColumns: [],
    groupBy: '',
    series: [],
    colors: {}
  });

  // Legend-related state
  const [legends, setLegends] = useState<Legend[]>([]);
  const [legendColorMap, setLegendColorMap] = useState<Record<string, string>>({});
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);

  // Display mode state for stacked charts
  const [displayMode, setDisplayMode] = useState<DisplayMode>('absolute');

  // Expand state for chart
  const [isChartExpanded, setIsChartExpanded] = useState(false);

  // Screenshot state for chart
  const [isScreenshotting, setIsScreenshotting] = useState(false);

  // Initialize screenshot functionality
  const { captureScreenshot } = useChartScreenshot();

  // Get available columns from joined data
  const availableColumns = useMemo(() => {
    return joinedTableData.headers.map(header => ({
      key: header.key,
      name: header.name,
      apiName: header.apiName,
      isDateColumn: header.isDateColumn
    }));
  }, [joinedTableData.headers]);

  // Auto-select first date column as X axis
  useEffect(() => {
    if (availableColumns.length > 0 && !configuration.xColumn) {
      const dateColumn = availableColumns.find(col => col.isDateColumn);
      const firstColumn = dateColumn || availableColumns[0];
      
      setConfiguration(prev => ({
        ...prev,
        xColumn: firstColumn.key
      }));
    }
  }, [availableColumns, configuration.xColumn]);

  // Auto-switch to stacked when groupBy is selected
  useEffect(() => {
    if (configuration.groupBy && configuration.groupBy !== '') {
      // When groupBy is selected, automatically switch to stacked if not already set
      if (configuration.chartType === 'simple') {
        setConfiguration(prev => ({
          ...prev,
          chartType: 'stacked'
        }));
      }
    } else {
      // When groupBy is cleared, switch back to simple if currently stacked (unless we have multiple Y columns)
      if (configuration.chartType === 'stacked' && configuration.yColumns.length <= 1) {
        setConfiguration(prev => ({
          ...prev,
          chartType: 'simple'
        }));
      }
    }
  }, [configuration.groupBy, configuration.chartType, configuration.yColumns.length]);

  // Update series when yColumns change
  useEffect(() => {
    if (configuration.yColumns.length > 0) {
      const newSeries = configuration.yColumns.map((col, index) => {
        const existingSeries = configuration.series.find(s => s.id === col);
        return existingSeries || {
          id: col,
          label: availableColumns.find(c => c.key === col)?.name || col,
          yAxis: index === 0 ? 'left' as const : 'right' as const,
          type: 'bar' as const,
          order: index + 1
        };
      });
      
      setConfiguration(prev => ({
        ...prev,
        series: newSeries
      }));
    }
  }, [configuration.yColumns, availableColumns]);

  // Generate chart data from joined table data
  const chartData = useMemo(() => {
    if (!configuration.xColumn || joinedTableData.rows.length === 0) {
      return [];
    }

    // Determine if we're using a stacked chart
    const hasGroupBy = Boolean(configuration.groupBy && configuration.groupBy !== '');
    const isStackedChart = hasGroupBy || (configuration.yColumns.length > 1 && configuration.chartType === 'stacked');

    if (isStackedChart) {
      // For StackedBarChart, use original column names
      return joinedTableData.rows.map(row => {
        const dataPoint: any = {};
        
        // Add x-axis value with original column name
        dataPoint[configuration.xColumn] = row[configuration.xColumn];
        
        // Add y-axis values with original column names
        configuration.yColumns.forEach(yCol => {
          dataPoint[yCol] = parseFloat(row[yCol]) || 0;
        });
        
        // Add group by value with original column name if specified
        if (configuration.groupBy) {
          dataPoint[configuration.groupBy] = row[configuration.groupBy];
        }
        
        return dataPoint;
      });
    } else {
      // For other charts (MultiSeriesLineBarChart, DualAxisChart), use cleaned field names
      const xColumnName = configuration.xColumn.split('_').pop() || configuration.xColumn;
      
      return joinedTableData.rows.map(row => {
        const dataPoint: any = {};
        
        // Add x-axis value with cleaned name
        dataPoint[xColumnName] = row[configuration.xColumn];
        
        // Add y-axis values with cleaned names
        configuration.yColumns.forEach(yCol => {
          // Use the same intelligent field name extraction as in updateLegends
          let fieldName: string;
          if (yCol.includes('_')) {
            const parts = yCol.split('_');
            if (parts.length >= 3) {
              fieldName = parts.slice(-2).join('_'); // e.g., "25th_percentile"
            } else {
              fieldName = parts[parts.length - 1]; // fallback to last part
            }
          } else {
            fieldName = yCol;
          }
          dataPoint[fieldName] = parseFloat(row[yCol]) || 0;
        });
        
        return dataPoint;
      });
    }
  }, [configuration, joinedTableData.rows]);

  // Update legends when chart data or configuration changes
  useEffect(() => {
    if (chartData.length > 0 && configuration.yColumns.length > 0) {
      updateLegends(chartData, configuration);
    }
  }, [chartData, configuration.yColumns, configuration.groupBy, configuration.chartType, configuration.series]);

  // Create chart config for the chart components
  const chartConfig: ChartConfig = useMemo(() => {
    // Determine chart characteristics
    const hasDualAxis = configuration.series.some(s => s.yAxis === 'right');
    const hasGroupBy = Boolean(configuration.groupBy && configuration.groupBy !== '');
    const hasMultipleSeries = configuration.series.length > 1;
    
    // Determine the appropriate chart type
    let finalChartType: ChartType;
    if (hasDualAxis) {
      finalChartType = 'dual-axis';
    } else if (hasGroupBy || (hasMultipleSeries && configuration.chartType === 'stacked')) {
      finalChartType = 'stacked-bar';
    } else {
      finalChartType = 'bar';
    }

    // For stacked charts, use full column names; for others, use cleaned names
    const isStackedChart = finalChartType === 'stacked-bar';
    const xAxisValue = isStackedChart 
      ? configuration.xColumn 
      : configuration.xColumn.split('_').pop() || configuration.xColumn;

    // For StackedBarChart, it expects strings in yAxis field, not YAxisConfig objects
    let yAxisValue: string | string[] | YAxisConfig | YAxisConfig[];
    if (isStackedChart) {
      // For stacked charts, use full column names as plain strings
      yAxisValue = configuration.yColumns.length === 1 ? configuration.yColumns[0] : configuration.yColumns;
    } else {
      // For other charts that need YAxisConfig with cleaned field names
      const yAxisConfigs: YAxisConfig[] = configuration.series.map(series => {
        // Use the same intelligent field name extraction
        let fieldName: string;
        if (series.id.includes('_')) {
          const parts = series.id.split('_');
          if (parts.length >= 3) {
            fieldName = parts.slice(-2).join('_'); // e.g., "25th_percentile"
          } else {
            fieldName = parts[parts.length - 1]; // fallback to last part
          }
        } else {
          fieldName = series.id;
        }
        
        return {
          field: fieldName,
          type: series.type,
          unit: undefined
        };
      });
      yAxisValue = yAxisConfigs.length === 1 ? yAxisConfigs[0] : yAxisConfigs;
    }

    return {
      id: 'preview-chart',
      title: configuration.name,
      page: 'dashboard',
      chartType: finalChartType,
      apiEndpoint: '/api/preview',
      isStacked: isStackedChart,
      dataMapping: {
        xAxis: xAxisValue,
        yAxis: yAxisValue,
        groupBy: hasGroupBy ? configuration.groupBy : undefined // Only used by stacked charts
      },
      useDistinctColors: hasMultipleSeries || hasGroupBy,
      dualAxisConfig: hasDualAxis ? {
        leftAxisFields: configuration.series.filter(s => s.yAxis === 'left').map(s => {
          // Use the same intelligent field name extraction
          if (s.id.includes('_')) {
            const parts = s.id.split('_');
            if (parts.length >= 3) {
              return parts.slice(-2).join('_'); // e.g., "25th_percentile"
            } else {
              return parts[parts.length - 1]; // fallback to last part
            }
          } else {
            return s.id;
          }
        }),
        rightAxisFields: configuration.series.filter(s => s.yAxis === 'right').map(s => {
          // Use the same intelligent field name extraction
          if (s.id.includes('_')) {
            const parts = s.id.split('_');
            if (parts.length >= 3) {
              return parts.slice(-2).join('_'); // e.g., "25th_percentile"
            } else {
              return parts[parts.length - 1]; // fallback to last part
            }
          } else {
            return s.id;
          }
        }),
        leftAxisType: configuration.series.find(s => s.yAxis === 'left')?.type || 'bar',
        rightAxisType: configuration.series.find(s => s.yAxis === 'right')?.type || 'line'
      } : undefined,
      additionalOptions: {}
    };
  }, [configuration]);

  const tabs = ['General', 'X Axis', 'Y Axis', 'Series'];

  const handleConfigChange = (key: keyof ChartConfiguration, value: any) => {
    setConfiguration(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleYColumnToggle = (columnKey: string) => {
    setConfiguration(prev => ({
      ...prev,
      yColumns: prev.yColumns.includes(columnKey)
        ? prev.yColumns.filter(col => col !== columnKey)
        : [...prev.yColumns, columnKey]
    }));
  };

  const handleSeriesUpdate = (seriesId: string, field: keyof SeriesConfig, value: any) => {
    setConfiguration(prev => ({
      ...prev,
      series: prev.series.map(s => 
        s.id === seriesId ? { ...s, [field]: value } : s
      )
    }));
  };

  // Check if stacked chart option should be available
  const canUseStackedChart = Boolean(configuration.groupBy && configuration.groupBy !== '') || configuration.yColumns.length > 1;

  // Generate legends for the preview chart
  const updateLegends = (data: any[], config: ChartConfiguration) => {
    if (!data || data.length === 0 || !config) return;
    
    let chartLegends: Legend[] = [];
    let colorMap = { ...legendColorMap };
    const isNewColorMap = Object.keys(colorMap).length === 0;
    
    const hasGroupBy = Boolean(config.groupBy && config.groupBy !== '');
    const groupField = config.groupBy || '';
    const isDual = config.chartType === 'dual';
    
    if (hasGroupBy && data[0] && data[0][groupField] !== undefined) {
      // Chart with groupBy - show group values in legend
      const uniqueGroups = Array.from(new Set(data.map(item => item[groupField])));
      
      const groupTotals: Record<string, number> = {};
      const yField = config.yColumns[0];
      
      uniqueGroups.forEach(group => {
        if (group !== null && group !== undefined) {
          const groupStr = String(group);
          
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
    else if (isDual && config.series) {
      // Dual axis chart - show series in legend
      config.series.forEach((series: any, index: number) => {
        // Use the same intelligent field name extraction
        let fieldName: string;
        if (series.id.includes('_')) {
          const parts = series.id.split('_');
          if (parts.length >= 3) {
            fieldName = parts.slice(-2).join('_'); // e.g., "25th_percentile"
          } else {
            fieldName = parts[parts.length - 1]; // fallback to last part
          }
        } else {
          fieldName = series.id;
        }
        
        if (isNewColorMap && !colorMap[fieldName]) {
          colorMap[fieldName] = getColorByIndex(index);
        }
        
        const total = data.reduce((sum, item) => sum + (Number(item[fieldName]) || 0), 0);
        
        chartLegends.push({
          id: fieldName,
          label: series.label || fieldName.replace(/_/g, ' ').split(' ').map((word: string) => 
            word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          color: colorMap[fieldName] || getColorByIndex(index),
          value: total,
          shape: series.yAxis === 'right' ? 'circle' as const : 'square' as const
        });
      });
    }
    else if (config.yColumns && config.yColumns.length > 1) {
      // Multiple Y columns - show each column in legend
      config.yColumns.forEach((column: string, index: number) => {
        // For multiple Y columns, preserve the full field name to maintain uniqueness
        // Only do intelligent extraction if all fields would result in the same shortened name
        let fieldName: string = column; // Default to full field name
        
        // Check if this is a date-based chart where we should use full field names
        const xField = typeof chartConfig.dataMapping?.xAxis === 'string' ? 
          chartConfig.dataMapping.xAxis : chartConfig.dataMapping?.xAxis?.[0];
        
        const isDateBased = data.length > 0 && xField && 
          (xField.toLowerCase().includes('date') || 
           xField.toLowerCase().includes('time') || 
           typeof data[0][xField] === 'string' && 
           data[0][xField].match(/^\d{4}-\d{2}-\d{2}/));
        
        // For date-based charts with multiple series, always use full field names to avoid conflicts
        if (isDateBased || config.yColumns.length > 1) {
          fieldName = column; // Use full field name
        } else {
          // Only do intelligent extraction for non-date based single series charts
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
        }
        
        if (isNewColorMap && !colorMap[fieldName]) {
          colorMap[fieldName] = getColorByIndex(index);
        }
        
        const total = data.reduce((sum, item) => sum + (Number(item[fieldName]) || 0), 0);
        
        // Create a more readable label from the full field name
        const readableLabel = availableColumns.find(col => col.key === column)?.name || 
          fieldName.replace(/_/g, ' ').split(' ').map((word: string) => 
            word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        
        chartLegends.push({
          id: fieldName,
          label: readableLabel,
          color: colorMap[fieldName] || getColorByIndex(index),
          value: total,
          shape: 'square' as const
        });
      });
    }
    else if (config.yColumns.length === 1) {
      // Single series - create one legend entry
      const yField = config.yColumns[0];
      
      // Use the same intelligent field name extraction for consistency
      let fieldName: string;
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
      
      const total = data.reduce((sum, item) => sum + (Number(item[fieldName]) || 0), 0);
      const label = availableColumns.find(col => col.key === yField)?.name || fieldName.replace(/_/g, ' ').split(' ').map((word: string) => 
        word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      
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
      setLegendColorMap(colorMap);
    }
    
    // Update legends
    setLegends(chartLegends);
  };

  // Handle legend click to toggle series visibility
  const handleLegendClick = (label: string) => {
    setHiddenSeries(prev => 
      prev.includes(label)
        ? prev.filter(id => id !== label)
        : [...prev, label]
    );
  };

  // Check if current configuration is a stacked chart
  const isStackedChart = () => {
    const hasGroupBy = Boolean(configuration.groupBy && configuration.groupBy !== '');
    const hasMultipleYColumns = configuration.yColumns.length > 1;
    return hasGroupBy || (hasMultipleYColumns && configuration.chartType === 'stacked');
  };

  // Handle display mode change for stacked charts
  const handleDisplayModeChange = (mode: DisplayMode) => {
    setDisplayMode(mode);
  };

  // Handle chart expand/collapse
  const handleExpandChart = () => {
    setIsChartExpanded(true);
  };

  const handleCloseExpanded = () => {
    setIsChartExpanded(false);
  };

  // Handle chart screenshot
  const handleChartScreenshot = async () => {
    try {
      // Set loading state
      setIsScreenshotting(true);
      
      // Create a chart config object for the screenshot
      const screenshotChartConfig = {
        ...chartConfig,
        id: 'preview-chart',
        title: configuration.name
      };
      
      // Use the screenshot capture hook
      const cardElementId = 'preview-chart-card';
      await captureScreenshot(screenshotChartConfig, cardElementId);
      
    } catch (error) {
      console.error('Error capturing screenshot:', error);
    } finally {
      // Clear loading state
      setIsScreenshotting(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'General':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">
                Visualization Type
              </label>
              <select
                value={configuration.type}
                onChange={(e) => handleConfigChange('type', e.target.value as ChartType)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="bar">Chart</option>
                <option value="line">Line</option>
                <option value="pie">Pie</option>
                <option value="area">Area</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">
                Visualization Name
              </label>
              <input
                type="text"
                value={configuration.name}
                onChange={(e) => handleConfigChange('name', e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Chart"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={configuration.description}
                onChange={(e) => handleConfigChange('description', e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Optional description for your chart..."
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">
                Chart Type
              </label>
              <select
                value={configuration.chartType}
                onChange={(e) => handleConfigChange('chartType', e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="simple">Bar</option>
                <option 
                  value="stacked" 
                  disabled={!canUseStackedChart}
                  className={!canUseStackedChart ? 'text-gray-500' : ''}
                >
                  Stacked Bar {!canUseStackedChart ? '(requires group by or multiple Y columns)' : ''}
                </option>
                <option value="dual">Dual Axis</option>
              </select>
              {configuration.chartType === 'stacked' && !canUseStackedChart && (
                <p className="text-xs text-yellow-400 mt-1">
                  ⚠️ Stacked charts require a group by field or multiple Y columns
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="horizontal"
                checked={configuration.isHorizontal}
                onChange={(e) => handleConfigChange('isHorizontal', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-900 border-gray-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="horizontal" className="text-xs text-gray-300">
                Horizontal Chart
              </label>
            </div>
          </div>
        );

      case 'X Axis':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">
                X Column
              </label>
              <select
                value={configuration.xColumn}
                onChange={(e) => handleConfigChange('xColumn', e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose column...</option>
                {availableColumns.map(col => (
                  <option key={col.key} value={col.key}>
                    {col.name} ({col.apiName})
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'Y Axis':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">
                Y Columns
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableColumns
                  .filter(col => col.key !== configuration.xColumn)
                  .map(col => (
                    <label key={col.key} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={configuration.yColumns.includes(col.key)}
                        onChange={() => handleYColumnToggle(col.key)}
                        className="w-4 h-4 text-blue-600 bg-gray-900 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-gray-300">
                        {col.name} ({col.apiName})
                      </span>
                    </label>
                  ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">
                Group by
              </label>
              <select
                value={configuration.groupBy}
                onChange={(e) => handleConfigChange('groupBy', e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose column...</option>
                {availableColumns
                  .filter(col => col.key !== configuration.xColumn && !configuration.yColumns.includes(col.key))
                  .map(col => (
                    <option key={col.key} value={col.key}>
                      {col.name} ({col.apiName})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        );

      case 'Series':
        return (
          <div className="space-y-4">
            {configuration.series.length > 0 ? (
              <div>
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-300 mb-2 pb-2 border-b border-gray-700">
                  <div className="col-span-1">Order</div>
                  <div className="col-span-5">Label</div>
                  <div className="col-span-3">Y Axis</div>
                  <div className="col-span-3">Type</div>
                </div>
                <div className="space-y-2">
                  {configuration.series
                    .sort((a, b) => a.order - b.order)
                    .map((series, index) => (
                      <div key={series.id} className="grid grid-cols-12 gap-2 items-center">
                        {/* Order */}
                        <div className="col-span-1 flex items-center space-x-1">
                          <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                          <span className="text-sm text-gray-300">{series.order}</span>
                        </div>
                        
                        {/* Label */}
                        <div className="col-span-5">
                          <input
                            type="text"
                            value={series.label}
                            onChange={(e) => handleSeriesUpdate(series.id, 'label', e.target.value)}
                            className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        
                        {/* Y Axis */}
                        <div className="col-span-3 flex space-x-2">
                          <label className="flex items-center space-x-1">
                            <input
                              type="radio"
                              name={`yaxis-${series.id}`}
                              value="left"
                              checked={series.yAxis === 'left'}
                              onChange={(e) => handleSeriesUpdate(series.id, 'yAxis', e.target.value)}
                              className="w-3 h-3 text-blue-600 bg-gray-900 border-gray-600 focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-300">left</span>
                          </label>
                          <label className="flex items-center space-x-1">
                            <input
                              type="radio"
                              name={`yaxis-${series.id}`}
                              value="right"
                              checked={series.yAxis === 'right'}
                              onChange={(e) => handleSeriesUpdate(series.id, 'yAxis', e.target.value)}
                              className="w-3 h-3 text-blue-600 bg-gray-900 border-gray-600 focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-300">right</span>
                          </label>
                        </div>
                        
                        {/* Type */}
                        <div className="col-span-3">
                          <select
                            value={series.type}
                            onChange={(e) => handleSeriesUpdate(series.id, 'type', e.target.value as 'bar' | 'line')}
                            className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="line">📈 Line</option>
                            <option value="bar">📊 Bar</option>
                          </select>
                        </div>
                      </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400">
                Select Y columns to configure series
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const isConfigurationValid = configuration.xColumn && configuration.yColumns.length > 0;

  // Determine which chart component to use
  const renderChart = () => {
    const hasDualAxis = configuration.series.some(s => s.yAxis === 'right');
    const hasGroupBy = Boolean(configuration.groupBy && configuration.groupBy !== '');
    const hasMultipleYColumns = configuration.yColumns.length > 1;
    
    const commonProps = {
      chartConfig,
      data: chartData,
      height: 400,
      hiddenSeries,
      colorMap: legendColorMap,
      displayMode,
      isExpanded: isChartExpanded,
      onCloseExpanded: handleCloseExpanded
    };
    
    // Logic for chart selection:
    // 1. If dual axis is configured -> DualAxisChart
    // 2. If groupBy field exists (regardless of stacked setting) -> StackedBarChart
    // 3. If multiple Y columns but no dual axis -> MultiSeriesLineBarChart  
    // 4. Default single Y column, no groupBy -> MultiSeriesLineBarChart
    
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Visualization Editor"
    >
      <div className="h-[80vh] flex">
        {/* Left Panel - Configuration */}
        <div className="w-1/3 border-r border-gray-700 pr-6">
          <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-1">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-0">
              {renderTabContent()}
            </div>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="w-2/3 pl-6">
          <div className="h-full flex flex-col">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-200 mb-2">Preview</h3>
              <div className="h-px bg-gray-700"></div>
            </div>
            
            <div className="flex-1 min-h-0">
              {isConfigurationValid ? (
                <ChartCard
                  title={configuration.name}
                  description={configuration.description || `${configuration.chartType === 'dual' ? 'Dual Axis' : configuration.chartType === 'stacked' ? 'Stacked ' : ''}Chart`}
                  className="h-full"
                  id="preview-chart-card"
                  onExpandClick={handleExpandChart}
                  onScreenshotClick={handleChartScreenshot}
                  isScreenshotting={isScreenshotting}
                  filterBar={
                    isStackedChart() ? (
                      <div className="flex flex-wrap gap-3 items-center">
                        <DisplayModeFilter
                          mode={displayMode}
                          onChange={handleDisplayModeChange}
                        />
                      </div>
                    ) : undefined
                  }
                  legend={
                    <>
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
                      ) : null}
                    </>
                  }
                >
                  {renderChart()}
                </ChartCard>
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-900/50 rounded-lg border border-gray-700">
                  <div className="text-center text-gray-400">
                    <div className="mb-2">
                      <svg className="w-12 h-12 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-sm">Select X and Y columns to preview chart</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Implement save functionality
                  console.log('Save chart configuration:', configuration);
                  onSaveVisualization(configuration.name, configuration, chartConfig, chartData);
                  onClose();
                }}
                disabled={!isConfigurationValid}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                  isConfigurationValid
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default VisualizationModal; 