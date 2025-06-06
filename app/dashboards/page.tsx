"use client";

import Link from "next/link";
import { useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useDashboards } from "../contexts/DashboardContext";
import { useCreateDashboardModal } from "../contexts/CreateDashboardModalContext";
import ConfirmationModal from "../components/shared/ConfirmationModal";

export default function DashboardsPage() {
  const { dashboards, createDashboard, deleteDashboard, isLoading } = useDashboards();
  const {
    showCreateModal,
    setShowCreateModal,
    newDashboardName,
    setNewDashboardName,
    newDashboardDescription,
    setNewDashboardDescription,
  } = useCreateDashboardModal();
  
  const [hoveredDashboard, setHoveredDashboard] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    dashboard: any | null;
  }>({ isOpen: false, dashboard: null });

  const handleCreateDashboard = () => {
    if (newDashboardName.trim()) {
      createDashboard(newDashboardName.trim(), newDashboardDescription.trim() || undefined);
      setNewDashboardName('');
      setNewDashboardDescription('');
      setShowCreateModal(false);
    }
  };

  const handleDeleteDashboard = (e: React.MouseEvent, dashboard: any) => {
    e.preventDefault(); // Prevent navigation to dashboard
    e.stopPropagation();
    
    setDeleteModal({ isOpen: true, dashboard });
  };

  const confirmDeleteDashboard = () => {
    if (deleteModal.dashboard) {
      deleteDashboard(deleteModal.dashboard.id);
      setDeleteModal({ isOpen: false, dashboard: null });
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="relative w-12 h-12 mx-auto mb-4">
              <div className="absolute inset-0 border-t-2 border-r-2 border-blue-400/60 rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-b-2 border-l-2 border-purple-400/80 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="text-gray-400 text-sm">Loading your dashboards...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashboards.map(dashboard => (
          <div 
            key={dashboard.id}
            className="relative bg-gray-900/50 border border-gray-800 rounded-lg hover:border-gray-700 hover:bg-gray-900/70 transition-all duration-200 group"
            onMouseEnter={() => setHoveredDashboard(dashboard.id)}
            onMouseLeave={() => setHoveredDashboard(null)}
          >
            <Link
              href={`/dashboards/${dashboard.id}`}
              className="block p-5 cursor-pointer"
            >
              <div className="space-y-3">
                {/* Dashboard Title */}
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-medium text-gray-100 group-hover:text-white transition-colors">
                    {dashboard.name}
                  </h3>
                  <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                {/* Description */}
                {dashboard.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {dashboard.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4 text-gray-500">
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>{dashboard.chartsCount} charts</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Modified {formatDate(dashboard.lastModified)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
            
            {/* Delete Button - appears on hover */}
            {hoveredDashboard === dashboard.id && (
              <button
                onClick={(e) => handleDeleteDashboard(e, dashboard)}
                className="absolute top-3 right-10 p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-md text-red-400 hover:text-red-300 transition-all duration-200 opacity-0 group-hover:opacity-100"
                title="Delete dashboard"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Create Dashboard Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          
          <div className="relative bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-md space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-100">Create New Dashboard</h3>
              <p className="text-sm text-gray-400 mt-1">
                Give your dashboard a name and optional description
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Dashboard Name
                </label>
                <input
                  type="text"
                  value={newDashboardName}
                  onChange={(e) => setNewDashboardName(e.target.value)}
                  placeholder="e.g., SOL Performance Metrics"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newDashboardDescription}
                  onChange={(e) => setNewDashboardDescription(e.target.value)}
                  placeholder="Brief description of what this dashboard tracks..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDashboard}
                disabled={!newDashboardName.trim()}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                  newDashboardName.trim()
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                Create Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, dashboard: null })}
        onConfirm={confirmDeleteDashboard}
        title="Delete Dashboard"
        message={deleteModal.dashboard ? `Are you sure you want to delete "${deleteModal.dashboard.name}"?\n\nThis will permanently delete the dashboard and all its charts and textboxes. This action cannot be undone.` : ''}
        confirmText="Delete Dashboard"
        cancelText="Cancel"
        isDangerous={true}
      />
    </div>
  );
} 