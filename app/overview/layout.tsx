"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import OverviewTabsHeader from "./components/OverviewTabsHeader";
import { usePathname } from "next/navigation";

interface OverviewLayoutProps {
  children: ReactNode;
}

export default function OverviewLayout({ children }: OverviewLayoutProps) {
  const pathname = usePathname();
  const activeTab = pathname.split('/')[2] || "network_usage";

  return (
    <Layout>
      <div className="space-y-6">
        <OverviewTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
}
