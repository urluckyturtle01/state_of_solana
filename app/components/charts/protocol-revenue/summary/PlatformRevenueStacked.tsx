"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { BarStack } from '@visx/shape';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import { GridRows } from '@visx/grid';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { localPoint } from '@visx/event';
import Loader from '../../../shared/Loader';
import ButtonSecondary from '../../../shared/buttons/ButtonSecondary';
import Modal from '../../../shared/Modal';
import TimeFilterSelector from '../../../shared/filters/TimeFilter';
import ChartTooltip from '../../../shared/ChartTooltip';
import BrushTimeScale from '../../../shared/BrushTimeScale';
import { TimeFilter, fetchPlatformRevenueData, formatCurrency, getPlatformColor, normalizePlatformName, platformColors } from '../../../../api/protocol-revenue/summary/platformRevenueData';
import { grid, axisLines, tickLabels, colors } from '../../../../utils/chartColors';

const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

interface PlatformStackedData {
  date: string;
  [key: string]: string | number;
}

interface PlatformRevenueStackedProps {
  timeFilter?: TimeFilter;
  isModalOpen?: boolean;
  onModalClose?: () => void;
  onTimeFilterChange?: (val: TimeFilter) => void;
  platformsChanged?: (platforms: Array<{platform: string, color: string, revenue: number}>) => void;
}

