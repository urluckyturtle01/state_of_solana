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
  const activeTab = pathname.split('/')[2] || "summary";

  return (
    <Layout>
      <div className="space-y-6">
        <WrappedBtcTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
}
