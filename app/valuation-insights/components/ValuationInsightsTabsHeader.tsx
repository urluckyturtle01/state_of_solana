"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface ValuationInsightsTabsHeaderProps {
  activeTab?: string;
}

export default function ValuationInsightsTabsHeader({ activeTab = "stablecoin-usage" }: ValuationInsightsTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "Overview", 
      path: "/valuation-insights/overview",
      key: "overview",
      icon: "M6 20V10M12 20V4M18 20V14"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="Valuation Insights"
      description="Protocol worth with data-driven insights"
      showDivider={true}
    />
  );
} 