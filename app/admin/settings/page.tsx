"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('24h');
  const [timeoutSuccess, setTimeoutSuccess] = useState(false);

  // Load saved timeout on component mount
  useEffect(() => {
    const savedTimeout = localStorage.getItem('admin_session_timeout');
    if (savedTimeout) {
      setSessionTimeout(savedTimeout);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset messages
    setError('');
    setSuccess('');
    
    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }
    
    // Submit form
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess('Password changed successfully');
        // Clear form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setError('An error occurred while changing the password');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle session timeout change
  const handleTimeoutChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTimeout = e.target.value;
    setSessionTimeout(newTimeout);
    
    // Save to localStorage
    localStorage.setItem('admin_session_timeout', newTimeout);
    
    // Convert timeout to milliseconds for the actual session expiration
    let timeoutMs = 24 * 60 * 60 * 1000; // Default 24 hours
    
    switch (newTimeout) {
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
    
    // Store the actual expiration timestamp
    const expiresAt = Date.now() + timeoutMs;
    localStorage.setItem('admin_session_expires', expiresAt.toString());
    
    // Show success message
    setTimeoutSuccess(true);
    setTimeout(() => setTimeoutSuccess(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="border-b border-gray-800 pb-5 mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Admin Settings</h1>
        <p className="mt-2 text-sm text-gray-400">
          Manage your admin account and authentication settings
        </p>
      </div>
      
      <div className="space-y-8">
        <section className="bg-gray-800 border border-gray-700 rounded-xl shadow-md overflow-hidden">
          <div className="border-b border-gray-700 bg-gray-850 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Change Password</h2>
            <p className="mt-1 text-sm text-gray-400">
              Update your admin password. Make sure to use a strong, secure password.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300 mb-1">
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-1">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">Password must be at least 8 characters long</p>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                disabled={isLoading}
              />
            </div>
            
            {error && (
              <div className="px-4 py-3 bg-red-900/30 border border-red-800 rounded-md text-red-400 text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="px-4 py-3 bg-green-900/30 border border-green-800 rounded-md text-green-400 text-sm">
                {success}
              </div>
            )}
            
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors shadow-lg shadow-indigo-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Changing Password...
                  </span>
                ) : 'Change Password'}
              </button>
            </div>
          </form>
        </section>
        
        <section className="bg-gray-800 border border-gray-700 rounded-xl shadow-md overflow-hidden">
          <div className="border-b border-gray-700 bg-gray-850 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Security Settings</h2>
            <p className="mt-1 text-sm text-gray-400">
              Additional security settings for your admin account
            </p>
          </div>
          
          <div className="p-6">
            
            <div className=" flex items-center justify-between py-3">
              <div>
                <h3 className="text-md font-medium text-white">Session Timeout</h3>
                <p className="text-sm text-gray-400">Set how long until you're automatically logged out</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <select 
                  className="bg-gray-700 border border-gray-600 text-gray-300 rounded-md px-3 py-1.5 text-sm"
                  value={sessionTimeout}
                  onChange={handleTimeoutChange}
                >
                  <option value="1h">1 hour</option>
                  <option value="8h">8 hours</option>
                  <option value="24h">24 hours</option>
                  <option value="7d">7 days</option>
                </select>
                {timeoutSuccess && (
                  <p className="text-xs text-green-400">Session timeout updated</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
} 