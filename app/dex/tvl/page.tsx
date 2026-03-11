import { generateNextMetadata, generateStructuredData } from '../../seo-metadata';
import React, { Suspense } from 'react';
import EnhancedDashboardRenderer from "@/app/admin/components/enhanced-dashboard-renderer";

// SEO Structured Data
const structuredData = generateStructuredData('/dex/tvl');

export default function TvlPage() {
  return (
    <div className="space-y-6">
      
        <EnhancedDashboardRenderer 
          pageId="dex-tvl" 
          enableCaching={true}
        />
      
    </div>
  );
} 

export const metadata = generateNextMetadata('/dex/tvl');
