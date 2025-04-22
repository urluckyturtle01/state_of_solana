"use client";

import { useState, useEffect } from "react";
import VolumeHistoryChart from "../../components/charts/VolumeHistoryChart";
import VolumeByProgramChart from "../../components/charts/VolumeByProgramChart";
import { ExpandIcon, DownloadIcon } from "../../components/shared/Icons";
import TimeFilterSelector from "../../components/shared/filters/TimeFilter";
import { VolumeTimeFilter, fetchVolumeHistoryData, formatVolumeDate } from "../../api/dex/volume/volumeHistoryData";
import { VolumeByProgramDataPoint, fetchVolumeByProgramDataWithFallback, formatVolume } from "../../api/dex/volume/volumeByProgramData";

// Define color palette (same as in VolumeByProgramChart)
const colors = [
  '#a78bfa', // purple - Jupiter
  '#60a5fa', // blue - Raydium
  '#9ca3af', // gray - Others
  '#f97316', // orange - OKX
  '#34d399', // green - Orca
  '#f43f5e', // red - Meteora
  '#facc15', // yellow - Pump Fun
  '#14b8a6', // teal - SolFi
  '#8b5cf6', // indigo - Lifinity
  '#6b7280', // darker gray - Others (Low Volume)
];

export default function DexVolumePage() {
  const [timeFilter, setTimeFilter] = useState<VolumeTimeFilter>('W');
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [programChartModalOpen, setProgramChartModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isProgramDataDownloading, setIsProgramDataDownloading] = useState(false);
  
  // Add state for volume by program data for the legend
  const [volumeByProgramData, setVolumeByProgramData] = useState<VolumeByProgramDataPoint[]>([]);
  const [isVolumeByProgramLoading, setIsVolumeByProgramLoading] = useState(true);

  // Fetch volume by program data for the legend
  useEffect(() => {
    const fetchVolumeByProgramData = async () => {
      setIsVolumeByProgramLoading(true);
      try {
        const data = await fetchVolumeByProgramDataWithFallback();
        setVolumeByProgramData(data);
      } catch (error) {
        console.error("Error fetching volume by program data:", error);
      } finally {
        setIsVolumeByProgramLoading(false);
      }
    };

    fetchVolumeByProgramData();
  }, []);

  // Function to download volume data as CSV
  const downloadVolumeDataCSV = async () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    try {
      // Fetch data with current timeFilter
      const volumeData = await fetchVolumeHistoryData(timeFilter);
      
      if (volumeData.length === 0) {
        alert("No data available to download");
        return;
      }
      
      // Convert data to CSV format
      const headers = ["Date", "Volume ($)"];
      const csvRows = [
        headers.join(","), // CSV header row
        ...volumeData.map(row => {
          const formattedDate = formatVolumeDate(row.date, timeFilter);
          const formattedVolume = row.volume.toString();
          return [formattedDate, formattedVolume].join(",");
        })
      ];
      
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const link = document.createElement("a");
      const fileName = `solana_dex_volume_${timeFilter}_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error("Error downloading volume data:", error);
      alert("Failed to download data. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Function to download volume by program data as CSV
  const downloadVolumeByProgramDataCSV = async () => {
    if (isProgramDataDownloading) return;
    
    setIsProgramDataDownloading(true);
    try {
      // Fetch data
      const volumeData = await fetchVolumeByProgramDataWithFallback();
      
      if (volumeData.length === 0) {
        alert("No data available to download");
        return;
      }
      
      // Convert data to CSV format
      const headers = ["DEX", "Volume ($)", "Share (%)"];
      const csvRows = [
        headers.join(","), // CSV header row
        ...volumeData.map(row => {
          return [
            row.dex,
            row.volume.toString(),
            row.percentage.toFixed(2)
          ].join(",");
        })
      ];
      
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const link = document.createElement("a");
      const fileName = `solana_dex_volume_by_program_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error("Error downloading volume by program data:", error);
      alert("Failed to download data. Please try again.");
    } finally {
      setIsProgramDataDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-blue-900/20 transition-all duration-300">
        <div className="flex justify-between items-center mb-3">
          <div className="-mt-1">
            <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">Trading Volume History</h2>
            <p className="text-gray-500 text-[10px] tracking-wide">Tracking trading volume trends across the Solana ecosystem</p>
          </div>
          {/* Action buttons */}
          <div className="flex space-x-2">
            {/* Download button */}
            <button 
              className={`p-1.5 ${isDownloading ? 'opacity-50 cursor-not-allowed' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'} rounded-md transition-colors`}
              onClick={downloadVolumeDataCSV}
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
              onClick={() => setChartModalOpen(true)}
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
            onChange={(val) => setTimeFilter(val as VolumeTimeFilter)}
            options={[
              { value: 'W', label: 'W' },
              { value: 'M', label: 'M' },
              { value: 'Q', label: 'Q' }
            ]}
          />
        </div>
        
        {/* Second Divider */}
        <div className="h-px bg-gray-900 w-full mb-3"></div>
        
        {/* Content Area - Render the chart */}
        <div className="h-80">
          <VolumeHistoryChart 
            timeFilter={timeFilter}
            isModalOpen={chartModalOpen}
            onModalClose={() => setChartModalOpen(false)}
          />
        </div>
      </div>
      
      {/* New row with two chart containers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* First new chart container */}
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-purple-900/20 transition-all duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">Volume by Program</h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Breakdown of trading volume by decentralized exchange</p>
            </div>
            <div className="flex space-x-2">
              {/* Download button */}
              <button 
                className={`p-1.5 ${isProgramDataDownloading ? 'opacity-50 cursor-not-allowed' : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'} rounded-md transition-colors`}
                onClick={downloadVolumeByProgramDataCSV}
                disabled={isProgramDataDownloading}
                title="Download CSV Data"
              >
                {isProgramDataDownloading ? (
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <DownloadIcon className="w-4 h-4" />
                )}
              </button>
              
              {/* Expand button */}
              <button 
                className="p-1.5 bg-purple-500/10 rounded-md text-purple-400 hover:bg-purple-500/20 transition-colors"
                onClick={() => setProgramChartModalOpen(true)}
                title="Expand Chart"
              >
                <ExpandIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Divider - Keep just one divider */}
          <div className="h-px bg-gray-900 w-full mb-3"></div>
          
          {/* Content Area - Split into columns on desktop, stacked on mobile */}
          <div className="flex flex-col lg:flex-row h-80">
            {/* Chart Area */}
            <div className="flex-grow lg:pr-3 lg:border-r lg:border-gray-900 h-64 lg:h-full">
              <VolumeByProgramChart
                isModalOpen={programChartModalOpen}
                onModalClose={() => setProgramChartModalOpen(false)}
              />
            </div>
            
            {/* Legend Area - horizontal on mobile, vertical on desktop with scrolling */}
            <div className="w-full lg:w-1/4 mt-2 lg:mt-0 lg:pl-3 flex flex-row lg:flex-col overflow-x-hidden lg:overflow-x-visible">
              <div className="flex flex-row lg:flex-col gap-4 lg:gap-3 pt-1 pb-2 lg:pb-0 lg:h-full lg:overflow-hidden">
                <div className="flex flex-row lg:flex-col gap-4 lg:gap-3 lg:max-h-[60vh] lg:overflow-y-auto lg:pr-1 
                  [&::-webkit-scrollbar]:w-1.5 
                  [&::-webkit-scrollbar-track]:bg-transparent 
                  [&::-webkit-scrollbar-thumb]:bg-gray-700/40
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
                  scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700/40">
                  {isVolumeByProgramLoading ? (
                    // Loading state
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-purple-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                      <span className="text-xs text-gray-300">Loading...</span>
                    </div>
                  ) : (
                    // Dynamically generated legends based on actual data
                    volumeByProgramData.map((item, index) => (
                      <div key={`legend-${index}`} className="flex items-start">
                        <div 
                          className="w-2 h-2 mr-2 rounded-sm mt-0.5 flex-shrink-0" 
                          style={{ background: colors[index % colors.length] }}
                        ></div>
                        <span className="text-xs text-gray-300 break-words max-w-full">
                          {item.dex} <span className="text-gray-400">({item.percentage.toFixed(1)}%)</span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Second new chart container */}
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-emerald-900/20 transition-all duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">Volume by Token</h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Most traded tokens by volume over time</p>
            </div>
            <div className="flex space-x-2">
              {/* Download button */}
              <button 
                className="p-1.5 bg-emerald-500/10 rounded-md text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                onClick={() => {/* Placeholder for download function */}}
                title="Download CSV Data"
              >
                <DownloadIcon className="w-4 h-4" />
              </button>
              
              {/* Expand button */}
              <button 
                className="p-1.5 bg-emerald-500/10 rounded-md text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                onClick={() => {/* Placeholder for expand function */}}
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
              onChange={(val) => setTimeFilter(val as VolumeTimeFilter)}
              options={[
                { value: 'W', label: 'W' },
                { value: 'M', label: 'M' },
                { value: 'Q', label: 'Q' }
              ]}
            />
          </div>
          
          {/* Second Divider */}
          <div className="h-px bg-gray-900 w-full mb-3"></div>
          
          {/* Content Area - Placeholder for chart */}
          <div className="h-80 flex items-center justify-center">
            <div className="text-gray-500 text-sm">Token Volume Chart (Coming Soon)</div>
          </div>
        </div>
      </div>
    </div>
  );
} 