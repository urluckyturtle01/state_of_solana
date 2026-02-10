"use client";

import { ReactNode, Suspense } from "react";
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
        <Suspense fallback={<div className="h-32 bg-gray-900/30 rounded-lg animate-pulse" />}>
          <ValidatorsTabsHeader activeTab={activeTab} />
        </Suspense>
        {children}
      </div>
    </Layout>
  );
}
