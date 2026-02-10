"use client";

import { ReactNode } from "react";
import Layout from "../../components/Layout";
import RaydiumTabsHeader from "./components/RaydiumTabsHeader";
import { usePathname } from "next/navigation";

interface RaydiumLayoutProps {
  children: ReactNode;
}

export default function RaydiumLayout({ children }: RaydiumLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  // /projects/raydium/overview -> overview, /projects/raydium/trading-volume -> trading-volume, etc.
  const pathSegments = pathname.split('/');
  const activeTab = pathSegments.length > 3 ? pathSegments[3] : "financials";
  
  return (
    <Layout>
      <div className="space-y-6">
        <RaydiumTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
} 