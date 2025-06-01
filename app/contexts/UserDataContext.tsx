"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface SavedVisualization {
  id: string;
  name: string;
  description?: string;
  configuration: any;
  chartConfig: any;
  chartData: any[];
  createdAt: Date;
}

interface ExplorerData {
  savedVisualizations: SavedVisualization[];
  selectedColumns: Record<string, string[]>;
  preferences: {
    defaultPageSize?: number;
    autoSave?: boolean;
    theme?: string;
  };
}

interface UserDataContextType {
  explorerData: ExplorerData;
  isLoading: boolean;
  addVisualization: (visualization: SavedVisualization) => void;
  updateVisualization: (id: string, updates: Partial<SavedVisualization>) => void;
  deleteVisualization: (id: string) => void;
  updateSelectedColumns: (apiId: string, columns: string[]) => void;
  updatePreferences: (preferences: Partial<ExplorerData['preferences']>) => void;
  saveToServer: () => Promise<void>;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export const useUserData = () => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
};

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [explorerData, setExplorerData] = useState<ExplorerData>({
    savedVisualizations: [],
    selectedColumns: {},
    preferences: {
      defaultPageSize: 50,
      autoSave: true,
      theme: 'dark'
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();

  // Load user data when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserData();
    } else {
      // Reset to default for non-authenticated users
      setExplorerData({
        savedVisualizations: [],
        selectedColumns: {},
        preferences: {
          defaultPageSize: 50,
          autoSave: true,
          theme: 'dark'
        }
      });
    }
  }, [isAuthenticated, user]);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user-data');
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.userData?.explorerData) {
          // Convert date strings back to Date objects for visualizations
          const explorerDataWithDates = {
            ...data.userData.explorerData,
            savedVisualizations: data.userData.explorerData.savedVisualizations?.map((viz: any) => ({
              ...viz,
              createdAt: new Date(viz.createdAt)
            })) || []
          };
          
          setExplorerData(explorerDataWithDates);
        }
      }
    } catch (error) {
      console.error('Failed to load user explorer data:', error);
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
          explorerData: explorerData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save explorer data');
      }
    } catch (error) {
      console.error('Failed to save explorer data to server:', error);
    }
  };

  // Auto-save explorer data when it changes (for authenticated users)
  useEffect(() => {
    if (isAuthenticated && explorerData.savedVisualizations.length > 0) {
      const timeoutId = setTimeout(() => {
        saveToServer();
      }, 1000); // Debounce saves by 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [explorerData, isAuthenticated]);

  const addVisualization = (visualization: SavedVisualization) => {
    setExplorerData(prev => ({
      ...prev,
      savedVisualizations: [...prev.savedVisualizations, visualization]
    }));
  };

  const updateVisualization = (id: string, updates: Partial<SavedVisualization>) => {
    setExplorerData(prev => ({
      ...prev,
      savedVisualizations: prev.savedVisualizations.map(viz =>
        viz.id === id ? { ...viz, ...updates } : viz
      )
    }));
  };

  const deleteVisualization = (id: string) => {
    setExplorerData(prev => ({
      ...prev,
      savedVisualizations: prev.savedVisualizations.filter(viz => viz.id !== id)
    }));
  };

  const updateSelectedColumns = (apiId: string, columns: string[]) => {
    setExplorerData(prev => ({
      ...prev,
      selectedColumns: {
        ...prev.selectedColumns,
        [apiId]: columns
      }
    }));
  };

  const updatePreferences = (preferences: Partial<ExplorerData['preferences']>) => {
    setExplorerData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        ...preferences
      }
    }));
  };

  return (
    <UserDataContext.Provider value={{
      explorerData,
      isLoading,
      addVisualization,
      updateVisualization,
      deleteVisualization,
      updateSelectedColumns,
      updatePreferences,
      saveToServer
    }}>
      {children}
    </UserDataContext.Provider>
  );
}; 