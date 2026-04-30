"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface MevTabsHeaderProps {
  activeTab?: string;
}

export default function MevTabsHeader({ activeTab = "summary" }: MevTabsHeaderProps) {
  const tabs: Tab[] = [
    {
      name: "Summary",
      path: "/mev/summary",
      key: "summary",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    },
    {
      name: "Extracted Value And Pnl",
      path: "/mev/extracted_value_and_pnl",
      key: "extracted_value_and_pnl",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    },
    {
      name: "Liquidity Hotspot",
      path: "/mev/liquidity_hotspot",
      key: "liquidity_hotspot",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    }
  ];

  return (
    <TabsNavigation
      tabs={tabs}
      activeTab={activeTab}
      title="MEV"
      description="MEV (Maximal Extractable Value) metrics and sandwich attack analytics on Solana"
      showDivider={true}
    />
  );
}
