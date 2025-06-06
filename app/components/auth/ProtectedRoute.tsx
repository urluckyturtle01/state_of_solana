"use client";

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, checkAuthForRoute, openLoginModal } = useAuth();

  useEffect(() => {
    const isProtectedRoute = checkAuthForRoute(pathname);
    
    // Only check authentication after loading is complete
    if (isProtectedRoute && !isLoading && !isAuthenticated) {
      // Redirect or show login modal
      openLoginModal();
    }
  }, [pathname, isAuthenticated, isLoading, checkAuthForRoute, openLoginModal]);

  const isProtectedRoute = checkAuthForRoute(pathname);

  // If it's a protected route and session is still loading, show loading state
  if (isProtectedRoute && isLoading) {
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
  if (isProtectedRoute && !isLoading && !isAuthenticated) {
    return null;
  }

  // For non-protected routes or authenticated users, render the children
  return <>{children}</>;
};

export default ProtectedRoute; 