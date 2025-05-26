"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface OverviewTabsHeaderProps {
  activeTab?: string;
}

export default function OverviewTabsHeader({ activeTab = "dashboard" }: OverviewTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "User Activity", 
      path: "/dashboard",
      key: "dashboard",
      icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
      viewBox: "0 0 24 24"
    },
    { 
      name: "Network Usage", 
      path: "/network-usage",
      key: "network-usage",
      icon: "M57.152 44.181L75.85 33.386V11.795L57.152 1L38.454 11.795M38.454 11.795L38.455 33.386M38.454 11.795L19.757 1L1.059 11.795L1 33.351L19.698 44.147M38.455 33.386L52.842 41.692M38.455 33.386L24.068 41.692M33.86 27.762L19.701 35.936V57.527L38.399 68.322L57.097 57.527V35.936L42.741 27.782",
      viewBox: "0 0 77 70",
      strokeWidth: 5,
    },
    { 
      name: "Market Dynamics", 
      path: "/market-dynamics",
      key: "market-dynamics",
      icon: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941",
      viewBox: "0 0 24 24"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="Overview"
      description="Solana's performance and network dynamics"
      showDivider={true}
    />
  );
} 