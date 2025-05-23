"use client";
import React, { Suspense } from 'react';
import EnhancedDashboardRenderer from "@/app/admin/components/enhanced-dashboard-renderer";
import Loader from "@/app/components/shared/Loader";

// Create a loading component for Suspense fallback
const ChartLoading = () => (
  <div className="w-full h-[500px] flex items-center justify-center">
    <Loader size="md" />
  </div>
);

export default function ProtocolRevenueDepinPage() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<ChartLoading />}>
        <EnhancedDashboardRenderer 
          pageId="depin" 
          enableCaching={true}
        />
      </Suspense>
    </div>
  );
} 