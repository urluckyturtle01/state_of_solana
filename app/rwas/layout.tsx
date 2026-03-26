"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import RwasTabsHeader from "./components/RwasTabsHeader";
import { usePathname } from "next/navigation";

interface RwasLayoutProps {
  children: ReactNode;
}

export default function RwasLayout({ children }: RwasLayoutProps) {
  const pathname = usePathname();
  const activeTab = pathname.split('/')[2] || "overview";

  return (
    <Layout>
      <div className="space-y-6">
        <RwasTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
}
