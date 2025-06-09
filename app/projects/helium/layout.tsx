"use client";

import { ReactNode } from "react";
import Layout from "../../components/Layout";
import HeliumTabsHeader from "./components/HeliumTabsHeader";
import { usePathname } from "next/navigation";

interface HeliumLayoutProps {
  children: ReactNode;
}

export default function HeliumLayout({ children }: HeliumLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  // /projects/raydium/overview -> overview, /projects/raydium/trading-volume -> trading-volume, etc.
  const pathSegments = pathname.split('/');
  const activeTab = pathSegments.length > 3 ? pathSegments[3] : "financials";
  
  return (
    <Layout>
      <div className="space-y-6">
        <HeliumTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
} 