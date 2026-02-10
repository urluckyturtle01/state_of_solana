import { generateNextMetadata, generateStructuredData } from '../../seo-metadata';
import React, { Suspense } from 'react';
import EnhancedDashboardRenderer from "@/app/admin/components/enhanced-dashboard-renderer";

// Create a loading component for Suspense fallback

// SEO Structured Data
const structuredData = generateStructuredData('/dex/network_fees');

export default function DexNetworkFeesPage() {
  return (
    <div className="space-y-4">
      
        <EnhancedDashboardRenderer 
          pageId="dex-network-fees" 
          enableCaching={true}
          overrideCounters={[]}
          overrideTables={[]}
        />
      
    </div>
  );
} 

export const metadata = generateNextMetadata('/dex/network_fees');
