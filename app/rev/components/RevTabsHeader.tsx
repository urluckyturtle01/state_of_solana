"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface RevTabsHeaderProps {
  activeTab?: string;
}

export default function RevTabsHeader({ activeTab = "overview" }: RevTabsHeaderProps) {
  const tabs: Tab[] = [
    
    { 
      name: "Cost & Capacity", 
      path: "/rev/cost-capacity",
      key: "cost-capacity",
      icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    },
    { 
      name: "Issuance & Burn", 
      path: "/rev/issuance-burn",
      key: "issuance-burn",
      icon: "M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"
    },
    { 
      name: "Total Economic Value", 
      path: "/rev/total-economic-value",
      key: "total-economic-value",
      icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="REV"
      description="Tracking Solana Network Revenue and Economic Activity"
      showDivider={true}
    />
  );
} 