import { generateNextMetadata, generateStructuredData } from '../../seo-metadata';
import React, { Suspense } from 'react';
import EnhancedDashboardRenderer from "@/app/admin/components/enhanced-dashboard-renderer";

// Create a loading component for Suspense fallback

// SEO Structured Data
const structuredData = generateStructuredData('/dex/prop_amm');

export default function DexPropAmmPage() {
  return (
    <div className="space-y-4">
      
        <EnhancedDashboardRenderer 
          pageId="dex-prop-amm" 
          enableCaching={true}
          overrideCounters={[]}
          overrideTables={[]}
        />
      
    </div>
  );
} 

export const metadata = generateNextMetadata('/dex/prop_amm');
