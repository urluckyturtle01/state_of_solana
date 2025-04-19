"use client";

import React, { useState } from "react";
import TransactionMetricsChart from "../../components/charts/TransactionMetricsChart";
import { TimeFilter } from "../../api/REV/cost-capacity";
import { ExpandIcon, DownloadIcon } from "../../components/shared/Icons";
import TimeFilterSelector from "../../components/shared/filters/TimeFilter";
import DisplayModeFilter, { DisplayMode } from "../../components/shared/filters/DisplayModeFilter";

export default function TransactionsPage() {
  // State for filters
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('M');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('absolute');
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Download function
  const downloadTransactionsCSV = async () => {
    // Prevent multiple clicks
    if (isDownloading) return;
    
    setIsDownloading(true);
    
    try {
      alert("Download functionality to be implemented");
    } catch (error) {
      console.error('Error downloading Transactions data:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-blue-900/20 transition-all duration-300">
        <div className="flex justify-between items-center mb-3">
          <div className="-mt-1">
            <h2 className="text-base font-medium text-gray-200 leading-tight mb-0.5">Transaction Metrics</h2>
            <p className="text-gray-500 text-xs tracking-wide">Analyzing transaction volume and success rates</p>
          </div>
          {/* Action buttons */}
          <div className="flex space-x-2">
            {/* Download button */}
            <button 
              className={`p-1.5 ${isDownloading ? 'bg-gray-700/50 text-gray-500' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'} rounded-md transition-colors`}
              onClick={downloadTransactionsCSV}
              disabled={isDownloading}
              title="Download Data"
            >
              <DownloadIcon className="w-4 h-4" />
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
        
        {/* First Divider */}
        <div className="h-px bg-gray-900 w-full"></div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between pl-1 py-1 mb-1">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Time filter */}
            <TimeFilterSelector 
              value={timeFilter} 
              onChange={(val) => setTimeFilter(val as TimeFilter)}
              options={[
                { value: 'D', label: 'D' },
                { value: 'W', label: 'W' },
                { value: 'M', label: 'M' },
                { value: 'Q', label: 'Q' },
                { value: 'Y', label: 'Y' }
              ]}
            />
            
            {/* Display mode filter */}
            <DisplayModeFilter 
              mode={displayMode} 
              onChange={(val) => setDisplayMode(val)}
              isCompact={true}
            />
          </div>
        </div>
        
        {/* Divider */}
        <div className="h-px bg-gray-900 w-full mb-3"></div>

        <div className="flex flex-col lg:flex-row h-[360px] lg:h-80">
          {/* Chart container */}
          <div className="flex-grow lg:pr-3 lg:border-r lg:border-gray-900 h-80 lg:h-auto w-full lg:w-4/5">
            <TransactionMetricsChart
              timeFilter={timeFilter}
              displayMode={displayMode}
              isModalOpen={chartModalOpen}
              onModalClose={() => setChartModalOpen(false)}
              onTimeFilterChange={setTimeFilter}
              onDisplayModeChange={setDisplayMode}
            />
          </div>

          {/* Legend */}
          <div className="flex flex-col justify-start mt-4 lg:mt-0 lg:w-1/5 lg:pl-4">
            <div className="text-xs text-gray-400 uppercase mb-3 font-medium">Transaction Types</div>
            
            <div className="flex flex-col space-y-3">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-sm mr-2 bg-blue-400"></div>
                <span className="text-xs text-gray-300">Vote Transactions</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-sm mr-2 bg-purple-400"></div>
                <span className="text-xs text-gray-300">Non-Vote Transactions</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2 bg-green-400"></div>
                <span className="text-xs text-gray-300">Success Rate</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2 bg-orange-400"></div>
                <span className="text-xs text-gray-300">Non-Vote Success Rate</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 