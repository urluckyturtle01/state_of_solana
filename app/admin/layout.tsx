"use client";

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminNavLink } from './components/AdminNavLink';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const pathname = usePathname();

  // Check if user has previously authenticated in this session
  useEffect(() => {
    const authStatus = sessionStorage.getItem('adminAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Check for session timeout
  useEffect(() => {
    const checkSessionTimeout = () => {
      const expiresAt = localStorage.getItem('admin_session_expires');
      
      if (expiresAt) {
        const expiryTime = parseInt(expiresAt, 10);
        
        // If the session has expired, redirect to login
        if (Date.now() > expiryTime) {
          // Clear session data
          localStorage.removeItem('admin_session_expires');
          // You might want to clear other session-related items here
          
          // Redirect to login page
          router.push('/auth/login');
          return;
        }
      } else {
        // If no expiry time is set, get the default timeout
        const timeout = localStorage.getItem('admin_session_timeout') || '24h';
        let timeoutMs = 24 * 60 * 60 * 1000; // Default 24 hours
        
        switch (timeout) {
          case '1h':
            timeoutMs = 1 * 60 * 60 * 1000;
            break;
          case '8h':
            timeoutMs = 8 * 60 * 60 * 1000;
            break;
          case '24h':
            timeoutMs = 24 * 60 * 60 * 1000;
            break;
          case '7d':
            timeoutMs = 7 * 24 * 60 * 60 * 1000;
            break;
        }
        
        // Set the expiry time
        const expiresAt = Date.now() + timeoutMs;
        localStorage.setItem('admin_session_expires', expiresAt.toString());
      }
    };
    
    // Check on initial load
    checkSessionTimeout();
    
    // Set up periodic check every minute
    const interval = setInterval(checkSessionTimeout, 60 * 1000);
    
    // Reset timeout on user activity
    const resetTimeout = () => {
      const timeout = localStorage.getItem('admin_session_timeout') || '24h';
      let timeoutMs = 24 * 60 * 60 * 1000; // Default 24 hours
      
      switch (timeout) {
        case '1h':
          timeoutMs = 1 * 60 * 60 * 1000;
          break;
        case '8h':
          timeoutMs = 8 * 60 * 60 * 1000;
          break;
        case '24h':
          timeoutMs = 24 * 60 * 60 * 1000;
          break;
        case '7d':
          timeoutMs = 7 * 24 * 60 * 60 * 1000;
          break;
      }
      
      // Update the expiry time
      const expiresAt = Date.now() + timeoutMs;
      localStorage.setItem('admin_session_expires', expiresAt.toString());
    };
    
    // Listen for user activity
    window.addEventListener('click', resetTimeout);
    window.addEventListener('keypress', resetTimeout);
    window.addEventListener('scroll', resetTimeout);
    window.addEventListener('mousemove', resetTimeout);
    
    // Clean up
    return () => {
      clearInterval(interval);
      window.removeEventListener('click', resetTimeout);
      window.removeEventListener('keypress', resetTimeout);
      window.removeEventListener('scroll', resetTimeout);
      window.removeEventListener('mousemove', resetTimeout);
    };
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    
    try {
      setIsAuthenticating(true);
      setError('');
      
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setIsAuthenticated(true);
        // Store authentication status in session storage
        sessionStorage.setItem('adminAuthenticated', 'true');
      } else {
        setError(data.message || 'Invalid password');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError('Authentication failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };
  
  const handleLogout = () => {
    // Clear authentication data
    sessionStorage.removeItem('adminAuthenticated');
    setIsAuthenticated(false);
    // Redirect back to login
    router.push('/admin');
  };

  // If not authenticated, show login screen
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black">
        <div className="w-full max-w-md p-8 space-y-8 bg-gray-900 rounded-xl shadow-lg">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold text-gray-100">
              Admin Access
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Enter password to continue
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm">
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none bg-gray-800 border border-gray-700 text-gray-100 rounded-lg relative block w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isAuthenticating}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <div>
              <button
                type="submit"
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isAuthenticating ? 'opacity-70 cursor-not-allowed' : ''
                }`}
                disabled={isAuthenticating}
              >
                {isAuthenticating ? 'Authenticating...' : 'Login'}
              </button>
            </div>
          </form>
          <div className="text-center mt-4">
            <Link href="/" className="font-medium text-blue-400 hover:text-blue-300">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // When authenticated, show admin content with navigation
  return (
    <div className="bg-gray-950 text-white min-h-screen flex flex-col">
      <header className="border-b border-gray-800 py-4 bg-gray-900 shadow-md">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center">
            <Link href="/admin" className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h1 className="text-xl font-bold tracking-tight text-white">Solana Analytics</h1>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-300 hover:text-white transition duration-150">
                <span className="flex items-center space-x-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Return to Dashboard</span>
                </span>
              </Link>
              <button 
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 border border-red-800 hover:border-red-700 rounded-md bg-gray-850 hover:bg-gray-800 transition duration-150"
              >
                Logout
              </button>
            </div>
          </div>
          <nav className="mt-4">
            <ul className="flex space-x-6">
              <li>
                <AdminNavLink href="/admin" exact>
                  Dashboard
                </AdminNavLink>
              </li>
              <li>
                <AdminNavLink href="/admin/chart-creator">
                  Create Chart
                </AdminNavLink>
              </li>
              <li>
                <AdminNavLink href="/admin/create-counter">
                  Create Counter
                </AdminNavLink>
              </li>
              <li>
                <AdminNavLink href="/admin/manage-dashboard">
                  Manage Dashboard
                </AdminNavLink>
              </li>
              <li>
                <AdminNavLink href="/admin/settings">
                  Settings
                </AdminNavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main className="flex-grow container mx-auto px-6 py-6">
        {children}
      </main>
      <footer className="border-t border-gray-800 py-4 bg-gray-900">
        <div className="container mx-auto px-6 text-center text-gray-500 text-sm">
          Solana Analytics Admin • {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
} 