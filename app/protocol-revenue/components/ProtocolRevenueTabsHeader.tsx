"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface ProtocolRevenueTabsHeaderProps {
  activeTab?: string;
}

export default function ProtocolRevenueTabsHeader({ activeTab = "summary" }: ProtocolRevenueTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "Summary", 
      path: "/protocol-revenue/summary",
      key: "summary",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    },
    { 
      name: "Total", 
      path: "/protocol-revenue/total",
      key: "total",
      icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
    },
    
    { 
      name: "DEX Ecosystem", 
      path: "/protocol-revenue/dex-ecosystem",
      key: "dex-ecosystem",
      icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
    },
    { 
      name: "NFT Ecosystem", 
      path: "/protocol-revenue/nft-ecosystem",
      key: "nft-ecosystem",
      icon: "M12 2L2 7l10 12L22 7l-10-5z"
    },
    {
      name: "DePin",
      path: "/protocol-revenue/depin",
      key: "depin",
      icon: "M12 12m-2 0a2 2 0 104 0 2 2 0 10-4 0z M12 5m-2 0a2 2 0 104 0 2 2 0 10-4 0z M7 18m-2 0a2 2 0 104 0 2 2 0 10-4 0z M17 18m-2 0a2 2 0 104 0 2 2 0 10-4 0z M12 12L12 7 M12 12L7 18 M12 12L17 18"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="Protocol Revenue"
      description="Revenue insights fueling growth on the Solana blockchain"
      showDivider={true}
    />
  );
} 