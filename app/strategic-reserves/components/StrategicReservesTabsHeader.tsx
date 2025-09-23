"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface StrategicReservesTabsHeaderProps {
  activeTab?: string;
}

export default function StrategicReservesTabsHeader({ activeTab = "general-stats" }: StrategicReservesTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "General Stats", 
      path: "/strategic-reserves/general-stats",
      key: "general-stats",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    },
    { 
      name: "Project Wise Stats", 
      path: "/strategic-reserves/project-wise-stats",
      key: "project-wise-stats",
      icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="Strategic Reserves"
      description="Strategic Reserves Analysis and Performance on Solana"
      showDivider={true}
    />
  );
} 
