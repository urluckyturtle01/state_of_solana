"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import TabsNavigation from "@/app/components/shared/TabsNavigation";
import { PlusIcon, ArrowLeftIcon, PencilIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { useDashboards } from "../../contexts/DashboardContext";
import { useCreateDashboardModal } from "../../contexts/CreateDashboardModalContext";

interface DashboardsHeaderProps {
  // No props needed anymore
}

export default function DashboardsHeader({}: DashboardsHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { dashboards, updateDashboard } = useDashboards();
  const { setShowCreateModal } = useCreateDashboardModal();
  
  // Edit mode state - managed internally
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Textbox modal state
  const [showTextboxModal, setShowTextboxModal] = useState(false);

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
          disabled: currentDashboard.chartsCount === 0,
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
        showDivider={true}
      />
    );
  }

  // Main dashboards page
  return (
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
  );
} 