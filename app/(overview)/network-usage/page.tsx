"use client";
import DashboardRenderer from "@/app/admin/components/dashboard-renderer";

export default function NetworkUsagePage() {
  return (
    <div className="space-y-6">
      <DashboardRenderer pageId="network-usage" />
    </div>
  );
} 