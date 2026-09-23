"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import PhoenixTabsHeader from "./components/PhoenixTabsHeader";
import { usePathname } from "next/navigation";

interface PhoenixLayoutProps {
  children: ReactNode;
}

export default function PhoenixLayout({ children }: PhoenixLayoutProps) {
  const pathname = usePathname();
  const activeTab = pathname.split('/')[2] || "summary";

  return (
    <Layout>
      <div className="space-y-6">
        <PhoenixTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
}
