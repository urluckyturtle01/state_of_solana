'use client';

import React, { useState } from 'react';
import DashboardStateDebug from './dashboard-state';

const DebugPage: React.FC = () => {
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchDebugData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug-dashboard-load');
      const data = await response.json();
      setDebugData(data);
    } catch (error) {
      console.error('Failed to fetch debug data:', error);
      setDebugData({ error: 'Failed to fetch debug data' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Debug Center</h1>
        
        {/* Dashboard State Debug Component */}
        <DashboardStateDebug />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* API Debug Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">S3 & API Debug</h2>
            
            <button
              onClick={fetchDebugData}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-4"
            >
              {loading ? 'Loading...' : 'Fetch Debug Data'}
            </button>
            
            {debugData && (
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(debugData, null, 2)}
                </pre>
              </div>
            )}
          </div>
          
          {/* Instructions */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Debug Instructions</h2>
            
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900">1. Check Dashboard State</h3>
                <p>The floating debug panel (top-right) shows your current authentication status and dashboard count in real-time.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900">2. S3 & API Debug</h3>
                <p>Click "Fetch Debug Data" to see:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Current session information</li>
                  <li>S3 connection status</li>
                  <li>All user files in S3</li>
                  <li>Your specific user data</li>
                  <li>ur.lucky.turtle@gmail.com data specifically</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900">3. Console Logs</h3>
                <p>Open your browser's developer console (F12) to see detailed logging during the dashboard loading process.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900">4. What to Look For</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Authentication status matches your login</li>
                  <li>S3 files exist for ur.lucky.turtle@gmail.com</li>
                  <li>Dashboard data structure is correct</li>
                  <li>No errors in the API calls</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {/* Console Instructions */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">Console Debugging</h3>
          <p className="text-yellow-700 text-sm">
            After logging in as ur.lucky.turtle@gmail.com, check the browser console for these messages:
          </p>
          <ul className="list-disc list-inside text-yellow-700 text-sm mt-2 space-y-1">
            <li><code>🔄 Starting loadUserData...</code></li>
            <li><code>📡 Full API response:</code> (should show your S3 data)</li>
            <li><code>✅ Reconstructed dashboards:</code> (should show 2 dashboards)</li>
            <li><code>🎯 Setting dashboards state with 2 dashboards</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DebugPage; 