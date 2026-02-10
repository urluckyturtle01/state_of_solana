"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";       
import LaunchpadsTabsHeader from "./components/LaunchpadsTabsHeader";
import { usePathname } from "next/navigation";

interface LaunchpadsLayoutProps {
  children: ReactNode;
}

export default function LaunchpadsLayout({ children }: LaunchpadsLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  // /launchpads/token-launches -> token-launches, /launchpads/bonding-curve-trade-stats -> bonding-curve-trade-stats, etc.
  const pathSegments = pathname.split('/');
  const activeTab = pathSegments.length > 2 ? pathSegments[2] : "token-launches";
  
  return (
    <Layout>
      <div className="space-y-6">
        <LaunchpadsTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
} 