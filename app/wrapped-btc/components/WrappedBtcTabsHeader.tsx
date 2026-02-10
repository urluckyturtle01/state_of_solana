"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface WrappedBtcTabsHeaderProps {
  activeTab?: string;
}

export default function WrappedBtcTabsHeader({ activeTab = "holders-supply" }: WrappedBtcTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "Holders & Supply", 
      path: "/wrapped-btc/holders-supply",
      key: "holders-supply",
      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    },
    { 
      name: "TVL", 
      path: "/wrapped-btc/btc-tvl",
      key: "btc-tvl",
      icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    },
    { 
      name: "Transfers", 
      path: "/wrapped-btc/transfers",
      key: "transfers",
      icon: "M7 16l-4-4m0 0l4-4m-4 4h18M17 8l4 4m0 0l-4 4m4-4H3"
    },
    { 
      name: "DEX Activity", 
      path: "/wrapped-btc/dex-activity",
      key: "dex-activity",
      icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="Wrapped BTC"
      description="Insights into wrapped Bitcoin flow, adoption, and supply on Solana"
      showDivider={true}
    />
  );
}