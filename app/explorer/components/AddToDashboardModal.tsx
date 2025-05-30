"use client";

import React, { useState, useMemo } from 'react';
import Modal from '@/app/components/shared/Modal';
import { useDashboards } from '@/app/contexts/DashboardContext';

interface AddToDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToDashboard: (dashboardId: string) => void;
  chartName: string;
}

const AddToDashboardModal: React.FC<AddToDashboardModalProps> = ({
  isOpen,
  onClose,
  onAddToDashboard,
  chartName
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);
  
  // Use dashboard context to get real dashboards
  const { dashboards } = useDashboards();
  
  // Filter dashboards based on search query
  const filteredDashboards = useMemo(() => {
    if (!searchQuery) return dashboards;
    
    return dashboards.filter(dashboard => 
      dashboard.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, dashboards]);
  
  const handleAddToDashboard = () => {
    if (selectedDashboardId) {
      onAddToDashboard(selectedDashboardId);
      onClose();
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add to Dashboard"
    >
      <div className="space-y-4">
        <p className="text-gray-400 text-sm">
          Choose the dashboard to add this query to:
        </p>
        
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search a dashboard by name"
            className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        {/* Dashboard List */}
        <div className="max-h-[300px] overflow-y-auto space-y-1 border border-gray-800 rounded-lg p-1">
          {filteredDashboards.length > 0 ? (
            filteredDashboards.map(dashboard => (
              <div
                key={dashboard.id}
                onClick={() => setSelectedDashboardId(dashboard.id)}
                className={`px-3 py-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                  selectedDashboardId === dashboard.id
                    ? 'bg-blue-600/20 border border-blue-600/50 text-white'
                    : 'hover:bg-gray-800/50 text-gray-300 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{dashboard.name}</span>
                  <span className="text-xs text-gray-500">{dashboard.chartsCount} charts</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              No dashboards found
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddToDashboard}
            disabled={!selectedDashboardId}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              selectedDashboardId
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            OK
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddToDashboardModal; 