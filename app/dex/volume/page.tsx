"use client";

import { useState } from "react";
import VolumeHistoryChart from "../../components/charts/VolumeHistoryChart";
import { ExpandIcon, DownloadIcon } from "../../components/shared/Icons";
import TimeFilterSelector from "../../components/charts/TimeFilter";
import { VolumeTimeFilter, fetchVolumeHistoryData, formatVolumeDate } from "../../api/dex/volume/volumeHistoryData";

export default function DexVolumePage() {
  const [timeFilter, setTimeFilter] = useState<VolumeTimeFilter>('W');
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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
    </div>
  );
} 