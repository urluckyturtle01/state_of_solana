"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  getAllChartConfigs, 
  deleteChartConfig, 
  getChartConfigsByPage,
  getAllCounterConfigs,
  deleteCounterConfig,
  getCounterConfigsByPage,
  getAllTableConfigs,
  deleteTableConfig,
  getTableConfigsByPage
} from '../utils';
import { AVAILABLE_PAGES, ChartConfig, CounterConfig, TableConfig } from '../types';
import { MENU_OPTIONS, MENU_PAGES } from '../config/menuPages';
import Button from '../components/Button';
import dynamic from 'next/dynamic';
import BatchCleanupButton from '../components/BatchCleanupButton';
import TempUpdateButtons from '../components/TempUpdateButtons';

// Dynamic imports to avoid SSR issues
const DashboardRenderer = dynamic(() => import('../components/dashboard-renderer'), {
  ssr: false,
});

const CounterRenderer = dynamic(() => import('../components/CounterRenderer'), {
  ssr: false,
});

const TableRenderer = dynamic(() => import('../components/TableRenderer'), {
  ssr: false,
});

// Add a helper function to format the Y-Axis display value
const formatYAxisValue = (yAxis: string | string[] | any[] | { field: string } | Array<string | { field: string }>): string => {
  if (typeof yAxis === 'string') {
    return yAxis;
  } 
  
  // Handle case where it's an object with a field property (YAxisConfig)
  if (typeof yAxis === 'object' && !Array.isArray(yAxis) && yAxis && 'field' in yAxis) {
    return yAxis.field;
  }
  
  if (Array.isArray(yAxis)) {
    return yAxis.map((field) => {
      if (typeof field === 'string') {
        return field;
      }
      // Handle YAxisConfig objects
      if (field && typeof field === 'object' && 'field' in field) {
        return field.field;
      }
      return 'unknown';
    }).join(', ');
  }
  
  return 'unknown';
};

// Add function to update chart positions
const updateChartsOrder = async (charts: ChartConfig[]): Promise<boolean> => {
  try {
    // Update positions for all charts
    const updatePromises = charts.map(async (chart, index) => {
      const updatedChart = { ...chart, position: index };
      const response = await fetch(`/api/charts/${chart.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedChart)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update chart ${chart.id}`);
      }
      
      return response.json();
    });
    
    await Promise.all(updatePromises);
    console.log('Successfully updated chart order');
    return true;
  } catch (error) {
    console.error('Error updating chart order:', error);
    return false;
  }
};

