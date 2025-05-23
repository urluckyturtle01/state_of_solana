"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MENU_OPTIONS, MENU_PAGES, MenuItem, MenuPage } from '../config/menuPages';
import Button from '../components/Button';

export default function MenuManagerPage() {
  const router = useRouter();
  const [menuData, setMenuData] = useState<{
    options: MenuItem[];
    pages: Record<string, MenuPage[]>;
  }>({
    options: [],
    pages: {}
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'menu' | 'page';
    id: string;
    menuId?: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Load menu data
  useEffect(() => {
    setMenuData({
      options: MENU_OPTIONS,
      pages: MENU_PAGES
    });
    setIsLoading(false);
  }, []);

  // Function to handle menu selection
  const handleMenuSelect = (menuId: string) => {
    setSelectedMenu(menuId);
  };

  // Function to prompt for menu deletion confirmation
  const promptDeleteMenu = (menuId: string, menuName: string) => {
    setDeleteConfirm({
      type: 'menu',
      id: menuId,
      name: menuName
    });
  };

  // Function to prompt for page deletion confirmation
  const promptDeletePage = (pageId: string, pageName: string, menuId: string) => {
    setDeleteConfirm({
      type: 'page',
      id: pageId,
      menuId,
      name: pageName
    });
  };

  // Function to cancel deletion
  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  // Function to delete a menu or page
  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    setResult(null);

    try {
      const endpoint = deleteConfirm.type === 'menu' 
        ? '/api/delete-menu' 
        : '/api/delete-page';

      const payload = deleteConfirm.type === 'menu'
        ? { menuId: deleteConfirm.id }
        : { menuId: deleteConfirm.menuId, pageId: deleteConfirm.id };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh data after successful deletion
        if (deleteConfirm.type === 'menu') {
          setMenuData(prev => ({
            options: prev.options.filter(opt => opt.id !== deleteConfirm.id),
            pages: Object.fromEntries(
              Object.entries(prev.pages).filter(([key]) => key !== deleteConfirm.id)
            )
          }));
          setSelectedMenu(null);
        } else if (deleteConfirm.menuId) {
          setMenuData(prev => ({
            ...prev,
            pages: {
              ...prev.pages,
              [deleteConfirm.menuId!]: prev.pages[deleteConfirm.menuId!].filter(
                page => page.id !== deleteConfirm.id
              )
            }
          }));
        }

        setResult({
          success: true,
          message: data.message || `${deleteConfirm.type === 'menu' ? 'Menu' : 'Page'} deleted successfully`
        });
      } else {
        throw new Error(data.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="border-b border-gray-800 pb-5 mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Menu Manager
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          View and manage menu sections and pages
        </p>
      </div>

      {result && (
        <div className={`mb-6 p-4 rounded-md ${result.success ? 'bg-green-900/30 border border-green-800' : 'bg-red-900/30 border border-red-800'}`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {result.success ? (
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.success ? 'Success' : 'Error'}
              </h3>
              <div className={`mt-2 text-sm ${result.success ? 'text-green-300' : 'text-red-300'}`}>
                <p>{result.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-md w-full p-6 border border-gray-800">
            <h3 className="text-lg font-medium text-white mb-4">
              Confirm Deletion
            </h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete the {deleteConfirm.type} <span className="font-semibold text-white">{deleteConfirm.name}</span>?
              {deleteConfirm.type === 'menu' && (
                <span className="block mt-2 text-red-400">
                  This will also delete all pages within this menu and remove any associated files.
                </span>
              )}
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                onClick={cancelDelete}
                className="px-4 py-2 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-transparent hover:bg-gray-800"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                isLoading={isDeleting}
                disabled={isDeleting}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Menu List */}
        <div className="bg-gray-900 rounded-lg p-4 col-span-1">
          <h2 className="text-lg font-medium text-indigo-400 mb-4">Menu Sections</h2>
          <ul className="space-y-1">
            {menuData.options.map(menu => (
              <li key={menu.id} className="relative">
                <button
                  onClick={() => handleMenuSelect(menu.id)}
                  className={`w-full text-left px-3 py-2 rounded-md ${selectedMenu === menu.id ? 'bg-indigo-900/50 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                >
                  {menu.name}
                </button>
                <button
                  onClick={() => promptDeleteMenu(menu.id, menu.name)}
                  className="absolute right-2 top-2 text-gray-500 hover:text-red-400"
                  title="Delete menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t border-gray-800">
            <Button
              type="button"
              onClick={() => router.push('/admin/menu-creator')}
              className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Create New Menu
            </Button>
          </div>
        </div>

        {/* Menu Details */}
        <div className="bg-gray-900 rounded-lg p-4 col-span-3">
          {selectedMenu ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-white">
                  {menuData.options.find(m => m.id === selectedMenu)?.name} Pages
                </h2>
                <Button
                  type="button"
                  onClick={() => router.push(`/${selectedMenu}/summary`)}
                  className="px-3 py-1.5 text-xs border border-transparent rounded-md shadow-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  View Menu
                </Button>
              </div>
              {menuData.pages[selectedMenu]?.length > 0 ? (
                <div className="bg-gray-800 rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Page ID
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Page Name
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Path
                        </th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {menuData.pages[selectedMenu].map(page => (
                        <tr key={page.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                            {page.id}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                            {page.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                            {page.path}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => promptDeletePage(page.id, page.name, selectedMenu)}
                              className="text-red-400 hover:text-red-300"
                              title="Delete page"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-gray-800 rounded-md p-4 text-gray-400">
                  No pages found for this menu.
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              Select a menu to view its pages
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 