const PlatformRevenueStacked: React.FC<PlatformRevenueStackedProps> = ({
  timeFilter = 'M',
  isModalOpen = false,
  onModalClose = () => {},
  onTimeFilterChange,
  platformsChanged,
}) => {
  const [data, setData] = useState<PlatformStackedData[]>([]);
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [filteredData, setFilteredData] = useState<PlatformStackedData[]>([]);
  
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    dataPoint: null as any, 
    platforms: [] as string[],
    left: 0, 
    top: 0 
  });
  
  const chartRef = useRef<HTMLDivElement | null>(null);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const processData = (apiData: any[]) => {
    if (!apiData.length) return { data: [], keys: [] };
    
    // Group by date and platform - keeping all platforms exactly as they come from API
    const dateGroups = new Map<string, Record<string, number>>();
    const platformSet = new Set<string>();
    
    // Log all original platform names for debugging
    console.log("Original platform names from API:", apiData.map(item => item.platform));
    
    apiData.forEach(item => {
      const { block_date: date, platform, protocol_revenue_usd: revenue } = item;
      if (!date || !platform || revenue === undefined) return;
      
      platformSet.add(platform);
      if (!dateGroups.has(date)) dateGroups.set(date, {});
      const dateData = dateGroups.get(date)!;
      dateData[platform] = (dateData[platform] || 0) + revenue;
    });
    
    // Calculate platform totals for sorting (we'll show all platforms)
    const platformTotals: Record<string, number> = {};
    Array.from(platformSet).forEach(platform => {
      platformTotals[platform] = 0;
      for (const [, dateData] of dateGroups.entries()) {
        platformTotals[platform] += Number(dateData[platform] || 0);
      }
    });
    
    // Sort platforms by total revenue
    const sortedPlatforms = Object.entries(platformTotals)
      .sort(([, a], [, b]) => b - a)
      .map(([platform]) => platform);
    
    // Log sorted platforms and their colors
    console.log("Sorted platforms:", sortedPlatforms);
    sortedPlatforms.forEach(platform => {
      const color = platformColors[platform] || getPlatformColor(platform);
      console.log(`Platform ${platform} color: ${color}`);
    });
    
    // Create stacked data without creating any "Other" category
    const stackedData = Array.from(dateGroups.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, values]) => {
        const result: PlatformStackedData = { date };
        
        // Add all platforms directly
        sortedPlatforms.forEach(platform => {
          result[platform] = values[platform] || 0;
        });
        
        return result;
      });
    
    // Notify parent of platform changes if callback provided
    if (platformsChanged) {
      const platformInfo = sortedPlatforms.map(platform => ({
        platform,
        color: platformColors[platform] || getPlatformColor(platform),
        revenue: platformTotals[platform] || 0
      }));
      platformsChanged(platformInfo);
    }
    
    return { data: stackedData, keys: sortedPlatforms };
  };
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiData = await fetchPlatformRevenueData(timeFilter);
      if (!apiData || apiData.length === 0) {
        setError('No data available');
        setData([]);
        setKeys([]);
        setFilteredData([]);
      } else {
        const { data: processedData, keys: platformKeys } = processData(apiData);
        
        // Log the colors being assigned to each platform
        console.log("Platform colors mapping:");
        platformKeys.forEach(platform => {
          console.log(`${platform}: ${platformColors[platform] || getPlatformColor(platform)}`);
        });
        
        setData(processedData);
        setFilteredData(processedData);
        setKeys(platformKeys);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
      setData([]);
      setKeys([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  }, [timeFilter, platformsChanged]);
  
  useEffect(() => { 
    // Debug colors array
    console.log("Colors array:", colors);
    console.log("platformColors mapping:", platformColors);
    
    fetchData(); 
  }, [fetchData]);
  
  // Apply brush filter
  useEffect(() => {
    if (!data.length) return;
    
    if (!brushDomain) {
      setFilteredData(data);
      return;
    }
    
    const [start, end] = brushDomain;
    const filtered = data.filter(d => {
      const itemDate = new Date(d.date as string).getTime();
      return itemDate >= start.getTime() && itemDate <= end.getTime();
    });
    
    setFilteredData(filtered.length > 0 ? filtered : data);
  }, [brushDomain, data]);
  
  // Handle brush change
  const handleBrushChange = useCallback((domain: any) => {
    if (!domain) {
      setBrushDomain(null);
      return;
    }
    
    const { x0, x1 } = domain;
    setBrushDomain([new Date(x0), new Date(x1)]);
  }, []);
  
  // Handle tooltip
  const handleTooltip = useCallback((event: React.MouseEvent<SVGRectElement>, datum: PlatformStackedData, platforms: string[]) => {
    const { x, y } = localPoint(event) || { x: 0, y: 0 };
    setTooltip({ visible: true, dataPoint: datum, platforms, left: x, top: y });
  }, []);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) setTooltip(prev => ({ ...prev, visible: false }));
  }, [tooltip.visible]);
  
  // Render chart content
  const renderChart = () => {
    if (loading) return <div className="flex justify-center items-center h-full w-full"><Loader size="sm" /></div>;
    
    if (error || !filteredData.length) {
      return (
        <div className="flex flex-col justify-center items-center h-full w-full">
          <div className="text-gray-400/80 text-xs mb-2">{error || 'No data available'}</div>
          <ButtonSecondary onClick={fetchData}>
            <div className="flex items-center gap-1.5">
              <RefreshIcon className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </div>
          </ButtonSecondary>
        </div>
      );
    }
    
    return (
      <div className="h-full w-full">
        <div className="h-[85%] w-full" ref={chartRef} onMouseLeave={handleMouseLeave}>
          <ParentSize>
            {({ width, height }) => {
              const margin = { top: 5, right: 25, bottom: 30, left: 45 };
              const xMax = width - margin.left - margin.right;
              const yMax = height - margin.top - margin.bottom;
              
              // X scale for dates
              const xScale = scaleBand<string>({
                domain: filteredData.map(d => d.date as string),
                padding: 0.2,
                range: [0, xMax]
              });
              
              // Y scale for values
              const yScale = scaleLinear<number>({
                domain: [0, Math.max(...filteredData.map(d => 
                  keys.reduce((sum, k) => sum + (Number(d[k]) || 0), 0)
                ))],
                nice: true,
                range: [yMax, 0]
              });
              
              // Color scale for platforms
              const colorScale = scaleOrdinal<string, string>({
                domain: keys,
                range: keys.map(platform => platformColors[platform] || getPlatformColor(platform))
              });
              
              return (
                <>
                  <svg width={width} height={height}>
                    <Group left={margin.left} top={margin.top}>
                      <GridRows
                        scale={yScale}
                        width={xMax}
                        height={yMax}
                        stroke={grid}
                        strokeOpacity={0.5}
                        strokeDasharray="2,3"
                        numTicks={5}
                      />
                      
                      <BarStack
                        data={filteredData}
                        keys={keys}
                        x={d => d.date as string}
                        xScale={xScale}
                        yScale={yScale}
                        color={(key) => {
                          console.log(`Platform in BarStack: ${key}`);
                          // First priority: Use the exact platformColors mapping
                          if (platformColors[key]) {
                            console.log(`Using platformColors for ${key}: ${platformColors[key]}`);
                            return platformColors[key];
                          }
                          
                          // Second priority: Try case-insensitive match in platformColors
                          const lowerKey = key.toLowerCase();
                          const platformKey = Object.keys(platformColors).find(k => 
                            k.toLowerCase() === lowerKey
                          );
                          
                          if (platformKey) {
                            console.log(`Using platformColors (case-insensitive) for ${key} via ${platformKey}: ${platformColors[platformKey]}`);
                            return platformColors[platformKey];
                          }
                          
                          // Last resort: use getPlatformColor function
                          console.log(`Using getPlatformColor for ${key}`);
                          return getPlatformColor(key);
                        }}
                      >
                        {barStacks => {
                          return barStacks.map(barStack => {
                            return barStack.bars.map(bar => {
                              if (bar.height <= 0) return null;
                              
                              return (
                                <rect
                                  key={`bar-stack-${barStack.index}-${bar.index}`}
                                  x={bar.x}
                                  y={bar.y}
                                  height={bar.height}
                                  width={bar.width}
                                  fill={(() => {
                                    const platform = barStack.key;
                                    console.log(`Rendering bar for platform: ${platform}`);
                                    
                                    // Direct match in platformColors
                                    if (platformColors[platform]) {
                                      console.log(`Using platformColors for bar ${platform}: ${platformColors[platform]}`);
                                      return platformColors[platform];
                                    }
                                    
                                    // Case-insensitive match
                                    const lowerPlatform = platform.toLowerCase();
                                    const platformKey = Object.keys(platformColors).find(k => 
                                      k.toLowerCase() === lowerPlatform
                                    );
                                    
                                    if (platformKey) {
                                      console.log(`Using platformColors (case-insensitive) for bar ${platform} via ${platformKey}: ${platformColors[platformKey]}`);
                                      return platformColors[platformKey];
                                    }
                                    
                                    // Fallback to color from BarStack
                                    console.log(`Using bar.color for ${platform}: ${bar.color}`);
                                    return bar.color;
                                  })()}
                                  opacity={tooltip.visible && tooltip.dataPoint?.date === filteredData[bar.index].date ? 1 : 0.75}
                                  rx={2}
                                  onMouseLeave={handleMouseLeave}
                                  onMouseMove={e => {
                                    // Log platform and color for debugging
                                    console.log(`Bar Platform: ${barStack.key}, Color: ${platformColors[barStack.key] || bar.color}`);
                                    handleTooltip(e, filteredData[bar.index], keys);
                                  }}
                                />
                              );
                            }).filter(Boolean);
                          });
                        }}
                      </BarStack>
                      
                      <AxisBottom
                        top={yMax}
                        scale={xScale}
                        tickFormat={formatDate}
                        stroke={axisLines}
                        strokeWidth={0.5}
                        tickStroke="transparent"
                        tickLength={0}
                        hideZero={true}
                        tickLabelProps={() => ({
                          fill: tickLabels,
                          fontSize: 11,
                          fontWeight: 300,
                          letterSpacing: '0.05em',
                          textAnchor: 'middle',
                          dy: '0.5em'
                        })}
                        tickValues={filteredData.length > 10 ? 
                          filteredData.filter((_, i) => i % Math.ceil(filteredData.length / 10) === 0).map(d => d.date as string) : 
                          filteredData.map(d => d.date as string)
                        }
                      />
                      
                      <AxisLeft
                        scale={yScale}
                        stroke={axisLines}
                        strokeWidth={0.5}
                        tickStroke="transparent"
                        tickLength={0}
                        tickFormat={(value) => formatCurrency(value as number)}
                        tickLabelProps={() => ({
                          fill: tickLabels,
                          fontSize: 11,
                          fontWeight: 300,
                          letterSpacing: '0.05em',
                          textAnchor: 'end',
                          dx: '-0.6em',
                          dy: '0.25em'
                        })}
                      />
                    </Group>
                  </svg>
                  
                  {tooltip.visible && tooltip.dataPoint && (
                    <ChartTooltip
                      title={formatDate(tooltip.dataPoint.date as string)}
                      items={
                        tooltip.platforms
                          .filter(platform => Number(tooltip.dataPoint[platform] || 0) > 0)
                          .filter((platform, index, self) => self.indexOf(platform) === index)
                          .map((platform: string) => {
                            let color;
                            // Direct match in platformColors
                            if (platformColors[platform]) {
                              color = platformColors[platform];
                              console.log(`Tooltip using platformColors for ${platform}: ${color}`);
                            } 
                            // Case-insensitive match
                            else {
                              const lowerPlatform = platform.toLowerCase();
                              const platformKey = Object.keys(platformColors).find(k => 
                                k.toLowerCase() === lowerPlatform
                              );
                              
                              if (platformKey) {
                                color = platformColors[platformKey];
                                console.log(`Tooltip using platformColors (case-insensitive) for ${platform} via ${platformKey}: ${color}`);
                              } else {
                                color = getPlatformColor(platform);
                                console.log(`Tooltip using getPlatformColor for ${platform}: ${color}`);
                              }
                            }
                            
                            return {
                              color,
                              label: normalizePlatformName(platform),
                              value: formatCurrency(Number(tooltip.dataPoint[platform] || 0)),
                              shape: 'square' as const
                            };
                          })
                      }
                      top={tooltip.top}
                      left={tooltip.left}
                    />
                  )}
                </>
              );
            }}
          </ParentSize>
        </div>
        
        <div className="h-[15%] w-full mt-1">
          <BrushTimeScale
            data={data}
            activeBrushDomain={brushDomain}
            onBrushChange={handleBrushChange}
            onClearBrush={() => setBrushDomain(null)}
            getDate={d => d.date as string}
            getValue={d => keys.reduce((sum, platform) => sum + (Number(d[platform]) || 0), 0)}
            lineColor={platformColors[keys[0] || ''] || getPlatformColor(keys[0] || '')}
            margin={{ top: 5, right: 25, bottom: 10, left: 45 }}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      {renderChart()}
      
      {isModalOpen && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={onModalClose} 
          title="Protocol Revenue by Platform"
          subtitle="Stacked view of protocol revenue across platforms by time period"
        >
          <div className="flex justify-between pl-1 py-0 mb-3">
            <TimeFilterSelector
              value={timeFilter}
              onChange={onTimeFilterChange || (() => {})}
              options={[
                { value: 'W', label: 'W' },
                { value: 'M', label: 'M' },
                { value: 'Q', label: 'Q' },
                { value: 'Y', label: 'Y' }
              ]}
            />
          </div>
          
          <div className="h-px bg-gray-900 w-full mb-3"></div>
          
          <div className="h-[60vh]">
            <div className="flex h-full">
              <div className="w-[90%] h-full pr-3 border-r border-gray-900">
                {renderChart()}
              </div>
              
              <div className="w-[10%] h-full pl-3 flex flex-col justify-start items-start">
                <div className="text-[10px] text-gray-400 mb-2">PLATFORMS</div>
                {keys.slice(0, 10).map((platform) => (
                  <div key={platform} className="flex items-center mb-1.5">
                    <div 
                      className="w-2.5 h-2.5 rounded-sm mr-1.5" 
                      style={{ 
                        backgroundColor: (() => {
                          // Direct match in platformColors
                          if (platformColors[platform]) {
                            return platformColors[platform];
                          }
                          
                          // Case-insensitive match
                          const lowerPlatform = platform.toLowerCase();
                          const platformKey = Object.keys(platformColors).find(k => 
                            k.toLowerCase() === lowerPlatform
                          );
                          
                          if (platformKey) {
                            return platformColors[platformKey];
                          }
                          
                          return getPlatformColor(platform);
                        })()
                      }}
                    ></div>
                    <span className="text-[11px] text-gray-300">{normalizePlatformName(platform)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default PlatformRevenueStacked; 