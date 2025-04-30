"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { BarStack } from '@visx/shape';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import { GridRows } from '@visx/grid';
import { AxisBottom, AxisLeft } from '@visx/axis';
import Modal from '../shared/Modal';
import Loader from '../shared/Loader';
import ChartTooltip from '../shared/ChartTooltip';
import { DataType } from '../shared/filters/DataTypeFilter';
import { DisplayMode } from '../shared/filters/DisplayModeFilter';
import { 
  AggregatorsDataPoint, 
  formatCurrency, 
  formatTraders, 
  formatMonth, 
  fetchAggregatorsDataWithFallback, 
  getUniqueAggregators, 
  getUniqueMonths 
} from '../../api/dex/aggregators/aggregatorsData';
import { ExpandIcon } from '../shared/Icons';
import DataTypeFilter from '../shared/filters/DataTypeFilter';
import DisplayModeFilter from '../shared/filters/DisplayModeFilter';
import BrushTimeScale from '../shared/BrushTimeScale';

// Define a type for the aggregator colors
type AggregatorColors = {
  [key: string]: string;
};

// Define colors for aggregators
export const aggregatorColors: AggregatorColors = {
  'Jupiter': '#60a5fa', // blue
  'OKX': '#34d399', // green
  'Non-Aggregator': '#a78bfa', // purple
  // Fallback color for any other aggregators that might appear
  'default': '#f97316' // orange
};

// Get the color for a specific aggregator
const getAggregatorColor = (aggregator: string): string => {
  return aggregatorColors[aggregator] || aggregatorColors.default;
};

// Interface for props
interface AggregatorsChartProps {
  dataType: DataType;
  displayMode: DisplayMode;
  isModalOpen: boolean;
  onModalClose: () => void;
}

