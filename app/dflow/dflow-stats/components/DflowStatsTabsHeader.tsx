"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface DflowStatsTabsHeaderProps {
  activeTab?: string;
}

export default function DflowStatsTabsHeader({ activeTab = "volume" }: DflowStatsTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "Volume", 
      path: "/dflow/dflow-stats/volume",
      key: "volume",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    },
    { 
      name: "Trades", 
      path: "/dflow/dflow-stats/trades",
      key: "trades",
      icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
    },
    { 
      name: "Traders", 
      path: "/dflow/dflow-stats/traders",
      key: "traders",
      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    },
    { 
      name: "Tokens Volume", 
      path: "/dflow/dflow-stats/tokens-volume",
      key: "tokens-volume",
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    },
    /*{ 
      name: "DEX Fee", 
      path: "/dflow/dflow-stats/dex-fee",
      key: "dex-fee",
      icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
    }*/
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="DFlow Stats"
      description="DFlow protocol statistics and performance metrics"
      showDivider={true}
    />
  );
}
