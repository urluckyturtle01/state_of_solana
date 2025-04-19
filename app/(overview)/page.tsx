"use client";

import Counter from "../components/shared/Counter";
import { ChartIcon, TvlIcon, ExchangeIcon } from "../components/shared/Icons";

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="bg-black/80 backdrop-blur-sm p-6 rounded-xl border border-gray-900 shadow-lg">
        <h2 className="text-xl font-semibold text-gray-200 mb-4">Key Statistics</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Counter 
            title="Key Metrics"
            value="845K"
            trend={{ value: 12.5, label: "vs last month" }}
            icon={<ChartIcon />}
            variant="indigo"
          />
          
          <Counter 
            title="Total Value Locked"
            value="$6.3B"
            trend={{ value: 4.2, label: "vs last week" }}
            icon={<TvlIcon />}
            variant="blue"
          />
          
          <Counter 
            title="Network Status"
            value="Healthy"
            icon={<ExchangeIcon />}
            variant="purple"
          />
        </div>
      </div>
      
      <div className="bg-black/80 backdrop-blur-sm p-6 rounded-xl border border-gray-900 shadow-lg">
        <h2 className="text-xl font-semibold text-gray-200 mb-4">Network Summary</h2>
        <div className="h-80 flex items-center justify-center bg-gray-900/50 rounded-lg">
          <p className="text-gray-400">Network status dashboard will appear here</p>
        </div>
      </div>
    </div>
  );
} 