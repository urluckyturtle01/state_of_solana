"use client";

import React from 'react';
import { signIn } from 'next-auth/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/app/contexts/AuthContext';

const LoginModal = () => {
  const { showLoginModal, closeLoginModal } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      await signIn('google');
      // Don't close the modal here - AuthContext will handle redirect and close
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  if (!showLoginModal) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-gray-950 via-black to-gray-950 rounded-2xl border border-gray-800/50 p-8 max-w-md w-full mx-4 relative shadow-2xl">
        {/* Close Button */}
        <button
          onClick={closeLoginModal}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-800/50"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {/* Animated Header Icon */}
        <div className="text-center mb-8">
          <div className="relative w-20 h-20 mx-auto mb-0">
            
            {/* Lock icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-medium bg-gradient-to-r from-blue-400 via-purple-400 to-teal-400 bg-clip-text text-transparent mb-3">
            Authentication Required
          </h2>
          {/* <p className="text-gray-400 text-sm leading-relaxed">
            Please sign in to access Explorer and Dashboards
          </p>*/}
        </div>

        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          className="w-full group relative overflow-hidden bg-gradient-to-r from-gray-900 via-black to-gray-900 hover:from-gray-800 hover:via-gray-900 hover:to-gray-800 border border-gray-700/50 hover:border-gray-600/50 text-gray-100 font-medium py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          {/* Button background glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="relative flex items-center justify-center space-x-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-sm font-medium">Continue with Google</span>
          </div>
        </button>

        {/* Divider */}
        <div className="my-6 flex items-center">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700/50 to-transparent"></div>
        </div>

        

        
      </div>
    </div>
  );
};

export default LoginModal; 