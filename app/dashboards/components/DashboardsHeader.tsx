"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import TabsNavigation from "@/app/components/shared/TabsNavigation";
import { PlusIcon, ArrowLeftIcon, PencilIcon, DocumentTextIcon, TrashIcon, ShareIcon } from "@heroicons/react/24/outline";
import { useDashboards } from "../../contexts/DashboardContext";
import { useCreateDashboardModal } from "../../contexts/CreateDashboardModalContext";
import ConfirmationModal from "@/app/components/shared/ConfirmationModal";
import ShareModal from "@/app/components/shared/ShareModal";

interface DashboardsHeaderProps {
  // No props needed anymore
}

export default function DashboardsHeader({}: DashboardsHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { dashboards, updateDashboard, deleteDashboard, forceSave } = useDashboards();
  const { setShowCreateModal } = useCreateDashboardModal();
  
  // Edit mode state - managed internally
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Textbox modal state
  const [showTextboxModal, setShowTextboxModal] = useState(false);
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);

  // Check if we're on a specific dashboard page
  const isDashboardPage = pathname.startsWith('/dashboards/') && pathname !== '/dashboards';
  const dashboardId = isDashboardPage ? pathname.split('/')[2] : null;
  const currentDashboard = dashboardId ? dashboards.find(d => d.id === dashboardId) : null;

  // Dispatch edit mode changes to the dashboard page
  useEffect(() => {
    if (isDashboardPage) {
      const event = new CustomEvent('dashboardEditModeChange', {
        detail: { isEditMode }
      });
      window.dispatchEvent(event);
    }
  }, [isEditMode, isDashboardPage]);

  // Reset edit mode when navigating away from dashboard
  useEffect(() => {
    if (!isDashboardPage) {
      setIsEditMode(false);
    }
  }, [isDashboardPage]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleTitleChange = (newTitle: string) => {
    if (currentDashboard) {
      updateDashboard(currentDashboard.id, { name: newTitle });
    }
  };

  const handleDescriptionChange = (newDescription: string) => {
    if (currentDashboard) {
      updateDashboard(currentDashboard.id, { 
        description: newDescription || undefined 
      });
    }
  };

  const handleEditToggle = () => {
    setIsEditMode(!isEditMode);
  };

  const handleAddTextbox = () => {
    setShowTextboxModal(true);
  };

  const handleDeleteDashboard = () => {
    if (currentDashboard) {
      setShowDeleteModal(true);
    }
  };

  const confirmDeleteDashboard = () => {
    if (currentDashboard) {
      deleteDashboard(currentDashboard.id);
      // Navigate back to dashboards list
      router.push('/dashboards');
    }
  };

  const handleShareDashboard = () => {
    if (currentDashboard) {
      setShowShareModal(true);
    }
  };

  const handleMakePublic = () => {
    if (currentDashboard) {
      // For now, we'll simulate making it public
      // In a real app, this would call an API to generate a public URL
      console.log('Making dashboard public:', currentDashboard.name);
      // Close the modal for now
      setShowShareModal(false);
    }
  };

  const handleTogglePublic = (isPublic: boolean) => {
    if (currentDashboard) {
      // For now, we'll simulate toggling public status
      // In a real app, this would call an API to update the dashboard's public status
      console.log('Toggling dashboard public status:', currentDashboard.name, 'to', isPublic);
      // You would update the dashboard's public status here
    }
  };

  // Dispatch textbox modal state changes
  useEffect(() => {
    if (isDashboardPage) {
      const event = new CustomEvent('textboxModalChange', {
        detail: { showTextboxModal }
      });
      window.dispatchEvent(event);
    }
  }, [showTextboxModal, isDashboardPage]);

  if (isDashboardPage && currentDashboard) {
    // Individual dashboard page
    const staticInfo = `${currentDashboard.chartsCount} charts • Last modified ${formatDate(currentDashboard.lastModified)}`;

    return (
      <>
        <TabsNavigation 
          title={currentDashboard.name}
          description={currentDashboard.description}
          staticInfo={staticInfo}
          editable={true}
          onTitleChange={handleTitleChange}
          onDescriptionChange={handleDescriptionChange}
          button={{
            label: "Back to Dashboards",
            onClick: () => router.push('/dashboards'),
            disabled: false,
            icon: <ArrowLeftIcon className="w-4 h-4" />,
            type: 'secondary'
          }}
          secondaryButton={{
            label: isEditMode ? "Done" : "Edit",
            onClick: handleEditToggle,
            disabled: false,
            icon: <PencilIcon className="w-4 h-4" />,
            type: 'secondary'
          }}
          tertiaryButton={isEditMode ? {
            label: "Add Textbox",
            onClick: handleAddTextbox,
            disabled: false,
            icon: <DocumentTextIcon className="w-4 h-4" />,
            type: 'secondary'
          } : undefined}
          quaternaryButton={{
            label: "Share Dashboard",
            onClick: handleShareDashboard,
            disabled: false,
            icon: <ShareIcon className="w-4 h-4" />,
            type: 'secondary',
            className: 'text-blue-400 hover:text-blue-300 border-blue-400/30 hover:border-blue-400/50'
          }}
          showDivider={true}
        />
        
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDeleteDashboard}
          title="Delete Dashboard"
          message={`Are you sure you want to delete "${currentDashboard.name}"?\n\nThis will permanently delete the dashboard and all its charts and textboxes. This action cannot be undone.`}
          confirmText="Delete Dashboard"
          cancelText="Cancel"
          isDangerous={true}
        />
        
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          onTogglePublic={handleTogglePublic}
          dashboardName={currentDashboard.name}
          dashboardId={currentDashboard.id}
          isPublic={false}
        />
      </>
    );
  }

  // Main dashboards page
  return (
    <>
      <TabsNavigation 
        title="Dashboards"
        description={`${dashboards.length} dashboard${dashboards.length !== 1 ? 's' : ''} total`}
        button={{
          label: "Create New Dashboard",
          onClick: () => setShowCreateModal(true),
          disabled: false,
          icon: <PlusIcon className="w-4 h-4" />,
          type: 'primary'
        }}
        showDivider={true}
      />
      
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteDashboard}
        title="Delete Dashboard"
        message={currentDashboard ? `Are you sure you want to delete "${currentDashboard.name}"?\n\nThis will permanently delete the dashboard and all its charts and textboxes. This action cannot be undone.` : ''}
        confirmText="Delete Dashboard"
        cancelText="Cancel"
        isDangerous={true}
      />
      
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onTogglePublic={handleTogglePublic}
        dashboardName={currentDashboard?.name || ''}
        dashboardId={currentDashboard?.id || ''}
        isPublic={false}
      />
    </>
  );
} 