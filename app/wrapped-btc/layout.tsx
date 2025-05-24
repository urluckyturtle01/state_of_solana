"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import WrappedBtcTabsHeader from "./components/WrappedBtcTabsHeader";
import { usePathname } from "next/navigation";

interface WrappedBtcLayoutProps {
  children: ReactNode;
}

export default function WrappedBtcLayout({ children }: WrappedBtcLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  const pathSegments = pathname.split('/');
  const activeTab = pathname.split('/')[2] || 'holders-supply';
  
  return (
    <Layout>
      <div className="space-y-6">
        <WrappedBtcTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
}