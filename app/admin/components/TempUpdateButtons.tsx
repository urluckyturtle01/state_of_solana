"use client";

import React, { useState } from 'react';
import Button from './Button';

interface UpdateStatus {
  isUpdating: boolean;
  message: string;
  type: 'success' | 'error' | 'info' | null;
}

const TempUpdateButtons: React.FC = () => {
  const [configsStatus, setConfigsStatus] = useState<UpdateStatus>({
    isUpdating: false,
    message: '',
    type: null
  });
  
  const [dataStatus, setDataStatus] = useState<UpdateStatus>({
    isUpdating: false,
    message: '',
    type: null
  });

  const updateConfigs = async () => {
    setConfigsStatus({ isUpdating: true, message: 'Updating chart configurations...', type: 'info' });
    
    try {
      const response = await fetch('/api/update-temp-configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        setConfigsStatus({ 
          isUpdating: false, 
          message: result.message, 
          type: 'success' 
        });
        
        // Auto-clear success message after 5 seconds
        setTimeout(() => {
          setConfigsStatus({ isUpdating: false, message: '', type: null });
        }, 5000);
      } else {
        setConfigsStatus({ 
          isUpdating: false, 
          message: result.message || 'Failed to update configurations', 
          type: 'error' 
        });
      }
    } catch (error) {
      setConfigsStatus({ 
        isUpdating: false, 
        message: 'Network error occurred', 
        type: 'error' 
      });
    }
  };

  const updateData = async () => {
    setDataStatus({ isUpdating: true, message: 'Updating chart data...', type: 'info' });
    
    try {
      const response = await fetch('/api/update-temp-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        setDataStatus({ 
          isUpdating: false, 
          message: result.message, 
          type: 'success' 
        });
        
        // Auto-clear success message after 5 seconds
        setTimeout(() => {
          setDataStatus({ isUpdating: false, message: '', type: null });
        }, 5000);
      } else {
        setDataStatus({ 
          isUpdating: false, 
          message: result.message || 'Failed to update data', 
          type: 'error' 
        });
      }
    } catch (error) {
      setDataStatus({ 
        isUpdating: false, 
        message: 'Network error occurred', 
        type: 'error' 
      });
    }
  };

  const forceUpdateData = async () => {
    setDataStatus({ isUpdating: true, message: 'Force updating chart data...', type: 'info' });
    
    try {
      const response = await fetch('/api/auto-update-temp-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force: true })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setDataStatus({ 
          isUpdating: false, 
          message: 'Data force updated successfully', 
          type: 'success' 
        });
        
        // Auto-clear success message after 5 seconds
        setTimeout(() => {
          setDataStatus({ isUpdating: false, message: '', type: null });
        }, 5000);
      } else {
        setDataStatus({ 
          isUpdating: false, 
          message: result.message || 'Failed to force update data', 
          type: 'error' 
        });
      }
    } catch (error) {
      setDataStatus({ 
        isUpdating: false, 
        message: 'Network error occurred', 
        type: 'error' 
      });
    }
  };

  const updateBoth = async () => {
    // First update configs, then data
    await updateConfigs();
    
    // Wait a bit before starting data update
    setTimeout(async () => {
      await updateData();
    }, 1000);
  };

  const getStatusIcon = (type: UpdateStatus['type']) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-4 h-4 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusColor = (type: UpdateStatus['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'info':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* GitHub Actions Auto-Update Info */}
      <div className="bg-gray-900/60 rounded-lg border border-gray-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-green-400">🔄 Auto-Update via GitHub Actions</h3>
          <div className="flex items-center space-x-2">
            <span className="flex items-center text-green-400 text-xs">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
              Every 10 minutes
            </span>
          </div>
        </div>
        
        <div className="text-xs text-gray-400 space-y-1">
          <p>📊 Chart data updates automatically via GitHub Actions workflow</p>
          <p>🔍 Monitor progress: <span className="text-blue-400">GitHub Repository → Actions tab</span></p>
          <p>⚡ Manual trigger: Use "Run workflow" button in GitHub Actions</p>
          <p>📖 Setup guide: <span className="text-blue-400">docs/github-actions-setup.md</span></p>
        </div>
      </div>

      <div className="bg-gray-800/40 rounded-lg border border-gray-800 p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Manual Updates</h3>
        <p className="text-xs text-gray-500 mb-4">
          Manually update configurations or force data updates outside the automatic schedule
        </p>
        
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={updateConfigs}
            disabled={configsStatus.isUpdating}
          >
            {configsStatus.isUpdating ? (
              <>
                <svg className="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </>
            ) : (
              'Update Configs'
            )}
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={updateData}
            disabled={dataStatus.isUpdating}
          >
            {dataStatus.isUpdating ? (
              <>
                <svg className="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </>
            ) : (
              'Update Data'
            )}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={forceUpdateData}
            disabled={dataStatus.isUpdating}
          >
            {dataStatus.isUpdating ? (
              <>
                <svg className="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </>
            ) : (
              'Force Update Data'
            )}
          </Button>
          
          <Button
            variant="primary"
            size="sm"
            onClick={updateBoth}
            disabled={configsStatus.isUpdating || dataStatus.isUpdating}
          >
            {(configsStatus.isUpdating || dataStatus.isUpdating) ? (
              <>
                <svg className="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </>
            ) : (
              'Update Both'
            )}
          </Button>
        </div>
        
        {/* Status messages */}
        <div className="mt-4 space-y-2">
          {configsStatus.message && (
            <div className={`flex items-center space-x-2 text-xs ${getStatusColor(configsStatus.type)}`}>
              {getStatusIcon(configsStatus.type)}
              <span>Configs: {configsStatus.message}</span>
            </div>
          )}
          {dataStatus.message && (
            <div className={`flex items-center space-x-2 text-xs ${getStatusColor(dataStatus.type)}`}>
              {getStatusIcon(dataStatus.type)}
              <span>Data: {dataStatus.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TempUpdateButtons; 