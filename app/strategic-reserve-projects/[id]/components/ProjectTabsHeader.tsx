"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface ProjectTabsHeaderProps {
  activeTab?: string;
  projectId: string;
}

export default function ProjectTabsHeader({ activeTab = "info", projectId }: ProjectTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "Info", 
      path: `/strategic-reserve-projects/${projectId}/info`,
      key: "info",
      icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    },
    { 
      name: "Financial", 
      path: `/strategic-reserve-projects/${projectId}/financial`,
      key: "financial",
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    },
    { 
      name: "Staking", 
      path: `/strategic-reserve-projects/${projectId}/staking`,
      key: "staking",
      icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    },
    { 
      name: "Revenue", 
      path: `/strategic-reserve-projects/${projectId}/revenue`,
      key: "revenue",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title={`Project ${projectId}`}
      description="Strategic Reserve Project Details and Analytics"
      showDivider={true}
    />
  );
} 
