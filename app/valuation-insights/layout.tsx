"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import ValuationInsightsTabsHeader from "./components/ValuationInsightsTabsHeader";
import { usePathname } from "next/navigation";

interface ValuationInsightsLayoutProps {
  children: ReactNode;
}

export default function ValuationInsightsLayout({ children }: ValuationInsightsLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  // /stablecoins -> overview, /stablecoins/supply -> supply, etc.
  const pathSegments = pathname.split('/');
  const activeTab = pathname.split('/')[2] || 'stablecoin-usage';
  //const activeTab = pathSegments.length > 2 ? pathSegments[2] : "overview";
  
  return (
    <Layout>
      <div className="space-y-6">
        <ValuationInsightsTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
} 