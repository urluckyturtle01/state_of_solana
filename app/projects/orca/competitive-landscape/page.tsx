"use client";

import { generateNextMetadata, generateStructuredData } from '../../../seo-metadata';
import React, { Suspense } from 'react';
import EnhancedDashboardRenderer from "@/app/admin/components/enhanced-dashboard-renderer";
import PrettyLoader from "@/app/components/shared/PrettyLoader";


// Create a loading component for Suspense fallback
const ChartLoading = () => (
  <div className="w-full h-[500px] flex items-center justify-center">
    <PrettyLoader size="sm" />
  </div>
);


// SEO Structured Data
const structuredData = generateStructuredData('/projects/orca/competitive-landscape');

export default function OrcaCompetetiveLandscapePage() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<ChartLoading />}>
        <EnhancedDashboardRenderer 
          pageId="orca-competitive-landscape" 
          enableCaching={true}
        />
      </Suspense>
    </div>
  );
} 


export const metadata = generateNextMetadata('/projects/orca/competitive-landscape');