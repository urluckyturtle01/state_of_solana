"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface SFTabsHeaderProps {
  activeTab?: string;
}

export default function SFTabsHeader({ activeTab = "stablecoin-usage" }: SFTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "Stablecoins", 
      path: "/sf-dashboards/stablecoins",
      key: "stablecoins",
      icon: "M6 20V10M12 20V4M18 20V14"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="SF Dashboards"
      description="SF Dashboards"
      showDivider={true}
    />
  );
} 