import { ChartConfig, CounterConfig, TableConfig } from '@/app/admin/types';
import dynamic from 'next/dynamic';

// Use dynamic imports for the existing admin components
const EnhancedDashboardRenderer = dynamic(() => import('../admin/components/enhanced-dashboard-renderer'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-64 w-full">
      <div className="w-6 h-6 border-2 border-t-blue-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
    </div>
  )
});

// Server-side data fetching function for charts
async function getChartsForPage(pageId: string): Promise<ChartConfig[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/charts?page=${pageId}`, {
      next: { revalidate: 30 } // Use ISR with 30-second revalidation
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch charts for page ${pageId}: ${response.status}`);
      return [];
    }
    
    const charts = await response.json();
    return Array.isArray(charts) ? charts : [];
  } catch (error) {
    console.error(`Error fetching charts for page ${pageId}:`, error);
    return [];
  }
}

// Server-side data fetching function for counters
async function getCountersForPage(pageId: string): Promise<CounterConfig[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/counters?page=${pageId}`, {
      next: { revalidate: 30 } // Use ISR with 30-second revalidation
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch counters for page ${pageId}: ${response.status}`);
      return [];
    }
    
    const counters = await response.json();
    return Array.isArray(counters) ? counters : [];
  } catch (error) {
    console.error(`Error fetching counters for page ${pageId}:`, error);
    return [];
  }
}

// Server-side data fetching function for tables
async function getTablesForPage(pageId: string): Promise<TableConfig[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/tables?page=${pageId}`, {
      next: { revalidate: 30 } // Use ISR with 30-second revalidation
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch tables for page ${pageId}: ${response.status}`);
      return [];
    }
    
    const tables = await response.json();
    return Array.isArray(tables) ? tables : [];
  } catch (error) {
    console.error(`Error fetching tables for page ${pageId}:`, error);
    return [];
  }
}

interface ServerChartRendererProps {
  pageId: string;
  enableCaching?: boolean;
  section?: string;
}

export default async function ServerChartRenderer({ 
  pageId, 
  enableCaching = true,
  section 
}: ServerChartRendererProps) {
  // Server-side data fetching
  const [charts, counters, tables] = await Promise.all([
    getChartsForPage(pageId),
    getCountersForPage(pageId),
    getTablesForPage(pageId)
  ]);

  // For now, use the existing EnhancedDashboardRenderer which handles client-side logic
  // In the future, this could be optimized further by passing the server-fetched data
  return (
    <EnhancedDashboardRenderer 
      pageId={pageId}
      enableCaching={enableCaching}
      section={section}
    />
  );
} 