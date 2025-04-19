"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import RevTabsHeader from "./components/RevTabsHeader";
import { usePathname } from "next/navigation";

interface RevLayoutProps {
  children: ReactNode;
}

export default function RevLayout({ children }: RevLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  // /rev -> overview, /rev/by-protocol -> by-protocol, etc.
  const pathSegments = pathname.split('/');
  const activeTab = pathSegments.length > 2 ? pathSegments[2] : "overview";
  
  return (
    <Layout>
      <div className="space-y-6">
        <RevTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
} 