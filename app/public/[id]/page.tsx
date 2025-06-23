import { notFound } from 'next/navigation';
import PublicDashboardClient from './PublicDashboardClient';

interface SavedChart {
  id: string;
  name: string;
  type: 'bar' | 'stacked' | 'dual' | 'line';
  description?: string;
  createdAt: Date;
  configuration: any;
  chartConfig: any;
  chartData: any[];
  order?: number;
}

interface DashboardTextbox {
  id: string;
  content: string;
  width: 'half' | 'full';
  height?: number;
  createdAt: Date;
  order?: number;
}

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  chartsCount: number;
  createdAt: Date;
  lastModified: Date;
  charts: SavedChart[];
  textboxes: DashboardTextbox[];
  createdBy?: string;
}

// Server-side data fetching function
async function getPublicDashboard(dashboardId: string): Promise<Dashboard | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/public-dashboard/${dashboardId}`, {
      next: { revalidate: 120 } // Use ISR with 2-minute revalidation
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch public dashboard: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    if (!data.success || !data.dashboard) {
      console.error('Invalid dashboard data received');
      return null;
    }
    
    // Convert date strings back to Date objects
    const dashboardWithDates = {
      ...data.dashboard,
      createdAt: new Date(data.dashboard.createdAt),
      lastModified: new Date(data.dashboard.lastModified),
      charts: data.dashboard.charts.map((chart: any) => ({
        ...chart,
        createdAt: new Date(chart.createdAt)
      })),
      textboxes: data.dashboard.textboxes.map((textbox: any) => ({
        ...textbox,
        createdAt: new Date(textbox.createdAt)
      }))
    };
    
    return dashboardWithDates;
  } catch (error) {
    console.error('Error fetching public dashboard:', error);
    return null;
  }
}

interface PublicDashboardPageProps {
  params: {
    id: string;
  };
}

export default async function PublicDashboardPage({ params }: PublicDashboardPageProps) {
  const dashboardId = params.id;
  
  // Server-side data fetching
  const dashboard = await getPublicDashboard(dashboardId);
  
  if (!dashboard) {
    notFound();
  }
  
  // Pass the server-fetched data to the client component
  return <PublicDashboardClient initialDashboard={dashboard} />;
} 