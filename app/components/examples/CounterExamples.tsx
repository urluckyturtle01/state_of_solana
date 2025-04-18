"use client";

import Counter from "../shared/Counter";
import { VolumeIcon, TvlIcon, UsersIcon, TokensIcon, ExchangeIcon, ChartIcon } from "../shared/Icons";

export default function CounterExamples() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">Counter Component Examples</h1>
        <p className="text-gray-400">Use these components to display key metrics throughout the application.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <Counter 
          title="Indigo Variant"
          value="$158.3B"
          trend={{ value: 2.4, label: "vs last month" }}
          icon={<VolumeIcon />}
          variant="indigo"
        />
        
        <Counter 
          title="Blue Variant"
          value="$2.7B"
          trend={{ value: -1.3, label: "vs last week" }}
          icon={<TvlIcon />}
          variant="blue"
        />
        
        <Counter 
          title="Purple Variant"
          value="3.2M"
          trend={{ value: 7.8, label: "vs last month" }}
          icon={<UsersIcon />}
          variant="purple"
        />
        
        <Counter 
          title="Emerald Variant"
          value="150K"
          trend={{ value: 5.2, label: "vs yesterday" }}
          icon={<ChartIcon />}
          variant="emerald"
        />
        
        <Counter 
          title="Amber Variant"
          value="48.7%"
          trend={{ value: -2.5, label: "vs last hour" }}
          icon={<TokensIcon />}
          variant="amber"
        />
        
        <Counter 
          title="Rose Variant"
          value="Operational"
          icon={<ExchangeIcon />}
          variant="rose"
        />
      </div>
    </div>
  );
} 