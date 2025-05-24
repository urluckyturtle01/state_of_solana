"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface ComputeUnitsTabsHeaderProps {
  activeTab?: string;
}

export default function ComputeUnitsTabsHeader({ activeTab = "transaction-bytes" }: ComputeUnitsTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "Transaction Bytes", 
      path: "/compute-units/transaction-bytes",
      key: "transaction-bytes",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    },
    { 
      name: "Compute Units", 
      path: "/compute-units/compute-units",
      key: "compute-units",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    },
    { 
      name: "CU Overspending", 
      path: "/compute-units/cu-overspending",
      key: "cu-overspending",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="Compute Units"
      description="Compute and size metrics for Solana transactions"
      showDivider={true}
    />
  );
}