"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import StablecoinsTabsHeader from "./components/StablecoinsTabsHeader";
import { usePathname } from "next/navigation";

interface StablecoinsLayoutProps {
  children: ReactNode;
}

export default function StablecoinsLayout({ children }: StablecoinsLayoutProps) {
  const pathname = usePathname();
  const activeTab = pathname.split('/')[2] || "dex_activity";

  return (
    <Layout>
      <div className="space-y-6">
        <StablecoinsTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
}
