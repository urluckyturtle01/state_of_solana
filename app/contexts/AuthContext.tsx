"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  showLoginModal: boolean;
  pendingRoute: string | null;
  openLoginModal: (route?: string) => void;
  closeLoginModal: () => void;
  checkAuthForRoute: (route: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROTECTED_ROUTES = ['/explorer', '/dashboards'];

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
  const router = useRouter();

  const isAuthenticated = status === 'authenticated';
  const user = session?.user;

  // Handle redirect after successful authentication
  useEffect(() => {
    if (isAuthenticated && pendingRoute) {
      router.push(pendingRoute);
      setPendingRoute(null);
      closeLoginModal();
    }
  }, [isAuthenticated, pendingRoute, router]);

  const openLoginModal = (route?: string) => {
    if (route) {
      setPendingRoute(route);
    }
    setShowLoginModal(true);
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    setPendingRoute(null);
  };

  const checkAuthForRoute = (route: string) => {
    // Check if the route starts with any protected route
    return PROTECTED_ROUTES.some(protectedRoute => 
      route.startsWith(protectedRoute)
    );
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      showLoginModal,
      pendingRoute,
      openLoginModal,
      closeLoginModal,
      checkAuthForRoute
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 