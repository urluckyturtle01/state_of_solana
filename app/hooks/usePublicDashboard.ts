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
  createdBy?: string;
}

export const usePublicDashboard = (dashboardId: string) => {
  const { getDashboard, dashboards, isLoading } = useDashboards();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // Get the dashboard from the context (which now loads from localStorage for public access)
    const foundDashboard = getDashboard(dashboardId);
    setDashboard(foundDashboard || null);
    console.log('🔍 Public dashboard lookup:', dashboardId, foundDashboard ? 'found' : 'not found');
    if (foundDashboard) {
      console.log('📊 Dashboard content:', {
        id: foundDashboard.id,
        name: foundDashboard.name,
        createdBy: foundDashboard.createdBy,
        charts: foundDashboard.charts.length,
        textboxes: foundDashboard.textboxes.length,
        lastModified: foundDashboard.lastModified
      });
    }
  }, [dashboardId, getDashboard, dashboards, refreshTrigger]);

  // Listen for dashboard updates
  useEffect(() => {
    const handleDashboardUpdate = (event: CustomEvent) => {
      if (event.detail.dashboardId === dashboardId) {
        console.log('🔄 Public dashboard received update event, refreshing...');
        setRefreshTrigger(prev => prev + 1);
      }
    };

    window.addEventListener('dashboardUpdated', handleDashboardUpdate as EventListener);
    return () => {
      window.removeEventListener('dashboardUpdated', handleDashboardUpdate as EventListener);
    };
  }, [dashboardId]);

  return { dashboard, isLoading };
}; 