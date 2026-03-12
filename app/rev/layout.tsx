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
  const activeTab = pathname.split('/')[2] || "cost_and_capacity";

  return (
    <Layout>
      <div className="space-y-6">
        <RevTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
}
