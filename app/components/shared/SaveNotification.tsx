"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useDashboards } from '@/app/contexts/DashboardContext';
import { useUserData } from '@/app/contexts/UserDataContext';

const SaveNotification: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { dashboards } = useDashboards();
  const { explorerData } = useUserData();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Track saving state by monitoring changes
  useEffect(() => {
    if (!isAuthenticated) return;

    setIsSaving(true);
    
    const timer = setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date());
      setShowSuccess(true);
      
      // Hide success message after 2 seconds
      setTimeout(() => setShowSuccess(false), 2000);
    }, 1000);

    return () => clearTimeout(timer);
  }, [dashboards, explorerData, isAuthenticated]);

  if (!isAuthenticated) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Saving indicator */}
      {isSaving && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 shadow-lg flex items-center space-x-3 hidden">
          <div className="flex-shrink-0">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="text-sm text-gray-300">
            Saving your data...
          </div>
        </div>
      )}

      {/* Success indicator */}
      {showSuccess && !isSaving && (
        <div className="bg-gray-900 border border-green-700 rounded-lg px-4 py-3 shadow-lg flex items-center space-x-3 hidden">
          <div className="flex-shrink-0">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="text-sm text-gray-300">
            Data saved
          </div>
        </div>
      )}

      {/* Last saved timestamp (subtle) */}
      {lastSaved && !isSaving && !showSuccess && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg px-3 py-2 shadow-lg opacity-60 hover:opacity-100 transition-opacity hidden">
          <div className="text-xs text-gray-500">
            Last saved: {lastSaved.toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default SaveNotification; 