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
  const activeTab = pathname.split('/')[2] || "aggregators";

  return (
    <Layout>
      <div className="space-y-6">
        <DexTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
}