export default function ManageDashboardPage() {
  const [activeTab, setActiveTab] = useState<'charts' | 'counters' | 'tables'>('charts');
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [counters, setCounters] = useState<CounterConfig[]>([]);
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<string>('');
  const [selectedPage, setSelectedPage] = useState<string>('all');
  const [availablePages, setAvailablePages] = useState<Array<{id: string, name: string, path: string}>>([]);
  const [isClient, setIsClient] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<Record<string, boolean>>({});
  
  // Add drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Update available pages when menu selection changes
  useEffect(() => {
    if (!selectedMenu) {
      setAvailablePages([]);
      return;
    }
    
    // Get pages from menuPages.ts configuration
    const menuPages = MENU_PAGES[selectedMenu] || [];
    setAvailablePages(menuPages);
    
    // Reset the page selection when menu changes
    setSelectedPage('all');
  }, [selectedMenu]);

  // Add drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add visual feedback
    const target = e.target as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    setDraggedIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newCharts = [...charts];
    const draggedChart = newCharts[draggedIndex];
    
    // Remove the dragged item
    newCharts.splice(draggedIndex, 1);
    
    // Insert at new position
    newCharts.splice(index, 0, draggedChart);
    
    setCharts(newCharts);
    setDraggedIndex(index);
  };

  const handleSaveOrder = async () => {
    if (charts.length === 0) return;
    
    setIsReordering(true);
    const success = await updateChartsOrder(charts);
    
    if (success) {
      alert('Chart order updated successfully in S3! Please regenerate config files locally and push to deploy.');
    } else {
      alert('Failed to update chart order. Please try again.');
    }
    
    setIsReordering(false);
  };

  // Load data from local storage when component mounts or filters change
  useEffect(() => {
    setIsClient(true);
    
    const loadData = async () => {
      try {
        console.log(`[LOAD DATA] Loading ${activeTab} with filters - selectedMenu: '${selectedMenu}', selectedPage: '${selectedPage}'`);
        
        // Check for refresh flags and clear cache if needed
        if (typeof window !== 'undefined') {
          const needsRefresh = localStorage.getItem(`${activeTab}_need_refresh`) === 'true';
          const refreshTime = parseInt(localStorage.getItem(`${activeTab}_refresh_time`) || '0', 10);
          
          if (needsRefresh) {
            // Check if the flag is not too old (less than 5 minutes)
            const now = Date.now();
            if (now - refreshTime < 5 * 60 * 1000) {
              console.log(`[REFRESH] Clearing ${activeTab} caches due to refresh flag`);
              
              // Clear all page-specific caches for this type
              const keys = Object.keys(localStorage);
              for (const key of keys) {
                if (key.startsWith(`${activeTab}_page_`)) {
                  localStorage.removeItem(key);
                }
              }
              
              // Clear the refresh flag
              localStorage.setItem(`${activeTab}_need_refresh`, 'false');
            } else {
              // Flag is too old, just clear it
              localStorage.setItem(`${activeTab}_need_refresh`, 'false');
            }
          }
        }
        
        // Load charts or counters based on active tab
        if (activeTab === 'charts') {
          let allCharts;
          if (selectedPage === 'all' && !selectedMenu) {
            // All charts from all menus
            allCharts = await getAllChartConfigs();
            console.log(`[LOAD DATA] Loaded ${allCharts?.length || 0} charts from all menus`);
          } else if (selectedPage === 'all' && selectedMenu) {
            // All charts from selected menu
            const menuCharts = await getAllChartConfigs();
            allCharts = menuCharts.filter(chart => {
              // Check if chart page matches any page in the selected menu
              return availablePages.some(page => page.id === chart.page);
            });
            console.log(`[LOAD DATA] Loaded ${allCharts?.length || 0} charts for menu: ${selectedMenu}`);
          } else {
            // Specific page charts
            allCharts = await getChartConfigsByPage(selectedPage);
            console.log(`[LOAD DATA] Loaded ${allCharts?.length || 0} charts for page: ${selectedPage}`);
          }
          
          // Ensure we're always setting an array, even if the API returns something else
          const sortedCharts = Array.isArray(allCharts) ? allCharts.sort((a, b) => {
            // Sort by position if available, otherwise by creation date
            const positionA = a.position ?? 999999;
            const positionB = b.position ?? 999999;
            
            if (positionA !== positionB) {
              return positionA - positionB;
            }
            
            // Fallback to creation date if positions are equal
            const dateA = new Date(a.createdAt || '').getTime();
            const dateB = new Date(b.createdAt || '').getTime();
            return dateA - dateB;
          }) : [];
          
          setCharts(sortedCharts);
        } else if (activeTab === 'counters') {
          let allCounters;
          if (selectedPage === 'all' && !selectedMenu) {
            // All counters from all menus
            allCounters = await getAllCounterConfigs();
            console.log(`[LOAD DATA] Loaded ${allCounters?.length || 0} counters from all menus`);
          } else if (selectedPage === 'all' && selectedMenu) {
            // All counters from selected menu
            const menuCounters = await getAllCounterConfigs();
            allCounters = menuCounters.filter(counter => {
              // Check if counter page matches any page in the selected menu
              return availablePages.some(page => page.id === counter.page);
            });
            console.log(`[LOAD DATA] Loaded ${allCounters?.length || 0} counters for menu: ${selectedMenu}`);
          } else {
            // Specific page counters
            allCounters = await getCounterConfigsByPage(selectedPage);
            console.log(`[LOAD DATA] Loaded ${allCounters?.length || 0} counters for page: ${selectedPage}`);
          }
          
          // Ensure we're always setting an array
          setCounters(Array.isArray(allCounters) ? allCounters : []);
        } else {
          // Load tables with the same filtering logic
          let allTables;
          if (selectedPage === 'all' && !selectedMenu) {
            // All tables from all menus - no filtering required
            allTables = await getAllTableConfigs();
            console.log(`[LOAD DATA] Loaded ${allTables?.length || 0} tables from all menus`);
            // Inspect the table objects to ensure they have page properties
            if (Array.isArray(allTables) && allTables.length > 0) {
              console.log('[TABLE INSPECTION] Sample table structure:', {
                id: allTables[0].id,
                title: allTables[0].title,
                page: allTables[0].page,
                hasPage: 'page' in allTables[0]
              });
            }
          } else if (selectedPage === 'all' && selectedMenu) {
            // All tables from selected menu
            const menuTables = await getAllTableConfigs();
            console.log(`[LOAD DATA] Fetched ${menuTables?.length || 0} total tables for filtering by menu: ${selectedMenu}`);
            
            // Debug log the page property of each table
            if (Array.isArray(menuTables) && menuTables.length > 0) {
              console.log('[TABLE PAGES] Available pages:', availablePages.map(p => p.id));
              console.log('[TABLE PAGES] Table pages:', menuTables.map(t => ({ id: t.id, page: t.page })));
            }
            
            // Special case: if no tables have a page that matches, show all tables for this menu
            // This fallback ensures tables are always visible when "All pages" is selected
            allTables = menuTables.filter(table => {
              // Check if table page matches any page in the selected menu
              const matches = availablePages.some(page => page.id === table.page);
              // Debug each filter operation
              console.log(`[FILTER] Table ${table.id} (page: ${table.page}) matches menu ${selectedMenu}: ${matches}`);
              return matches;
            });
            
            // If no tables matched after filtering, show all tables as fallback
            if (allTables.length === 0 && menuTables.length > 0) {
              console.log('[FALLBACK] No tables matched menu pages, showing all tables');
              allTables = menuTables;
            }
            
            console.log(`[LOAD DATA] After filtering, loaded ${allTables?.length || 0} tables for menu: ${selectedMenu}`);
            console.log(`[LOAD DATA] Available pages for menu ${selectedMenu}:`, availablePages.map(p => p.id).join(', '));
          } else {
            // Specific page tables
            allTables = await getTableConfigsByPage(selectedPage);
            console.log(`[LOAD DATA] Loaded ${allTables?.length || 0} tables for page: ${selectedPage}`);
          }
          
          // Ensure we're always setting an array
          setTables(Array.isArray(allTables) ? allTables : []);
          console.log(`[LOAD DATA] Final tables state set with ${Array.isArray(allTables) ? allTables.length : 0} items`);
        }
      } catch (error) {
        console.error(`Error loading ${activeTab}:`, error);
        if (activeTab === 'charts') {
          setCharts([]);
        } else if (activeTab === 'counters') {
          setCounters([]);
        } else {
          setTables([]);
        }
      }
    };
    
    loadData();
  }, [activeTab, selectedMenu, selectedPage, availablePages]);

  // Handle item deletion
  const handleDeleteItem = async (id: string, type: 'chart' | 'counter' | 'table') => {
    const itemType = type === 'chart' ? 'chart' : type === 'counter' ? 'counter' : 'table';
    if (window.confirm(`Are you sure you want to delete this ${itemType}?`)) {
      try {
        let success;
        if (type === 'chart') {
          success = await deleteChartConfig(id);
          if (success) {
            setCharts(prev => prev.filter(chart => chart.id !== id));
          }
        } else if (type === 'counter') {
          success = await deleteCounterConfig(id);
          if (success) {
            setCounters(prev => prev.filter(counter => counter.id !== id));
          }
        } else {
          success = await deleteTableConfig(id);
          if (success) {
            setTables(prev => prev.filter(table => table.id !== id));
          }
        }
        
        if (success) {
          // Also update the isPreviewOpen state
          setIsPreviewOpen(prev => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
          });
        } else {
          throw new Error(`Failed to delete ${itemType}`);
        }
      } catch (error) {
        console.error(`Error deleting ${itemType}:`, error);
        alert(`Failed to delete ${itemType}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  // Toggle preview
  const togglePreview = (id: string) => {
    setIsPreviewOpen(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Handle menu selection change
  const handleMenuChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMenu(e.target.value);
  };

  if (!isClient) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-900 text-gray-100">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-indigo-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-400">Loading dashboard items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen text-gray-100 sm:pt-8">
      <div className="border-b border-gray-800 pb-5 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-medium text-white tracking-tight">Manage Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">View, preview, and manage your analytics visualizations and counters</p>
        </div>
        <div className="flex space-x-3">
          <BatchCleanupButton />
          <Link href={activeTab === 'charts' 
              ? "/admin/chart-creator" 
              : activeTab === 'counters' 
                ? "/admin/create-counter" 
                : "/admin/table-creator"}>
            <Button variant="primary">
              Create {activeTab === 'charts' ? 'Chart' : activeTab === 'counters' ? 'Counter' : 'Table'}
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Tabs for switching between charts, counters, and tables */}
      <div className="border-b border-gray-800 mb-6">
        <div className="flex -mb-px">
          <button
            className={`pb-3 px-4 text-sm font-medium ${activeTab === 'charts' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveTab('charts')}
          >
            Charts
          </button>
          <button
            className={`pb-3 px-4 text-sm font-medium ${activeTab === 'counters' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveTab('counters')}
          >
            Counters
          </button>
          <button
            className={`pb-3 px-4 text-sm font-medium ${activeTab === 'tables' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveTab('tables')}
          >
            Tables
          </button>
        </div>
      </div>
      
      {/* Filtering controls */}
      <div className="mb-6 p-4 bg-gray-800/40 rounded-lg border border-gray-800">
        <h2 className="text-sm font-medium text-gray-300 mb-3">Filter {activeTab === 'charts' ? 'Charts' : activeTab === 'counters' ? 'Counters' : 'Tables'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="menuFilter" className="block text-xs text-gray-500 mb-1">Menu</label>
            <select
              id="menuFilter"
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-300"
              value={selectedMenu}
              onChange={handleMenuChange}
            >
              <option value="">All Menus</option>
              {MENU_OPTIONS.map(menu => (
                <option key={menu.id} value={menu.id}>{menu.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="pageFilter" className="block text-xs text-gray-500 mb-1">Page</label>
            <select
              id="pageFilter"
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-300"
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
              disabled={!selectedMenu && availablePages.length === 0}
            >
              <option value="all">All Pages</option>
              {availablePages.map((page) => (
                <option key={page.id} value={page.id}>{page.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Temp File Update Section */}
      <TempUpdateButtons />
      
      {/* Display charts, counters, or tables based on active tab */}
      {activeTab === 'charts' ? (
        // Charts list
        <div className="space-y-4">
          {/* Chart reordering controls */}
          {charts.length > 0 && selectedPage !== 'all' && (
            <div className="flex justify-between items-center p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
              <div>
                <p className="text-sm text-blue-300 font-medium">Drag & Drop to Reorder Charts</p>
                <p className="text-xs text-blue-400/70 mt-1">Saves positions to S3. Run config script locally and push to deploy changes.</p>
              </div>
              <Button 
                variant="primary" 
                onClick={handleSaveOrder}
                disabled={isReordering}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isReordering ? 'Saving...' : 'Save Order'}
              </Button>
            </div>
          )}
          
          {charts.length === 0 ? (
            <div className="text-center p-8 bg-gray-800/30 rounded-lg border border-gray-800">
              <p className="text-gray-400">No charts found matching the selected criteria.</p>
              <Link href="/admin/chart-creator">
                <button className="mt-4 text-sm text-indigo-400 hover:text-indigo-300">
                  Create your first chart
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {charts.map((chart, index) => (
                <div
                  key={chart.id}
                  className={`bg-gray-800/40 rounded-lg overflow-hidden border border-gray-800 transition-all cursor-move ${
                    draggedIndex === index ? 'opacity-50' : 'hover:border-gray-700'
                  }`}
                  draggable={selectedPage !== 'all'}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDragOver(e, index)}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium text-white">{chart.title}</h3>
                        {chart.subtitle && (
                          <p className="mt-1 text-sm text-gray-400">{chart.subtitle}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => togglePreview(chart.id)}
                          className="text-sm text-gray-400 hover:text-gray-300"
                        >
                          {isPreviewOpen[chart.id] ? 'Hide Preview' : 'Preview'}
                        </button>
                        <Link href={`/admin/chart-creator?editId=${chart.id}`}>
                          <button className="text-sm text-blue-400 hover:text-blue-300">
                            Edit
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDeleteItem(chart.id, 'chart')}
                          className="text-sm text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-400">Page:</span>{' '}
                        <span className="text-gray-200">{chart.page}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400">Type:</span>{' '}
                        <span className="text-gray-200">{chart.chartType}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400">Created:</span>{' '}
                        <span className="text-gray-200">{chart.createdAt ? new Date(chart.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400">X-Axis:</span>{' '}
                        <span className="text-gray-200 truncate">{typeof chart.dataMapping.xAxis === 'string' ? chart.dataMapping.xAxis : 'Multiple'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400">Y-Axis:</span>{' '}
                        <span className="text-gray-200 truncate">{formatYAxisValue(chart.dataMapping.yAxis)}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400">Group By:</span>{' '}
                        <span className="text-gray-200">{chart.dataMapping.groupBy || 'None'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {isPreviewOpen[chart.id] && (
                    <div className="border-t border-gray-700 p-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-3">Preview</h4>
                      <div className="bg-gray-900 rounded-md p-4 h-150">
                        <DashboardRenderer pageId={chart.page} overrideCharts={[chart]} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'counters' ? (
        // Counters list
        <div className="space-y-4">
          {counters.length === 0 ? (
            <div className="text-center p-8 bg-gray-800/30 rounded-lg border border-gray-800">
              <p className="text-gray-400">No counters found matching the selected criteria.</p>
              <Link href="/admin/create-counter">
                <button className="mt-4 text-sm text-green-400 hover:text-green-300">
                  Create your first counter
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {counters.map((counter) => (
                <div key={counter.id} className="bg-gray-800/40 rounded-lg overflow-hidden border border-gray-800 transition-all">
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium text-white">{counter.title}</h3>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => togglePreview(counter.id)}
                          className="text-sm text-gray-400 hover:text-gray-300"
                        >
                          {isPreviewOpen[counter.id] ? 'Hide Preview' : 'Preview'}
                        </button>
                        <Link href={`/admin/create-counter?editId=${counter.id}`}>
                          <button className="text-sm text-green-400 hover:text-green-300">
                            Edit
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDeleteItem(counter.id, 'counter')}
                          className="text-sm text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-400">Page:</span>{' '}
                        <span className="text-gray-200">{counter.page}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400">Width:</span>{' '}
                        <span className="text-gray-200">
                          {counter.width === 1 ? '1/3 width' : 
                           counter.width === 2 ? '1/2 width' : 
                           counter.width === 3 ? 'Full width' : 'Default'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400">Created:</span>{' '}
                        <span className="text-gray-200">{counter.createdAt ? new Date(counter.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400">API:</span>{' '}
                        <span className="text-gray-200 truncate">{counter.apiEndpoint}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400">Value Field:</span>{' '}
                        <span className="text-gray-200">{counter.valueField}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400">Format:</span>{' '}
                        <span className="text-gray-200">{(counter.prefix || '') + 'value' + (counter.suffix ? ' ' + counter.suffix : '')}</span>
                      </div>
                    </div>
                  </div>
                  
                  {isPreviewOpen[counter.id] && (
                    <div className="border-t border-gray-700 p-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-3">Preview</h4>
                      <div className="bg-gray-900 rounded-md p-4">
                        <CounterRenderer counterConfig={counter} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Tables list
        <div className="space-y-4">
          {tables.length === 0 ? (
            <div className="text-center p-8 bg-gray-800/30 rounded-lg border border-gray-800">
              <p className="text-gray-400">No tables found matching the selected criteria.</p>
              <Link href="/admin/table-creator">
                <button className="mt-4 text-sm text-purple-400 hover:text-purple-300">
                  Create your first table
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {tables.map((table) => (
                <div key={table.id} className="bg-gray-800/40 rounded-lg overflow-hidden border border-gray-800 transition-all">
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium text-white">{table.title}</h3>
                        {table.description && (
                          <p className="mt-1 text-sm text-gray-400">{table.description}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => togglePreview(table.id)}
                          className="text-sm text-gray-400 hover:text-gray-300"
                        >
                          {isPreviewOpen[table.id] ? 'Hide Preview' : 'Preview'}
                        </button>
                        <Link href={`/admin/table-creator?editId=${table.id}`}>
                          <button className="text-sm text-purple-400 hover:text-purple-300">
                            Edit
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDeleteItem(table.id, 'table')}
                          className="text-sm text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-400">Page:</span>{' '}
                        <span className="text-gray-200">{table.page}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400">Created:</span>{' '}
                        <span className="text-gray-200">{table.createdAt ? new Date(table.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400">API:</span>{' '}
                        <span className="text-gray-200 truncate">{table.apiEndpoint}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-400">Columns:</span>{' '}
                        <span className="text-gray-200">{table.columns?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  {isPreviewOpen[table.id] && (
                    <div className="border-t border-gray-700 p-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-3">Preview</h4>
                      <div className="bg-gray-900 rounded-md p-4">
                        <TableRenderer tableConfig={table} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 