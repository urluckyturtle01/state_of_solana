"use client";

import React, { useState, useEffect } from "react";
import Counter from "../../components/shared/Counter";
import { VolumeIcon, TvlIcon, UsersIcon, ExpandIcon, DownloadIcon } from "../../components/shared/Icons";
import TvlVelocityChart, { getTvlVelocityChartColors } from "../../components/charts/TvlVelocityChart";
import VelocityByDexChart from "../../components/charts/VelocityByDexChart";
import TimeFilterSelector from "../../components/charts/TimeFilter";
import { TimeFilter as TVLTimeFilter, fetchTvlVelocityData, TvlVelocityDataPoint } from "../../api/dex/summary/chartData";
import { fetchVelocityByDexData, getUniqueProgramTypes, getUniqueDates, TimeFilter, VelocityByDexDataPoint } from "../../api/dex/summary/velocityByDexData";
import { getLatestVolumeStats } from "../../api/dex/summary/volumeData";
import { getLatestTvlStats } from "../../api/dex/summary/tvlData";
import { getLatestTradersStats } from "../../api/dex/summary/tradersData";

// Define colors for program types (same as in VelocityByDexChart)
const baseColors = [
  '#60a5fa', // blue
  '#a78bfa', // purple
  '#34d399', // green
  '#f97316', // orange
  '#f43f5e', // red
  '#facc15', // yellow
];

// Get TVL and Velocity colors from the chart component
const tvlVelocityColors = getTvlVelocityChartColors();

const getColorForProgramType = (programType: string, programTypes: string[]) => {
  const index = programTypes.indexOf(programType) % baseColors.length;
  return baseColors[index];
};

// Function to get available metrics from TVL velocity data
const getAvailableMetrics = (data: TvlVelocityDataPoint[]) => {
  if (!data || data.length === 0) return [];
  
  // Get the first data point to extract property names
  const samplePoint = data[0];
  
  // Define proper display names for metrics
  const displayNames: Record<string, string> = {
    tvl: 'TVL',
    velocity: 'Velocity'
  };
  
  // Filter out date and any other non-metric properties
  return Object.keys(samplePoint)
    .filter(key => key !== 'date')
    .map(key => {
      // Use the mapped display name or fallback to capitalized key
      const displayName = displayNames[key] || key.charAt(0).toUpperCase() + key.slice(1);
      
      // Determine shape and color based on metric name
      const isLine = key === 'velocity';
      return {
        key,
        displayName,
        shape: isLine ? 'circle' : 'square',
        color: isLine ? tvlVelocityColors.velocity : tvlVelocityColors.tvl
      };
    });
};

