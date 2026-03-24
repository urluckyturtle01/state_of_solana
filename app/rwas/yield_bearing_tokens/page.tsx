import { generateNextMetadata, generateStructuredData } from '../../seo-metadata';
import React, { Suspense } from 'react';
import EnhancedDashboardRenderer from "@/app/admin/components/enhanced-dashboard-renderer";
import PrettyLoader from "@/app/components/shared/PrettyLoader";

const ChartLoading = () => (
  <div className="w-full h-[500px] flex items-center justify-center">
    <PrettyLoader size="sm" />
  </div>
);

const structuredData = generateStructuredData('/rwas/yield_bearing_tokens');

export default function RwasYieldBearingTokensPage() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<ChartLoading />}>
        <EnhancedDashboardRenderer
          pageId="rwas-yield-bearing-tokens"
          enableCaching={true}
        />
      </Suspense>
    </div>
  );
}

export const metadata = generateNextMetadata('/rwas/yield_bearing_tokens');
