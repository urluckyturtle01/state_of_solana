"use client";

import { useState, useEffect } from "react";
import { ExpandIcon, DownloadIcon } from "../../components/shared/Icons";
import TimeFilterSelector from "../../components/shared/filters/TimeFilter";
import TvlByPoolChart from "../../components/charts/TvlByPoolChart";
import { TvlByPoolDataPoint, fetchTvlByPoolDataWithFallback } from "../../api/dex/tvl/tvlByPoolData";

// Define a TimeFilter type similar to VolumeTimeFilter
type TimeFilter = 'W' | 'M' | 'Q' | 'Y';

export default function DexTvlPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('W');
  const [tvlChartModalOpen, setTvlChartModalOpen] = useState(false);
  const [tvlByPoolModalOpen, setTvlByPoolModalOpen] = useState(false);
  const [tvlChangeModalOpen, setTvlChangeModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isTvlByPoolDownloading, setIsTvlByPoolDownloading] = useState(false);
  const [isTvlChangeDownloading, setIsTvlChangeDownloading] = useState(false);
  
  // Add state for TVL by Pool data for the legend
  const [tvlByPoolData, setTvlByPoolData] = useState<TvlByPoolDataPoint[]>([]);
  const [isTvlByPoolLoading, setIsTvlByPoolLoading] = useState(true);

  // Fetch TVL by Pool data for the legend
  useEffect(() => {
    const fetchTvlByPoolData = async () => {
      setIsTvlByPoolLoading(true);
      try {
        const data = await fetchTvlByPoolDataWithFallback();
        setTvlByPoolData(data);
      } catch (error) {
        console.error("Error fetching TVL by Pool data:", error);
      } finally {
        setIsTvlByPoolLoading(false);
      }
    };

    fetchTvlByPoolData();
  }, []);

  // Function to download TVL data as CSV - currently just a placeholder
  const downloadTvlDataCSV = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      console.log("Downloading TVL data...");
      // Implementation will go here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
      alert("Download feature coming soon!");
    } catch (error) {
      console.error("Error downloading TVL data:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  // Function to download TVL by Pool data as CSV - currently just a placeholder
  const downloadTvlByPoolDataCSV = async () => {
    if (isTvlByPoolDownloading) return;
    setIsTvlByPoolDownloading(true);
    try {
      console.log("Downloading TVL by Pool data...");
      // Implementation will go here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
      alert("Download feature coming soon!");
    } catch (error) {
      console.error("Error downloading TVL by Pool data:", error);
    } finally {
      setIsTvlByPoolDownloading(false);
    }
  };

  // Function to download TVL change data as CSV - currently just a placeholder
  const downloadTvlChangeDataCSV = async () => {
    if (isTvlChangeDownloading) return;
    setIsTvlChangeDownloading(true);
    try {
      console.log("Downloading TVL change data...");
      // Implementation will go here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
      alert("Download feature coming soon!");
    } catch (error) {
      console.error("Error downloading TVL change data:", error);
    } finally {
      setIsTvlChangeDownloading(false);
    }
  };

  return (
    <>
      {/* Row with two chart containers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* TVL Change container */}
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-emerald-900/20 transition-all duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">TVL Change</h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Weekly change in TVL by protocol</p>
            </div>
            <div className="flex space-x-2">
              {/* Download button */}
              <button 
                className={`p-1.5 ${isTvlChangeDownloading ? 'opacity-50 cursor-not-allowed' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'} rounded-md transition-colors`}
                onClick={downloadTvlChangeDataCSV}
                disabled={isTvlChangeDownloading}
                title="Download CSV Data"
              >
                {isTvlChangeDownloading ? (
                  <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <DownloadIcon className="w-4 h-4" />
                )}
              </button>
              
              {/* Expand button */}
              <button 
                className="p-1.5 bg-emerald-500/10 rounded-md text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                onClick={() => setTvlChangeModalOpen(true)}
                title="Expand Chart"
              >
                <ExpandIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Divider */}
          <div className="h-px bg-gray-900 w-full"></div>
          
          {/* Filter Space */}
          <div className="flex items-center justify-start pl-1 py-2 overflow-x-auto">
            <TimeFilterSelector 
              value={timeFilter} 
              onChange={(val) => setTimeFilter(val as TimeFilter)}
              options={[
                { value: 'W', label: 'W' },
                { value: 'M', label: 'M' }
              ]}
            />
          </div>
          
          {/* Second Divider */}
          <div className="h-px bg-gray-900 w-full mb-3"></div>
          
          {/* Content Area - Placeholder for chart */}
          <div className="h-[360px] lg:h-80 flex items-center justify-center">
            <div className="text-gray-500 text-sm">TVL Change Chart (Coming Soon)</div>
          </div>
        </div>
        
        {/* TVL by Pool container */}
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-purple-900/20 transition-all duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">TVL by Pool</h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Breakdown of TVL by liquidity pool</p>
            </div>
            <div className="flex space-x-2">
              {/* Download button */}
              <button 
                className={`p-1.5 ${isTvlByPoolDownloading ? 'opacity-50 cursor-not-allowed' : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'} rounded-md transition-colors`}
                onClick={downloadTvlByPoolDataCSV}
                disabled={isTvlByPoolDownloading}
                title="Download CSV Data"
              >
                {isTvlByPoolDownloading ? (
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <DownloadIcon className="w-4 h-4" />
                )}
              </button>
              
              {/* Expand button */}
              <button 
                className="p-1.5 bg-purple-500/10 rounded-md text-purple-400 hover:bg-purple-500/20 transition-colors"
                onClick={() => setTvlByPoolModalOpen(true)}
                title="Expand Chart"
              >
                <ExpandIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Divider */}
          <div className="h-px bg-gray-900 w-full mb-3"></div>
          
          {/* Content Area - Chart with TVL by Pool component */}
          <div className="flex flex-col lg:flex-row h-[360px] lg:h-80">
            {/* Chart Area */}
            <div className="flex-grow lg:pr-3 lg:border-r lg:border-gray-900 h-64 lg:h-full">
              <TvlByPoolChart
                isModalOpen={tvlByPoolModalOpen}
                onModalClose={() => setTvlByPoolModalOpen(false)}
              />
            </div>
            
            {/* Legend Area */}
            <div className="w-full lg:w-1/4 mt-2 lg:mt-0 lg:pl-3 h-full flex flex-row lg:flex-col overflow-x-hidden lg:overflow-x-visible">
              <div className="flex flex-row lg:flex-col gap-4 lg:gap-3 pt-1 pb-2 lg:pb-0 w-full h-full lg:overflow-hidden">
                <div className="flex flex-row lg:flex-col gap-4 lg:gap-3 w-full h-full lg:overflow-y-auto lg:pr-1 
                  [&::-webkit-scrollbar]:w-1.5 
                  [&::-webkit-scrollbar-track]:bg-transparent 
                  [&::-webkit-scrollbar-thumb]:bg-gray-700/40
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
                  scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700/40">
                  {isTvlByPoolLoading ? (
                    // Loading state
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-purple-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                      <span className="text-xs text-gray-300">Loading...</span>
                    </div>
                  ) : (
                    // Dynamically generated legends based on actual data
                    tvlByPoolData.map((item, index) => (
                      <div key={`legend-${index}`} className="flex items-start">
                        <div 
                          className="w-2 h-2 mr-2 rounded-sm mt-0.5 flex-shrink-0" 
                          style={{ background: ['#a78bfa', '#60a5fa', '#34d399', '#f97316', '#f43f5e', '#facc15', '#14b8a6', '#8b5cf6', '#ec4899', '#6b7280'][index % 10] }}
                        ></div>
                        <span className="text-xs text-gray-300 break-words max-w-full">
                          {item.pool} <span className="text-gray-400">({item.percentage.toFixed(1)}%)</span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* First chart container - TVL History */}
      <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-blue-900/20 transition-all duration-300 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="-mt-1">
            <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">TVL History</h2>
            <p className="text-gray-500 text-[10px] tracking-wide">Tracking total value locked across the Solana ecosystem</p>
          </div>
          {/* Action buttons */}
          <div className="flex space-x-2">
            {/* Download button */}
            <button 
              className={`p-1.5 ${isDownloading ? 'opacity-50 cursor-not-allowed' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'} rounded-md transition-colors`}
              onClick={downloadTvlDataCSV}
              disabled={isDownloading}
              title="Download CSV Data"
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <DownloadIcon className="w-4 h-4" />
              )}
            </button>
            
            {/* Expand button */}
            <button 
              className="p-1.5 bg-blue-500/10 rounded-md text-blue-400 hover:bg-blue-500/20 transition-colors"
              onClick={() => setTvlChartModalOpen(true)}
              title="Expand Chart"
            >
              <ExpandIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Divider */}
        <div className="h-px bg-gray-900 w-full"></div>
        
        {/* Filter Space */}
        <div className="flex items-center justify-start pl-1 py-2 overflow-x-auto">
          <TimeFilterSelector 
            value={timeFilter} 
            onChange={(val) => setTimeFilter(val as TimeFilter)}
            options={[
              { value: 'W', label: 'W' },
              { value: 'M', label: 'M' },
              { value: 'Q', label: 'Q' },
              { value: 'Y', label: 'Y' }
            ]}
          />
        </div>
        
        {/* Second Divider */}
        <div className="h-px bg-gray-900 w-full mb-3"></div>
        
        {/* Content Area - Placeholder for chart */}
        <div className="h-[360px] lg:h-80 flex items-center justify-center">
          <div className="text-gray-500 text-sm">TVL History Chart (Coming Soon)</div>
        </div>
      </div>
    </>
  );
} 