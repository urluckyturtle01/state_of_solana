"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import OverviewTabsHeader from "../components/shared/OverviewTabsHeader";
import { usePathname } from "next/navigation";

interface AnalyticsLayoutProps {
  children: ReactNode;
}

export default function AnalyticsLayout({ children }: AnalyticsLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  // /analytics -> analytics
  const activeTab = "analytics";
  
  return (
    <Layout>
      <div className="space-y-6">
        <OverviewTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
} 