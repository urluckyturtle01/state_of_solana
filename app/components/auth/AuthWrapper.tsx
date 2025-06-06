"use client";

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/app/contexts/AuthContext';
import { DashboardProvider } from '@/app/contexts/DashboardContext';
import { UserDataProvider } from '@/app/contexts/UserDataContext';
import LoginModal from './LoginModal';
import ProtectedRoute from './ProtectedRoute';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  return (
    <SessionProvider>
      <AuthProvider>
        <DashboardProvider>
          <UserDataProvider>
            <ProtectedRoute>
              {children}
            </ProtectedRoute>
            <LoginModal />
          </UserDataProvider>
        </DashboardProvider>
      </AuthProvider>
    </SessionProvider>
  );
};

export default AuthWrapper; 