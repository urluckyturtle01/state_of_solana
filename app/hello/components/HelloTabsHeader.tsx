"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface HelloTabsHeaderProps {
  activeTab?: string;
}

export default function HelloTabsHeader({ activeTab = "hbhb" }: HelloTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "hbhb", 
      path: "/hello/hbhb",
      key: "hbhb",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="hello"
      description="haha"
      showDivider={true}
    />
  );
}