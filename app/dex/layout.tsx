"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import DexTabsHeader from "./components/DexTabsHeader";
import { usePathname } from "next/navigation";

interface DexLayoutProps {
  children: ReactNode;
}

export default function DexLayout({ children }: DexLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  // /dex/summary -> summary, /dex/tvl -> tvl, etc.
  const activeTab = pathname.split('/')[2] || 'summary';
  
  return (
    <Layout>
      <div className="space-y-6">
        <DexTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
} 