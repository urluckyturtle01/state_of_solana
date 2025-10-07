"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import ValidatorsTabsHeader from "./components/ValidatorsTabsHeader";
import { usePathname } from "next/navigation";

interface ValidatorsLayoutProps {
  children: ReactNode;
}

export default function ValidatorsLayout({ children }: ValidatorsLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  // /validators -> overview, /validators/performance -> performance, etc.
  const pathSegments = pathname.split('/');
  const activeTab = pathname.split('/')[2] || 'overview';
  
  return (
    <Layout>
      <div className="space-y-6">
        <ValidatorsTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
}
