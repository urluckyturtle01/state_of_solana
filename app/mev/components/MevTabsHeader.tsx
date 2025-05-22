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
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    },
    { 
      name: "DEX & Token Hotspots", 
      path: "/mev/dex-token-hotspots",
      key: "dex-token-hotspots",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    }

  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="MEV"
      description="Revenue metrics and analytics for Solana"
      showDivider={true}
    />
  );
} 