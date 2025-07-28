"use client";

import { ReactNode } from "react";
import Layout from "../../components/Layout";
import SolStrategiesTabsHeader from "./components/SolSTabsHeader";
import { usePathname } from "next/navigation";

interface SolStrategiesLayoutProps {
  children: ReactNode;
}

export default function SolStrategiesLayout({ children }: SolStrategiesLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  // /projects/raydium/overview -> overview, /projects/raydium/trading-volume -> trading-volume, etc.
  const pathSegments = pathname.split('/');
  const activeTab = pathSegments.length > 3 ? pathSegments[3] : "financials";
  
  return (
    <Layout>
      <div className="space-y-6">
        <SolStrategiesTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
} 