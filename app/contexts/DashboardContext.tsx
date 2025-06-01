"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

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
  height?: number; // Height in pixels
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

interface DashboardContextType {
  dashboards: Dashboard[];
  isLoading: boolean;
  addChartToDashboard: (dashboardId: string, chart: SavedChart) => void;
  addTextboxToDashboard: (dashboardId: string, content: string, width: 'half' | 'full') => void;
  updateTextbox: (dashboardId: string, textboxId: string, updates: Partial<Pick<DashboardTextbox, 'content' | 'height'>>) => void;
  createDashboard: (name: string, description?: string) => Dashboard;
  getDashboard: (id: string) => Dashboard | undefined;
  updateDashboard: (id: string, updates: Partial<Pick<Dashboard, 'name' | 'description'>>) => void;
  reorderCharts: (dashboardId: string, startIndex: number, endIndex: number) => void;
  deleteChart: (dashboardId: string, chartId: string) => void;
  deleteTextbox: (dashboardId: string, textboxId: string) => void;
  reorderItems: (dashboardId: string, startIndex: number, endIndex: number) => void;
  saveToServer: () => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();

  // Load user data when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserData();
    } else {
      // Load default dashboards for non-authenticated users
      loadDefaultDashboards();
    }
  }, [isAuthenticated, user]);

  const loadDefaultDashboards = () => {
    const defaultDashboards: Dashboard[] = [
      {
        id: '1',
        name: 'jito sol',
        description: 'Jito SOL metrics and analytics',
        chartsCount: 0,
        createdAt: new Date('2024-01-15'),
        lastModified: new Date('2024-03-01'),
        charts: [],
        textboxes: []
      },
      {
        id: '2',
        name: 'JLP Dashboard',
        description: 'Jupiter LP token performance tracking',
        chartsCount: 0,
        createdAt: new Date('2024-01-20'),
        lastModified: new Date('2024-03-02'),
        charts: [],
        textboxes: []
      },
      {
        id: '3',
        name: 'Jupiter Aggregator',
        description: 'Aggregation volume and routing analytics',
        chartsCount: 0,
        createdAt: new Date('2024-02-01'),
        lastModified: new Date('2024-02-28'),
        charts: [],
        textboxes: []
      },
      {
        id: '4',
        name: 'Lag in major tables',
        description: 'Database performance monitoring',
        chartsCount: 0,
        createdAt: new Date('2024-02-10'),
        lastModified: new Date('2024-03-03'),
        charts: [],
        textboxes: []
      }
    ];

    setDashboards(defaultDashboards);
  };

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user-data');
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.userData) {
          // Convert date strings back to Date objects
          const dashboardsWithDates = data.userData.dashboards.map((dashboard: any) => ({
            ...dashboard,
            createdAt: new Date(dashboard.createdAt),
            lastModified: new Date(dashboard.lastModified),
            charts: dashboard.charts?.map((chart: any) => ({
              ...chart,
              createdAt: new Date(chart.createdAt)
            })) || [],
            textboxes: dashboard.textboxes?.map((textbox: any) => ({
              ...textbox,
              createdAt: new Date(textbox.createdAt)
            })) || []
          }));
          
          setDashboards(dashboardsWithDates);
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      loadDefaultDashboards(); // Fallback to default dashboards
    } finally {
      setIsLoading(false);
    }
  };

  const saveToServer = async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch('/api/user-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dashboards: dashboards
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save dashboards');
      }
    } catch (error) {
      console.error('Failed to save dashboards to server:', error);
    }
  };

  // Auto-save dashboards when they change (for authenticated users)
  useEffect(() => {
    if (isAuthenticated && dashboards.length > 0) {
      const timeoutId = setTimeout(() => {
        saveToServer();
      }, 1000); // Debounce saves by 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [dashboards, isAuthenticated]);

  const addChartToDashboard = (dashboardId: string, chart: SavedChart) => {
    setDashboards(prev => 
      prev.map(dashboard => {
        if (dashboard.id === dashboardId) {
          // Get next order number
          const allItems = [...dashboard.charts, ...dashboard.textboxes];
          const maxOrder = allItems.length > 0 ? Math.max(...allItems.map(item => item.order || 0)) : -1;
          
          const chartWithOrder = { ...chart, order: maxOrder + 1 };
          const updatedCharts = [...dashboard.charts, chartWithOrder];
          
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

  const addTextboxToDashboard = (dashboardId: string, content: string, width: 'half' | 'full') => {
    setDashboards(prev => 
      prev.map(dashboard => {
        if (dashboard.id === dashboardId) {
          // Get next order number
          const allItems = [...dashboard.charts, ...dashboard.textboxes];
          const maxOrder = allItems.length > 0 ? Math.max(...allItems.map(item => item.order || 0)) : -1;
          
          const newTextbox: DashboardTextbox = {
            id: `textbox-${Date.now()}`,
            content,
            width,
            createdAt: new Date(),
            order: maxOrder + 1
          };

          const updatedTextboxes = [...dashboard.textboxes, newTextbox];
          return {
            ...dashboard,
            textboxes: updatedTextboxes,
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
      charts: [],
      textboxes: []
    };

    setDashboards(prev => [...prev, newDashboard]);
    return newDashboard;
  };

  const getDashboard = (id: string): Dashboard | undefined => {
    return dashboards.find(dashboard => dashboard.id === id);
  };

  const updateDashboard = (id: string, updates: Partial<Pick<Dashboard, 'name' | 'description'>>) => {
    setDashboards(prev => 
      prev.map(dashboard => {
        if (dashboard.id === id) {
          return {
            ...dashboard,
            ...updates,
            lastModified: new Date()
          };
        }
        return dashboard;
      })
    );
  };

  const reorderCharts = (dashboardId: string, startIndex: number, endIndex: number) => {
    setDashboards(prev => 
      prev.map(dashboard => {
        if (dashboard.id === dashboardId) {
          const charts = [...dashboard.charts];
          const [reorderedItem] = charts.splice(startIndex, 1);
          charts.splice(endIndex, 0, reorderedItem);
          
          return {
            ...dashboard,
            charts,
            lastModified: new Date()
          };
        }
        return dashboard;
      })
    );
  };

  const deleteChart = (dashboardId: string, chartId: string) => {
    setDashboards(prev => 
      prev.map(dashboard => {
        if (dashboard.id === dashboardId) {
          const updatedCharts = dashboard.charts.filter(chart => chart.id !== chartId);
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

  const deleteTextbox = (dashboardId: string, textboxId: string) => {
    setDashboards(prev => 
      prev.map(dashboard => {
        if (dashboard.id === dashboardId) {
          const updatedTextboxes = dashboard.textboxes.filter(textbox => textbox.id !== textboxId);
          return {
            ...dashboard,
            textboxes: updatedTextboxes,
            lastModified: new Date()
          };
        }
        return dashboard;
      })
    );
  };

  const reorderItems = (dashboardId: string, startIndex: number, endIndex: number) => {
    setDashboards(prev => 
      prev.map(dashboard => {
        if (dashboard.id === dashboardId) {
          // Combine and sort all items by order
          const allItems = [
            ...dashboard.charts.map(chart => ({ ...chart, type: 'chart' as const })),
            ...dashboard.textboxes.map(textbox => ({ ...textbox, type: 'textbox' as const }))
          ].sort((a, b) => (a.order || 0) - (b.order || 0));
          
          // Perform the reorder
          const [reorderedItem] = allItems.splice(startIndex, 1);
          allItems.splice(endIndex, 0, reorderedItem);
          
          // Update order values
          const itemsWithNewOrder = allItems.map((item, index) => ({
            ...item,
            order: index
          }));
          
          // Separate back into charts and textboxes
          const newCharts = itemsWithNewOrder
            .filter(item => item.type === 'chart')
            .map(({ type, ...chart }) => chart as SavedChart);
          
          const newTextboxes = itemsWithNewOrder
            .filter(item => item.type === 'textbox')
            .map(({ type, ...textbox }) => textbox as DashboardTextbox);
          
          return {
            ...dashboard,
            charts: newCharts,
            textboxes: newTextboxes,
            lastModified: new Date()
          };
        }
        return dashboard;
      })
    );
  };

  const updateTextbox = (dashboardId: string, textboxId: string, updates: Partial<Pick<DashboardTextbox, 'content' | 'height'>>) => {
    setDashboards(prev => 
      prev.map(dashboard => {
        if (dashboard.id === dashboardId) {
          return {
            ...dashboard,
            textboxes: dashboard.textboxes.map(textbox => {
              if (textbox.id === textboxId) {
                return {
                  ...textbox,
                  ...updates
                };
              }
              return textbox;
            }),
            lastModified: new Date()
          };
        }
        return dashboard;
      })
    );
  };

  return (
    <DashboardContext.Provider value={{
      dashboards,
      isLoading,
      addChartToDashboard,
      addTextboxToDashboard,
      updateTextbox,
      createDashboard,
      getDashboard,
      updateDashboard,
      reorderCharts,
      deleteChart,
      deleteTextbox,
      reorderItems,
      saveToServer
    }}>
      {children}
    </DashboardContext.Provider>
  );
}; 