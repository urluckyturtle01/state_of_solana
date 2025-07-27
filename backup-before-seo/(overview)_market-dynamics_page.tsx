import React, { Suspense } from 'react';
import ServerChartRenderer from "@/app/components/ServerChartRenderer";

// Create a loading component for Suspense fallback
const ChartLoading = () => (
  <div className="w-full h-[500px] flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-t-blue-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
  </div>
);

export default function MarketDynamicsPage() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<ChartLoading />}>
        <ServerChartRenderer 
          pageId="market-dynamics" 
          enableCaching={true}
        />
      </Suspense>
    </div>
  );
} 