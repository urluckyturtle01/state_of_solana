"use client";

import React, { useState } from 'react';
import { signOut, signIn } from 'next-auth/react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useDashboards } from '@/app/contexts/DashboardContext';
import { useUserData } from '@/app/contexts/UserDataContext';
import ButtonPrimary from '@/app/components/shared/buttons/ButtonPrimary';
import Image from 'next/image';

const UserProfile: React.FC = () => {
  const { user, isAuthenticated, setIsAuthenticated, isInternalAuth } = useAuth();
  const { dashboards, isLoading: dashboardsLoading } = useDashboards();
  const { explorerData, isLoading: explorerLoading } = useUserData();
  const [showDropdown, setShowDropdown] = useState(false);

  // Show login button when not authenticated
  if (!isAuthenticated || !user) {
    const { openLoginModal } = useAuth();
    
    return (
      <ButtonPrimary 
       onClick={openLoginModal}
       className="w-full bg-gray-900/60 hover:bg-gray-900/80 border-gray-900 hover:border-gray-900 text-gray-900"
       /*icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
           <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
           <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
           <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        }*/
     >
        Login 
      </ButtonPrimary>
    );
  }

  const totalCharts = dashboards.reduce((total, dashboard) => total + dashboard.chartsCount, 0);
  const totalVisualizations = explorerData.savedVisualizations.length;
  const isLoading = dashboardsLoading || explorerLoading;

  const handleSignOut = async () => {
    // For internal password authentication
    if (isInternalAuth()) {
      setIsAuthenticated(false);
      window.location.href = '/';
    } else {
      // For NextAuth authentication
      await signOut({ callbackUrl: '/' });
    }
    setShowDropdown(false);
  };

  const formatUserName = (name: string) => {
    if (name.length > 20) {
      return name.substring(0, 20) + '...';
    }
    return name;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-gray-800/50 transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          
            <div className="w-full h-full flex items-center justify-center text-xs font-medium text-gray-300">
              {(user.name || user.email || 'U').charAt(0).toUpperCase()}
            </div>
          
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-medium text-gray-200 truncate">
            {formatUserName(user.name || user.email || 'User')}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {user.email}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-950/95 border border-gray-900 rounded-lg shadow-xl py-2 px-2 space-y-4">
          
          
           
            
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-900/80 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          
        </div>
      )}
    </div>
  );
};

export default UserProfile; 