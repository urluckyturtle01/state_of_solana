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
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    },
    { 
      name: "TVL", 
      path: "/wrapped-btc/btc-tvl",
      key: "btc-tvl",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    },
    { 
      name: "Transfers", 
      path: "/wrapped-btc/transfers",
      key: "transfers",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    },
    { 
      name: "DEX Activity", 
      path: "/wrapped-btc/dex-activity",
      key: "dex-activity",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
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