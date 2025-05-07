"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface ProtocolRevenueTabsHeaderProps {
  activeTab?: string;
}

export default function ProtocolRevenueTabsHeader({ activeTab = "summary" }: ProtocolRevenueTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "Summary", 
      path: "/protocol-revenue/summary",
      key: "summary",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    },
    { 
      name: "Distribution", 
      path: "/protocol-revenue/distribution",
      key: "distribution",
      icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
    },
    { 
      name: "Trends", 
      path: "/protocol-revenue/trends",
      key: "trends",
      icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
    },
    { 
      name: "Validators", 
      path: "/protocol-revenue/validators",
      key: "validators",
      icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="Protocol Revenue"
      description="Protocol revenue statistics for the Solana blockchain"
      showDivider={true}
    />
  );
} 