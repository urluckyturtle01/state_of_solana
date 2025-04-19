"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import StablecoinsTabsHeader from "./components/StablecoinsTabsHeader";
import { usePathname } from "next/navigation";

interface StablecoinsLayoutProps {
  children: ReactNode;
}

export default function StablecoinsLayout({ children }: StablecoinsLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  // /stablecoins -> overview, /stablecoins/supply -> supply, etc.
  const pathSegments = pathname.split('/');
  const activeTab = pathSegments.length > 2 ? pathSegments[2] : "overview";
  
  return (
    <Layout>
      <div className="space-y-6">
        <StablecoinsTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
} 