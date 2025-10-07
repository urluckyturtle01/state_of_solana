"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface ValidatorsTabsHeaderProps {
  activeTab?: string;
}

export default function ValidatorsTabsHeader({ activeTab = "overview" }: ValidatorsTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "Overview", 
      path: "/validators",
      key: "overview",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    },
    { 
      name: "Performance", 
      path: "/validators/performance",
      key: "performance",
      icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
    },
    { 
      name: "Rewards & Economics", 
      path: "/validators/rewards",
      key: "rewards",
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="Validators"
      description="Solana validator network performance, rewards, and economics"
      showDivider={true}
    />
  );
}
