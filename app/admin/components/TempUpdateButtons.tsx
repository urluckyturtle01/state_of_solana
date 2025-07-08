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
        const message = result.details?.summary ? 
          `${result.message} (${result.details.summary.totalPages} pages processed)` : 
          result.message;
          
        setConfigsStatus({ 
          isUpdating: false, 
          message: message, 
          type: 'success' 
        });
        
        // Auto-clear success message after 8 seconds
        setTimeout(() => {
          setConfigsStatus({ isUpdating: false, message: '', type: null });
        }, 8000);
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
        let message = result.message;
        if (result.details?.summary) {
          const s = result.details.summary;
          message += ` (${s.successfulFetches}/${s.totalCharts} charts, ${s.successRate} success rate)`;
        }
        
        setDataStatus({ 
          isUpdating: false, 
          message: message, 
          type: 'success' 
        });
        
        // Auto-clear success message after 10 seconds for data updates
        setTimeout(() => {
          setDataStatus({ isUpdating: false, message: '', type: null });
        }, 10000);
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
      <div className="bg-gray-800/40 rounded-lg border border-gray-800 p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Temp File Updates</h3>
        <p className="text-xs text-gray-500 mb-4">
          Update chart configurations and data from the API to temp files for faster loading.
          <br />
          <span className="text-blue-400">ℹ️ Auto-updates run every 10 minutes via GitHub Actions</span>
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