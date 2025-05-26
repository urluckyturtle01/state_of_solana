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
      icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
    },
    { 
      name: "Network Usage", 
      path: "/network-usage",
      key: "network-usage",
      icon: "M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
    },
    { 
      name: "Market Dynamics", 
      path: "/market-dynamics",
      key: "market-dynamics",
      icon: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="Overview"
      description="Welcome to the State of Solana dashboard"
      showDivider={true}
    />
  );
} 