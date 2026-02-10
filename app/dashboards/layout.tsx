"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import DashboardsHeader from "./components/DashboardsHeader";
import { CreateDashboardModalProvider } from "../contexts/CreateDashboardModalContext";

interface DashboardsLayoutProps {
  children: ReactNode;
}

export default function DashboardsLayout({ children }: DashboardsLayoutProps) {
  return (
    <Layout>
      <CreateDashboardModalProvider>
        <div className="space-y-6">
          <DashboardsHeader />
          {children}
        </div>
      </CreateDashboardModalProvider>
    </Layout>
  );
} 