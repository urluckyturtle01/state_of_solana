"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface SFTabsHeaderProps {
  activeTab?: string;
}

export default function SFTabsHeader({ activeTab = "stablecoin-usage" }: SFTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "Overview", 
      path: "/sf-dashboards/overview",
      key: "overview",
      icon: "M6 20V10M12 20V4M18 20V14"
    },
    { 
      name: "Stablecoins", 
      path: "/sf-dashboards/stablecoins",
      key: "stablecoins",
      icon: "M6 20V10M12 20V4M18 20V14"
    },
    {
      name: "DeFi", 
      path: "/sf-dashboards/defi",
      key: "defi",
      icon: "M6 20V10M12 20V4M18 20V14"
    },
    {
      name: "AI Tokens", 
      path: "/sf-dashboards/ai-tokens",
      key: "ai-tokens",
      icon: "M6 20V10M12 20V4M18 20V14"
    },
    {
      name: "Bitcoin on Solana", 
      path: "/sf-dashboards/bitcoin-on-solana",
      key: "bitcoin-on-solana",
      icon: "M6 20V10M12 20V4M18 20V14"
    },
    {
      name: "Consumer", 
      path: "/sf-dashboards/consumer",
      key: "consumer",
      icon: "M6 20V10M12 20V4M18 20V14"
    },
    {
      name: "Depin", 
      path: "/sf-dashboards/depin",
      key: "depin",
      icon: "M6 20V10M12 20V4M18 20V14"
    },
    {
      name: "Payments", 
      path: "/sf-dashboards/payments",
      key: "payments",
      icon: "M6 20V10M12 20V4M18 20V14"
    },
    {
      name: "RWA", 
      path: "/sf-dashboards/rwa",
      key: "rwa",
      icon: "M6 20V10M12 20V4M18 20V14"
    },
    {
      name: "Treasury", 
      path: "/sf-dashboards/treasury",
      key: "treasury",
      icon: "M6 20V10M12 20V4M18 20V14"
    },
    {
      name: "VC Funding", 
      path: "/sf-dashboards/vc-funding",
      key: "vc-funding",
      icon: "M6 20V10M12 20V4M18 20V14"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="SF Dashboards"
      description="Solana blockchain, at a glance"
      showDivider={true}
    />
  );
} 