export default function DexSummaryPage() {
  const [tvlTimeFilter, setTvlTimeFilter] = useState<TVLTimeFilter>('M');
  const [velocityTimeFilter, setVelocityTimeFilter] = useState<TimeFilter>('M');
  const [tvlChartModalOpen, setTvlChartModalOpen] = useState(false);
  const [velocityChartModalOpen, setVelocityChartModalOpen] = useState(false);
  const [programTypes, setProgramTypes] = useState<string[]>([]);
  const [isLoadingDexVelocity, setIsLoadingDexVelocity] = useState(true);
  
  // Add state for actual chart data
  const [tvlVelocityData, setTvlVelocityData] = useState<TvlVelocityDataPoint[]>([]);
  const [velocityByDexData, setVelocityByDexData] = useState<VelocityByDexDataPoint[]>([]);
  const [isTvlDataLoading, setIsTvlDataLoading] = useState(true);
  
  // New state for volume data
  const [volumeStats, setVolumeStats] = useState({
    cumulativeVolume: 0,
    percentChange: 0,
    isPositive: true
  });
  const [isVolumeLoading, setIsVolumeLoading] = useState(true);
  
  // New state for TVL data
  const [tvlStats, setTvlStats] = useState({
    currentTvl: 0,
    percentChange: 0,
    isPositive: true
  });
  const [isTvlStatsLoading, setIsTvlStatsLoading] = useState(true);

  // Add state for traders data
  const [tradersStats, setTradersStats] = useState({
    cumulativeTraders: 0,
    percentChange: 0,
    isPositive: true
  });
  const [isTradersLoading, setIsTradersLoading] = useState(true);

  // Add state for download button loading
  const [isTvlDownloading, setIsTvlDownloading] = useState(false);
  const [isDexDownloading, setIsDexDownloading] = useState(false);

  // Fetch TVL velocity data
  useEffect(() => {
    const fetchTvlData = async () => {
      setIsTvlDataLoading(true);
      try {
        const data = await fetchTvlVelocityData(tvlTimeFilter);
        setTvlVelocityData(data);
      } catch (error) {
        console.error('Error fetching TVL velocity data:', error);
      } finally {
        setIsTvlDataLoading(false);
      }
    };

    fetchTvlData();
  }, [tvlTimeFilter]);

  // Fetch velocity data for programs
  useEffect(() => {
    const fetchDexVelocityData = async () => {
      setIsLoadingDexVelocity(true);
      try {
        const data = await fetchVelocityByDexData(velocityTimeFilter);
        setProgramTypes(getUniqueProgramTypes(data));
        setVelocityByDexData(data);
      } catch (error) {
        console.error('Error fetching DEX velocity data:', error);
      } finally {
        setIsLoadingDexVelocity(false);
      }
    };

    fetchDexVelocityData();
  }, [velocityTimeFilter]);

  // Fetch volume data
  useEffect(() => {
    const fetchVolumeData = async () => {
      setIsVolumeLoading(true);
      try {
        const stats = await getLatestVolumeStats();
        setVolumeStats(stats);
      } catch (error) {
        console.error('Error fetching volume data:', error);
      } finally {
        setIsVolumeLoading(false);
      }
    };

    fetchVolumeData();
  }, []);
  
  // Fetch TVL data
  useEffect(() => {
    const fetchTvlStats = async () => {
      setIsTvlStatsLoading(true);
      try {
        const stats = await getLatestTvlStats();
        setTvlStats(stats);
      } catch (error) {
        console.error('Error fetching TVL stats:', error);
      } finally {
        setIsTvlStatsLoading(false);
      }
    };

    fetchTvlStats();
  }, []);

  // Fetch traders data
  useEffect(() => {
    const fetchTradersData = async () => {
      setIsTradersLoading(true);
      try {
        const stats = await getLatestTradersStats();
        setTradersStats(stats);
      } catch (error) {
        console.error('Error fetching traders data:', error);
      } finally {
        setIsTradersLoading(false);
      }
    };

    fetchTradersData();
  }, []);

  // Format the cumulative volume for display in trillions
  const formatCumulativeVolume = (value: number) => {
    if (value >= 1) {
      return `$${value.toFixed(2)}T`;
    } else {
      // Convert to billions if less than 1 trillion
      return `$${(value * 1000).toFixed(2)}B`;
    }
  };

  // Format the current TVL for display in billions
  const formatCurrentTvl = (value: number) => {
    return `$${value.toFixed(2)}B`;
  };

  // Format the cumulative traders in millions
  const formatCumulativeTraders = (value: number) => {
    return `${value.toFixed(1)}M`;
  };

  // Function to download TVL velocity data as CSV
  const downloadTvlVelocityCSV = async () => {
    // Prevent multiple clicks
    if (isTvlDownloading) return;
    
    setIsTvlDownloading(true);
    
    try {
      // Check if data is available
      if (tvlVelocityData.length === 0) {
        console.error('No TVL velocity data available for download');
        // Try to fetch it now
        const data = await fetchTvlVelocityData(tvlTimeFilter);
        if (data.length === 0) {
          console.error('Failed to fetch TVL velocity data for download');
          return;
        }
        setTvlVelocityData(data);
      }
      
      // Create a CSV header
      const csvContent = "data:text/csv;charset=utf-8,Date,TVL,Velocity\n";
      
      // Convert data to CSV rows
      const rows = tvlVelocityData.map(item => 
        `${item.date},${item.tvl},${item.velocity}`
      ).join("\n");
      
      // Create the full CSV content
      const encodedUri = encodeURI(csvContent + rows);
      
      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `tvl-velocity-${tvlTimeFilter}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading TVL velocity data:', error);
    } finally {
      setIsTvlDownloading(false);
    }
  };
  
  // Function to download DEX velocity data as CSV
  const downloadDexVelocityCSV = async () => {
    // Prevent multiple clicks
    if (isDexDownloading) return;
    
    setIsDexDownloading(true);
    
    try {
      // Check if data is available
      if (velocityByDexData.length === 0 || programTypes.length === 0) {
        console.error('No DEX velocity data available for download');
        // Try to fetch it now
        const data = await fetchVelocityByDexData(velocityTimeFilter);
        if (data.length === 0) {
          console.error('Failed to fetch DEX velocity data for download');
          return;
        }
        setVelocityByDexData(data);
        setProgramTypes(getUniqueProgramTypes(data));
      }
      
      // Get unique dates to organize the data
      const uniqueDates = getUniqueDates(velocityByDexData);
      
      // Create a CSV header with program types
      let header = "Date";
      programTypes.forEach(type => {
        header += `,${type}`;
      });
      
      const csvContent = `data:text/csv;charset=utf-8,${header}\n`;
      
      // Create rows with proper data organization
      const rows = uniqueDates.map(date => {
        let row = date;
        
        // For each program type, find the corresponding velocity for this date
        programTypes.forEach(programType => {
          const dataPoint = velocityByDexData.find(d => 
            d.date === date && d.program_type === programType
          );
          
          // Add the velocity or 0 if no data
          row += `,${dataPoint ? dataPoint.velocity : 0}`;
        });
        
        return row;
      }).join("\n");
      
      // Create the full CSV content
      const encodedUri = encodeURI(csvContent + rows);
      
      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `dex-velocity-${velocityTimeFilter}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading DEX velocity data:', error);
    } finally {
      setIsDexDownloading(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Counter 
          title="All-time Volume"
          value={isVolumeLoading ? "0" : formatCumulativeVolume(volumeStats.cumulativeVolume)}
          trend={isVolumeLoading ? undefined : { 
            value: parseFloat(volumeStats.percentChange.toFixed(1)), 
            label: "vs last year" 
          }}
          icon={<VolumeIcon />}
          variant="indigo"
          isLoading={isVolumeLoading}
        />
        
        <Counter 
          title="Current TVL"
          value={isTvlStatsLoading ? "0" : formatCurrentTvl(tvlStats.currentTvl)}
          trend={isTvlStatsLoading ? undefined : { 
            value: parseFloat(tvlStats.percentChange.toFixed(1)), 
            label: "vs last day" 
          }}
          icon={<TvlIcon />}
          variant="blue"
          isLoading={isTvlStatsLoading}
        />
        
        <Counter 
          title="All-time Traders"
          value={isTradersLoading ? "0" : formatCumulativeTraders(tradersStats.cumulativeTraders)}
          trend={isTradersLoading ? undefined : { 
            value: parseFloat(tradersStats.percentChange.toFixed(1)), 
            label: "vs last day" 
          }}
          icon={<UsersIcon />}
          variant="purple"
          isLoading={isTradersLoading}
        />
      </div>
      
      {/* Two chart containers stacked on mobile, side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* TVL and Velocity Chart Container */}
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-blue-900/20 transition-all duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">TVL and Velocity Trends</h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Tracking value locked and market velocity across the ecosystem</p>
            </div>
            <div className="flex space-x-2">
              <button 
                className={`p-1.5 bg-blue-500/10 rounded-md text-blue-400 hover:bg-blue-500/20 transition-colors ${isTvlDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={downloadTvlVelocityCSV}
                title="Download CSV"
                disabled={isTvlDownloading}
              >
                {isTvlDownloading ? (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <DownloadIcon className="w-4 h-4" />
                )}
              </button>
            <button 
              className="p-1.5 bg-blue-500/10 rounded-md text-blue-400 hover:bg-blue-500/20 transition-colors"
                onClick={() => setTvlChartModalOpen(true)}
                title="Expand Chart"
            >
              <ExpandIcon className="w-4 h-4" />
            </button>
            </div>
          </div>
          
          {/* First Divider */}
          <div className="h-px bg-gray-900 w-full"></div>
          
          {/* Filter Space - Match layout of DEX velocity chart */}
          <div className="flex items-center justify-start pl-1 py-2 overflow-x-auto">
            <TimeFilterSelector value={tvlTimeFilter} onChange={setTvlTimeFilter} />
          </div>
          
          {/* Second Divider */}
          <div className="h-px bg-gray-900 w-full mb-3"></div>
          
          {/* Content Area - Split into columns */}
          <div className="flex flex-col lg:flex-row h-[360px] lg:h-80">
            {/* Chart Area */}
            <div className="flex-grow lg:pr-3 lg:border-r lg:border-gray-900 h-80 lg:h-auto">
              <TvlVelocityChart 
                timeFilter={tvlTimeFilter} 
                isModalOpen={tvlChartModalOpen}
                onModalClose={() => setTvlChartModalOpen(false)}
              />
            </div>
            
            {/* Legend area */}
            <div className="w-full lg:w-1/5 mt-2 lg:mt-0 lg:pl-3 flex flex-row lg:flex-col">
              <div className="flex flex-row lg:flex-col gap-4 lg:gap-3 pt-1 pb-2 lg:pb-0">
                <div className="flex flex-row lg:flex-col gap-4 lg:gap-3">
                  {!isTvlDataLoading && tvlVelocityData.length > 0 ? (
                    <>
                      {getAvailableMetrics(tvlVelocityData).map(metric => (
                        <div key={metric.key} className="flex items-start">
                          <div 
                            className={`w-2 h-2 mr-2 ${metric.shape === 'circle' ? 'rounded-full' : 'rounded-sm'} mt-0.5`}
                            style={{ background: metric.color }}
                          ></div>
                          <span className="text-xs text-gray-300">{metric.displayName}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {/* Loading states */}
                  <div className="flex items-start">
                        <div className="w-2 h-2 bg-blue-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                        <div className="text-xs text-gray-300">Loading...</div>
                  </div>
                      
                  <div className="flex items-start">
                        <div className="w-2 h-2 bg-purple-500 mr-2 rounded-full mt-0.5 animate-pulse"></div>
                        <div className="text-xs text-gray-300">Loading...</div>
                  </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Velocity By DEX Program Category Chart Container */}
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-purple-900/20 transition-all duration-300">
          {/* Header Section with Title and Expand Icon */}
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">Velocity By DEX Program Category</h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Tracking velocity trends across different DEX program types</p>
            </div>
            <div className="flex space-x-2">
              <button 
                className={`p-1.5 bg-purple-500/10 rounded-md text-purple-400 hover:bg-purple-500/20 transition-colors ${isDexDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={downloadDexVelocityCSV}
                title="Download CSV"
                disabled={isDexDownloading}
              >
                {isDexDownloading ? (
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <DownloadIcon className="w-4 h-4" />
                )}
              </button>
              <button 
                className="p-1.5 bg-purple-500/10 rounded-md text-purple-400 hover:bg-purple-500/20 transition-colors"
                onClick={() => setVelocityChartModalOpen(true)}
                title="Expand Chart"
              >
              <ExpandIcon className="w-4 h-4" />
            </button>
            </div>
          </div>
          
          {/* First Divider */}
          <div className="h-px bg-gray-900 w-full"></div>
          
          {/* Filter Space - Match layout of first chart */}
          <div className="flex items-center justify-start pl-1 py-2 overflow-x-auto">
            <TimeFilterSelector value={velocityTimeFilter} onChange={setVelocityTimeFilter} />
          </div>
          
          {/* Second Divider */}
          <div className="h-px bg-gray-900 w-full mb-3"></div>
          
          {/* Content Area - Split into columns on desktop, stacked on mobile */}
          <div className="flex flex-col lg:flex-row h-[360px] lg:h-80">
            {/* Chart Area */}
            <div className="flex-grow lg:pr-3 lg:border-r lg:border-gray-900 h-80 lg:h-auto">
              <VelocityByDexChart
                timeFilter={velocityTimeFilter}
                isModalOpen={velocityChartModalOpen}
                onModalClose={() => setVelocityChartModalOpen(false)}
              />
            </div>
            
            {/* Legend Area - horizontal on mobile, vertical on desktop */}
            <div className="w-full lg:w-1/5 mt-2 lg:mt-0 lg:pl-3 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible">
              <div className="flex flex-row lg:flex-col gap-4 lg:gap-3 pt-1 pb-2 lg:pb-0">
                <div className="flex flex-row lg:flex-col gap-4 lg:gap-3">
                  {!isLoadingDexVelocity && programTypes.length > 0 ? (
                    programTypes.map((programType, index) => (
                      <div key={programType} className="flex items-start whitespace-nowrap">
                        <div 
                          className="w-2 h-2 mr-2 rounded-sm mt-0.5" 
                          style={{ background: getColorForProgramType(programType, programTypes) }}
                        ></div>
                        <span className="text-xs text-gray-300 truncate" title={programType}>
                          {programType.length > 12 ? `${programType.substring(0, 12)}...` : programType}
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
                  <div className="flex items-start">
                        <div className="w-2 h-2 bg-green-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
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
    </>
  );
} 