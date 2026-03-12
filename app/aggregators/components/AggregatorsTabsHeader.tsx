"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface AggregatorsTabsHeaderProps {
  activeTab?: string;
}

export default function AggregatorsTabsHeader({ activeTab = "summary" }: AggregatorsTabsHeaderProps) {
  const tabs: Tab[] = [
    {
      name: "Summary",
      path: "/aggregators/summary",
      key: "summary",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    },
    {
      name: "Traders",
      path: "/aggregators/traders",
      key: "traders",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    }
  ];

  return (
    <TabsNavigation
      tabs={tabs}
      activeTab={activeTab}
      title="Aggregators Metrics Catalog"
      description="Metrics for DEX aggregator analytics"
      showDivider={true}
    />
  );
}
