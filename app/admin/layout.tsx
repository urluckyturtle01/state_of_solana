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
    <div className="bg-gray-200 text-white min-h-screen flex flex-col">
      <header className="border-b border-gray-300 py-4">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-600">Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-600 hover:text-gray-800">
                Return to Site
              </Link>
              <button 
                onClick={handleLogout}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-700 border border-red-500 hover:border-red-600 rounded-md"
              >
                Logout
              </button>
            </div>
          </div>
          <nav className="mt-4">
            <ul className="flex space-x-6">
              <li>
                <AdminNavLink href="/admin" exact>
                  Overview
                </AdminNavLink>
              </li>
              <li>
                <AdminNavLink href="/admin/chart-creator">
                  Chart Creator
                </AdminNavLink>
              </li>
              <li>
                <AdminNavLink href="/admin/manage-charts">
                  Manage Charts
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
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
} 