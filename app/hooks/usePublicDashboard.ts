"use client";

import { useState, useEffect } from 'react';
import { useDashboards } from '@/app/contexts/DashboardContext';

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
}

export const usePublicDashboard = (dashboardId: string) => {
  const { getDashboard, dashboards, isLoading } = useDashboards();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  useEffect(() => {
    // Get the dashboard from the context (which now loads from localStorage for public access)
    const foundDashboard = getDashboard(dashboardId);
    setDashboard(foundDashboard || null);
    console.log('🔍 Public dashboard lookup:', dashboardId, foundDashboard ? 'found' : 'not found');
    if (foundDashboard) {
      console.log('📊 Dashboard content:', {
        charts: foundDashboard.charts.length,
        textboxes: foundDashboard.textboxes.length
      });
    }
  }, [dashboardId, getDashboard, dashboards]);

  return { dashboard, isLoading };
}; 