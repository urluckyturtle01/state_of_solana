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
  createdBy?: string; // Creator's name
}

interface DashboardContextType {
  dashboards: Dashboard[];
  isLoading: boolean;
  userName: string;
  addChartToDashboard: (dashboardId: string, chart: SavedChart) => void;
  addTextboxToDashboard: (dashboardId: string, content: string, width: 'half' | 'full') => void;
  updateTextbox: (dashboardId: string, textboxId: string, updates: Partial<Pick<DashboardTextbox, 'content' | 'height'>>) => void;
  createDashboard: (name: string, description?: string) => Dashboard;
  getDashboard: (id: string) => Dashboard | undefined;
  updateDashboard: (id: string, updates: Partial<Pick<Dashboard, 'name' | 'description'>>) => void;
  deleteDashboard: (id: string) => void;
  reorderCharts: (dashboardId: string, startIndex: number, endIndex: number) => void;
  deleteChart: (dashboardId: string, chartId: string) => void;
  deleteTextbox: (dashboardId: string, textboxId: string) => void;
  reorderItems: (dashboardId: string, startIndex: number, endIndex: number) => void;
  saveToServer: () => Promise<void>;
  forceSave: () => Promise<void>;
  forceReload: () => Promise<void>;
  updateDashboardCreator: (id: string, creatorName: string) => void;
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
  const [userName, setUserName] = useState<string>(''); // Store user name from S3
  const { isAuthenticated, user } = useAuth();

