"use client";

import { ReactNode } from "react";
import Layout from "../../components/Layout";
import OrcaTabsHeader from "./components/OrcaTabsHeader";
import { usePathname } from "next/navigation";

interface OrcaLayoutProps {
  children: ReactNode;
}

export default function OrcaLayout({ children }: OrcaLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  // /projects/raydium/overview -> overview, /projects/raydium/trading-volume -> trading-volume, etc.
  const pathSegments = pathname.split('/');
  const activeTab = pathSegments.length > 3 ? pathSegments[3] : "financials";
  
  return (
    <Layout>
      <div className="space-y-6">
        <OrcaTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
} 