"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface ComputeUnitsTabsHeaderProps {
  activeTab?: string;
}

export default function ComputeUnitsTabsHeader({ activeTab = "capacity" }: ComputeUnitsTabsHeaderProps) {
  const tabs: Tab[] = [
    {
      name: "Capacity",
      path: "/compute-units/capacity",
      key: "capacity",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    },
    {
      name: "Efficiency",
      path: "/compute-units/efficiency",
      key: "efficiency",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    },
    {
      name: "Programs",
      path: "/compute-units/programs",
      key: "programs",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    }
  ];

  return (
    <TabsNavigation
      tabs={tabs}
      activeTab={activeTab}
      title="Compute Units"
      description="Research sources: [Syndica](https://blog.syndica.io/deep-dive-solana-on-chain-activity/), [TopLedger](https://research.topledger.xyz/compute-units)"
      showDivider={true}
    />
  );
}
