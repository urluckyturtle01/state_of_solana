"use client";

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const pathname = usePathname();
  const { isAuthenticated, checkAuthForRoute, openLoginModal } = useAuth();

  useEffect(() => {
    const isProtectedRoute = checkAuthForRoute(pathname);
    
    if (isProtectedRoute && !isAuthenticated) {
      // Redirect or show login modal
      openLoginModal();
    }
  }, [pathname, isAuthenticated, checkAuthForRoute, openLoginModal]);

  const isProtectedRoute = checkAuthForRoute(pathname);

  // If it's a protected route and user is not authenticated, show a loading state
  if (isProtectedRoute && !isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-200 mb-2">Authentication Required</h3>
          <p className="text-gray-400 text-sm">
            Please sign in to access this page
          </p>
        </div>
      </div>
    );
  }

  // For non-protected routes or authenticated users, render the children
  return <>{children}</>;
};

export default ProtectedRoute; 