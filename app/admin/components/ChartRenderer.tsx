import React, { useEffect, useState } from 'react';
import { ChartConfig, YAxisConfig } from '../types';

import SimpleBarChart from './charts/SimpleBarChart';
import StackedBarChart from './charts/StackedBarChart';
import DualAxisChart from './charts/DualAxisChart';
import MultiSeriesLineBarChart from './charts/MultiSeriesLineBarChart';
import PieChart from './charts/PieChart';
import SimpleAreaChart from './charts/SimpleAreaChart';
import Modal from '../../components/shared/Modal';
//import LineChart from './charts/LineChart';
// import AreaChart from './charts/AreaChart';
// Import filter components
import TimeFilterSelector from '../../components/shared/filters/TimeFilter';
import CurrencyFilter from '../../components/shared/filters/CurrencyFilter';
import DisplayModeFilter, { DisplayMode } from '../../components/shared/filters/DisplayModeFilter';

interface ChartRendererProps {
  chartConfig: ChartConfig;
  onDataLoaded?: (data: any[]) => void;
  isExpanded?: boolean;
  onCloseExpanded?: () => void;
  // New props for filter handling
  onFilterChange?: (filterType: string, value: string) => void;
  filterValues?: Record<string, string>;
  // Add colorMap prop for legend color consistency
  colorMap?: Record<string, string>;
  // Add callback to report generated colors back to parent
  onColorsGenerated?: (colorMap: Record<string, string>) => void;
  // Add loading state prop
  isLoading?: boolean;
  hiddenSeries?: string[];
  // Add prop to pass pre-loaded data
  preloadedData?: any[];
}

