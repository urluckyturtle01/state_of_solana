"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { validateNormalizedData, sanitizeNormalizedData, logValidationResult } from '../utils/dataValidation';

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
  isSaving: boolean;
  lastSaved: Date | null;
  userName: string;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
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

// Robust Data Manager Class
class DashboardDataManager {
  private pendingSave: NodeJS.Timeout | null = null;
  private isLoadingData = false;
  private hasPendingChanges = false;
  private lastKnownServerState: Dashboard[] = [];

  constructor(
    private setDashboards: React.Dispatch<React.SetStateAction<Dashboard[]>>,
    private setSyncStatus: React.Dispatch<React.SetStateAction<'idle' | 'syncing' | 'success' | 'error'>>,
    private setIsSaving: React.Dispatch<React.SetStateAction<boolean>>,
    private setLastSaved: React.Dispatch<React.SetStateAction<Date | null>>,
    private getApiEndpoint: () => string,
    private isAuthenticated: boolean
  ) {}

  // Load data from server (only called once on mount)
  async loadInitialData(): Promise<void> {
    if (this.isLoadingData) {
      console.log('🔄 Data load already in progress, skipping...');
      return;
    }

    this.isLoadingData = true;
    this.setSyncStatus('syncing');
    
    console.log('🔄 Loading initial data from server...');
    
    try {
      const apiEndpoint = this.getApiEndpoint();
      console.log('📡 Fetching from:', apiEndpoint);
      
      const response = await fetch(apiEndpoint);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📡 Server response:', data);
        
        if (data.success && data.userData) {
          // Validate and sanitize incoming data
          const sanitizedData = sanitizeNormalizedData(data.userData);
          const validationResult = validateNormalizedData(sanitizedData);
          logValidationResult(validationResult, 'Server data validation');
          
          const dashboards = this.reconstructDashboards(sanitizedData);
          console.log('✅ Loaded', dashboards.length, 'dashboards from server');
          
          // Update local state AND track server state
          this.lastKnownServerState = [...dashboards];
          this.setDashboards(dashboards);
          
          // Also sync to localStorage for offline access
          this.saveToLocalStorage(dashboards);
          
          this.setSyncStatus('success');
        } else {
          console.log('⚠️ No user data from server, starting with empty state');
          this.setDashboards([]);
          this.setSyncStatus('idle');
        }
      } else {
        throw new Error(`Server responded with ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      
      // Fallback to localStorage
      const localDashboards = this.loadFromLocalStorage();
      if (localDashboards.length > 0) {
        console.log('📥 Loaded', localDashboards.length, 'dashboards from localStorage as fallback');
        this.setDashboards(localDashboards);
      }
      
      this.setSyncStatus('error');
    } finally {
      this.isLoadingData = false;
    }
  }

  // Reconstruct dashboards from normalized server data
  private reconstructDashboards(userData: any): Dashboard[] {
    if (!userData.charts || !Array.isArray(userData.charts)) {
      // Legacy format
      return (userData.dashboards || []).map((dashboard: any) => ({
        ...dashboard,
        createdAt: new Date(dashboard.createdAt),
        lastModified: new Date(dashboard.lastModified),
        charts: (dashboard.charts || []).map((chart: any) => ({
          ...chart,
          createdAt: new Date(chart.createdAt)
        })),
        textboxes: (dashboard.textboxes || []).map((textbox: any) => ({
          ...textbox,
          createdAt: new Date(textbox.createdAt)
        }))
      }));
    }

    // Normalized format
    const dashboards = userData.dashboards || [];
    const charts = userData.charts || [];
    const textboxes = userData.textboxes || [];

    return dashboards.map((dashboard: any) => {
      const dashboardCharts = charts
        .filter((chart: any) => chart.dashboardId === dashboard.id)
        .map((chart: any) => ({
          ...chart,
          createdAt: new Date(chart.createdAt)
        }))
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

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
        chartsCount: dashboardCharts.length
      };
    });
  }

  // Update dashboards with change tracking
  updateDashboards(updater: (prev: Dashboard[]) => Dashboard[]): void {
    if (!this.isAuthenticated) return;
    
    this.setDashboards(prev => {
      const updated = updater(prev);
      
      // Mark as having pending changes
      this.hasPendingChanges = true;
      
      // Save to localStorage immediately
      this.saveToLocalStorage(updated);
      
      // Debounce server save
      this.debouncedServerSave(updated);
      
      return updated;
    });
  }

  // Debounced server save
  private debouncedServerSave(dashboards: Dashboard[]): void {
    if (this.pendingSave) {
      clearTimeout(this.pendingSave);
    }

    this.pendingSave = setTimeout(async () => {
      if (this.hasPendingChanges) {
        await this.saveToServer(dashboards);
        this.hasPendingChanges = false;
      }
    }, 1000);
  }

  // Save to server
  async saveToServer(dashboards: Dashboard[]): Promise<void> {
    if (!this.isAuthenticated) return;

    this.setIsSaving(true);
    this.setSyncStatus('syncing');

    const apiEndpoint = this.getApiEndpoint();
    console.log('💾 Saving to server:', apiEndpoint);

    const normalizedData = this.normalizeForServer(dashboards);
    console.log('📊 Normalized data:', {
      endpoint: apiEndpoint,
      dashboards: normalizedData.dashboards.length,
      charts: normalizedData.charts.length,
      textboxes: normalizedData.textboxes.length
    });

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Save failed: ${response.status} ${errorText}`);
      }

      // Track successful save
      this.lastKnownServerState = [...dashboards];
      this.setLastSaved(new Date());
      this.setSyncStatus('success');
      
      console.log('✅ Successfully saved to server');
    } catch (error) {
      console.error('❌ Server save failed:', error);
      this.setSyncStatus('error');
      throw error;
    } finally {
      this.setIsSaving(false);
    }
  }

  // Normalize data for server
  private normalizeForServer(dashboards: Dashboard[]) {
    const normalizedData = {
      dashboards: dashboards.map(d => ({
        id: d.id,
        name: d.name,
        description: d.description,
        createdAt: d.createdAt.toISOString(),
        lastModified: d.lastModified.toISOString(),
        chartsCount: d.charts.length,
        textboxesCount: d.textboxes.length,
        createdBy: d.createdBy
      })),
      charts: dashboards.flatMap(d => 
        d.charts.map(chart => ({
          ...chart,
          dashboardId: d.id,
          createdAt: chart.createdAt.toISOString()
        }))
      ),
      textboxes: dashboards.flatMap(d =>
        d.textboxes.map(textbox => ({
          ...textbox,
          dashboardId: d.id,
          createdAt: textbox.createdAt.toISOString()
        }))
      )
    };

    // Validate before sending
    const validationResult = validateNormalizedData(normalizedData);
    logValidationResult(validationResult, 'Pre-save validation');
    
    return normalizedData;
  }

  // localStorage operations
  private saveToLocalStorage(dashboards: Dashboard[]): void {
    try {
      localStorage.setItem('dashboards', JSON.stringify(dashboards));
      console.log('💾 Saved to localStorage:', dashboards.length, 'dashboards');
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  private loadFromLocalStorage(): Dashboard[] {
    try {
      const stored = localStorage.getItem('dashboards');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((dashboard: any) => ({
          ...dashboard,
          createdAt: new Date(dashboard.createdAt),
          lastModified: new Date(dashboard.lastModified),
          charts: (dashboard.charts || []).map((chart: any) => ({
            ...chart,
            createdAt: new Date(chart.createdAt)
          })),
          textboxes: (dashboard.textboxes || []).map((textbox: any) => ({
            ...textbox,
            createdAt: new Date(textbox.createdAt)
          }))
        }));
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
    return [];
  }

  // Force immediate save
  async forceSave(dashboards: Dashboard[]): Promise<void> {
    if (this.pendingSave) {
      clearTimeout(this.pendingSave);
      this.pendingSave = null;
    }
    
    await this.saveToServer(dashboards);
    this.hasPendingChanges = false;
  }

  // Cleanup
  cleanup(): void {
    if (this.pendingSave) {
      clearTimeout(this.pendingSave);
    }
  }
}

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  
  const { isAuthenticated, user } = useAuth();
  const dataManagerRef = useRef<DashboardDataManager | null>(null);
  const hasInitialized = useRef(false);

  // Get API endpoint based on auth type
  const getApiEndpoint = useCallback(() => {
    return user?.email ? '/api/user-data/google' : '/api/user-data/internal';
  }, [user?.email]);

  // Initialize data manager
  useEffect(() => {
    if (isAuthenticated && !hasInitialized.current) {
      console.log('🚀 Initializing robust dashboard system...');
      console.log('🔍 Auth state:', {
        isAuthenticated,
        userEmail: user?.email,
        isGoogleAuth: !!user?.email,
        endpoint: getApiEndpoint()
      });

      // Create data manager
      dataManagerRef.current = new DashboardDataManager(
        setDashboards,
        setSyncStatus,
        setIsSaving,
        setLastSaved,
        getApiEndpoint,
        isAuthenticated
      );

      // Load initial data
      dataManagerRef.current.loadInitialData();
      hasInitialized.current = true;

      // Cleanup on unmount
      return () => {
        dataManagerRef.current?.cleanup();
      };
    }
  }, [isAuthenticated, getApiEndpoint, user?.email]);

  // Dashboard operations
  const createDashboard = useCallback((name: string, description?: string): Dashboard => {
    const newDashboard: Dashboard = {
      id: generateShortId(),
      name,
      description,
      chartsCount: 0,
      createdAt: new Date(),
      lastModified: new Date(),
      charts: [],
      textboxes: [],
      createdBy: undefined
    };
    
    console.log('🆕 Creating dashboard:', newDashboard.name);
    
    dataManagerRef.current?.updateDashboards(prev => [...prev, newDashboard]);
    return newDashboard;
  }, []);

  const addChartToDashboard = useCallback((dashboardId: string, chart: SavedChart) => {
    dataManagerRef.current?.updateDashboards(prev => 
      prev.map(dashboard => {
        if (dashboard.id === dashboardId) {
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
  }, []);

  const addTextboxToDashboard = useCallback((dashboardId: string, content: string, width: 'half' | 'full') => {
    dataManagerRef.current?.updateDashboards(prev => 
      prev.map(dashboard => {
        if (dashboard.id === dashboardId) {
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
  }, []);

  const updateDashboard = useCallback((id: string, updates: Partial<Pick<Dashboard, 'name' | 'description'>>) => {
    dataManagerRef.current?.updateDashboards(prev => 
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
  }, []);

  const deleteDashboard = useCallback((id: string) => {
    dataManagerRef.current?.updateDashboards(prev => prev.filter(d => d.id !== id));
  }, []);

  const getDashboard = useCallback((id: string): Dashboard | undefined => {
    return dashboards.find(dashboard => dashboard.id === id);
  }, [dashboards]);

  const reorderCharts = useCallback((dashboardId: string, startIndex: number, endIndex: number) => {
    dataManagerRef.current?.updateDashboards(prev => 
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
  }, []);

  const deleteChart = useCallback((dashboardId: string, chartId: string) => {
    dataManagerRef.current?.updateDashboards(prev => 
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
  }, []);

  const deleteTextbox = useCallback((dashboardId: string, textboxId: string) => {
    dataManagerRef.current?.updateDashboards(prev => 
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
  }, []);

  const reorderItems = useCallback((dashboardId: string, startIndex: number, endIndex: number) => {
    dataManagerRef.current?.updateDashboards(prev => 
      prev.map(dashboard => {
        if (dashboard.id === dashboardId) {
          const allItems = [
            ...dashboard.charts.map(chart => ({ ...chart, type: 'chart' as const })),
            ...dashboard.textboxes.map(textbox => ({ ...textbox, type: 'textbox' as const }))
          ].sort((a, b) => (a.order || 0) - (b.order || 0));
          
          const [reorderedItem] = allItems.splice(startIndex, 1);
          allItems.splice(endIndex, 0, reorderedItem);
          
          const itemsWithNewOrder = allItems.map((item, index) => ({
            ...item,
            order: index
          }));
          
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
  }, []);

  const updateTextbox = useCallback((dashboardId: string, textboxId: string, updates: Partial<Pick<DashboardTextbox, 'content' | 'height'>>) => {
    dataManagerRef.current?.updateDashboards(prev => 
      prev.map(dashboard => {
        if (dashboard.id === dashboardId) {
          const updatedTextboxes = dashboard.textboxes.map(textbox => {
            if (textbox.id === textboxId) {
              return { ...textbox, ...updates };
            }
            return textbox;
          });
          
          return {
            ...dashboard,
            textboxes: updatedTextboxes,
            lastModified: new Date()
          };
        }
        return dashboard;
      })
    );
  }, []);

  const updateDashboardCreator = useCallback((id: string, creatorName: string) => {
    dataManagerRef.current?.updateDashboards(prev => 
      prev.map(dashboard => {
        if (dashboard.id === id) {
          return {
            ...dashboard,
            createdBy: creatorName,
            lastModified: new Date()
          };
        }
        return dashboard;
      })
    );
  }, []);

  const saveToServer = useCallback(async () => {
    if (dataManagerRef.current) {
      await dataManagerRef.current.forceSave(dashboards);
    }
  }, [dashboards]);

  const forceSave = useCallback(async () => {
    await saveToServer();
  }, [saveToServer]);

  const forceReload = useCallback(async () => {
    if (dataManagerRef.current) {
      hasInitialized.current = false;
      await dataManagerRef.current.loadInitialData();
    }
  }, []);

  return (
    <DashboardContext.Provider value={{
      dashboards,
      isLoading,
      isSaving,
      lastSaved,
      userName,
      syncStatus,
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

function generateShortId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
} 