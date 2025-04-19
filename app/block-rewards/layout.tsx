"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import BlockRewardsTabsHeader from "./components/BlockRewardsTabsHeader";
import { usePathname } from "next/navigation";

interface BlockRewardsLayoutProps {
  children: ReactNode;
}

export default function BlockRewardsLayout({ children }: BlockRewardsLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  // /block-rewards -> overview, /block-rewards/distribution -> distribution, etc.
  const pathSegments = pathname.split('/');
  const activeTab = pathSegments.length > 2 ? pathSegments[2] : "overview";
  
  return (
    <Layout>
      <div className="space-y-6">
        <BlockRewardsTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
} 