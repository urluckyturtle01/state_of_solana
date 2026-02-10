'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import EnhancedDashboardRenderer from "@/app/admin/components/enhanced-dashboard-renderer";
import PrettyLoader from "@/app/components/shared/PrettyLoader";

// Create a loading component for Suspense fallback
const ChartLoading = () => (
  <div className="w-full h-[500px] flex items-center justify-center">
    <PrettyLoader size="sm" />
  </div>
);

function OverallStatsPageContent() {
  const searchParams = useSearchParams();
  
  return (
    <div className="space-y-6">
      <EnhancedDashboardRenderer 
        pageId="app-stats-overall-stats" 
        enableCaching={true}
        urlParams={searchParams}
      />
    </div>
  );
}

export default function OverallStatsPage() {
  return (
    <Suspense fallback={<ChartLoading />}>
      <OverallStatsPageContent />
    </Suspense>
  );
}