// Add helper function at the top of the file
function getFieldFromYAxisConfig(field: string | YAxisConfig): string {
  return typeof field === 'string' ? field : field.field;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ 
  chartConfig, 
  onDataLoaded,
  isExpanded = false, 
  onCloseExpanded,
  onFilterChange,
  filterValues: externalFilterValues,
  colorMap: externalColorMap,
  onColorsGenerated,
  isLoading = false,
  hiddenSeries = [],
  preloadedData
}) => {
  const [data, setData] = useState<any[]>(preloadedData || []);
  const [error, setError] = useState<string | null>(null);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  // Use internal or external filter values based on what's provided
  const [internalFilterValues, setInternalFilterValues] = useState<Record<string, string>>({});
  const [isFilterChanged, setIsFilterChanged] = useState(false);
  // Add state to track legend colors, use external if provided
  const [legendColorMap, setLegendColorMap] = useState<Record<string, string>>(externalColorMap || {});
  
  // Update data when preloadedData changes
  useEffect(() => {
    if (preloadedData && preloadedData.length > 0) {
      setData(preloadedData);
      setError(null);
    }
  }, [preloadedData]);

  // Update legendColorMap when externalColorMap changes
  useEffect(() => {
    if (externalColorMap) {
      setLegendColorMap(externalColorMap);
    }
  }, [externalColorMap]);

  // Add effect to forward legend colors to parent component
  useEffect(() => {
    if (onColorsGenerated && Object.keys(legendColorMap).length > 0) {
      // Check if this is actually a new color map from what we got externally
      const externalMapStr = JSON.stringify(externalColorMap || {});
      const currentMapStr = JSON.stringify(legendColorMap);
      
      // Only trigger the callback if the maps are different
      if (externalMapStr !== currentMapStr) {
        onColorsGenerated(legendColorMap);
      }
    }
  }, [legendColorMap, onColorsGenerated, externalColorMap]);

  // Determine whether to use internal or external filter values
  const filterValues = externalFilterValues || internalFilterValues;

  // Helper function to find a matching field with flexible matching
  const findMatchingField = (obj: any, fieldName: string): string | null => {
    // Direct match
    if (fieldName in obj) return fieldName;
    
    // Case insensitive match
    const lowerField = fieldName.toLowerCase();
    const keys = Object.keys(obj);
    
    // First try exact match with lowercase
    for (const key of keys) {
      if (key.toLowerCase() === lowerField) return key;
    }
    
    // Then try replacing spaces with underscores and vice versa
    const spaceToUnderscore = lowerField.replace(/ /g, '_');
    const underscoreToSpace = lowerField.replace(/_/g, ' ');
    
    for (const key of keys) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === spaceToUnderscore || lowerKey === underscoreToSpace) {
        return key;
      }
    }
    
    return null;
  };

  // Initialize filter values from chart config
  useEffect(() => {
    // Only initialize internal filters if external ones aren't provided
    if (externalFilterValues) return;
    
    const initialFilters: Record<string, string> = {};
    
    // Extract initial filter values from chart config
    if (chartConfig.additionalOptions?.filters) {
      // Set time filter
      if (chartConfig.additionalOptions.filters.timeFilter &&
          Array.isArray(chartConfig.additionalOptions.filters.timeFilter.options) &&
          chartConfig.additionalOptions.filters.timeFilter.options.length > 0) {
        initialFilters['timeFilter'] = chartConfig.additionalOptions.filters.timeFilter.options[0];
      }
      
      // Set currency filter
      if (chartConfig.additionalOptions.filters.currencyFilter &&
          Array.isArray(chartConfig.additionalOptions.filters.currencyFilter.options) &&
          chartConfig.additionalOptions.filters.currencyFilter.options.length > 0) {
        initialFilters['currencyFilter'] = chartConfig.additionalOptions.filters.currencyFilter.options[0];
      }
      
      // Set display mode filter
      if (chartConfig.additionalOptions.filters.displayModeFilter &&
          Array.isArray(chartConfig.additionalOptions.filters.displayModeFilter.options) &&
          chartConfig.additionalOptions.filters.displayModeFilter.options.length > 0) {
        initialFilters['displayModeFilter'] = chartConfig.additionalOptions.filters.displayModeFilter.options[0];
      }
    }
    
    setInternalFilterValues(initialFilters);
  }, [chartConfig.id, externalFilterValues]);

  // Handle filter change
  const handleFilterChange = (filterType: string, value: string) => {
    console.log(`Filter changed: ${filterType} = ${value}`);
    
    // If external handler is provided, use it
    if (onFilterChange) {
      onFilterChange(filterType, value);
    } else {
      // Otherwise update internal state
      setInternalFilterValues(prev => ({
        ...prev,
        [filterType]: value
      }));
      setIsFilterChanged(true);
    }
  };

  // Sample data to use when API fails
  const getSampleData = (chartType: string, groupByField?: string) => {
    // Basic sample data for bar charts
    if (chartType.includes('bar')) {
      if (chartType.includes('stacked') && groupByField) {
        // Sample data for stacked bar charts
        return [
          { platform: 'Raydium', segment: 'DEX', protocol_revenue: 1250000 },
          { platform: 'Raydium', segment: 'Lending', protocol_revenue: 350000 },
          { platform: 'Raydium', segment: 'NFT', protocol_revenue: 75000 },
          { platform: 'Orca', segment: 'DEX', protocol_revenue: 980000 },
          { platform: 'Orca', segment: 'Lending', protocol_revenue: 120000 },
          { platform: 'Orca', segment: 'Liquid Staking', protocol_revenue: 420000 },
          { platform: 'Drift', segment: 'DEX', protocol_revenue: 750000 },
          { platform: 'Drift', segment: 'Perpetuals', protocol_revenue: 890000 },
          { platform: 'Marinade', segment: 'Liquid Staking', protocol_revenue: 1100000 },
          { platform: 'Marinade', segment: 'Lending', protocol_revenue: 120000 }
        ];
      }
      
      // Regular bar chart
      return [
        { platform: 'Raydium', protocol_revenue: 1750000, volume: 12500000, users: 45000 },
        { platform: 'Orca', protocol_revenue: 1380000, volume: 9800000, users: 32000 },
        { platform: 'Drift', protocol_revenue: 1640000, volume: 11200000, users: 28000 },
        { platform: 'Marinade', protocol_revenue: 1220000, volume: 5400000, users: 56000 },
        { platform: 'Jupiter', protocol_revenue: 2100000, volume: 18600000, users: 78000 },
        { platform: 'Solend', protocol_revenue: 840000, volume: 4200000, users: 22000 }
      ];
    }
    
    // Time series data (previously for line charts, now as a fallback)
    if (chartType === 'line' || chartType.includes('time')) {
      return [
        { date: '2023-01-01', protocol_revenue: 980000, cumulative_revenue: 980000 },
        { date: '2023-02-01', protocol_revenue: 1250000, cumulative_revenue: 2230000 },
        { date: '2023-03-01', protocol_revenue: 1420000, cumulative_revenue: 3650000 },
        { date: '2023-04-01', protocol_revenue: 1650000, cumulative_revenue: 5300000 },
        { date: '2023-05-01', protocol_revenue: 2100000, cumulative_revenue: 7400000 },
        { date: '2023-06-01', protocol_revenue: 1850000, cumulative_revenue: 9250000 }
      ];
    }
    
    // Default data
    return [
      { x: 'A', y: 100 },
      { x: 'B', y: 200 },
      { x: 'C', y: 150 },
      { x: 'D', y: 300 },
      { x: 'E', y: 250 }
    ];
  };

  // Fetch data from API when component mounts or filters change
  useEffect(() => {
    // Skip fetching if we have preloaded data
    if (preloadedData && preloadedData.length > 0) {
      console.log(`Using preloaded data for chart ${chartConfig.title}, skipping API fetch`);
      return;
    }
    
    // Create a stringified version of the data mapping for dependency comparison
    const dataMappingKey = JSON.stringify({
      xAxis: chartConfig.dataMapping.xAxis,
      yAxis: chartConfig.dataMapping.yAxis,
      groupBy: chartConfig.dataMapping.groupBy
    });
    
    // Create an AbortController to cancel fetch requests when component unmounts
    const controller = new AbortController();
    const signal = controller.signal;
    
    const fetchData = async () => {
      // Variable to hold our parsed data
      let parsedData: any[] = [];
      
      try {
        // Skip API call if using the same endpoint with the same mapping and no filter changes
        const cacheKey = `${chartConfig.apiEndpoint}-${dataMappingKey}-${JSON.stringify(filterValues)}`;
        const cachedData = !isFilterChanged ? sessionStorage.getItem(cacheKey) : null;
        
        if (cachedData) {
          console.log('Using cached data for', chartConfig.title);
          parsedData = JSON.parse(cachedData);
          
          // Set cached data immediately
          setData(parsedData);
          setError(null);
          
          // Start background refresh if we have cached data
          setIsBackgroundLoading(true);
        }
        
        // Always fetch fresh data in the background
        try {
          // Create URL with API key if provided
          let apiUrl;
          try {
            apiUrl = new URL(chartConfig.apiEndpoint);
            // Add API key to URL for both GET and POST requests
            if (chartConfig.apiKey) {
              // Check if the apiKey contains max_age parameter
              const apiKeyValue = chartConfig.apiKey.trim();
              
              if (apiKeyValue.includes('&max_age=')) {
                // Split by &max_age= and add each part separately
                const [baseApiKey, maxAgePart] = apiKeyValue.split('&max_age=');
                if (baseApiKey) {
                  apiUrl.searchParams.append('api_key', baseApiKey.trim());
                }
                if (maxAgePart) {
                  apiUrl.searchParams.append('max_age', maxAgePart.trim());
                }
              } else {
                // Just a regular API key
                apiUrl.searchParams.append('api_key', apiKeyValue);
              }
            }
          } catch (error) {
            throw new Error(`Invalid URL: ${chartConfig.apiEndpoint}`);
          }
          
          // Build parameters object for POST request based on filters
          const parameters: Record<string, any> = {};
          const filterConfig = chartConfig.additionalOptions?.filters;
          const hasFilters = filterConfig !== undefined;
          
          if (hasFilters) {
            // Add time filter parameter
            if (filterConfig.timeFilter && filterValues['timeFilter']) {
              parameters[filterConfig.timeFilter.paramName] = filterValues['timeFilter'];
            } else if (filterConfig.timeFilter && 
                     Array.isArray(filterConfig.timeFilter.options) && 
                     filterConfig.timeFilter.options.length > 0) {
              parameters[filterConfig.timeFilter.paramName] = filterConfig.timeFilter.options[0];
            }
            
            // Add currency filter parameter
            if (filterConfig.currencyFilter && filterValues['currencyFilter']) {
              parameters[filterConfig.currencyFilter.paramName] = filterValues['currencyFilter'];
            } else if (filterConfig.currencyFilter && 
                     Array.isArray(filterConfig.currencyFilter.options) && 
                     filterConfig.currencyFilter.options.length > 0) {
              parameters[filterConfig.currencyFilter.paramName] = filterConfig.currencyFilter.options[0];
            }
            
            // Add display mode filter parameter
            if (filterConfig.displayModeFilter && filterValues['displayModeFilter']) {
              parameters[filterConfig.displayModeFilter.paramName] = filterValues['displayModeFilter'];
            } else if (filterConfig.displayModeFilter && 
                     Array.isArray(filterConfig.displayModeFilter.options) && 
                     filterConfig.displayModeFilter.options.length > 0) {
              parameters[filterConfig.displayModeFilter.paramName] = filterConfig.displayModeFilter.options[0];
            }
          }
          
          const hasParameters = Object.keys(parameters).length > 0;
          
          // Set up fetch options
          const options: RequestInit = {
            method: hasParameters ? 'POST' : 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
            signal,
            ...{ timeout: 15000 }
          };
          
          if (hasParameters) {
            options.body = JSON.stringify({ parameters });
          }
          
          // Fetch fresh data in the background
          const response = await fetch(apiUrl.toString(), options);
          
          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
          }
          
          const result = await response.json();
          
          // Handle different API response formats
          if (result?.query_result?.data?.rows) {
            parsedData = result.query_result.data.rows;
          } else if (Array.isArray(result)) {
            parsedData = result;
          } else if (result?.data && Array.isArray(result.data)) {
            parsedData = result.data;
          } else if (result?.rows && Array.isArray(result.rows)) {
            parsedData = result.rows;
          } else if (result?.results && Array.isArray(result.results)) {
            parsedData = result.results;
          } else if (result?.error) {
            throw new Error(`API returned an error: ${result.error}`);
          } else {
            throw new Error('API response does not have a recognized structure');
          }
          
          // Cache the fresh data
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(parsedData));
          } catch (e) {
            console.warn('Failed to cache data:', e);
          }
          
          // Update the data with fresh data
          if (!signal.aborted) {
            setData(parsedData);
            setError(null);
            
            // Call onDataLoaded callback if provided
            if (onDataLoaded) {
              onDataLoaded(parsedData);
            }
          }
        } catch (error) {
          // Only log the error, don't show it to the user if we have cached data
          console.error('Error fetching fresh data:', error);
          if (!cachedData) {
            setError(`Error fetching data: ${error instanceof Error ? error.message : String(error)}`);
          }
        } finally {
          setIsBackgroundLoading(false);
        }
      } catch (error) {
        // Only set error if we don't have cached data
        if (!parsedData.length) {
          console.error('Error processing data:', error);
          setError(`Error processing data: ${error instanceof Error ? error.message : String(error)}`);
          
          // Use sample data as fallback
          parsedData = getSampleData(
            chartConfig.chartType, 
            chartConfig.dataMapping.groupBy
          );
          
          setData(parsedData);
        }
      }
    };
    
    // Only fetch if we have a valid endpoint
    if (chartConfig.apiEndpoint) {
      fetchData();
    } else {
      setError("No API endpoint provided");
    }
    
    // Cleanup function to cancel pending requests when component unmounts
    return () => {
      controller.abort();
    };
  }, [chartConfig.apiEndpoint, chartConfig.apiKey, chartConfig.title, JSON.stringify(chartConfig.dataMapping), filterValues, isFilterChanged]);

  // Memoize the chart rendering to prevent unnecessary re-renders
  const renderChart = React.useCallback(() => {
    console.log("=== CHART RENDER DEBUG ===");
    console.log("Rendering chart with config:", {
      chartType: chartConfig.chartType,
      isStacked: chartConfig.isStacked,
      title: chartConfig.title,
      xAxis: chartConfig.dataMapping.xAxis,
      yAxis: chartConfig.dataMapping.yAxis,
      groupBy: chartConfig.dataMapping.groupBy
    });
    console.log("Data length:", data.length);
    console.log("First data item:", data[0]);
    
    // Get the unit from the chart config for use with all chart types
    const yAxisUnit = getYAxisUnit(chartConfig.dataMapping.yAxis);
    
    const commonProps = {
      chartConfig,
      data,
      isExpanded,
      onCloseExpanded,
      colorMap: legendColorMap,
      filterValues,
      hiddenSeries,
      yAxisUnit
    };
    
    switch (chartConfig.chartType) {
      case 'line':
      case 'bar':
        // For bar charts, check if stacked mode is enabled FIRST
        if (chartConfig.chartType === 'bar' && chartConfig.isStacked) {
          console.log("=== DECISION: Using StackedBarChart for stacked mode ===");
          return <StackedBarChart 
            {...commonProps}
            onFilterChange={(newFilters: Record<string, string>) => {
              // Apply the filter changes
              Object.entries(newFilters).forEach(([key, value]) => {
                handleFilterChange(key, value);
              });
            }}
          />;
        }
        
        // Then check for multi-series (array) configurations
        if (chartConfig.dataMapping.yAxis && Array.isArray(chartConfig.dataMapping.yAxis)) {
          console.log("=== DECISION: Using MultiSeriesLineBarChart for array yAxis ===");
          return <MultiSeriesLineBarChart 
            {...commonProps}
            onFilterChange={(newFilters: Record<string, string>) => {
              // Apply the filter changes
              Object.entries(newFilters).forEach(([key, value]) => {
                handleFilterChange(key, value);
              });
            }}
          />;
        }
        
        // For simple bar charts (single field, not stacked)
        console.log("=== DECISION: Using SimpleBarChart ===");
        return <SimpleBarChart 
          {...commonProps}
          onFilterChange={(newFilters: Record<string, string>) => {
            // Apply the filter changes
            Object.entries(newFilters).forEach(([key, value]) => {
              handleFilterChange(key, value);
            });
          }}
        />;
        
      case 'dual-axis': // Handle dual-axis with the enhanced BarChart
        return <DualAxisChart 
          {...commonProps}
          onFilterChange={(newFilters: Record<string, string>) => {
            // Apply the filter changes
            Object.entries(newFilters).forEach(([key, value]) => {
              handleFilterChange(key, value);
            });
          }}
        />;
        
      case 'pie':
        return <PieChart 
          {...commonProps}
          onFilterChange={(newFilters: Record<string, string>) => {
            // Apply the filter changes
            Object.entries(newFilters).forEach(([key, value]) => {
              handleFilterChange(key, value);
            });
          }}
        />;
        
      case 'area':
      case 'stacked-area':
        return <SimpleAreaChart 
          {...commonProps}
          isStacked={chartConfig.chartType === 'stacked-area'}
          onFilterChange={(newFilters: Record<string, string>) => {
            // Apply the filter changes
            Object.entries(newFilters).forEach(([key, value]) => {
              handleFilterChange(key, value);
            });
          }}
        />;
        
      default:
        console.warn(`Unsupported chart type: ${chartConfig.chartType}`);
        return null;
    }
  }, [chartConfig, data, isExpanded, onCloseExpanded, legendColorMap, filterValues, hiddenSeries]);

  // Implement logic to extract the unit from yAxis when necessary
  const getYAxisUnit = (yAxis: string | YAxisConfig | (string | YAxisConfig)[]): string | undefined => {
    // Check if we're using a dataMapping.yAxisUnit field (single field mode)
    if (chartConfig.dataMapping.yAxisUnit) {
      return chartConfig.dataMapping.yAxisUnit;
    }
    
    // Otherwise try to get unit from YAxisConfig objects if available
    if (Array.isArray(yAxis) && yAxis.length > 0 && typeof yAxis[0] !== 'string') {
      return (yAxis[0] as YAxisConfig).unit;
    }
    
    // Handle single YAxisConfig
    if (typeof yAxis !== 'string' && !Array.isArray(yAxis)) {
      return yAxis.unit;
    }
    
    // No unit specified
    return undefined;
  };

  if (error) {
    console.log("=== ERROR STATE ===", error);
    console.log("Data available despite error:", data.length);
    
    // Don't return early if we have data to show
    if (data.length === 0) {
      return (
        <div className="p-4 rounded-md">
          <div className="flex">
            
          </div>
        </div>
      );
    }
    
  
  }

  // Render expanded modal view if isExpanded is true
  if (isExpanded) {
    return (
      <Modal 
        isOpen={isExpanded} 
        onClose={onCloseExpanded || (() => {})} 
        title={chartConfig.title}
        subtitle={chartConfig.subtitle}
        isLoading={isLoading}
      >
        <div className="h-[70vh] w-full relative">
          {/* Add filter controls in modal */}
          {chartConfig.additionalOptions?.filters && (
            <div className="flex flex-wrap gap-3 items-center mb-4 px-2">
              {/* Time Filter */}
              {chartConfig.additionalOptions.filters.timeFilter && (
                <TimeFilterSelector
                  value={filterValues['timeFilter'] || chartConfig.additionalOptions.filters.timeFilter.options[0]}
                  onChange={(value) => handleFilterChange('timeFilter', value)}
                  options={chartConfig.additionalOptions.filters.timeFilter.options.map((value: string) => ({ 
                    value, 
                    label: value 
                  }))}
                />
              )}
              
              {/* Currency Filter */}
              {chartConfig.additionalOptions.filters.currencyFilter && (
                <CurrencyFilter
                  currency={filterValues['currencyFilter'] || chartConfig.additionalOptions.filters.currencyFilter.options[0]}
                  options={chartConfig.additionalOptions.filters.currencyFilter.options}
                  onChange={(value) => handleFilterChange('currencyFilter', value)}
                />
              )}
              
              {/* Display Mode Filter */}
              {chartConfig.additionalOptions.filters.displayModeFilter && (
                <DisplayModeFilter
                  mode={filterValues['displayModeFilter'] as DisplayMode || chartConfig.additionalOptions.filters.displayModeFilter.options[0] as DisplayMode}
                  onChange={(value) => handleFilterChange('displayModeFilter', value)}
                />
              )}
            </div>
          )}
          
          {/* Chart container with proper containment */}
          <div className="h-full w-full">
            {renderChart()}
          </div>
        </div>
      </Modal>
    );
  }

  // Render the regular chart
  return renderChart();
};

export default ChartRenderer; 