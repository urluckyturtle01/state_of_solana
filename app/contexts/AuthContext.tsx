"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  showLoginModal: boolean;
  openLoginModal: () => void;
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

  const isAuthenticated = status === 'authenticated';
  const user = session?.user;

  const openLoginModal = () => {
    setShowLoginModal(true);
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
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
      openLoginModal,
      closeLoginModal,
      checkAuthForRoute
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 