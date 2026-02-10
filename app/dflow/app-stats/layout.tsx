"use client";

import { ReactNode, Suspense } from "react";
import Layout from "@/app/components/Layout";
import AppStatsTabsHeader from "./components/AppStatsTabsHeader";
import { usePathname } from "next/navigation";

interface AppStatsLayoutProps {
  children: ReactNode;
}

export default function AppStatsLayout({ children }: AppStatsLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  const pathSegments = pathname.split('/');
  const activeTab = pathSegments[3] || 'analytics';
  
  return (
    <Layout >
      <div className="space-y-6">
        <Suspense fallback={<div className="h-20 bg-gray-900/30 animate-pulse rounded-lg" />}>
        <AppStatsTabsHeader activeTab={activeTab} />
        </Suspense>
        {children}
      </div>
    </Layout>
  );
}

