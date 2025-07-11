"use client";
import React, { Suspense, useRef } from 'react';
import EnhancedDashboardRenderer from "@/app/admin/components/enhanced-dashboard-renderer";
import PrettyLoader from "@/app/components/shared/PrettyLoader";


// Create a loading component for Suspense fallback
const ChartLoading = () => (
  <div className="w-full h-[500px] flex items-center justify-center">
    <PrettyLoader size="sm" />
  </div>
);

export default function RaydiumFinancialsPage() {
  const tableRef = useRef<HTMLDivElement>(null);

  const scrollToIncomeStatement = () => {
    // First try to find the table by looking for common table selectors
    const tableElement = document.querySelector('[data-testid="table-container"]') || 
                        document.querySelector('.table-container') ||
                        document.querySelector('table') ||
                        tableRef.current;
    
    if (tableElement) {
      tableElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest' 
      });
    } else {
      // Fallback: scroll to a position where tables typically appear
      const dashboardElement = document.querySelector('[data-testid="enhanced-dashboard"]');
      if (dashboardElement) {
        const tables = dashboardElement.querySelectorAll('table, [class*="table"]');
        if (tables.length > 0) {
          tables[0].scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest' 
          });
        }
      }
    }
  };

  return (
    <div className="space-y-0">
      {/* Income Statement Chip */}
      <div className="flex justify-start">
        <button
          onClick={scrollToIncomeStatement}
          className="inline-flex items-center px-3 py-1.5 bg-gray-800/40 hover:bg-gray-800/60 border border-gray-800/30 hover:border-gray-800/50 rounded-lg text-gray-400 hover:text-gray-300 text-xs font-medium transition-colors duration-150"
        >
          <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Income Statement
        </button>
      </div>

      {/* Dashboard Content */}
      <div ref={tableRef} data-testid="enhanced-dashboard">
      <Suspense fallback={<ChartLoading />}>
        <EnhancedDashboardRenderer 
          pageId="raydium-financials" 
          enableCaching={true}
        />
      </Suspense>
      </div>
    </div>
  );
} 