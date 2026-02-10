"use client";

import { useState, useEffect } from 'react';

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
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicDashboard = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('🔍 Fetching public dashboard:', dashboardId);
        const response = await fetch(`/api/public-dashboard/${dashboardId}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.dashboard) {
            console.log('✅ Public dashboard loaded successfully:', data.dashboard.name);
            
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
            
            setDashboard(dashboardWithDates);
            console.log('📊 Dashboard content:', {
              id: dashboardWithDates.id,
              name: dashboardWithDates.name,
              createdBy: dashboardWithDates.createdBy,
              charts: dashboardWithDates.charts.length,
              textboxes: dashboardWithDates.textboxes.length,
              lastModified: dashboardWithDates.lastModified
            });
          } else {
            console.error('❌ Invalid response structure:', data);
            setError('Invalid dashboard data received');
            setDashboard(null);
          }
        } else {
          const errorData = await response.json();
          console.error('❌ Failed to fetch public dashboard:', response.status, errorData);
          setError(errorData.details || 'Dashboard not found or not accessible');
          setDashboard(null);
        }
      } catch (fetchError) {
        console.error('❌ Error fetching public dashboard:', fetchError);
        setError('Failed to load dashboard');
        setDashboard(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (dashboardId) {
      fetchPublicDashboard();
    }
  }, [dashboardId]);

  return { dashboard, isLoading, error };
}; 