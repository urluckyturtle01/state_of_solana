"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SavedChart {
  id: string;
  name: string;
  type: 'bar' | 'stacked' | 'dual' | 'line';
  description?: string;
  createdAt: Date;
  configuration: any;
  chartConfig: any;
  chartData: any[];
}

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  chartsCount: number;
  createdAt: Date;
  lastModified: Date;
  charts: SavedChart[];
}

interface DashboardContextType {
  dashboards: Dashboard[];
  addChartToDashboard: (dashboardId: string, chart: SavedChart) => void;
  createDashboard: (name: string, description?: string) => Dashboard;
  getDashboard: (id: string) => Dashboard | undefined;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const useDashboards = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboards must be used within a DashboardProvider');
  }
  return context;
};

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);

  // Initialize with default dashboards
  useEffect(() => {
    const defaultDashboards: Dashboard[] = [
      {
        id: '1',
        name: 'jito sol',
        description: 'Jito SOL metrics and analytics',
        chartsCount: 0,
        createdAt: new Date('2024-01-15'),
        lastModified: new Date('2024-03-01'),
        charts: []
      },
      {
        id: '2',
        name: 'JLP Dashboard',
        description: 'Jupiter LP token performance tracking',
        chartsCount: 0,
        createdAt: new Date('2024-01-20'),
        lastModified: new Date('2024-03-02'),
        charts: []
      },
      {
        id: '3',
        name: 'Jupiter Aggregator',
        description: 'Aggregation volume and routing analytics',
        chartsCount: 0,
        createdAt: new Date('2024-02-01'),
        lastModified: new Date('2024-02-28'),
        charts: []
      },
      {
        id: '4',
        name: 'Lag in major tables',
        description: 'Database performance monitoring',
        chartsCount: 0,
        createdAt: new Date('2024-02-10'),
        lastModified: new Date('2024-03-03'),
        charts: []
      }
    ];

    // Try to load from localStorage, fallback to default
    const savedDashboards = localStorage.getItem('dashboards');
    if (savedDashboards) {
      try {
        const parsed = JSON.parse(savedDashboards);
        // Convert date strings back to Date objects
        const dashboardsWithDates = parsed.map((dashboard: any) => ({
          ...dashboard,
          createdAt: new Date(dashboard.createdAt),
          lastModified: new Date(dashboard.lastModified),
          charts: dashboard.charts.map((chart: any) => ({
            ...chart,
            createdAt: new Date(chart.createdAt)
          }))
        }));
        setDashboards(dashboardsWithDates);
      } catch (error) {
        console.error('Failed to parse saved dashboards:', error);
        setDashboards(defaultDashboards);
      }
    } else {
      setDashboards(defaultDashboards);
    }
  }, []);

  // Save to localStorage whenever dashboards change
  useEffect(() => {
    localStorage.setItem('dashboards', JSON.stringify(dashboards));
  }, [dashboards]);

  const addChartToDashboard = (dashboardId: string, chart: SavedChart) => {
    setDashboards(prev => 
      prev.map(dashboard => {
        if (dashboard.id === dashboardId) {
          const updatedCharts = [...dashboard.charts, chart];
          return {
            ...dashboard,
            charts: updatedCharts,
            chartsCount: updatedCharts.length,
            lastModified: new Date()
          };
        }
        return dashboard;
      })
    );
  };

  const createDashboard = (name: string, description?: string): Dashboard => {
    const newDashboard: Dashboard = {
      id: `dashboard-${Date.now()}`,
      name,
      description,
      chartsCount: 0,
      createdAt: new Date(),
      lastModified: new Date(),
      charts: []
    };

    setDashboards(prev => [...prev, newDashboard]);
    return newDashboard;
  };

  const getDashboard = (id: string): Dashboard | undefined => {
    return dashboards.find(dashboard => dashboard.id === id);
  };

  return (
    <DashboardContext.Provider value={{
      dashboards,
      addChartToDashboard,
      createDashboard,
      getDashboard
    }}>
      {children}
    </DashboardContext.Provider>
  );
}; 