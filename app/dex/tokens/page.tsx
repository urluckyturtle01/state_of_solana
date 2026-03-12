import { generateNextMetadata, generateStructuredData } from '../../seo-metadata';
import React, { Suspense } from 'react';
import EnhancedDashboardRenderer from "@/app/admin/components/enhanced-dashboard-renderer";
import PrettyLoader from "@/app/components/shared/PrettyLoader";

const ChartLoading = () => (
  <div className="w-full h-[500px] flex items-center justify-center">
    <PrettyLoader size="sm" />
  </div>
);

const structuredData = generateStructuredData('/dex/tokens');

export default function DexTokensPage() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<ChartLoading />}>
        <EnhancedDashboardRenderer
          pageId="dex-tokens"
          enableCaching={true}
        />
      </Suspense>
    </div>
  );
}

export const metadata = generateNextMetadata('/dex/tokens');
