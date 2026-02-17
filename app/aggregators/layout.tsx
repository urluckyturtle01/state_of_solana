"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import AggregatorsTabsHeader from "./components/AggregatorsTabsHeader";
import { usePathname } from "next/navigation";

interface AggregatorsLayoutProps {
  children: ReactNode;
}

export default function AggregatorsLayout({ children }: AggregatorsLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  // /aggregators -> summary, /aggregators/traders -> traders, etc.
  const pathSegments = pathname.split('/');
  const activeTab = pathSegments.length > 2 ? pathSegments[2] : "summary";
  
  return (
    <Layout>
      <div className="space-y-6">
        <AggregatorsTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
} 