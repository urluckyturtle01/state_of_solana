"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface DexTabsHeaderProps {
  activeTab?: string;
}

export default function DexTabsHeader({ activeTab = "summary" }: DexTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "Summary", 
      path: "/dex/summary",
      key: "summary",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    },
    { 
      name: "Volume", 
      path: "/dex/volume",
      key: "volume",
      icon: "M3 13a1 1 0 011-1h2a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1v-7zM9 9a1 1 0 011-1h2a1 1 0 011 1v11a1 1 0 01-1 1h-2a1 1 0 01-1-1V9zM15 5a1 1 0 011-1h2a1 1 0 011 1v15a1 1 0 01-1 1h-2a1 1 0 01-1-1V5z"
    },
    { 
      name: "TVL", 
      path: "/dex/tvl",
      key: "tvl",
      icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    },
    { 
      name: "Traders", 
      path: "/dex/traders",
      key: "traders",
      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    },
    { 
      name: "DEX Aggregators", 
      path: "/dex/aggregators",
      key: "aggregators",
      icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="DEX"
      description="Decentralized Exchange metrics for Solana"
      showDivider={true}
    />
  );
} 