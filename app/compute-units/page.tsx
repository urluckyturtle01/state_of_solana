import { generateNextMetadata, generateStructuredData } from '../seo-metadata';
import React, { Suspense } from 'react';
import EnhancedDashboardRenderer from "@/app/admin/components/enhanced-dashboard-renderer";
import PrettyLoader from "@/app/components/shared/PrettyLoader";


// SEO Structured Data
const structuredData = generateStructuredData('/compute-units');

export default function ComputeUnitsIndexPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<PrettyLoader />}>
        <EnhancedDashboardRenderer 
          pageId="compute-units" 
          enableCaching={true}
        />
      </Suspense>
    </div>
  );
}

export const metadata = generateNextMetadata('/compute-units');