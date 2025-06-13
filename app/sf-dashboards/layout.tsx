"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import SFTabsHeader from "./components/SFTabsHeader";
import { usePathname } from "next/navigation";

interface SFLayoutsProps {
  children: ReactNode;
}

export default function SFLayouts({ children }: SFLayoutsProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  // /stablecoins -> overview, /stablecoins/supply -> supply, etc.
  const pathSegments = pathname.split('/');
  const activeTab = pathname.split('/')[2] || 'overview';
  //const activeTab = pathSegments.length > 2 ? pathSegments[2] : "overview";
  
  return (
    <Layout>
      <div className="space-y-6">
        <SFTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
} 