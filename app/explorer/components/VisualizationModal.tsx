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
  editingVisualization?: SavedVisualization | null;
}

interface SavedVisualization {
  id: string;
  name: string;
  description?: string;
  configuration: any;
  chartConfig: any;
  chartData: any[];
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
  isStacked: boolean;
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

// Function to clean up API field names for better display
const cleanFieldName = (fieldName: string): string => {
  // Handle null/undefined fieldName
  if (!fieldName || typeof fieldName !== 'string') {
    return '';
  }
  
  // Remove API URL prefix if present
  let cleaned = fieldName;
  
  // Remove URL pattern (everything before the last part that starts with "Get")
  const getIndex = cleaned.toLowerCase().lastIndexOf(' get ');
  if (getIndex !== -1) {
    cleaned = cleaned.substring(getIndex + 5); // +5 to remove " get "
  }
  
  // If no "Get" found, try to extract from URL pattern
  if (getIndex === -1 && cleaned.includes('api/queries/')) {
    const parts = cleaned.split(' ');
    // Find parts that don't contain URL-like strings
    const meaningfulParts = parts.filter(part => 
      !part.includes('http') && 
      !part.includes('api/') && 
      !part.toLowerCase().startsWith('get')
    );
    cleaned = meaningfulParts.join(' ');
  }
  
  // Remove any remaining "Get" prefix
  cleaned = cleaned.replace(/^get\s+/i, '');
  
  return cleaned.trim();
};

const VisualizationModal: React.FC<VisualizationModalProps> = ({
  isOpen,
  onClose,
  columnData,
  apis,
  joinedTableData,
  onSaveVisualization,
  editingVisualization
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
    isStacked: false,
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

  // Screenshot functionality now handled directly in ChartCard

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

  // Initialize configuration when editing a visualization
  useEffect(() => {
    if (editingVisualization && isOpen) {
      setConfiguration(editingVisualization.configuration);
      // Reset other states that might be affected
      setActiveTab('General');
      setDisplayMode('absolute');
      setHiddenSeries([]);
      setLegendColorMap({});
      setLegends([]);
    } else if (!editingVisualization && isOpen) {
      // Reset to default configuration when creating new visualization
      setConfiguration({
        name: 'Chart',
        description: '',
        type: 'bar',
        chartType: 'simple',
        isHorizontal: false,
        xColumn: '',
        yColumns: [],
        groupBy: '',
        isStacked: false,
        series: [],
        colors: {}
      });
      setActiveTab('General');
      setDisplayMode('absolute');
      setHiddenSeries([]);
      setLegendColorMap({});
      setLegends([]);
    }
  }, [editingVisualization, isOpen]);

  // Auto-switch to stacked when isStacked is checked - modified to respect the checkbox
  useEffect(() => {
    if (configuration.isStacked) {
      // When isStacked is checked, automatically switch to stacked if not already set
      if (configuration.chartType === 'simple') {
        setConfiguration(prev => ({
          ...prev,
          chartType: 'stacked'
        }));
      }
    } else {
      // When isStacked is unchecked, switch back to simple if currently stacked (unless we have dual axis)
      if (configuration.chartType === 'stacked') {
        setConfiguration(prev => ({
          ...prev,
          chartType: 'simple'
        }));
      }
    }
  }, [configuration.isStacked, configuration.chartType]);

  // Update series when yColumns change
  useEffect(() => {
    if (configuration.yColumns.length > 0) {
      // Standard series generation for yColumns
      const newSeries = configuration.yColumns.map((col, index) => {
        const existingSeries = configuration.series.find(s => s.id === col);
        return existingSeries || {
          id: col,
          label: availableColumns.find(c => c.key === col)?.name || col,
          // For stacked charts, all series should use the same Y-axis (left)
          // For non-stacked charts, alternate between left and right
          yAxis: configuration.isStacked ? 'left' as const : (index === 0 ? 'left' as const : 'right' as const),
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

  // Update series Y-axis assignments when isStacked changes
  useEffect(() => {
    if (configuration.series.length > 0) {
      const updatedSeries = configuration.series.map((series, index) => ({
        ...series,
        // For stacked charts, all series should use the same Y-axis (left)
        // For non-stacked charts, alternate between left and right
        yAxis: configuration.isStacked ? 'left' as const : (index === 0 ? 'left' as const : 'right' as const)
      }));
      
      // Only update if there's actually a change
      const hasChanges = updatedSeries.some((series, index) => 
        series.yAxis !== configuration.series[index].yAxis
      );
      
      if (hasChanges) {
        setConfiguration(prev => ({
          ...prev,
          series: updatedSeries
        }));
      }
    }
  }, [configuration.isStacked]);

  // Generate chart data from joined table data
  const chartData = useMemo(() => {
    if (!configuration.xColumn || joinedTableData.rows.length === 0) {
      return [];
    }

    const hasGroupBy = Boolean(configuration.groupBy && configuration.groupBy !== '');
    
    // If we have groupBy but not stacked, transform data for grouped bars
    if (hasGroupBy && !configuration.isStacked) {
      // Transform data so each group becomes a separate field
      const groupedData: Record<string, any> = {};
      const uniqueGroups = new Set<string>();
      
      // Clean field names
      const cleanedXColumn = cleanFieldName(availableColumns.find(col => col.key === configuration.xColumn)?.name || configuration.xColumn);
      const cleanedYColumn = cleanFieldName(availableColumns.find(col => col.key === configuration.yColumns[0])?.name || configuration.yColumns[0]);
      const cleanedGroupColumn = cleanFieldName(availableColumns.find(col => col.key === configuration.groupBy)?.name || configuration.groupBy);
      
      // Collect all unique x-values and group values
      joinedTableData.rows.forEach(row => {
        const xValue = row[configuration.xColumn];
        const groupValue = String(row[configuration.groupBy] || 'Unknown');
        
        // Store unique groups
        uniqueGroups.add(groupValue);
        
        // Initialize x-value group if needed
        if (!groupedData[xValue]) {
          groupedData[xValue] = { [cleanedXColumn]: xValue };
        }
        
        // Store the value for each group
        const yValue = parseFloat(row[configuration.yColumns[0]]) || 0;
        groupedData[xValue][groupValue] = (groupedData[xValue][groupValue] || 0) + yValue;
      });
      
      // Fill missing groups with 0 for each x-value
      Object.keys(groupedData).forEach(xValue => {
        uniqueGroups.forEach(group => {
          if (!(group in groupedData[xValue])) {
            groupedData[xValue][group] = 0;
          }
        });
      });
      
      return Object.values(groupedData);
    }
    
    // Standard processing for non-groupBy or stacked charts
    return joinedTableData.rows.map(row => {
      const dataPoint: any = {};
      
      // Add x-axis value with cleaned column name
      const cleanedXColumn = cleanFieldName(availableColumns.find(col => col.key === configuration.xColumn)?.name || configuration.xColumn);
      dataPoint[cleanedXColumn] = row[configuration.xColumn];
      
      // Add y-axis values with cleaned column names
      configuration.yColumns.forEach(yCol => {
        const cleanedYColumn = cleanFieldName(availableColumns.find(col => col.key === yCol)?.name || yCol);
        dataPoint[cleanedYColumn] = parseFloat(row[yCol]) || 0;
      });
      
      // Add group by value with cleaned column name if specified
      if (configuration.groupBy) {
        const cleanedGroupColumn = cleanFieldName(availableColumns.find(col => col.key === configuration.groupBy)?.name || configuration.groupBy);
        dataPoint[cleanedGroupColumn] = row[configuration.groupBy];
      }
      
      return dataPoint;
    });
  }, [configuration, joinedTableData.rows, availableColumns]);

  // Update series for grouped charts after chartData is available
  useEffect(() => {
    const hasGroupBy = Boolean(configuration.groupBy && configuration.groupBy !== '');
    
    // Special handling for grouped but not stacked charts
    if (hasGroupBy && !configuration.isStacked && chartData.length > 0 && configuration.yColumns.length > 0) {
      // For grouped charts, series are based on group values, not yColumns
      const cleanedXColumn = cleanFieldName(availableColumns.find(col => col.key === configuration.xColumn)?.name || configuration.xColumn);
      const uniqueGroups = new Set<string>();
      
      // Extract unique groups from the transformed data
      chartData.forEach(dataPoint => {
        Object.keys(dataPoint).forEach(key => {
          if (key !== cleanedXColumn) {
            uniqueGroups.add(key);
          }
        });
      });
      
      // Only update series if the groups have actually changed
      const currentGroupIds = new Set(configuration.series.map(s => s.id));
      const newGroupIds = new Set(Array.from(uniqueGroups));
      
      // Check if groups have changed
      const groupsChanged = currentGroupIds.size !== newGroupIds.size || 
        Array.from(newGroupIds).some(group => !currentGroupIds.has(group));
      
      if (groupsChanged) {
        const groupSeries = Array.from(uniqueGroups).map((group, index) => {
          const existingSeries = configuration.series.find(s => s.id === group);
          return existingSeries || {
            id: group,
            label: group,
            yAxis: 'left' as const,
            type: 'bar' as const,
            order: index + 1
          };
        });
        
        setConfiguration(prev => ({
          ...prev,
          series: groupSeries
        }));
      }
    } else if (!hasGroupBy && configuration.yColumns.length > 0) {
      // When groupBy is removed, revert to yColumn-based series
      // Check if current series are group-based (not matching yColumns)
      const currentSeriesIds = new Set(configuration.series.map(s => s.id));
      const yColumnIds = new Set(configuration.yColumns);
      
      // If series don't match yColumns, regenerate them
      const seriesNeedReset = currentSeriesIds.size !== yColumnIds.size || 
        Array.from(yColumnIds).some(col => !currentSeriesIds.has(col));
      
      if (seriesNeedReset) {
        const yColumnSeries = configuration.yColumns.map((col, index) => {
          // Try to preserve existing series configuration if it exists
          const existingSeries = configuration.series.find(s => s.id === col);
          return existingSeries || {
            id: col,
            label: availableColumns.find(c => c.key === col)?.name || col,
            // For stacked charts, all series should use the same Y-axis (left)
            // For non-stacked charts, alternate between left and right
            yAxis: configuration.isStacked ? 'left' as const : (index === 0 ? 'left' as const : 'right' as const),
            type: 'bar' as const,
            order: index + 1
          };
        });
        
        setConfiguration(prev => ({
          ...prev,
          series: yColumnSeries
        }));
      }
    }
  }, [configuration.groupBy, configuration.isStacked, configuration.yColumns.length, availableColumns, configuration.xColumn]);

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
    
    // Determine the appropriate chart type - now respects isStacked checkbox
    let finalChartType: ChartType;
    if (hasDualAxis) {
      finalChartType = 'dual-axis';
    } else if (configuration.isStacked) {
      // Only use stacked-bar when isStacked is explicitly checked
      finalChartType = 'stacked-bar';
    } else {
      // Use regular bar for non-stacked (even with groupBy)
      finalChartType = 'bar';
    }

    // Use cleaned field names to match the data
    const isStackedChart = finalChartType === 'stacked-bar';
    const xAxisValue = cleanFieldName(availableColumns.find(col => col.key === configuration.xColumn)?.name || configuration.xColumn);

    // For all chart types, use cleaned field names to match the data
    let yAxisValue: string | string[] | YAxisConfig | YAxisConfig[];
    if (isStackedChart) {
      // For stacked charts, use cleaned column names as plain strings
      const cleanedYColumns = configuration.yColumns.map(yCol => 
        cleanFieldName(availableColumns.find(col => col.key === yCol)?.name || yCol)
      );
      yAxisValue = cleanedYColumns.length === 1 ? cleanedYColumns[0] : cleanedYColumns;
    } else if (hasGroupBy && !configuration.isStacked) {
      // For non-stacked grouped charts, we need to create YAxisConfig for each group
      // Extract unique groups from chartData
      const uniqueGroups = new Set<string>();
      chartData.forEach(dataPoint => {
        Object.keys(dataPoint).forEach(key => {
          // Skip the x-axis field
          const cleanedXColumn = cleanFieldName(availableColumns.find(col => col.key === configuration.xColumn)?.name || configuration.xColumn);
          if (key !== cleanedXColumn) {
            uniqueGroups.add(key);
          }
        });
      });
      
      // Map each group to its corresponding series configuration
      const groupConfigs: YAxisConfig[] = Array.from(uniqueGroups).map(group => {
        // Find the series configuration for this group
        const seriesConfig = configuration.series.find(s => s.id === group || s.label === group);
        const seriesType = seriesConfig ? seriesConfig.type : 'bar';
        
        return {
          field: group,
          type: seriesType, // Use the individual series type
          unit: undefined
        };
      });
      
      yAxisValue = groupConfigs.length === 1 ? groupConfigs[0] : groupConfigs;
    } else {
      // For other charts that need YAxisConfig with cleaned field names
      const yAxisConfigs: YAxisConfig[] = configuration.series.map(series => {
        const cleanedFieldName = cleanFieldName(availableColumns.find(col => col.key === series.id)?.name || series.id);
        return {
          field: cleanedFieldName,
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
        groupBy: hasGroupBy ? cleanFieldName(availableColumns.find(col => col.key === configuration.groupBy)?.name || configuration.groupBy) : undefined
      },
      useDistinctColors: hasMultipleSeries || hasGroupBy,
      dualAxisConfig: hasDualAxis ? {
        leftAxisFields: configuration.series.filter(s => s.yAxis === 'left').map(s => 
          cleanFieldName(availableColumns.find(col => col.key === s.id)?.name || s.id)
        ),
        rightAxisFields: configuration.series.filter(s => s.yAxis === 'right').map(s => 
          cleanFieldName(availableColumns.find(col => col.key === s.id)?.name || s.id)
        ),
        leftAxisType: configuration.series.find(s => s.yAxis === 'left')?.type || 'bar',
        rightAxisType: configuration.series.find(s => s.yAxis === 'right')?.type || 'line'
      } : undefined,
      additionalOptions: {}
    };
  }, [configuration, availableColumns]);

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

  // Check if stacked chart option should be available - modified to be more flexible
  const canUseStackedChart = configuration.yColumns.length > 0;

  // Generate legends for the preview chart
  const updateLegends = (data: any[], config: ChartConfiguration) => {
    if (!data || data.length === 0 || !config) return;
    
    let chartLegends: Legend[] = [];
    let colorMap = { ...legendColorMap };
    const isNewColorMap = Object.keys(colorMap).length === 0;
    
    const hasGroupBy = Boolean(config.groupBy && config.groupBy !== '');
    const cleanedGroupField = hasGroupBy ? cleanFieldName(availableColumns.find(col => col.key === config.groupBy)?.name || config.groupBy) : '';
    const isDual = config.chartType === 'dual';
    
    // Special handling for non-stacked grouped charts
    if (hasGroupBy && !config.isStacked && data.length > 0) {
      // For non-stacked grouped charts, each group becomes a separate series
      const cleanedXColumn = cleanFieldName(availableColumns.find(col => col.key === config.xColumn)?.name || config.xColumn);
      const uniqueGroups = new Set<string>();
      
      // Extract all group fields from the transformed data
      data.forEach(dataPoint => {
        Object.keys(dataPoint).forEach(key => {
          if (key !== cleanedXColumn) {
            uniqueGroups.add(key);
          }
        });
      });
      
      const groupTotals: Record<string, number> = {};
      
      // Calculate totals for each group
      Array.from(uniqueGroups).forEach(group => {
        groupTotals[group] = data.reduce((sum, item) => sum + (Number(item[group]) || 0), 0);
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
      
      chartLegends = Array.from(uniqueGroups)
        .map(group => ({
          id: group,
          label: group,
          color: colorMap[group] || getColorByIndex(Array.from(uniqueGroups).indexOf(group)),
          value: groupTotals[group] || 0,
          shape: 'square' as const
        }))
        .sort((a, b) => (b.value || 0) - (a.value || 0));
    }
    else if (hasGroupBy && data[0] && data[0][cleanedGroupField] !== undefined) {
      // Chart with groupBy - show group values in legend
      const uniqueGroups = Array.from(new Set(data.map(item => item[cleanedGroupField])));
      
      const groupTotals: Record<string, number> = {};
      const cleanedYField = cleanFieldName(availableColumns.find(col => col.key === config.yColumns[0])?.name || config.yColumns[0]);
      
      uniqueGroups.forEach(group => {
        if (group !== null && group !== undefined) {
          const groupStr = String(group);
          
          groupTotals[groupStr] = data
            .filter(item => item[cleanedGroupField] === group)
            .reduce((sum, item) => sum + (Number(item[cleanedYField]) || 0), 0);
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
            color: colorMap[groupStr] || getColorByIndex(uniqueGroups.indexOf(group)),
            value: groupTotals[groupStr] || 0,
            shape: 'square' as const
          };
        })
        .sort((a, b) => (b.value || 0) - (a.value || 0));
    }
    else if (isDual && config.series) {
      // Dual axis chart - show series in legend
      config.series.forEach((series: any, index: number) => {
        const cleanedFieldName = cleanFieldName(availableColumns.find(col => col.key === series.id)?.name || series.id);
        
        if (isNewColorMap && !colorMap[cleanedFieldName]) {
          colorMap[cleanedFieldName] = getColorByIndex(index);
        }
        
        const total = data.reduce((sum, item) => sum + (Number(item[cleanedFieldName]) || 0), 0);
        
        chartLegends.push({
          id: cleanedFieldName,
          label: series.label || cleanedFieldName,
          color: colorMap[cleanedFieldName] || getColorByIndex(index),
          value: total,
          shape: series.yAxis === 'right' ? 'circle' as const : 'square' as const
        });
      });
    }
    else if (config.yColumns && config.yColumns.length > 1) {
      // Multiple Y columns - show each column in legend
      config.yColumns.forEach((column: string, index: number) => {
        const cleanedFieldName = cleanFieldName(availableColumns.find(col => col.key === column)?.name || column);
        
        if (isNewColorMap && !colorMap[cleanedFieldName]) {
          colorMap[cleanedFieldName] = getColorByIndex(index);
        }
        
        const total = data.reduce((sum, item) => sum + (Number(item[cleanedFieldName]) || 0), 0);
        
        chartLegends.push({
          id: cleanedFieldName,
          label: cleanedFieldName,
          color: colorMap[cleanedFieldName] || getColorByIndex(index),
          value: total,
          shape: 'square' as const
        });
      });
    }
    else if (config.yColumns.length === 1) {
      // Single series - create one legend entry
      const yField = config.yColumns[0];
      const cleanedFieldName = cleanFieldName(availableColumns.find(col => col.key === yField)?.name || yField);
      
      const total = data.reduce((sum, item) => sum + (Number(item[cleanedFieldName]) || 0), 0);
      
      if (isNewColorMap && !colorMap[cleanedFieldName]) {
        colorMap[cleanedFieldName] = getColorByIndex(0);
      }
      
      chartLegends = [{
        id: cleanedFieldName,
        label: cleanedFieldName,
        color: colorMap[cleanedFieldName] || getColorByIndex(0),
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

  // Check if current configuration is a stacked chart - updated to use isStacked checkbox
  const isStackedChart = () => {
    const hasGroupBy = Boolean(configuration.groupBy && configuration.groupBy !== '');
    const hasMultipleYColumns = configuration.yColumns.length > 1;
    return configuration.isStacked && (hasGroupBy || hasMultipleYColumns);
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

  // Screenshot functionality now handled directly in ChartCard

  const renderTabContent = () => {
    switch (activeTab) {
      case 'General':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">
                Visualization Type
              </label>
              <select
                value={configuration.type}
                onChange={(e) => handleConfigChange('type', e.target.value as ChartType)}
                className="text-xs bg-gray-900/40 border-[0.5px] border-gray-700/60 rounded px-2 py-3 w-full text-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="bar">Chart</option>
                <option value="line">Line</option>
                <option value="pie">Pie</option>
                <option value="area">Area</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">
                Visualization Name
              </label>
              <input
                type="text"
                value={configuration.name}
                onChange={(e) => handleConfigChange('name', e.target.value)}
                className="text-xs bg-gray-900/40 border-[0.5px] border-gray-700/60 rounded px-2 py-3 w-full text-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="Chart"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">
                Description
              </label>
              <textarea
                value={configuration.description}
                onChange={(e) => handleConfigChange('description', e.target.value)}
                className="text-xs bg-gray-900/40 border-[0.5px] border-gray-700/60 rounded px-2 py-3 w-full text-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                placeholder="Optional description for your chart..."
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">
                Chart Type
              </label>
              <select
                value={configuration.chartType}
                onChange={(e) => handleConfigChange('chartType', e.target.value)}
                className="text-xs bg-gray-900/40 border-[0.5px] border-gray-700/60 rounded px-2 py-3 w-full text-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="simple">Bar</option>
                
                
              </select>
              
            </div>

            
          </div>
        );

      case 'X Axis':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">
                X Column
              </label>
              <select
                value={configuration.xColumn}
                onChange={(e) => handleConfigChange('xColumn', e.target.value)}
                className="text-xs bg-gray-900/40 border-[0.5px] border-gray-700/60 rounded px-2 py-3 w-full text-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
              <label className="block text-xs font-medium text-gray-400 mb-3">
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
                        className="appearance-none w-4 h-4 rounded border border-gray-700/80 bg-gray-900/40 checked:bg-blue-900 checked:border-blue-900  relative checked:after:content-['✓'] checked:after:text-white checked:after:text-xs checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center"
                      />
                      <span className="text-gray-500 text-xs">
                        {col.name} ({col.apiName})
                      </span>
                    </label>
                  ))}
              </div>
            </div>

            

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">
                Group by
              </label>
              <select
                value={configuration.groupBy}
                onChange={(e) => handleConfigChange('groupBy', e.target.value)}
                className="text-xs bg-gray-900/40 border-[0.5px] border-gray-700/60 rounded px-2 py-3 w-full text-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isStacked"
                checked={configuration.isStacked}
                onChange={(e) => handleConfigChange('isStacked', e.target.checked)}
                className="appearance-none w-4 h-4 rounded border border-gray-700/80 bg-gray-900/40 checked:bg-blue-900 checked:border-blue-900  relative checked:after:content-['✓'] checked:after:text-white checked:after:text-xs checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center"
              />
              <label htmlFor="isStacked" className="text-xs text-gray-500">
                Is Stacked
              </label>
            </div>
          </div>
        );

      case 'Series':
        return (
          <div className="space-y-4">
            {configuration.series.length > 0 ? (
              <div>
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 mb-2 pb-2 border-b border-gray-900">
                  
                  <div className="col-span-5">Label</div>
                  <div className="col-span-3">Y Axis</div>
                  <div className="col-span-3">Type</div>
                </div>
                <div className="space-y-2">
                  {configuration.series
                    .sort((a, b) => a.order - b.order)
                    .map((series, index) => (
                      <div key={series.id} className="grid grid-cols-12 gap-2 items-center">
                        
                        
                        {/* Label */}
                        <div className="col-span-5">
                          <p className="w-full px-2 py-1 rounded text-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                            
                            {series.label}
                            
                            
                          </p>
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
                              className="appearance-none w-3 h-3 rounded-full border border-gray-700/80 bg-gray-900/40 checked:bg-blue-800 checked:border-gray-200  relative checked:after:text-white checked:after:text-xs checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center"
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
                              className="appearance-none w-3 h-3 rounded-full border border-gray-700/80 bg-gray-900/40 checked:bg-blue-800 checked:border-gray-200  relative checked:after:text-white checked:after:text-xs checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center"
                            />
                            <span className="text-xs text-gray-300">right</span>
                          </label>
                        </div>
                        
                        {/* Type */}
                        <div className="col-span-3">
                          <select
                            value={series.type}
                            onChange={(e) => handleSeriesUpdate(series.id, 'type', e.target.value as 'bar' | 'line')}
                            className="text-xs bg-gray-900/40 border-[0.5px] border-gray-700/60 rounded px-2 py-2 w-full text-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="line"> Line</option>
                            <option value="bar"> Bar</option>
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

  // Determine which chart component to use - updated to respect isStacked checkbox
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
    // 2. If isStacked is true -> StackedBarChart
    // 3. Otherwise -> MultiSeriesLineBarChart
    
    if (hasDualAxis) {
      return (
        <DualAxisChart
          {...commonProps}
        />
      );
    } else if (configuration.isStacked) {
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
      title={editingVisualization ? "Edit Visualization" : "Create Visualization"}
    >
      <div className="h-[80vh] flex">
        {/* Left Panel - Configuration */}
        <div className="w-1/3 border-r border-gray-900 pr-6">
          <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-1">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    activeTab === tab
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-900 text-gray-300 hover:bg-gray-900/80'
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
            
            
            <div className="flex-1 min-h-0">
              {isConfigurationValid ? (
                <ChartCard
                  title={configuration.name}
                  description={configuration.description || `${configuration.chartType === 'dual' ? 'Dual Axis' : configuration.chartType === 'stacked' ? 'Stacked ' : ''}Chart`}
                  className="h-full"
                  id="preview-chart-card"
                  onExpandClick={handleExpandChart}
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
                <div className="h-full flex items-center justify-center bg-gray-950/50 rounded-lg border border-gray-900">
                  <div className="text-center text-gray-400">
                    <div className="mb-2">
                      <svg className="w-12 h-12 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600">Select X and Y columns to preview chart</p>
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