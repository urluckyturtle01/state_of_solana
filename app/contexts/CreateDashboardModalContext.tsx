"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CreateDashboardModalContextType {
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
  newDashboardName: string;
  setNewDashboardName: (name: string) => void;
  newDashboardDescription: string;
  setNewDashboardDescription: (description: string) => void;
}

const CreateDashboardModalContext = createContext<CreateDashboardModalContextType | undefined>(undefined);

export const CreateDashboardModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardDescription, setNewDashboardDescription] = useState('');

  return (
    <CreateDashboardModalContext.Provider value={{
      showCreateModal,
      setShowCreateModal,
      newDashboardName,
      setNewDashboardName,
      newDashboardDescription,
      setNewDashboardDescription,
    }}>
      {children}
    </CreateDashboardModalContext.Provider>
  );
};

export const useCreateDashboardModal = () => {
  const context = useContext(CreateDashboardModalContext);
  if (context === undefined) {
    throw new Error('useCreateDashboardModal must be used within a CreateDashboardModalProvider');
  }
  return context;
}; 