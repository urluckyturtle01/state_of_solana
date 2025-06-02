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
      null
    );
  }

  // For non-protected routes or authenticated users, render the children
  return <>{children}</>;
};

export default ProtectedRoute; 