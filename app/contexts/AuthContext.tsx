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
  setIsAuthenticated: (value: boolean, section?: string) => void;
  isInternalAuth: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROTECTED_ROUTES = ['/explorer', '/dashboards'];
const INTERNAL_AUTH_ROUTES = ['/sf-dashboards', '/dflow'];

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to check auth synchronously for a specific section
const checkInitialAuth = (section?: string) => {
  if (typeof window === 'undefined') return false;
  
  if (section) {
    // Check section-specific auth
    const storageKey = `${section}_auth`;
    const cookieKey = `${section}_session`;
    
    const hasLocalAuth = localStorage.getItem(storageKey) === 'true';
    const hasAuthCookie = document.cookie
      .split('; ')
      .some(row => row.startsWith(`${cookieKey}=authenticated`));
    
    return hasLocalAuth || hasAuthCookie;
  }
  
  // Check generic auth (for backward compatibility)
  const hasLocalAuth = localStorage.getItem('solana_dashboard_auth') === 'true';
  const hasAuthCookie = document.cookie
    .split('; ')
    .some(row => row.startsWith('solana_dashboard_session=authenticated'));
  
  return hasLocalAuth || hasAuthCookie;
};

// Helper to determine section from pathname
const getSectionFromPath = (pathname: string | null): string | null => {
  if (!pathname) return null;
  if (pathname.startsWith('/sf-dashboards')) return 'sf-dashboards';
  if (pathname.startsWith('/dflow')) return 'dflow';
  return null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  // Initialize manualAuth synchronously for instant page load
  const [manualAuth, setManualAuth] = useState(() => checkInitialAuth());
  const [authChecked, setAuthChecked] = useState(true); // Start as true since we check synchronously
  const router = useRouter();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : null;
  const currentSection = getSectionFromPath(pathname);

  // Set up listener for storage changes (in case user logs in in another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Listen for both generic and section-specific auth changes
      if (e.key === 'solana_dashboard_auth' || 
          e.key === 'sf-dashboards_auth' || 
          e.key === 'dflow_auth') {
        // Recheck auth for current section
        const section = getSectionFromPath(window.location.pathname);
        setManualAuth(checkInitialAuth(section || undefined));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Check auth state when pathname changes
  useEffect(() => {
    const section = getSectionFromPath(window.location.pathname);
    const isAuthed = checkInitialAuth(section || undefined);
    setManualAuth(isAuthed);
  }, [pathname]);

  // Clear internal auth when Google auth is successful to prevent conflicts
  useEffect(() => {
    if (status === 'authenticated' && session?.user && manualAuth) {
      console.log('🔄 Google auth detected, clearing internal auth to prevent conflicts');
      // Clear internal auth when Google auth is active
      setManualAuth(false);
      localStorage.removeItem('solana_dashboard_auth');
      document.cookie = 'solana_dashboard_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  }, [status, session, manualAuth]);

  // Combine NextAuth status with manual auth status
  const isAuthenticated = status === 'authenticated' || manualAuth;
  const isLoading = status === 'loading' || !authChecked;
  
  // Set user name based on authentication type and section
  const getUserName = () => {
    if (session?.user) return session.user;
    if (manualAuth) {
      const section = getSectionFromPath(pathname);
      if (section === 'dflow') return { name: 'DFlow' };
      if (section === 'sf-dashboards') return { name: 'Solana Foundation' };
      return { name: 'Internal User' };
    }
    return null;
  };
  
  const user = getUserName();

  // Check if the user is authenticated through internal password
  const isInternalAuth = () => {
    return manualAuth === true;
  };

  // Set auth status manually (for password-based auth)
  const setIsAuthenticated = (value: boolean, section?: string) => {
    setManualAuth(value);
    
    if (typeof window === 'undefined') return;
    
    if (value && section) {
      // Set section-specific auth
      const storageKey = `${section}_auth`;
      const cookieKey = `${section}_session`;
      
      localStorage.setItem(storageKey, 'true');
      
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);
      document.cookie = `${cookieKey}=authenticated; expires=${expiryDate.toUTCString()}; path=/`;
    } else if (!value) {
      // Clear all auth on logout
      localStorage.removeItem('solana_dashboard_auth');
      localStorage.removeItem('sf-dashboards_auth');
      localStorage.removeItem('dflow_auth');
      
      document.cookie = 'solana_dashboard_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'sf-dashboards_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'dflow_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    } else {
      // Fallback to generic auth for backward compatibility
      localStorage.setItem('solana_dashboard_auth', 'true');
      
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);
      document.cookie = `solana_dashboard_session=authenticated; expires=${expiryDate.toUTCString()}; path=/`;
    }
  };

  // Handle redirect after successful authentication
  useEffect(() => {
    if (isAuthenticated && pendingRoute && typeof pendingRoute === 'string') {
      router.push(pendingRoute);
      setPendingRoute(null);
      closeLoginModal();
    }
  }, [isAuthenticated, pendingRoute, router]);

  const openLoginModal = (route?: string) => {
    // Don't open login modal if already authenticated through internal password for the specific section
    if (isInternalAuth() && route && typeof route === 'string') {
      if (route.startsWith('/sf-dashboards') || route.startsWith('/dflow')) {
      return;
      }
    }
    
    if (route && typeof route === 'string') {
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