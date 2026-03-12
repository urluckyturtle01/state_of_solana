"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import AggregatorsTabsHeader from "./components/AggregatorsTabsHeader";
import { usePathname } from "next/navigation";

interface AggregatorsLayoutProps {
  children: ReactNode;
}

export default function AggregatorsLayout({ children }: AggregatorsLayoutProps) {
  const pathname = usePathname();
  const activeTab = pathname.split('/')[2] || "summary";

  return (
    <Layout>
      <div className="space-y-6">
        <AggregatorsTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
}
