"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface StablecoinsTabsHeaderProps {
  activeTab?: string;
}

export default function StablecoinsTabsHeader({ activeTab = "summary" }: StablecoinsTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "Summary", 
      path: "/stablecoins/summary",
      key: "summary",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    },
    { 
      name: "Mint & Burns", 
      path: "/stablecoins/mint_burns",
      key: "mint_burns",
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    },
    { 
      name: "Transfers", 
      path: "/stablecoins/transfers",
      key: "transfers",
      icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
    },
    { 
      name: "CEXs", 
      path: "/stablecoins/cexs",
      key: "cexs",
      icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    },
    { 
      name: "DEX Activity", 
      path: "/stablecoins/dex_activity",
      key: "dex_activity",
      icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="Stablecoins"
      description="Stablecoin metrics and analytics on Solana"
      showDivider={true}
    />
  );
}
