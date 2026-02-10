"use client";

import React from 'react';
import { useDashboards } from '../contexts/DashboardContext';

export const SyncStatusIndicator: React.FC = () => {
  const { syncStatus, isSaving, lastSaved, forceSave } = useDashboards();

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'syncing': return 'text-blue-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    if (isSaving) {
      return (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      );
    }

    switch (syncStatus) {
      case 'success':
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getStatusText = () => {
    if (isSaving) return 'Saving...';
    
    switch (syncStatus) {
      case 'syncing': return 'Syncing...';
      case 'success': 
        return lastSaved 
          ? `Saved ${formatTimeAgo(lastSaved)}`
          : 'All changes saved';
      case 'error': return 'Sync failed';
      default: return 'Ready';
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const handleRetry = async () => {
    try {
      await forceSave();
    } catch (error) {
      console.error('Manual retry failed:', error);
    }
  };

  return (
    <div className={`flex items-center space-x-2 text-sm ${getStatusColor()}`}>
      {getStatusIcon()}
      <span>{getStatusText()}</span>
      {syncStatus === 'error' && (
        <button
          onClick={handleRetry}
          className="ml-2 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 rounded text-red-400 hover:text-red-300 transition-all duration-200 text-xs"
          title="Retry saving"
        >
          Retry
        </button>
      )}
    </div>
  );
}; 