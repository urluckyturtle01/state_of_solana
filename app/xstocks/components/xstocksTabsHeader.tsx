"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface XStocksTabsHeaderProps {
  activeTab?: string;
}

export default function XStocksTabsHeader({ activeTab = "fee-revenue" }: XStocksTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "Fees & Revenue", 
      path: "/xstocks/fee-revenue",
    key: "fee-revenue",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    },
    { 
      name: "Traction", 
      path: "/xstocks/traction",
      key: "traction",
      icon: "M3 13a1 1 0 011-1h2a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1v-7zM9 9a1 1 0 011-1h2a1 1 0 011 1v11a1 1 0 01-1 1h-2a1 1 0 01-1-1V9zM15 5a1 1 0 011-1h2a1 1 0 011 1v15a1 1 0 01-1 1h-2a1 1 0 01-1-1V5z"
    },
    { 
      name: "TVL", 
      path: "/xstocks/tvl",
      key: "tvl",
      icon: "M3 13a1 1 0 011-1h2a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1v-7zM9 9a1 1 0 011-1h2a1 1 0 011 1v11a1 1 0 01-1 1h-2a1 1 0 01-1-1V9zM15 5a1 1 0 011-1h2a1 1 0 011 1v15a1 1 0 01-1 1h-2a1 1 0 01-1-1V5z"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="xStocks"
      description="Onchain metrics, activity, and charts for tokenized equities on Solana"
      showDivider={true}
    />
  );
} 