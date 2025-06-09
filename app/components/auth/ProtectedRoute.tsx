"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, checkAuthForRoute, openLoginModal, isInternalAuth } = useAuth();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Add a helper function to check if the current path requires internal auth
  const isInternalAuthRoute = () => {
    return pathname.startsWith('/sf-dashboards');
  };

  useEffect(() => {
    // Add a short delay to allow auth state to be loaded from localStorage/cookies
    const timer = setTimeout(() => {
      const isProtectedRoute = checkAuthForRoute(pathname);
      
      // Only check authentication after loading is complete and we've waited for localStorage
      if (!isLoading && hasCheckedAuth) {
        // Check regular protected routes
        if (isProtectedRoute && !isAuthenticated) {
          openLoginModal();
          return;
        }
        
        // Check internal auth routes
        if (isInternalAuthRoute() && !isInternalAuth()) {
          openLoginModal();
        }
      }
    }, 300); // Short delay to ensure localStorage is checked
    
    return () => clearTimeout(timer);
  }, [pathname, isAuthenticated, isLoading, hasCheckedAuth, checkAuthForRoute, openLoginModal]);

  // Set hasCheckedAuth to true after initial render
  useEffect(() => {
    if (!isLoading) {
      setHasCheckedAuth(true);
    }
  }, [isLoading]);

  const isProtectedRoute = checkAuthForRoute(pathname);

  // If it's a protected route and session is still loading, show loading state
  if (isProtectedRoute && (isLoading || !hasCheckedAuth)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 border-t-2 border-r-2 border-blue-400/60 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-b-2 border-l-2 border-purple-400/80 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If it's a protected route and user is not authenticated (after loading), show nothing (login modal will show)
  if (hasCheckedAuth && ((isProtectedRoute && !isAuthenticated) || 
      (isInternalAuthRoute() && !isInternalAuth()))) {
    return null;
  }

  // For non-protected routes or authenticated users, render the children
  return <>{children}</>;
};

export default ProtectedRoute; 