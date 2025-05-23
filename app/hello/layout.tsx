"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import HelloTabsHeader from "./components/HelloTabsHeader";
import { usePathname } from "next/navigation";

interface HelloLayoutProps {
  children: ReactNode;
}

export default function HelloLayout({ children }: HelloLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  const pathSegments = pathname.split('/');
  const activeTab = pathname.split('/')[2] || 'hbhb';
  
  return (
    <Layout>
      <div className="space-y-6">
        <HelloTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
}