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
const structuredData = generateStructuredData('/projects/sol-strategies/overview');

export default function SolStrategiesOverviewPage() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<ChartLoading />}>
        <EnhancedDashboardRenderer 
          pageId="sol-strategies-overview" 
          enableCaching={true}
        />
      </Suspense>
    </div>
  );
} 

export const metadata = generateNextMetadata('/projects/sol-strategies/overview');