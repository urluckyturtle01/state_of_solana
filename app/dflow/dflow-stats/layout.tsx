"use client";

import { ReactNode } from "react";
import Layout from "@/app/components/Layout";
import DflowStatsTabsHeader from "./components/DflowStatsTabsHeader";
import { usePathname } from "next/navigation";

interface DflowStatsLayoutProps {
  children: ReactNode;
}

export default function DflowStatsLayout({ children }: DflowStatsLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  const pathSegments = pathname.split('/');
  const activeTab = pathSegments[3] || 'volume';
  
  return (
    <Layout>
      <div className="space-y-6">
        <DflowStatsTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
}

