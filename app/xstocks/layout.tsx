"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";       
import XStocksTabsHeader from "./components/XStocksTabsHeader";
import { usePathname } from "next/navigation";

interface XStocksLayoutProps {
  children: ReactNode;
}

export default function XStocksLayout({ children }: XStocksLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  // /xstocks/financials -> financials, /xstocks/traction -> traction, etc.
  const pathSegments = pathname.split('/');
  const activeTab = pathSegments.length > 2 ? pathSegments[2] : "fee-revenue";
  
  return (
    <Layout>
      <div className="space-y-6">
        <XStocksTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
} 