// Main chart component
const AggregatorsChart: React.FC<AggregatorsChartProps> = ({
  dataType,
  displayMode,
  isModalOpen,
  onModalClose
}) => {
  // Data states
  const [data, setData] = useState<AggregatorsDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Chart data processing states
  const [aggregators, setAggregators] = useState<string[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  
  // Brush and filtering states
  const [filteredData, setFilteredData] = useState<AggregatorsDataPoint[]>([]);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isBrushActive, setIsBrushActive] = useState(false);
  
  // Modal specific states
  const [modalData, setModalData] = useState<AggregatorsDataPoint[]>([]);
  const [modalFilteredData, setModalFilteredData] = useState<AggregatorsDataPoint[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalDataType, setModalDataType] = useState<DataType>(dataType);
  const [modalDisplayMode, setModalDisplayMode] = useState<DisplayMode>(displayMode);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  
  // Add refs for throttling
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canUpdateFilteredDataRef = useRef<boolean>(true);
  const modalThrottleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canUpdateModalFilteredDataRef = useRef<boolean>(true);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    month: string;
    items: { aggregator: string; value: number; rawValue: number; color: string }[];
  }>({
    visible: false,
    x: 0,
    y: 0,
    month: '',
    items: []
  });

  // Fetch data for the chart
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const chartData = await fetchAggregatorsDataWithFallback();
      setData(chartData);
      setFilteredData(chartData); // Initialize filtered data with all data
      
      // Process the data for the chart
      const uniqueAggregators = getUniqueAggregators(chartData);
      const uniqueMonths = getUniqueMonths(chartData);
      
      setAggregators(uniqueAggregators);
      setMonths(uniqueMonths);
      
    } catch (err) {
      console.error('[AggregatorsChart] Error loading chart data:', err);
      setError('Failed to load data. Please try again later.');
      setData([]);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update modal data when it opens
  useEffect(() => {
    if (isModalOpen) {
      setModalLoading(true);
      setModalData(data);
      setModalFilteredData(filteredData);
      setModalDataType(dataType);
      
      // Only initialize display mode when the modal first opens
      if (modalData.length === 0) {
        setModalDisplayMode(displayMode);
      }
      
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
      setModalLoading(false);
    }
  }, [isModalOpen, data, filteredData, dataType, brushDomain, isBrushActive, modalData.length]);

  // Handle modal data type change
  const handleModalDataTypeChange = (type: DataType) => {
    setModalDataType(type);
  };

  // Handle modal display mode change
  const handleModalDisplayModeChange = (mode: DisplayMode) => {
    setModalDisplayMode(mode);
  };

  // Handle brush change with throttling
  const handleBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isBrushActive) {
        setBrushDomain(null);
        setIsBrushActive(false);
        setFilteredData(data);
      }
      // Clear any pending throttle timeout
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
        throttleTimeoutRef.current = null;
        canUpdateFilteredDataRef.current = true; // Allow immediate update on clear
      }
      return;
    }
    
    const { x0, x1 } = domain;
    const startDate = new Date(x0);
    const endDate = new Date(x1);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return; // Ignore invalid dates
    }

    // Update immediate brush domain for visual feedback
    const newDomain: [Date, Date] = [startDate, endDate];
    setBrushDomain(newDomain);
    if (!isBrushActive) {
      setIsBrushActive(true);
    }
    
    // Apply throttling to data filtering
    if (canUpdateFilteredDataRef.current) {
      canUpdateFilteredDataRef.current = false;
      
      // Filter data within the date range
      const filtered = data.filter(d => {
        const itemDate = new Date(formatMonth(d.month)).getTime();
        return itemDate >= startDate.getTime() && itemDate <= endDate.getTime();
      });
      
      if (filtered.length === 0) {
        // Fallback to all data if no dates are in range
        setFilteredData(data);
      } else {
        // Set filtered data
        setFilteredData(filtered);
      }
      
      // Set timeout to allow next update
      throttleTimeoutRef.current = setTimeout(() => {
        canUpdateFilteredDataRef.current = true;
        throttleTimeoutRef.current = null;
      }, 100);
    }
  }, [isBrushActive, data]);
  
  // Handle modal brush change with throttling
  const handleModalBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isModalBrushActive) {
        setModalBrushDomain(null);
        setIsModalBrushActive(false);
        setModalFilteredData(modalData);
      }
      // Clear any pending throttle timeout
      if (modalThrottleTimeoutRef.current) {
        clearTimeout(modalThrottleTimeoutRef.current);
        modalThrottleTimeoutRef.current = null;
        canUpdateModalFilteredDataRef.current = true; // Allow immediate update on clear
      }
      return;
    }
    
    const { x0, x1 } = domain;
    const startDate = new Date(x0);
    const endDate = new Date(x1);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return; // Ignore invalid dates
    }

    // Update immediate brush domain for visual feedback
    const newDomain: [Date, Date] = [startDate, endDate];
    setModalBrushDomain(newDomain);
    if (!isModalBrushActive) {
      setIsModalBrushActive(true);
    }
    
    // Apply throttling to data filtering
    if (canUpdateModalFilteredDataRef.current) {
      canUpdateModalFilteredDataRef.current = false;
      
      // Filter data within the date range
      const filtered = modalData.filter(d => {
        const itemDate = new Date(formatMonth(d.month)).getTime();
        return itemDate >= startDate.getTime() && itemDate <= endDate.getTime();
      });
      
      if (filtered.length === 0) {
        // Fallback to all data if no dates are in range
        setModalFilteredData(modalData);
      } else {
        // Set filtered data
        setModalFilteredData(filtered);
      }
      
      // Set timeout to allow next update
      modalThrottleTimeoutRef.current = setTimeout(() => {
        canUpdateModalFilteredDataRef.current = true;
        modalThrottleTimeoutRef.current = null;
      }, 100);
    }
  }, [isModalBrushActive, modalData]);

  // Process data for brush component
  const processDataForBrush = useCallback((chartData: AggregatorsDataPoint[], chartDataType: DataType): { date: string; value: number }[] => {
    if (!chartData || chartData.length === 0) {
      return [];
    }
    
    // Sum up all aggregator values for each month
    const aggregatorData = chartData.reduce((acc, item) => {
      const month = item.month;
      if (!acc[month]) {
        acc[month] = {
          date: month,
          value: 0
        };
      }
      
      const value = chartDataType === 'volume' ? item.volume : item.signers;
      acc[month].value += value;
      
      return acc;
    }, {} as Record<string, { date: string; value: number }>);
    
    return Object.values(aggregatorData)
      .map(item => ({
        date: new Date(item.date).toISOString(),
        value: item.value
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, []);

  // Format value based on data type and display mode
  const formatValue = (value: number, type: DataType, totalValue?: number): string => {
    if (displayMode === 'percent' && totalValue) {
      const percentage = (value / totalValue) * 100;
      return `${percentage.toFixed(1)}%`;
    }
    
    return type === 'volume' 
      ? formatCurrency(value) 
      : formatTraders(value);
  };

  // Prepare chart data for rendering
  const prepareChartData = useCallback((
    chartData: AggregatorsDataPoint[], 
    chartAggregators: string[], 
    chartMonths: string[],
    chartDataType: DataType,
    displayMode: DisplayMode
  ) => {
    // Create a map of month -> { aggregator -> value }
    const dataMap: Record<string, Record<string, number>> = {};
    
    // Initialize all months with zero values for all aggregators
    chartMonths.forEach(month => {
      dataMap[month] = {};
      chartAggregators.forEach(aggregator => {
        dataMap[month][aggregator] = 0;
      });
    });
    
    // Fill in the actual values
    chartData.forEach(point => {
      if (dataMap[point.month]) {
        const value = chartDataType === 'volume' ? point.volume : point.signers;
        dataMap[point.month][point.aggregator] = value;
      }
    });
    
    // Convert to the format expected by BarStack
    const result = chartMonths.map(month => {
      const monthData: any = { month };
      
      // Calculate total for this month if percentage mode
      let total = 0;
      if (displayMode === 'percent') {
        chartAggregators.forEach(aggregator => {
          total += dataMap[month][aggregator] || 0;
        });
      }
      
      // Add values to the month data
      chartAggregators.forEach(aggregator => {
        const value = dataMap[month][aggregator] || 0;
        
        // For percentage mode, convert value to percentage
        if (displayMode === 'percent' && total > 0) {
          monthData[aggregator] = (value / total) * 100;
        } else {
          monthData[aggregator] = value;
        }
      });
      
      return monthData;
    });
    
    return result;
  }, []);

  // Calculate total values by month for percentage mode
  const calculateTotals = useCallback((
    chartData: AggregatorsDataPoint[], 
    chartMonths: string[],
    chartDataType: DataType
  ): Record<string, number> => {
    const totals: Record<string, number> = {};
    
    chartMonths.forEach(month => {
      totals[month] = 0;
    });
    
    chartData.forEach(point => {
      const value = chartDataType === 'volume' ? point.volume : point.signers;
      totals[point.month] = (totals[point.month] || 0) + value;
    });
    
    return totals;
  }, []);

  // Handle mouse move for tooltip display
  const handleMouseMove = useCallback((
    event: React.MouseEvent<SVGRectElement>,
    month: string,
    aggregator: string,
    value: number,
    chartData: AggregatorsDataPoint[],
    chartAggregators: string[],
    chartDataType: DataType,
    isPercentMode: boolean
  ) => {
    const chartMonths = getUniqueMonths(chartData);
    const totals = calculateTotals(chartData, chartMonths, chartDataType);
    
    // Get all values for this month
    const monthData = chartData.filter(d => d.month === month);
    
    const tooltipItems = chartAggregators.map(agg => {
      const dataPoint = monthData.find(d => d.aggregator === agg);
      const itemValue = dataPoint 
        ? (chartDataType === 'volume' ? dataPoint.volume : dataPoint.signers) 
        : 0;
      
      let displayValue = itemValue;
      if (isPercentMode && totals[month]) {
        displayValue = (itemValue / totals[month]) * 100;
      }
      
      return {
        aggregator: agg,
        value: displayValue,
        rawValue: itemValue,
        color: getAggregatorColor(agg)
      };
    }).sort((a, b) => b.value - a.value);
    
    setTooltip({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      month,
      items: tooltipItems
    });
  }, [calculateTotals]);

  // Handle mouse leave to hide tooltip
  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  // Cleanup throttle timeout on unmount
  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
      if (modalThrottleTimeoutRef.current) {
        clearTimeout(modalThrottleTimeoutRef.current);
      }
    };
  }, []);

  // Render the chart content
  const renderChart = (isModal = false) => {
    // Use the appropriate data based on whether we're in the modal or main view
    const chartData = isModal 
      ? (isModalBrushActive ? modalFilteredData : modalData) 
      : (isBrushActive ? filteredData : data);
    const chartAggregators = getUniqueAggregators(chartData);
    const chartMonths = getUniqueMonths(chartData);
    const chartDataType = isModal ? modalDataType : dataType;
    const chartDisplayMode = isModal ? modalDisplayMode : displayMode;
    const isPercentMode = chartDisplayMode === 'percent';
    
    // Handle loading and error states
    if (isModal ? modalLoading : isLoading) {
      return <div className="flex items-center justify-center h-full"><Loader size="sm" /></div>;
    }
    
    if (error || chartData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
          <p>{error || 'No data available'}</p>
        </div>
      );
    }
    
    // Prepare data for the chart - now pass the display mode
    const processedData = prepareChartData(chartData, chartAggregators, chartMonths, chartDataType, chartDisplayMode);
    const totals = calculateTotals(chartData, chartMonths, chartDataType);

    // Render just the chart content for the modal view
    if (isModal) {
      return (
        <div className="flex flex-col h-full w-full">
          {/* Tooltip */}
          {tooltip.visible && (
            <ChartTooltip
              title={formatMonth(tooltip.month)}
              items={tooltip.items.map(item => ({
                color: item.color,
                label: item.aggregator,
                value: isPercentMode 
                  ? `${item.value.toFixed(1)}%` 
                  : (chartDataType === 'volume' 
                    ? formatCurrency(item.rawValue || item.value) 
                    : formatTraders(item.rawValue || item.value)),
                shape: 'square'
              }))}
              top={tooltip.y - (isModal ? 50 : 240)}
              left={tooltip.x - (isModal ? 50 : 240)}
              isModal={isModal}
            />
          )}
          
          {/* Main chart */}
          <div className="h-[85%] w-full relative">
            <ParentSize>
              {({ width, height }) => {
                if (width < 10 || height < 10) return null;
                
                // Chart margins
                const margin = { top: 20, right: 20, bottom: 40, left: 60 };
                const innerWidth = width - margin.left - margin.right;
                const innerHeight = height - margin.top - margin.bottom;
                
                // X scale (months)
                const xScale = scaleBand<string>({
                  domain: chartMonths,
                  padding: 0.2,
                  range: [0, innerWidth]
                });
                
                // Calculate the maximum value for y scale
                let maxValue = 0;
                if (isPercentMode) {
                  maxValue = 100; // 100% for percentage mode
                } else {
                  // Find the max stacked value
                  chartMonths.forEach(month => {
                    maxValue = Math.max(maxValue, totals[month] || 0);
                  });
                }
                
                // Y scale
                const yScale = scaleLinear<number>({
                  domain: [0, isPercentMode ? 100 : maxValue * 1.1], // No padding for percentage mode
                  range: [innerHeight, 0],
                  nice: true
                });
                
                // Color scale
                const colorScale = scaleOrdinal<string, string>({
                  domain: chartAggregators,
                  range: chartAggregators.map(agg => getAggregatorColor(agg))
                });
                
                return (
                  <svg width={width} height={height}>
                    <Group left={margin.left} top={margin.top}>
                      {/* Display active brush status */}
                      {(isModal ? isModalBrushActive : isBrushActive) && (
                        <text x={0} y={-8} fontSize={8} fill={colorScale(chartAggregators[0])} textAnchor="start">
                          {`Filtered: ${chartData.length} item${chartData.length !== 1 ? 's' : ''}`}
                        </text>
                      )}
                    
                      {/* Background grid */}
                      <GridRows
                        scale={yScale}
                        width={innerWidth}
                        height={innerHeight}
                        stroke="#1f2937"
                        strokeOpacity={0.2}
                        strokeDasharray="2,3"
                      />
                      
                      {/* Y axis */}
                      <AxisLeft
                        scale={yScale}
                        hideZero
                        stroke="#374151"
                        tickStroke="transparent"
                        tickFormat={(value) => {
                          const val = value as number;
                          if (isPercentMode) {
                            return `${val}%`;
                          }
                          return chartDataType === 'volume'
                            ? formatCurrency(val)
                            : formatTraders(val);
                        }}
                        tickLabelProps={() => ({
                          fill: '#6b7280',
                          fontSize: 11,
                          textAnchor: 'end',
                          dx: '-0.25em',
                          dy: '0.25em'
                        })}
                      />
                      
                      {/* X axis */}
                      <AxisBottom
                        top={innerHeight}
                        scale={xScale}
                        stroke="#374151"
                        tickStroke="transparent"
                        tickFormat={(month) => formatMonth(month as string)}
                        tickLabelProps={() => ({
                          fill: '#6b7280',
                          fontSize: 11,
                          textAnchor: 'middle',
                          dy: '0.25em'
                        })}
                      />
                      
                      {/* Stacked bars */}
                      <BarStack
                        data={processedData}
                        keys={chartAggregators}
                        x={(d: any) => d.month}
                        xScale={xScale}
                        yScale={yScale}
                        color={colorScale}
                      >
                        {(barStacks) => 
                          barStacks.map(barStack => 
                            barStack.bars.map(bar => {
                              // Get raw value for this segment
                              const rawValue = bar.bar[bar.key as keyof typeof bar.bar] as number;
                              
                              return (
                                <rect
                                  key={`bar-stack-${barStack.index}-${bar.index}`}
                                  x={bar.x}
                                  y={bar.y}
                                  height={bar.height}
                                  width={bar.width}
                                  fill={bar.color}
                                  opacity={0.75}
                                  rx={1}
                                  onMouseMove={(e) => handleMouseMove(
                                    e, 
                                    (bar.bar.data as { month: string }).month, 
                                    bar.key, 
                                    rawValue,
                                    chartData,
                                    chartAggregators,
                                    chartDataType,
                                    isPercentMode
                                  )}
                                  onMouseLeave={handleMouseLeave}
                                />
                              );
                            })
                          )
                        }
                      </BarStack>
                    </Group>
                  </svg>
                );
              }}
            </ParentSize>
          </div>
          
          {/* Brush component */}
          <div className="h-[15%] w-full mt-1">
            <BrushTimeScale
              data={processDataForBrush(
                isModal ? modalData : data,
                isModal ? modalDataType : dataType
              )}
              isModal={isModal}
              activeBrushDomain={isModal ? modalBrushDomain : brushDomain}
              onBrushChange={isModal ? handleModalBrushChange : handleBrushChange}
              onClearBrush={() => {
                if (isModal) {
                  setModalBrushDomain(null);
                  setIsModalBrushActive(false);
                  setModalFilteredData(modalData);
                } else {
                  setBrushDomain(null);
                  setIsBrushActive(false);
                  setFilteredData(data);
                }
              }}
              getDate={(d) => (d as { date: string }).date}
              getValue={(d) => (d as { value: number }).value}
              lineColor={dataType === 'volume' ? "#60a5fa" : "#34d399"}
              margin={{ top: 5, right: 20, bottom: 10, left: 60 }}
            />
          </div>
        </div>
      );
    }
    
    // For the main view, follow the summary page layout
    return (
      <div className="flex flex-col lg:flex-row h-[360px] lg:h-80">
        {/* Chart area - main section */}
        <div className="flex-grow lg:pr-3 lg:border-r lg:border-gray-900 h-80 lg:h-auto">
          <div className="h-full w-full relative">
            {/* Tooltip */}
            {tooltip.visible && (
              <ChartTooltip
                title={formatMonth(tooltip.month)}
                items={tooltip.items.map(item => ({
                  color: item.color,
                  label: item.aggregator,
                  value: isPercentMode 
                    ? `${item.value.toFixed(1)}%` 
                    : (chartDataType === 'volume' 
                      ? formatCurrency(item.rawValue || item.value) 
                      : formatTraders(item.rawValue || item.value)),
                  shape: 'square'
                }))}
                top={tooltip.y - 240}
                left={tooltip.x - 240}
                isModal={false}
              />
            )}
            
            {/* Main chart content */}
            <div className="h-[85%] w-full">
              <ParentSize>
                {({ width, height }) => 
                  renderStackedBarChart(width, height, chartData, chartAggregators, chartMonths, chartDataType, isPercentMode, processedData, totals, false)
                }
              </ParentSize>
            </div>
            
            {/* Brush component */}
            <div className="h-[15%] w-full mt-1">
              <BrushTimeScale
                data={processDataForBrush(data, dataType)}
                isModal={false}
                activeBrushDomain={brushDomain}
                onBrushChange={handleBrushChange}
                onClearBrush={() => {
                  setBrushDomain(null);
                  setIsBrushActive(false);
                  setFilteredData(data);
                }}
                getDate={(d) => (d as { date: string }).date}
                getValue={(d) => (d as { value: number }).value}
                lineColor={dataType === 'volume' ? "#60a5fa" : "#34d399"}
                margin={{ top: 5, right: 20, bottom: 10, left: 60 }}
              />
            </div>
          </div>
        </div>
        
        {/* Legend area - horizontal on mobile, vertical on desktop */}
        <div className="w-full lg:w-1/5 mt-2 lg:mt-0 lg:pl-3 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible">
          <div className="flex flex-row lg:flex-col gap-4 lg:gap-3 pt-1 pb-2 lg:pb-0">
            <div className="text-[10px] text-gray-400 mb-2 whitespace-nowrap">AGGREGATORS</div>
            <div className="flex flex-row lg:flex-col gap-4 lg:gap-3">
              {chartAggregators.length > 0 ? (
                chartAggregators.map((aggregator) => (
                  <div key={aggregator} className="flex items-start whitespace-nowrap">
                    <div 
                      className="w-2 h-2 mr-2 rounded-sm mt-0.5" 
                      style={{ background: getAggregatorColor(aggregator) }}
                    ></div>
                    <span className="text-xs text-gray-300 truncate" title={aggregator}>
                      {aggregator.length > 12 ? `${aggregator.substring(0, 12)}...` : aggregator}
                    </span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                    <div className="text-xs text-gray-300">Loading...</div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-purple-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                    <div className="text-xs text-gray-300">Loading...</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Extract the bar chart rendering logic to a separate function for reuse
  const renderStackedBarChart = (
    width: number, 
    height: number, 
    chartData: AggregatorsDataPoint[], 
    chartAggregators: string[], 
    chartMonths: string[], 
    chartDataType: DataType, 
    isPercentMode: boolean, 
    processedData: any, 
    totals: Record<string, number>,
    isModal: boolean
  ) => {
    if (width < 10 || height < 10) return null;
    
    // Chart margins
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // X scale (months)
    const xScale = scaleBand<string>({
      domain: chartMonths,
      padding: 0.2,
      range: [0, innerWidth]
    });
    
    // Calculate the maximum value for y scale
    let maxValue = 0;
    if (isPercentMode) {
      maxValue = 100; // 100% for percentage mode
    } else {
      // Find the max stacked value
      chartMonths.forEach(month => {
        maxValue = Math.max(maxValue, totals[month] || 0);
      });
    }
    
    // Y scale
    const yScale = scaleLinear<number>({
      domain: [0, isPercentMode ? 100 : maxValue * 1.1], // No padding for percentage mode
      range: [innerHeight, 0],
      nice: true
    });
    
    // Color scale
    const colorScale = scaleOrdinal<string, string>({
      domain: chartAggregators,
      range: chartAggregators.map(agg => getAggregatorColor(agg))
    });
    
    return (
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          {/* Display active brush status */}
          {(isModal ? isModalBrushActive : isBrushActive) && (
            <text x={0} y={-8} fontSize={8} fill={colorScale(chartAggregators[0])} textAnchor="start">
              {`Filtered: ${chartData.length} item${chartData.length !== 1 ? 's' : ''}`}
            </text>
          )}
        
          {/* Background grid */}
          <GridRows
            scale={yScale}
            width={innerWidth}
            height={innerHeight}
            stroke="#1f2937"
            strokeOpacity={0.2}
            strokeDasharray="2,3"
          />
          
          {/* Y axis */}
          <AxisLeft
            scale={yScale}
            hideZero
            stroke="#374151"
            tickStroke="transparent"
            tickFormat={(value) => {
              const val = value as number;
              if (isPercentMode) {
                return `${val}%`;
              }
              return chartDataType === 'volume'
                ? formatCurrency(val)
                : formatTraders(val);
            }}
            tickLabelProps={() => ({
              fill: '#6b7280',
              fontSize: 11,
              textAnchor: 'end',
              dx: '-0.25em',
              dy: '0.25em'
            })}
          />
          
          {/* X axis */}
          <AxisBottom
            top={innerHeight}
            scale={xScale}
            stroke="#374151"
            tickStroke="transparent"
            tickFormat={(month) => formatMonth(month as string)}
            tickLabelProps={() => ({
              fill: '#6b7280',
              fontSize: 11,
              textAnchor: 'middle',
              dy: '0.25em'
            })}
          />
          
          {/* Stacked bars */}
          <BarStack
            data={processedData}
            keys={chartAggregators}
            x={(d: any) => d.month}
            xScale={xScale}
            yScale={yScale}
            color={colorScale}
          >
            {(barStacks) => 
              barStacks.map(barStack => 
                barStack.bars.map(bar => {
                  // Get raw value for this segment
                  const rawValue = bar.bar[bar.key as keyof typeof bar.bar] as number;
                  
                  return (
                    <rect
                      key={`bar-stack-${barStack.index}-${bar.index}`}
                      x={bar.x}
                      y={bar.y}
                      height={bar.height}
                      width={bar.width}
                      fill={bar.color}
                      opacity={0.75}
                      rx={1}
                      onMouseMove={(e) => handleMouseMove(
                        e, 
                        (bar.bar.data as { month: string }).month, 
                        bar.key, 
                        rawValue,
                        chartData,
                        chartAggregators,
                        chartDataType,
                        isPercentMode
                      )}
                      onMouseLeave={handleMouseLeave}
                    />
                  );
                })
              )
            }
          </BarStack>
        </Group>
      </svg>
    );
  };

  // Render modal content
  const renderModalContent = () => {
    return (
      <div className="p-4 w-full h-full">
        {/* Filters - horizontal row */}
        <div className="flex items-center justify-between pl-1 py-0 mb-3">
          <div className="flex space-x-4 items-center">
            <DataTypeFilter 
              selectedDataType={modalDataType} 
              onChange={handleModalDataTypeChange}
              isCompact={true}
            />
            <DisplayModeFilter 
              mode={modalDisplayMode} 
              onChange={handleModalDisplayModeChange}
              isCompact={true}
            />
          </div>
        </div>
        
        {/* Horizontal line */}
        <div className="h-px bg-gray-900 w-full mb-3"></div>
        
        {/* Chart with legends in modal */}
        <div className="h-[60vh]">
          <div className="flex flex-col lg:flex-row h-full">
            {/* Chart area - main section */}
            <div className="flex-grow lg:pr-3 lg:border-r lg:border-gray-900 h-[85%] lg:h-auto">
              {renderChart(true)}
            </div>
            
            {/* Legend area - horizontal on mobile, vertical on desktop */}
            <div className="w-full lg:w-1/5 mt-2 lg:mt-0 lg:pl-3 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible">
              <div className="flex flex-row lg:flex-col gap-4 lg:gap-3 pt-1 pb-2 lg:pb-0">
                <div className="text-[10px] text-gray-400 mb-2 whitespace-nowrap">AGGREGATORS</div>
                <div className="flex flex-row lg:flex-col gap-4 lg:gap-3">
                  {getUniqueAggregators(modalData).length > 0 ? (
                    getUniqueAggregators(modalData).map((aggregator) => (
                      <div key={aggregator} className="flex items-start whitespace-nowrap">
                        <div 
                          className="w-2 h-2 mr-2 rounded-sm mt-0.5" 
                          style={{ background: getAggregatorColor(aggregator) }}
                        ></div>
                        <span className="text-xs text-gray-300 truncate" title={aggregator}>
                          {aggregator.length > 12 ? `${aggregator.substring(0, 12)}...` : aggregator}
                        </span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-blue-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                        <div className="text-xs text-gray-300">Loading...</div>
                      </div>
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-purple-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                        <div className="text-xs text-gray-300">Loading...</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full">
      {renderChart()}
      
      {/* Modal for expanded view */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={onModalClose} 
        title="DEX Aggregators" 
        subtitle="Trading volume and active traders by aggregator"
      >
        {renderModalContent()}
      </Modal>
    </div>
  );
};

export default AggregatorsChart; 