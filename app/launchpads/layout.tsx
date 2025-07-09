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
  // /launchpads/financials -> financials, /launchpads/traction -> traction, etc.
  const pathSegments = pathname.split('/');
  const activeTab = pathSegments.length > 2 ? pathSegments[2] : "financials";
  
  return (
    <Layout>
      <div className="space-y-6">
        <LaunchpadsTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
} 