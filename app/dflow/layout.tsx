"use client";

import { ReactNode } from "react";

interface DflowLayoutProps {
  children: ReactNode;
}

export default function DflowLayout({ children }: DflowLayoutProps) {
  return <>{children}</>;
}

