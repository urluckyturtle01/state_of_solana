"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import MevTabsHeader from "./components/MevTabsHeader";
import { usePathname } from "next/navigation";

interface MevLayoutProps {
  children: ReactNode;
}

export default function MevLayout({ children }: MevLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  // /rev -> overview, /rev/by-protocol -> by-protocol, etc.
  const pathSegments = pathname.split('/');
  const activeTab = pathname.split('/')[2] || 'summary';
  
  return (
    <Layout>
      <div className="space-y-6">
        <MevTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
} 