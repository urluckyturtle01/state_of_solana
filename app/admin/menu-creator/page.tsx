"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AVAILABLE_ICONS, MenuItem, MenuPage, getPagesForMenu, MENU_OPTIONS, findMenuForPage } from '../config/menuPages';
import Button from '../components/Button';

export default function MenuCreatorPage() {
  const router = useRouter();
  
  // Menu information
  const [menuInfo, setMenuInfo] = useState<{
    id: string;
    name: string;
    icon: string;
    description: string;
  }>({
    id: '',
    name: '',
    icon: 'home',
    description: ''
  });
  
  // Pages for the menu
  const [pages, setPages] = useState<MenuPage[]>([]);
  
  // New page input
  const [newPage, setNewPage] = useState<{
    id: string;
    name: string;
  }>({
    id: '',
    name: ''
  });
  
  // Form status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  
  // Handle menu info changes
  const handleMenuInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // If id field, enforce lowercase, no spaces, and kebab-case
    if (name === 'id') {
      const formattedValue = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      // Check if menu ID already exists in MENU_OPTIONS
      if (formattedValue && MENU_OPTIONS.some(menu => menu.id === formattedValue)) {
        alert(`Menu ID "${formattedValue}" is already in use. Please choose a different ID.`);
        return;
      }
      
      setMenuInfo(prev => ({ ...prev, [name]: formattedValue }));
    } else {
      setMenuInfo(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Handle new page input changes
  const handleNewPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // If id field, enforce lowercase, no spaces, and kebab-case
    if (name === 'id') {
      const formattedValue = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      // Check if page ID already exists in the system
      const existingMenuWithPage = findMenuForPage(formattedValue);
      if (formattedValue && existingMenuWithPage) {
        alert(`Page ID "${formattedValue}" is already in use in the "${existingMenuWithPage}" menu. Please choose a different ID.`);
        return;
      }
      
      setNewPage(prev => ({ ...prev, [name]: formattedValue }));
    } else {
      setNewPage(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Add a new page
  const handleAddPage = () => {
    if (!newPage.id || !newPage.name) {
      alert('Please provide both ID and Name for the page');
      return;
    }
    
    // Check if page ID already exists
    if (pages.some(p => p.id === newPage.id)) {
      alert(`A page with ID "${newPage.id}" already exists`);
      return;
    }
    
    // Add the new page
    const path = `/${menuInfo.id}/${newPage.id}`;
    setPages(prev => [...prev, { ...newPage, path }]);
    
    // Reset the new page input
    setNewPage({ id: '', name: '' });
  };
  
  // Remove a page
  const handleRemovePage = (pageId: string) => {
    setPages(prev => prev.filter(p => p.id !== pageId));
  };
  
  // Generate file content
  const generateLayoutFileContent = (menuId: string, menuName: string): string => {
    const capitalizedMenuId = menuId.charAt(0).toUpperCase() + menuId.slice(1);
    const defaultPageId = pages.length > 0 ? pages[0].id : 'summary';
    
    return `"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import ${capitalizedMenuId}TabsHeader from "./components/${capitalizedMenuId}TabsHeader";
import { usePathname } from "next/navigation";

interface ${capitalizedMenuId}LayoutProps {
  children: ReactNode;
}

export default function ${capitalizedMenuId}Layout({ children }: ${capitalizedMenuId}LayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  const pathSegments = pathname.split('/');
  const activeTab = pathname.split('/')[2] || '${defaultPageId}';
  
  return (
    <Layout>
      <div className="space-y-6">
        <${capitalizedMenuId}TabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
}`;
  };
  
  // Generate root page content
  const generateRootPageContent = (menuId: string, menuName: string): string => {
    const capitalizedMenuId = menuId.charAt(0).toUpperCase() + menuId.slice(1);
    const defaultPageId = pages.length > 0 ? pages[0].id : 'summary';
    
    return `"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPagesForMenu } from "@/app/admin/config/menuPages";

export default function ${capitalizedMenuId}IndexPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Get available pages for this menu
    const pages = getPagesForMenu('${menuId}');
    
    // Redirect to the first available page, or show a message if no pages exist
    if (pages.length > 0) {
      const firstPage = pages[0];
      router.replace(firstPage.path);
    }
  }, [router]);
  
  return (
    <div className="flex flex-col justify-center items-center h-screen bg-black text-gray-400">
      <h2 className="text-xl font-semibold mb-2">Welcome to ${menuName}</h2>
      <p>Loading available pages...</p>
    </div>
  );
}`;
  };
  
  // Generate tabs header content
  const generateTabsHeaderContent = (menuId: string, menuName: string, description: string, pages: MenuPage[]): string => {
    const capitalizedMenuId = menuId.charAt(0).toUpperCase() + menuId.slice(1);
    const defaultPageId = pages.length > 0 ? pages[0].id : 'summary';
    
    // Generate tabs array content
    const tabsContent = pages.map(page => {
      return `    { 
      name: "${page.name}", 
      path: "/${menuId}/${page.id}",
      key: "${page.id}",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    }`;
    }).join(',\n');
    
    return `"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface ${capitalizedMenuId}TabsHeaderProps {
  activeTab?: string;
}

export default function ${capitalizedMenuId}TabsHeader({ activeTab = "${defaultPageId}" }: ${capitalizedMenuId}TabsHeaderProps) {
  const tabs: Tab[] = [
${tabsContent}
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="${menuName}"
      description="${description}"
      showDivider={true}
    />
  );
}`;
  };
  
  // Generate page content
  const generatePageContent = (menuId: string, pageId: string): string => {
    const capitalizedMenuId = menuId.charAt(0).toUpperCase() + menuId.slice(1);
    const capitalizedPageId = pageId.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    
    return `"use client";
import React, { Suspense } from 'react';
import EnhancedDashboardRenderer from "@/app/admin/components/enhanced-dashboard-renderer";
import Loader from "@/app/components/shared/Loader";

// Create a loading component for Suspense fallback
const ChartLoading = () => (
  <div className="w-full h-[500px] flex items-center justify-center">
    <Loader size="md" />
  </div>
);

export default function ${capitalizedMenuId}${capitalizedPageId}Page() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<ChartLoading />}>
        <EnhancedDashboardRenderer 
          pageId="${pageId}" 
          enableCaching={true}
        />
      </Suspense>
    </div>
  );
}`;
  };
  
  // Generate updated menuPages.ts content
  const generateMenuPagesUpdateContent = (menuName: string, icon: string, pages: MenuPage[]): string => {
    const menuId = menuInfo.id; // Use from state
    const pagesArrayContent = pages.map(page => {
      return `    { id: '${page.id}', name: '${page.name}', path: '/${menuId}/${page.name.toLowerCase().replace(/\s+/g, '-')}' }`;
    }).join(',\n');
    
    return `// Add to MENU_OPTIONS array:
{ id: '${menuId}', name: '${menuName}', icon: '${icon}' },

// Add to MENU_PAGES object:
${menuId}: [
${pagesArrayContent}
],`;
  };
  
  // Generate folder structure diagram
  const generateFolderStructure = (menuId: string, pages: MenuPage[]): string => {
    const capitalizedMenuId = menuId.charAt(0).toUpperCase() + menuId.slice(1);
    
    let structure = `app/
└── ${menuId}/
    ├── components/
    │   └── ${capitalizedMenuId}TabsHeader.tsx
    ├── layout.tsx
    ├── page.tsx`;
    
    pages.forEach(page => {
      structure += `
    └── ${page.id}/
        └── page.tsx`;
    });
    
    return structure;
  };
  
  // Generate menu structure
  const generateMenuStructure = () => {
    const filesConfig = [];
    const menuId = menuInfo.id;
    const capitalizedMenuId = menuId.charAt(0).toUpperCase() + menuId.slice(1);
    
    // Add layout.tsx
    filesConfig.push({
      path: `app/${menuId}/layout.tsx`,
      content: generateLayoutFileContent(menuId, menuInfo.name)
    });
    
    // Add page.tsx (root redirect)
    filesConfig.push({
      path: `app/${menuId}/page.tsx`,
      content: generateRootPageContent(menuId, menuInfo.name)
    });
    
    // Add tabs header component
    filesConfig.push({
      path: `app/${menuId}/components/${capitalizedMenuId}TabsHeader.tsx`,
      content: generateTabsHeaderContent(menuId, menuInfo.name, menuInfo.description, pages)
    });
    
    // Add page files for each page
    pages.forEach(page => {
      filesConfig.push({
        path: `app/${menuId}/${page.id}/page.tsx`,
        content: generatePageContent(menuId, page.id)
      });
    });
    
    // The update_menuPages.txt is causing issues because it's not in the app directory
    // Instead, create a temporary file in the app directory
    filesConfig.push({
      path: `app/admin/temp/menu-update-${menuId}.txt`,
      content: generateMenuPagesUpdateContent(menuInfo.name, menuInfo.icon, pages)
    });
    
    return filesConfig;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!menuInfo.id || !menuInfo.name || !menuInfo.description) {
      alert("Please fill in all required menu information");
      return;
    }
    
    if (pages.length === 0) {
      alert("Please add at least one page to the menu");
      return;
    }
    
    // Final check for duplicate menu ID (in case it was added while this form was open)
    if (MENU_OPTIONS.some(menu => menu.id === menuInfo.id)) {
      alert(`Menu ID "${menuInfo.id}" is already in use. Please choose a different ID.`);
      return;
    }
    
    // Check for duplicate page IDs across the application
    for (const page of pages) {
      const existingMenuWithPage = findMenuForPage(page.id);
      if (existingMenuWithPage) {
        alert(`Page ID "${page.id}" is already in use in the "${existingMenuWithPage}" menu. Please choose a different ID.`);
        return;
      }
    }
    
    setIsSubmitting(true);
    setResult(null);
    
    try {
      console.log("Updating menu configuration...");
      const menuUpdateResponse = await fetch('/api/update-menu-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          menuId: menuInfo.id,
          menuName: menuInfo.name,
          menuIcon: menuInfo.icon,
          menuDescription: menuInfo.description,
          pages: pages
        }),
      });
      
      const menuUpdateData = await menuUpdateResponse.json();
      
      if (!menuUpdateResponse.ok) {
        throw new Error(menuUpdateData.error || 'Failed to update menu configuration');
      }
      
      setResult({
        success: true,
        message: `Menu structure for "${menuInfo.name}" has been created successfully. The configuration has been updated.`
      });
      
      console.log('Menu configuration updated successfully');
      
      // Redirect to the new menu page after a short delay
      setTimeout(() => {
        // Get the first page ID, or default to 'summary' if no pages exist
        const firstPageId = pages.length > 0 ? pages[0].id : 'summary';
        router.push(`/${menuInfo.id}/${firstPageId}`);
      }, 3000);
    } catch (error) {
      console.error("Error creating menu:", error);
      setResult({
        success: false,
        message: `Error creating menu: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="border-b border-gray-800 pb-5 mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Create Menu Section
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Create a new menu section and generate the necessary file structure
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
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-gray-900 p-6 rounded-lg">
        {/* Menu Information */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-indigo-400 mb-4">Menu Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="id" className="block text-sm font-medium text-gray-400">
                Menu ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="id"
                name="id"
                value={menuInfo.id}
                onChange={handleMenuInfoChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="my-new-menu"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Lowercase letters, numbers, and hyphens only. This will be used in URLs and file paths.
              </p>
            </div>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-400">
                Menu Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={menuInfo.name}
                onChange={handleMenuInfoChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="My New Menu"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="icon" className="block text-sm font-medium text-gray-400">
                Menu Icon
              </label>
              <select
                id="icon"
                name="icon"
                value={menuInfo.icon}
                onChange={handleMenuInfoChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {AVAILABLE_ICONS.map(icon => (
                  <option key={icon.id} value={icon.id}>{icon.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-400">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="description"
                name="description"
                value={menuInfo.description}
                onChange={handleMenuInfoChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Description of this menu section"
                required
              />
            </div>
          </div>
        </div>
        
        {/* Pages Configuration */}
        <div className="space-y-4 border-t border-gray-800 pt-6">
          <h2 className="text-xl font-semibold text-indigo-400 mb-4">Pages</h2>
          
          <div className="bg-gray-800 p-4 rounded-md">
            <p className="text-sm text-gray-300 mb-4">
              Define the pages that will be available in this menu section. Each page will have its own URL and content.
            </p>
            
            {/* Existing Pages */}
            {pages.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Current Pages</h3>
                <div className="bg-gray-900 border border-gray-800 rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-800">
                    <thead className="bg-gray-900">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Page ID
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Page Name
                        </th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {pages.map((page, index) => (
                        <tr key={page.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                            {page.id}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                            {page.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              type="button"
                              onClick={() => handleRemovePage(page.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Add New Page */}
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Add New Page</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="pageId" className="block text-xs font-medium text-gray-400">
                    Page ID
                  </label>
                  <input
                    type="text"
                    id="pageId"
                    name="id"
                    value={newPage.id}
                    onChange={handleNewPageChange}
                    className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="my-page"
                  />
                </div>
                <div>
                  <label htmlFor="pageName" className="block text-xs font-medium text-gray-400">
                    Page Name
                  </label>
                  <input
                    type="text"
                    id="pageName"
                    name="name"
                    value={newPage.name}
                    onChange={handleNewPageChange}
                    className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="My Page"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddPage}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Add Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Preview */}
        <div className="space-y-4 border-t border-gray-800 pt-6">
          <h2 className="text-xl font-semibold text-indigo-400 mb-4">Preview</h2>
          
          <div className="bg-gray-800 p-4 rounded-md">
            <p className="text-sm text-gray-300 mb-2">
              This will create the following file structure:
            </p>
            
            <div className="bg-gray-900 p-3 rounded-md font-mono text-xs text-gray-300 overflow-auto">
              <div>
                <span className="text-blue-400">app/</span>
                <span className="text-yellow-400">{menuInfo.id || 'menu-id'}/</span>
              </div>
              <div className="pl-6">
                <span className="text-green-400">components/</span>
              </div>
              <div className="pl-10">
                <span className="text-purple-400">{menuInfo.id ? `${menuInfo.id.charAt(0).toUpperCase() + menuInfo.id.slice(1)}TabsHeader.tsx` : 'MenuTabsHeader.tsx'}</span>
              </div>
              <div className="pl-6">
                <span className="text-green-400">layout.tsx</span>
              </div>
              <div className="pl-6">
                <span className="text-green-400">page.tsx</span>
              </div>
              {pages.map(page => (
                <div key={page.id} className="pl-6">
                  <span className="text-yellow-400">{page.id}/</span>
                  <span className="pl-2 text-green-400">page.tsx</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-md mt-4">
            <p className="text-sm text-gray-300">
              <span className="text-yellow-400 font-medium">Important:</span> The files will be automatically created in your project directory and the menu configuration will be updated automatically. After successful creation, you'll be redirected to your new menu page.
            </p>
          </div>
        </div>
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-3 border-t border-gray-800 pt-6">
          <Button
            type="button"
            onClick={() => router.push('/admin')}
            className="px-4 py-2 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-transparent hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Generate Menu Files
          </Button>
        </div>
      </form>
    </div>
  );
}