  // Track if data has been loaded to prevent reloading on navigation
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Load user data when authenticated (only once)
  useEffect(() => {
    if (isAuthenticated && user && !hasLoadedData) {
      console.log('🔄 First time loading user data for authenticated user');
      loadUserData();
      setHasLoadedData(true);
    } else if (!isAuthenticated && !hasLoadedData) {
      console.log('🔄 Loading data for non-authenticated user');
      // For non-authenticated users (public dashboards), try to load from localStorage first
      try {
        const storedDashboards = localStorage.getItem('dashboards');
        if (storedDashboards !== null) {
          const dashboards = JSON.parse(storedDashboards);
          // Handle both empty arrays and arrays with data
          const dashboardsWithDates = dashboards.map((dashboard: any) => ({
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
          console.log('📥 Loaded dashboards from localStorage for public access:', dashboardsWithDates.length, 'dashboards');
        } else {
          // Fallback to default empty dashboards if no localStorage data
          loadDefaultDashboards();
        }
      } catch (error) {
        console.error('Failed to load from localStorage:', error);
        loadDefaultDashboards();
      }
      setHasLoadedData(true);
    }
  }, [isAuthenticated, user, hasLoadedData]);

  const loadDefaultDashboards = () => {
    // Start with zero dashboards - users will create their own
    const defaultDashboards: Dashboard[] = [];
    setDashboards(defaultDashboards);
  };

  const loadUserData = async () => {
    setIsLoading(true);
    console.log('🔄 Starting loadUserData...');
    try {
      console.log('📡 Fetching from /api/user-data...');
      const response = await fetch('/api/user-data');
      console.log('📡 Response status:', response.status, response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📡 Full API response:', data);
        
        if (data.success && data.userData) {
          console.log('📥 Loading normalized user data from S3');
          console.log('📊 Raw S3 data counts:', {
            dashboards: data.userData.dashboards?.length || 0,
            charts: data.userData.charts?.length || 0,
            textboxes: data.userData.textboxes?.length || 0,
            userName: data.userData.name || 'Unknown'
          });
          
          // Add debugging for auth state
          console.log('🔐 Auth state during load:', {
            hasUserData: !!data.userData,
            hasCharts: !!data.userData.charts,
            isArray: Array.isArray(data.userData.charts)
          });
          
          // Store the user name from S3 data
          setUserName(data.userData.name || data.userData.email || 'User');
          
          // Handle both old denormalized and new normalized structures
          let dashboardsWithDates: Dashboard[];
          
          if (data.userData.charts && Array.isArray(data.userData.charts)) {
            // New normalized structure - reconstruct dashboards
            console.log('📊 Using normalized structure');
            
            const dashboards = data.userData.dashboards || [];
            const charts = data.userData.charts || [];
            const textboxes = data.userData.textboxes || [];
            
            dashboardsWithDates = dashboards.map((dashboard: any) => {
              // Find charts for this dashboard
              const dashboardCharts = charts
                .filter((chart: any) => chart.dashboardId === dashboard.id)
                .map((chart: any) => ({
                  ...chart,
                  createdAt: new Date(chart.createdAt)
                }))
                .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
              
              // Find textboxes for this dashboard
              const dashboardTextboxes = textboxes
                .filter((textbox: any) => textbox.dashboardId === dashboard.id)
                .map((textbox: any) => ({
                  ...textbox,
                  createdAt: new Date(textbox.createdAt)
                }))
                .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
              
              return {
                ...dashboard,
                createdAt: new Date(dashboard.createdAt),
                lastModified: new Date(dashboard.lastModified),
                charts: dashboardCharts,
                textboxes: dashboardTextboxes,
                chartsCount: dashboardCharts.length, // Ensure consistency
                createdBy: data.userData.createdBy
              };
            });
          } else {
            // Old denormalized structure - convert dates
            console.log('📊 Using legacy denormalized structure');
            dashboardsWithDates = data.userData.dashboards.map((dashboard: any) => ({
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
              })) || [],
              createdBy: data.userData.createdBy
            }));
          }
          
          console.log('✅ Reconstructed dashboards:', dashboardsWithDates.map(d => ({
            id: d.id,
            name: d.name,
            chartsCount: d.charts.length,
            textboxesCount: d.textboxes.length
          })));
          
          console.log('🎯 Setting dashboards state with', dashboardsWithDates.length, 'dashboards');
          setDashboards(dashboardsWithDates);
          console.log('✅ Dashboard state updated successfully');
        } else {
          console.log('❌ API call was not successful');
          console.log('Response status:', response.status);
          console.log('Response text:', await response.text());
        }
      } else {
        console.log('❌ API response not ok, status:', response.status);
        const errorText = await response.text();
        console.log('Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Failed to load user data:', error);
      console.error('Error details:', error);
      loadDefaultDashboards(); // Fallback to default dashboards
    } finally {
      console.log('🔄 Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const saveToServer = async () => {
    if (!isAuthenticated) {
      return;
    }

    // Create properly normalized structure for S3
    const normalizedData = {
      dashboards: dashboards.map(d => ({
        id: d.id,
        name: d.name,
        description: d.description,
        createdAt: d.createdAt.toISOString(),
        lastModified: d.lastModified.toISOString(),
        chartsCount: d.charts.length, // Keep for quick access
        textboxesCount: d.textboxes.length,
        createdBy: d.createdBy
      })),
      charts: dashboards.flatMap(d => 
        d.charts.map(chart => ({
          ...chart,
          dashboardId: d.id, // Foreign key reference
          createdAt: chart.createdAt.toISOString()
        }))
      ),
      textboxes: dashboards.flatMap(d =>
        d.textboxes.map(textbox => ({
          ...textbox,
          dashboardId: d.id, // Foreign key reference
          createdAt: textbox.createdAt.toISOString()
        }))
      )
    };

    console.log('💾 Saving to S3:', {
      dashboards: normalizedData.dashboards.length,
      charts: normalizedData.charts.length,
      textboxes: normalizedData.textboxes.length
    });

    try {
      const response = await fetch('/api/user-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(normalizedData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Save failed:', response.status, errorText);
        throw new Error(`Failed to save dashboards: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Save successful');
    } catch (error) {
      console.error('❌ Save error:', error);
    }
  };

  // Auto-save dashboards when they change (for authenticated users)
  useEffect(() => {
    if (isAuthenticated) {
      // Save to localStorage immediately for public dashboard access
      // This includes saving empty arrays when all dashboards are deleted
      try {
        localStorage.setItem('dashboards', JSON.stringify(dashboards));
        console.log('💾 Saved dashboards to localStorage:', dashboards.map(d => ({
          id: d.id,
          name: d.name, 
          createdBy: d.createdBy
        })));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }

      // Also save to server with debounce
      const timeoutId = setTimeout(() => {
        saveToServer();
      }, 1000); // Debounce saves by 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [dashboards, isAuthenticated]);

  const addChartToDashboard = (dashboardId: string, chart: SavedChart) => {
    setDashboards(prev => {
      const updatedDashboards = prev.map(dashboard => {
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
      });
      
      return updatedDashboards;
    });
  };

  const addTextboxToDashboard = (dashboardId: string, content: string, width: 'half' | 'full') => {
    setDashboards(prev => 
      prev.map(dashboard => {
        if (dashboard.id === dashboardId) {
          // Get next order number
          const allItems = [...dashboard.charts, ...dashboard.textboxes];
          const maxOrder = allItems.length > 0 ? Math.max(...allItems.map(item => item.order || 0)) : -1;
          
          const newTextbox: DashboardTextbox = {
            id: `textbox-${generateShortId()}`,
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
      id: generateShortId(),
      name,
      description,
      chartsCount: 0,
      createdAt: new Date(),
      lastModified: new Date(),
      charts: [],
      textboxes: [],
      createdBy: undefined // Creator will be set when dashboard is made public
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

  const forceSave = async () => {
    console.log('🚀 Force save triggered manually');
    await saveToServer();
  };

  const forceReload = async () => {
    console.log('🔄 Force reload triggered - reloading from S3');
    setHasLoadedData(false);
    if (isAuthenticated && user) {
      await loadUserData();
      setHasLoadedData(true);
    }
  };

  const deleteDashboard = (id: string) => {
    setDashboards(prev => prev.filter(dashboard => dashboard.id !== id));
  };

  const updateDashboardCreator = (id: string, creatorName: string) => {
    console.log('🏗️ updateDashboardCreator called:', { id, creatorName });
    
    setDashboards(prev => {
      const updated = prev.map(dashboard => {
        if (dashboard.id === id) {
          console.log('📊 Updating dashboard:', dashboard.name, 'with creator:', creatorName);
          const updatedDashboard = {
            ...dashboard,
            createdBy: creatorName,
            lastModified: new Date()
          };
          console.log('✅ Updated dashboard object:', { 
            id: updatedDashboard.id, 
            name: updatedDashboard.name, 
            createdBy: updatedDashboard.createdBy 
          });
          return updatedDashboard;
        }
        return dashboard;
      });
      
      console.log('💾 All dashboards after update:', updated.map(d => ({ 
        id: d.id, 
        name: d.name, 
        createdBy: d.createdBy 
      })));
      
      // Dispatch event for public dashboard refresh
      setTimeout(() => {
        const event = new CustomEvent('dashboardUpdated', {
          detail: { dashboardId: id }
        });
        window.dispatchEvent(event);
        console.log('📡 Dispatched dashboardUpdated event for:', id);
      }, 100);
      
      return updated;
    });
  };

  return (
    <DashboardContext.Provider value={{
      dashboards,
      isLoading,
      userName,
      addChartToDashboard,
      addTextboxToDashboard,
      updateTextbox,
      createDashboard,
      getDashboard,
      updateDashboard,
      deleteDashboard,
      reorderCharts,
      deleteChart,
      deleteTextbox,
      reorderItems,
      saveToServer,
      forceSave,
      forceReload,
      updateDashboardCreator
    }}>
      {children}
    </DashboardContext.Provider>
  );
};

// Generate a proper UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate a shorter, URL-friendly unique ID (12 characters)
function generateShortId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
} 