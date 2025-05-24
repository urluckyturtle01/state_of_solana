"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import ComputeUnitsTabsHeader from "./components/ComputeUnitsTabsHeader";
import { usePathname } from "next/navigation";

interface ComputeUnitsLayoutProps {
  children: ReactNode;
}

export default function ComputeUnitsLayout({ children }: ComputeUnitsLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  const pathSegments = pathname.split('/');
  const activeTab = pathname.split('/')[2] || 'transaction-bytes';
  
  return (
    <Layout>
      <div className="space-y-6">
        <ComputeUnitsTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
}