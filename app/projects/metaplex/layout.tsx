"use client";

import { ReactNode } from "react";
import Layout from "../../components/Layout";
import MetaplexTabsHeader from "./components/MetaplexTabsHeader";
import { usePathname } from "next/navigation";

interface MetaplexLayoutProps {
  children: ReactNode;
}

export default function MetaplexLayout({ children }: MetaplexLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  // /projects/raydium/overview -> overview, /projects/raydium/trading-volume -> trading-volume, etc.
  const pathSegments = pathname.split('/');
  const activeTab = pathSegments.length > 3 ? pathSegments[3] : "financials";
  
  return (
    <Layout>
      <div className="space-y-6">
        <MetaplexTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
} 