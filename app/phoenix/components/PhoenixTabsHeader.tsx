"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface PhoenixTabsHeaderProps {
  activeTab?: string;
}

export default function PhoenixTabsHeader({ activeTab = "summary" }: PhoenixTabsHeaderProps) {
  const tabs: Tab[] = [
    {
      name: "Summary",
      path: "/phoenix/summary",
      key: "summary",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    }
  ];

  return (
    <TabsNavigation
      tabs={tabs}
      activeTab={activeTab}
      title="Phoenix"
      description="Phoenix DEX metrics and analytics on Solana"
      showDivider={true}
    />
  );
}
