"use client";

import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { MENU_OPTIONS, MENU_PAGES, findMenuForPage } from '../../admin/config/menuPages';
import { useState, useMemo } from 'react';

// API Configuration interface
interface ApiConfig {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  columns: string[];
  chartTitle?: string;
  apiKey?: string;
  additionalOptions?: any;
  page?: string;
}

// Hierarchical structure interfaces
interface PageGroup {
  pageId: string;
  pageName: string;
  apis: ApiConfig[];
}

interface MenuGroup {
  menuId: string;
  menuName: string;
  pages: PageGroup[];
}

interface ApiListProps {
  apis: ApiConfig[];
  expandedApis: Set<string>;
  selectedColumns: Record<string, Set<string>>;
  selectedParameters: Record<string, Record<string, string>>;
  onToggleApiExpansion: (apiId: string) => void;
  onToggleColumnSelection: (apiId: string, column: string) => void;
  onParameterChange: (apiId: string, paramName: string, value: string) => void;
}

const ApiList: React.FC<ApiListProps> = ({
  apis,
  expandedApis,
  selectedColumns,
  selectedParameters,
  onToggleApiExpansion,
  onToggleColumnSelection,
  onParameterChange,
}) => {
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());

  // Group APIs by menu and page
  const groupedApis = useMemo(() => {
    const menuGroups: MenuGroup[] = [];
    
    // Create a map to track APIs by menu and page
    const menuMap = new Map<string, Map<string, ApiConfig[]>>();
    
    // Group APIs by their page and then by menu
    apis.forEach(api => {
      if (!api.page) {
        console.log('API without page:', api);
        return;
      }
      
      // Find which menu this page belongs to
      const menuId = findMenuForPage(api.page);
      if (!menuId) {
        console.log('Page not found in menu config:', api.page);
        return;
      }
      
      // Initialize menu map if needed
      if (!menuMap.has(menuId)) {
        menuMap.set(menuId, new Map());
      }
      
      // Initialize page array if needed
      const menuPages = menuMap.get(menuId)!;
      if (!menuPages.has(api.page)) {
        menuPages.set(api.page, []);
      }
      
      // Add API to the page
      menuPages.get(api.page)!.push(api);
    });
    
    // Convert map structure to MenuGroup array
    MENU_OPTIONS.forEach(menuOption => {
      const menuPages = menuMap.get(menuOption.id);
      if (menuPages && menuPages.size > 0) {
        const pages: PageGroup[] = [];
        
        // Get pages for this menu from config
        const menuPagesConfig = MENU_PAGES[menuOption.id] || [];
        
        menuPagesConfig.forEach(pageConfig => {
          const apis = menuPages.get(pageConfig.id) || [];
          if (apis.length > 0) {
            pages.push({
              pageId: pageConfig.id,
              pageName: pageConfig.name,
              apis: apis
            });
          }
        });
        
        if (pages.length > 0) {
          menuGroups.push({
            menuId: menuOption.id,
            menuName: menuOption.name,
            pages: pages
          });
        }
      }
    });
    
    return menuGroups;
  }, [apis]);

  const toggleMenuExpansion = (menuId: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuId)) {
        newSet.delete(menuId);
      } else {
        newSet.add(menuId);
      }
      return newSet;
    });
  };

  const togglePageExpansion = (pageId: string) => {
    setExpandedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageId)) {
        newSet.delete(pageId);
      } else {
        newSet.add(pageId);
      }
      return newSet;
    });
  };

  const getTotalApiCount = () => {
    return groupedApis.reduce((total, menu) => 
      total + menu.pages.reduce((pageTotal, page) => pageTotal + page.apis.length, 0), 0
    );
  };

  return (
    <div className="w-80 bg-black/40 border-r border-gray-900/50 flex flex-col">
      <div className="pl-4 pb-2 pt-2 border-b border-gray-900/50">
        <p className="text-xs text-gray-500 mt-1">{getTotalApiCount()} APIs found</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-4">
          {groupedApis.map((menu, menuIndex) => (
            <div key={menu.menuId} className="bg-gray-900/30 rounded-md overflow-hidden border border-gray-800/50">
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-800/40 transition-colors"
                onClick={() => toggleMenuExpansion(menu.menuId)}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-500">
                    {menu.menuName}
                  </span>
                  
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-700">{menu.pages.length} pages</span>
                  {expandedMenus.has(menu.menuId) ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                  )}
                </div>
              </div>
              
              {expandedMenus.has(menu.menuId) && (
                <div className="pl-0 pb-0 pr-2">
                  <div className="space-y-0 mt-0">
                    {menu.pages.map((page, pageIndex) => (
                      <div key={page.pageId} className="overflow-hidden border-t border-gray-800/30 ml-2">
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-800/40 transition-colors"
                          onClick={() => togglePageExpansion(page.pageId)}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-500">
                              {page.pageName}
                            </span>
                            
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-700">{page.apis.length} APIs</span>
                            {expandedPages.has(page.pageId) ? (
                              <ChevronDownIcon className="w-4 h-4 text-gray-600" />
                            ) : (
                              <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                            )}
                          </div>
                        </div>
                        
                        {expandedPages.has(page.pageId) && (
                          <div className="px-0 pb-2 border-t border-gray-800/30">
                            <div className="space-y-2 mt-2">
                              {page.apis.map((api, apiIndex) => (
                                <div key={api.id} className=" rounded-md overflow-hidden border border-gray-800/50 ml-0">
                                  <div
                                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-800/40 transition-colors"
                                    onClick={() => onToggleApiExpansion(api.id)}
                                  >
                                    <div className="flex items-center space-x-2">
                                      {/* Chart Title */}
                                      {api.chartTitle && (
                                      <span className="text-sm font-medium text-gray-500">
                                        {api.chartTitle}
                                      </span>
                                      )}
                                      
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-xs text-gray-700">{api.columns.length} cols</span>
                                      {expandedApis.has(api.id) ? (
                                        <ChevronDownIcon className="w-4 h-4 text-gray-600" />
                                      ) : (
                                        <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                                      )}
                                    </div>
                                  </div>
                                  
                                  {expandedApis.has(api.id) && (
                                    <div className="px-3 pb-3 border-t border-gray-800/30">
                                      
                                      
                                      
                                      {/* Parameter Controls */}
                                      {api.additionalOptions?.filters && (
                                        <div className="mb-3">
                                          
                                          <div className="space-y-2">
                                            {/* Time Filter */}
                                            {api.additionalOptions.filters.timeFilter?.paramName && (
                                              <div>
                                                <label className="text-xs text-gray-700/70 block mt-2 mb-1">
                                                  {api.additionalOptions.filters.timeFilter.paramName}
                                                </label>
                                                <select
                                                  className="text-xs bg-gray-900/40 border-[0.5px] border-gray-800/60 rounded px-1 py-1 text-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                                  value={selectedParameters[api.id]?.[api.additionalOptions.filters.timeFilter.paramName] || api.additionalOptions.filters.timeFilter.options[0]}
                                                  onChange={(e) => onParameterChange(api.id, api.additionalOptions.filters.timeFilter.paramName, e.target.value)}
                                                >
                                                  {api.additionalOptions.filters.timeFilter.options.map((option: string) => (
                                                    <option key={option} value={option}>
                                                      {option === 'D' ? 'Daily' :
                                                       option === 'W' ? 'Weekly' :
                                                       option === 'M' ? 'Monthly' :
                                                       option === 'Q' ? 'Quarterly' :
                                                       option === 'Y' ? 'Yearly' : option}
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>
                                            )}
                                            
                                            {/* Currency Filter */}
                                            {api.additionalOptions.filters.currencyFilter?.paramName && (
                                              <div>
                                                <label className="text-xs text-gray-700/70 block mt-2 mb-1">
                                                  {api.additionalOptions.filters.currencyFilter.paramName}
                                                </label>
                                                <select
                                                  className="text-xs bg-gray-900/40 border-[0.5px] border-gray-800/60 rounded px-1 py-1 text-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                                  value={selectedParameters[api.id]?.[api.additionalOptions.filters.currencyFilter.paramName] || api.additionalOptions.filters.currencyFilter.options[0]}
                                                  onChange={(e) => onParameterChange(api.id, api.additionalOptions.filters.currencyFilter.paramName, e.target.value)}
                                                >
                                                  {api.additionalOptions.filters.currencyFilter.options.map((option: string) => (
                                                    <option key={option} value={option}>
                                                      {option}
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Columns */}
                                      <div className="space-y-1.5 max-h-32 mt-2 overflow-y-auto">
                                        {api.columns.length > 0 ? (
                                          api.columns.map((column) => (
                                            <label key={column} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-800/20 rounded px-1 py-0.5">
                                              <input
                                                type="checkbox"
                                                className="appearance-none w-4 h-4 rounded border border-gray-700/80 bg-gray-900/40 checked:bg-blue-900 checked:border-blue-900  relative checked:after:content-['✓'] checked:after:text-white checked:after:text-xs checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center"
                                                checked={selectedColumns[api.id]?.has(column) || false}
                                                onChange={() => onToggleColumnSelection(api.id, column)}
                                              />
                                              <span className="text-gray-500 text-xs">{column}</span>
                                            </label>
                                          ))
                                        ) : (
                                          <div className="text-xs text-gray-500 italic py-2">
                                            No columns detected
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ApiList; 