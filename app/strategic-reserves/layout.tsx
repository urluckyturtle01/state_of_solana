"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import StrategicReservesTabsHeader from "./components/StrategicReservesTabsHeader";
import { usePathname } from "next/navigation";

interface StrategicReservesLayoutProps {
  children: ReactNode;
}

export default function StrategicReservesLayout({ children }: StrategicReservesLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  // /strategic-reserves/general-stats -> general-stats, /strategic-reserves/project-wise-stats -> project-wise-stats
  const activeTab = pathname.split('/')[2] || 'general-stats';
  
  return (
    <Layout>
      <div className="space-y-6">
        <StrategicReservesTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
} 
