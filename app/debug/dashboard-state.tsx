'use client';

import React from 'react';
import { useDashboards } from '@/app/contexts/DashboardContext';
import { useAuth } from '@/app/contexts/AuthContext';

const DashboardStateDebug: React.FC = () => {
  const { dashboards, isLoading, userName } = useDashboards();
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="fixed top-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-sm z-50">
      <h3 className="text-lg font-bold mb-2">Debug Info</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-semibold">Auth Status:</span> 
          <span className={isAuthenticated ? 'text-green-400' : 'text-red-400'}>
            {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
          </span>
        </div>
        
        <div>
          <span className="font-semibold">User:</span> {user?.name || user?.email || 'None'}
        </div>
        
        <div>
          <span className="font-semibold">User Name:</span> {userName || 'None'}
        </div>
        
        <div>
          <span className="font-semibold">Loading:</span> 
          <span className={isLoading ? 'text-yellow-400' : 'text-green-400'}>
            {isLoading ? 'Yes' : 'No'}
          </span>
        </div>
        
        <div>
          <span className="font-semibold">Dashboards:</span> {dashboards.length}
        </div>
        
        {dashboards.length > 0 && (
          <div className="mt-2">
            <span className="font-semibold">Dashboard Names:</span>
            <ul className="ml-2">
              {dashboards.map(d => (
                <li key={d.id} className="text-xs">
                  • {d.name} ({d.charts.length} charts)
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="mt-2 pt-2 border-t border-gray-700">
          <span className="font-semibold">localStorage:</span>
          <div className="text-xs">
            {localStorage.getItem('dashboards') ? 
              `${JSON.parse(localStorage.getItem('dashboards') || '[]').length} items` : 
              'Empty'
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStateDebug; 