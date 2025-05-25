"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface StablecoinsTabsHeaderProps {
  activeTab?: string;
}

export default function StablecoinsTabsHeader({ activeTab = "stablecoin-usage" }: StablecoinsTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "Stablecoin Usage", 
      path: "/stablecoins/stablecoin-usage",
      key: "stablecoin-usage",
      icon: "M6 20V10M12 20V4M18 20V14"
    },
    { 
      name: "Transfers", 
      path: "/stablecoins/transaction-activity",
      key: "transaction-activity",
      icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
    },
    { 
      name: "Velocity", 
      path: "/stablecoins/liquidity-velocity",
      key: "liquidity-velocity",
      icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
    },
    { 
      name: "Mint & Burn", 
      path: "/stablecoins/mint-burn",
      key: "mint-burn",
      icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
    },
    { 
      name: "CEXs", 
      path: "/stablecoins/cexs",
      key: "cexs",
      icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    },
    { 
      name: "TVL", 
      path: "/stablecoins/tvl",
      key: "tvl",
      icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="Stablecoins"
      description="Stablecoin usage, flows and performance on Solana"
      showDivider={true}
    />
  );
} 