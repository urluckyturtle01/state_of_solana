"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface MevTabsHeaderProps {
  activeTab?: string;
}

export default function MevTabsHeader({ activeTab = "overview" }: MevTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "Summary", 
      path: "/mev",
      key: "summary",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    },
    { 
      name: "Extracted Value & PNL", 
      path: "/mev/extracted-value-pnl",
      key: "extracted-value-pnl",
      icon: "M4 0L0 3.99H3V11H5V3.99H8L4 0ZM11 14.01V7H9V14.01H6L10 18L14 14.01H11Z"
    },
    { 
      name: "Liquidity Hotspots", 
      path: "/mev/dex-token-hotspots",
      key: "dex-token-hotspots",
      icon: "M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 16a6 6 0 100-12 6 6 0 000 12zm0-4a2 2 0 110-4 2 2 0 010 4z"
    }

  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="MEV"
      description="Uncovering MEV profits and patterns on Solana"
      showDivider={true}
    />
  );
} 