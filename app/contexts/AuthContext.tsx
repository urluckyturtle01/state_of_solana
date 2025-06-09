"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  showLoginModal: boolean;
  pendingRoute: string | null;
  openLoginModal: (route?: string) => void;
  closeLoginModal: () => void;
  checkAuthForRoute: (route: string) => boolean;
  setIsAuthenticated: (value: boolean) => void;
  isInternalAuth: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROTECTED_ROUTES = ['/explorer', '/dashboards'];
const INTERNAL_AUTH_ROUTES = ['/sf-dashboards'];

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const [manualAuth, setManualAuth] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  // Check if user is authenticated through localStorage on first load
  useEffect(() => {
    const checkLocalAuth = () => {
      // Check for localStorage token
      const hasLocalAuth = typeof window !== 'undefined' && localStorage.getItem('solana_dashboard_auth') === 'true';
      
      // Check for auth cookie
      const hasAuthCookie = typeof document !== 'undefined' && document.cookie
        .split('; ')
        .some(row => row.startsWith('solana_dashboard_session=authenticated'));
      
      setManualAuth(hasLocalAuth || hasAuthCookie);
      setAuthChecked(true);
    };
    
    checkLocalAuth();
    
    // Set up event listener for storage changes (in case user logs in in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'solana_dashboard_auth') {
        setManualAuth(e.newValue === 'true');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Combine NextAuth status with manual auth status
  const isAuthenticated = status === 'authenticated' || manualAuth;
  const isLoading = status === 'loading' || !authChecked;
  const user = session?.user || (manualAuth ? { name: 'Solana Foundation' } : null);

  // Check if the user is authenticated through internal password
  const isInternalAuth = () => {
    return manualAuth === true;
  };

  // Set auth status manually (for password-based auth)
  const setIsAuthenticated = (value: boolean) => {
    setManualAuth(value);
    
    if (!value && typeof window !== 'undefined') {
      // Clear stored auth on logout
      localStorage.removeItem('solana_dashboard_auth');
      document.cookie = 'solana_dashboard_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  };

  // Handle redirect after successful authentication
  useEffect(() => {
    if (isAuthenticated && pendingRoute) {
      router.push(pendingRoute);
      setPendingRoute(null);
      closeLoginModal();
    }
  }, [isAuthenticated, pendingRoute, router]);

  const openLoginModal = (route?: string) => {
    // Don't open login modal if already authenticated through internal password
    if (isInternalAuth() && route && route.startsWith('/sf-dashboards')) {
      return;
    }
    
    if (route) {
      setPendingRoute(route);
    }
    setShowLoginModal(true);
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
  };

  const checkAuthForRoute = (route: string) => {
    // Check if the route starts with any protected route
    const isProtectedRoute = PROTECTED_ROUTES.some(protectedRoute => 
      route.startsWith(protectedRoute)
    );
    
    // Check if the route requires internal authentication
    const requiresInternalAuth = INTERNAL_AUTH_ROUTES.some(internalRoute => 
      route.startsWith(internalRoute)
    );
    
    // Return true if the route requires any kind of authentication
    return isProtectedRoute || requiresInternalAuth;
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      user,
      showLoginModal,
      pendingRoute,
      openLoginModal,
      closeLoginModal,
      checkAuthForRoute,
      setIsAuthenticated,
      isInternalAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 