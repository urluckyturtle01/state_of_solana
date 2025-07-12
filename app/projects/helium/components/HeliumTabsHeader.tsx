"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface HeliumTabsHeaderProps {
  activeTab?: string;
}

export default function HeliumTabsHeader({ activeTab = "overview" }: HeliumTabsHeaderProps) {
  const tabs: Tab[] = [
    
    { 
      name: "Financials", 
      path: "/projects/helium/financials",
      key: "financials",
      icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
    },
    { 
      name: "Traction", 
      path: "/projects/helium/traction",
      key: "traction",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    },
    { 
      name: "Protocol Token", 
      path: "/projects/helium/protocol-token",
      key: "protocol-token",
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    },
    { 
      name: "Governance", 
      path: "/projects/helium/governance",
      key: "governance",
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    }
    /*
    { 
      name: "Competitive Landscape", 
      path: "/projects/helium/competitive-landscape",
      key: "competitive-landscape",
      icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
    }*/
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="Helium"
      description="Comprehensive analytics for Helium - revenue, data credits, data transfers, payloads, and subscribers"
      showDivider={true}
    />
  );
} 