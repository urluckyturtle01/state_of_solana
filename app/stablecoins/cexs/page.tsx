import { generateNextMetadata, generateStructuredData } from '../../seo-metadata';
import React, { Suspense } from 'react';
import EnhancedDashboardRenderer from "@/app/admin/components/enhanced-dashboard-renderer";

// Create a loading component for Suspense fallback

// SEO Structured Data
const structuredData = generateStructuredData('/stablecoins/cexs');

export default function CexsPage() {
  return (
    <div className="space-y-6">
      
        <EnhancedDashboardRenderer 
          pageId="stablecoins-cexs" 
          enableCaching={true}
          //overrideCounters={[]}
          //overrideTables={[]}
        />
      
    </div>
  );
} 

export const metadata = generateNextMetadata('/stablecoins/cexs');
