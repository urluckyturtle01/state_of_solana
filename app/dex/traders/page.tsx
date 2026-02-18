import { generateNextMetadata, generateStructuredData } from '../../seo-metadata';
import React, { Suspense } from 'react';
import EnhancedDashboardRenderer from "@/app/admin/components/enhanced-dashboard-renderer";

// Create a loading component for Suspense fallback


// SEO Structured Data
const structuredData = generateStructuredData('/dex/traders');

export default function DexTradersPage() {
  return (
    <div className="space-y-4">
      
        <EnhancedDashboardRenderer 
          pageId="dex-traders" 
          enableCaching={true}
          
        />
      
    </div>
  );
} 

export const metadata = generateNextMetadata('/dex/traders');