"use client";

import { useState } from "react";
import VolumeHistoryChart from "../../components/charts/VolumeHistoryChart";
import { ExpandIcon } from "../../components/shared/Icons";
import TimeFilterSelector from "../../components/charts/TimeFilter";
import { VolumeTimeFilter } from "../../api/dex/volume"; // Import the correct type

export default function DexVolumePage() {
  const [timeFilter, setTimeFilter] = useState<VolumeTimeFilter>('W'); // Use VolumeTimeFilter
  const [chartModalOpen, setChartModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-blue-900/20 transition-all duration-300">
        <div className="flex justify-between items-center mb-3">
          <div className="-mt-1">
            <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">Trading Volume History</h2>
            <p className="text-gray-500 text-[10px] tracking-wide">Tracking trading volume trends across the Solana ecosystem</p>
          </div>
          {/* Re-add expand button */}
          <div className="flex space-x-2">
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
            onChange={(val) => setTimeFilter(val as VolumeTimeFilter)} // Cast type
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