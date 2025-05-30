"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";

interface ExplorerLayoutProps {
  children: ReactNode;
}

export default function ExplorerLayout({ children }: ExplorerLayoutProps) {
  return (
    <Layout>
      {children}
    </Layout>
  );
} 