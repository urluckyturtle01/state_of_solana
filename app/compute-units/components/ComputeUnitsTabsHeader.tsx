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
      icon: "M4 6h16v12H4V6zm2 3h2v2H6V9zm5 0h2v2h-2V9zm5 0h2v2h-2V9zM6 14h2v2H6v-2zm5 0h2v2h-2v-2zm5 0h2v2h-2v-2z"
    },
    { 
      name: "Compute Units", 
      path: "/compute-units/compute-units",
      key: "compute-units",
      icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
    },
    { 
      name: "CU Overspending", 
      path: "/compute-units/cu-overspending",
      key: "cu-overspending",
      icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
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