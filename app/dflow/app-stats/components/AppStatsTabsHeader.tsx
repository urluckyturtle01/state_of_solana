"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";
import DateRangePicker from "./DateRangePicker";
import { parse, format } from "date-fns";

interface AppStatsTabsHeaderProps {
  activeTab?: string;
}

export default function AppStatsTabsHeader({ activeTab = "analytics" }: AppStatsTabsHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Helper function to parse date string to Date object
  const parseDate = (dateStr: string | null): Date | null => {
    if (!dateStr) return null;
    try {
      return parse(dateStr, 'dd/MM/yy', new Date());
    } catch {
      return null;
    }
  };

  // Helper function to format Date object to string
  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return format(date, 'dd/MM/yy');
  };

  // Initialize dates from URL params or use defaults
  const defaultStartDate = parseDate(searchParams.get('Block Date.start')) || parse('01/12/25', 'dd/MM/yy', new Date());
  const defaultEndDate = parseDate(searchParams.get('Block Date.end')) || parse('11/12/25', 'dd/MM/yy', new Date());

  // State for filters
  const [startDate, setStartDate] = useState<Date | null>(defaultStartDate);
  const [endDate, setEndDate] = useState<Date | null>(defaultEndDate);
  const [appId, setAppId] = useState(searchParams.get('appId') || '147');

  // Sync state with URL parameters
  useEffect(() => {
    const urlAppId = searchParams.get('appId');
    if (urlAppId && urlAppId !== appId) {
      setAppId(urlAppId);
    }
  }, [searchParams, appId]);

  const tabs: Tab[] = [
    { 
      name: "SOL-USDC Pair", 
      path: "/dflow/app-stats/sol-usdc-pair",
      key: "sol-usdc-pair",
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    },
    { 
      name: "Overall Stats", 
      path: "/dflow/app-stats/overall-stats",
      key: "overall-stats",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    }
  ];

  // Update URL params when filters change
  const updateFilters = (from: Date | null, to: Date | null, app: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentPath = window.location.pathname;
    
    if (from) params.set('Block Date.start', formatDate(from));
    if (to) params.set('Block Date.end', formatDate(to));
    if (app) params.set('appId', app);
    
    const newUrl = `${currentPath}?${params.toString()}`;
    console.log('🔄 Updating filters, new URL:', newUrl);
    router.push(newUrl);
  };

  // Handle start date change
  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
    updateFilters(date, endDate, appId);
  };

  // Handle end date change
  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
    updateFilters(startDate, date, appId);
  };

  // Handle app ID change
  const handleAppIdChange = (value: string) => {
    console.log('🔄 App ID changed:', { from: appId, to: value });
    setAppId(value);
    updateFilters(startDate, endDate, value);
  };

  // Custom filters component
  const customFilters = (
    <div className="bg-gray-900/30 rounded-lg border border-gray-900">
      <div className="p-4 overflow-x-auto md:overflow-x-visible">
        <div className="flex items-center justify-start gap-4 md:flex-wrap min-w-max md:min-w-0">
        {/* Block Date Filter */}
          <div className="flex items-center space-x-3 shrink-0 relative">
            <div className="w-[240px]">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
          />
            </div>
        </div>

        {/* App ID Dropdown */}
        <div className="flex items-center space-x-2 shrink-0">
          <label className="text-sm font-medium text-gray-500 whitespace-nowrap">
            App ID:
          </label>
          <div className="relative">
          <select
  value={appId}
  onChange={(e) => handleAppIdChange(e.target.value)}
  className="bg-gray-900/50 text-sm px-3 py-1.5 pr-8 rounded-sm border border-gray-800/70 focus:outline-none focus:ring-1 focus:ring-gray-700 focus:border-transparent text-gray-200 appearance-none cursor-pointer"
>
  <option value="0">0</option>
  <option value="28">28</option>
  <option value="49">49</option>
  <option value="53">53</option>
  <option value="54">54</option>
  <option value="57">57</option>
  <option value="85">85</option>
  <option value="104">104</option>
  <option value="120">120</option>
  <option value="137">137</option>
  <option value="144">144</option>
  <option value="147">147</option>
  <option value="162">162</option>
  <option value="185">185</option>
  <option value="227">227</option>
  <option value="337">337</option>
</select>

            {/* Dropdown arrow icon */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="App Stats"
      description="DFlow application statistics and metrics"
      showDivider={true}
      customFilters={customFilters}
    />
  );
}
