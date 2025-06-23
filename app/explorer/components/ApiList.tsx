"use client";

import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { MENU_OPTIONS, MENU_PAGES, findMenuForPage } from '../../admin/config/menuPages';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';

// Simple virtual list component
interface VirtualListProps {
  height: number;
  itemCount: number;
  itemSize: (index: number) => number;
  children: ({ index, style }: { index: number; style: React.CSSProperties }) => React.ReactNode;
}

const VirtualList: React.FC<VirtualListProps> = ({ height, itemCount, itemSize, children }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Calculate visible range
  const { startIndex, endIndex, totalHeight } = useMemo(() => {
    let accumulatedHeight = 0;
    let start = 0;
    let end = 0;
    let total = 0;
    
    // Find start index
    for (let i = 0; i < itemCount; i++) {
      const itemHeight = itemSize(i);
      if (accumulatedHeight + itemHeight > scrollTop) {
        start = i;
        break;
      }
      accumulatedHeight += itemHeight;
    }
    
    // Find end index and calculate total height
    accumulatedHeight = 0;
    for (let i = 0; i < itemCount; i++) {
      const itemHeight = itemSize(i);
      total += itemHeight;
      
      if (accumulatedHeight + itemHeight > scrollTop + height + 200) { // Add buffer
        end = Math.min(i + 1, itemCount);
        break;
      } else if (i === itemCount - 1) {
        end = itemCount;
      }
      accumulatedHeight += itemHeight;
    }
    
    return { startIndex: start, endIndex: end, totalHeight: total };
  }, [scrollTop, height, itemCount, itemSize]);
  
  // Calculate offset for visible items
  const offsetY = useMemo(() => {
    let offset = 0;
    for (let i = 0; i < startIndex; i++) {
      offset += itemSize(i);
    }
    return offset;
  }, [startIndex, itemSize]);
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  // Render visible items
  const visibleItems = [];
  let currentOffset = offsetY;
  
  for (let i = startIndex; i < endIndex; i++) {
    const itemHeight = itemSize(i);
    visibleItems.push(
      children({
        index: i,
        style: {
          position: 'absolute',
          top: currentOffset,
          left: 0,
          right: 0,
          height: itemHeight,
        }
      })
    );
    currentOffset += itemHeight;
  }
  
  return (
    <div
      ref={containerRef}
      style={{ height, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  );
};

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

// Virtualization item types
interface VirtualItem {
  type: 'menu' | 'page' | 'api' | 'apiDetails';
  id: string;
  data: any;
  level: number;
  parentId?: string;
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
  const [searchQuery, setSearchQuery] = useState('');

  // Create a cached lookup map for page-to-menu mapping (O(1) lookup)
  const pageToMenuMap = useMemo(() => {
    const map = new Map<string, string>();
    Object.entries(MENU_PAGES).forEach(([menuId, pages]) => {
      pages.forEach(page => map.set(page.id, menuId));
    });
    return map;
  }, []);

  // Filter APIs based on search query
  const filteredApis = useMemo(() => {
    if (!searchQuery.trim()) return apis;
    
    return apis.filter(api => 
      api.chartTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.endpoint?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [apis, searchQuery]);

  // Group APIs by menu and page
  const groupedApis = useMemo(() => {
    const menuGroups: MenuGroup[] = [];
    
    // Create a map to track APIs by menu and page
    const menuMap = new Map<string, Map<string, ApiConfig[]>>();
    
    // Group APIs by their page and then by menu
    filteredApis.forEach(api => {
      if (!api.page) {
        return;
      }
      
      // Find which menu this page belongs to using cached lookup (O(1))
      const menuId = pageToMenuMap.get(api.page);
      if (!menuId) {
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
  }, [filteredApis, pageToMenuMap]);

  // Create flattened list for virtualization
  const virtualItems = useMemo(() => {
    const items: VirtualItem[] = [];
    
    groupedApis.forEach(menu => {
      // Add menu item
      items.push({
        type: 'menu',
        id: menu.menuId,
        data: menu,
        level: 0
      });
      
      // Add pages and APIs if menu is expanded
      if (expandedMenus.has(menu.menuId)) {
        menu.pages.forEach(page => {
          // Add page item
          items.push({
            type: 'page',
            id: page.pageId,
            data: page,
            level: 1,
            parentId: menu.menuId
          });
          
          // Add APIs if page is expanded
          if (expandedPages.has(page.pageId)) {
            page.apis.forEach(api => {
              // Add API item
              items.push({
                type: 'api',
                id: api.id,
                data: api,
                level: 2,
                parentId: page.pageId
              });
              
              // Add API details if expanded
              if (expandedApis.has(api.id)) {
                items.push({
                  type: 'apiDetails',
                  id: `${api.id}_details`,
                  data: api,
                  level: 3,
                  parentId: api.id
                });
              }
            });
          }
        });
      }
    });
    
    return items;
  }, [groupedApis, expandedMenus, expandedPages, expandedApis]);

  // Calculate dynamic height for each item
  const getItemSize = useCallback((index: number) => {
    const item = virtualItems[index];
    if (!item) return 40;

    switch (item.type) {
      case 'menu':
        return 50; // Menu items are larger
      case 'page':
        return 32; // Page items are medium
      case 'api':
        return 32; // API items are medium
      case 'apiDetails':
        const api = item.data as ApiConfig;
        let height = 15; // Base height for details container
        
        // Add height for parameters
        if (api.additionalOptions?.filters) {
          if (api.additionalOptions.filters.timeFilter?.paramName) {
            height += 50; // Height for time filter
          }
          if (api.additionalOptions.filters.currencyFilter?.paramName) {
            height += 50; // Height for currency filter
          }
        }
        
        // Add height for columns (more compact calculation)
        const columnCount = api.columns.length;
        if (columnCount > 0) {
          height += 20; // Header height
          height += Math.min(columnCount * 24, 200); // Max 200px for columns, 24px per column
        } else {
          height += 40; // "No columns detected" message
        }
        
        return height;
      default:
        return 40;
    }
  }, [virtualItems]);

  const toggleMenuExpansion = useCallback((menuId: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuId)) {
        newSet.delete(menuId);
      } else {
        newSet.add(menuId);
      }
      return newSet;
    });
  }, []);

  const togglePageExpansion = useCallback((pageId: string) => {
    setExpandedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageId)) {
        newSet.delete(pageId);
      } else {
        newSet.add(pageId);
      }
      return newSet;
    });
  }, []);

  const getTotalApiCount = useCallback(() => {
    return groupedApis.reduce((total, menu) => 
      total + menu.pages.reduce((pageTotal, page) => pageTotal + page.apis.length, 0), 0
    );
  }, [groupedApis]);

  // Virtualized row renderer
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = virtualItems[index];
    if (!item) return null;

    const marginLeft = item.level * 12; // 12px per level

    switch (item.type) {
      case 'menu':
        const menu = item.data as MenuGroup;
        return (
          <div style={style}>
            <div className="bg-gray-900/40 rounded-lg overflow-hidden border border-gray-800/60 mx-2 mb-2">
              <div
                className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-800/50 transition-colors border-l-3 border-blue-500/60"
                onClick={() => toggleMenuExpansion(menu.menuId)}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-gray-200">
                    {menu.menuName}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400 bg-gray-800/50 px-1.5 py-0.5 rounded-full">
                    {menu.pages.length}
                  </span>
                  {expandedMenus.has(menu.menuId) ? (
                    <ChevronDownIcon className="w-3 h-3 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="w-3 h-3 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'page':
        const page = item.data as PageGroup;
        return (
          <div style={style}>
            <div style={{ marginLeft }} className="mx-2">
              <div
                className="flex items-center justify-between py-1 px-2 cursor-pointer hover:bg-gray-700/30 transition-colors rounded-sm"
                onClick={() => togglePageExpansion(page.pageId)}
              >
                <span className="text-xs text-gray-400 font-medium">
                  {page.pageName}
                </span>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-500">{page.apis.length}</span>
                  {expandedPages.has(page.pageId) ? (
                    <ChevronDownIcon className="w-3 h-3 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="w-3 h-3 text-gray-500" />
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'api':
        const api = item.data as ApiConfig;
        return (
          <div style={style}>
            <div style={{ marginLeft }} className="mx-2">
              <div
                className="flex items-center justify-between py-1 px-2 cursor-pointer hover:bg-gray-600/30 transition-colors rounded-sm"
                onClick={() => onToggleApiExpansion(api.id)}
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="7" height="7" strokeWidth="1.5"/>
                    <rect x="14" y="3" width="7" height="7" strokeWidth="1.5"/>
                    <rect x="3" y="14" width="7" height="7" strokeWidth="1.5"/>
                    <rect x="14" y="14" width="7" height="7" strokeWidth="1.5"/>
                  </svg>
                  {api.chartTitle && (
                    <span className="text-xs text-gray-400 truncate">
                      {api.chartTitle}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <span className="text-xs text-gray-600">{api.columns.length}</span>
                  {expandedApis.has(api.id) ? (
                    <ChevronDownIcon className="w-3 h-3 text-gray-600" />
                  ) : (
                    <ChevronRightIcon className="w-3 h-3 text-gray-600" />
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'apiDetails':
        const apiDetails = item.data as ApiConfig;
        return (
          <div style={style}>
            <div style={{ marginLeft }} className="mx-2">
              <div className="p-2 bg-gray-700/20 rounded-sm border-l border-gray-600/30">
                {/* Parameters */}
                {apiDetails.additionalOptions?.filters && (
                  <div className="mb-2">
                    
                    <div className="space-y-1">
                      {apiDetails.additionalOptions.filters.timeFilter?.paramName && (
                        <div>
                         {/* <label className="text-xs text-gray-600 block mb-0.5">
                            {apiDetails.additionalOptions.filters.timeFilter.paramName}
                          </label> */}
                          <select
                            className="text-xs bg-gray-800/60 border border-gray-600/60 rounded px-1.5 py-1 text-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-full"
                            value={selectedParameters[apiDetails.id]?.[apiDetails.additionalOptions.filters.timeFilter.paramName] || apiDetails.additionalOptions.filters.timeFilter.options[0]}
                            onChange={(e) => onParameterChange(apiDetails.id, apiDetails.additionalOptions.filters.timeFilter.paramName, e.target.value)}
                          >
                            {apiDetails.additionalOptions.filters.timeFilter.options.map((option: string) => (
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
                      
                      {apiDetails.additionalOptions.filters.currencyFilter?.paramName && (
                        <div>
                          <label className="text-xs text-gray-600 block mb-0.5">
                            {apiDetails.additionalOptions.filters.currencyFilter.paramName}
                          </label>
                          <select
                            className="text-xs bg-gray-800/60 border border-gray-600/60 rounded px-1.5 py-1 text-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-full"
                            value={selectedParameters[apiDetails.id]?.[apiDetails.additionalOptions.filters.currencyFilter.paramName] || apiDetails.additionalOptions.filters.currencyFilter.options[0]}
                            onChange={(e) => onParameterChange(apiDetails.id, apiDetails.additionalOptions.filters.currencyFilter.paramName, e.target.value)}
                          >
                            {apiDetails.additionalOptions.filters.currencyFilter.options.map((option: string) => (
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
                <div>
                  <div className="text-xs text-gray-500 mb-1">Columns</div>
                  <div className="space-y-0.5 max-h-48 overflow-y-auto">
                    {apiDetails.columns.length > 0 ? (
                      apiDetails.columns.map((column) => (
                        <label key={column} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-600/20 rounded px-1 py-0.5 transition-colors">
                          <input
                            type="checkbox"
                            className="appearance-none w-3 h-3 rounded border border-gray-600/80 bg-gray-800/60 checked:bg-blue-600 checked:border-blue-600 relative checked:after:content-['✓'] checked:after:text-white checked:after:text-xs checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center transition-colors"
                            checked={selectedColumns[apiDetails.id]?.has(column) || false}
                            onChange={() => onToggleColumnSelection(apiDetails.id, column)}
                          />
                          <span className="text-xs text-gray-400">{column}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-600 italic py-1 text-center">
                        No columns detected
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  }, [virtualItems, expandedMenus, expandedPages, expandedApis, selectedColumns, selectedParameters, toggleMenuExpansion, togglePageExpansion, onToggleApiExpansion, onToggleColumnSelection, onParameterChange]);

  return (
    <div className="w-80 bg-black/40 border-r border-gray-900/50 flex flex-col">
      <p className="text-xs text-gray-500 ml-3 mt-2">{getTotalApiCount()} Tables found</p>
      {/* Search Bar */}
      <div className="p-3 border-b border-gray-900/50">
        <div className="relative">
          <input
            type="text"
            placeholder="Search tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-900/60 border border-gray-800/60 rounded-md text-gray-300 placeholder-gray-500 focus:border-gray-600 focus:ring-1 focus:ring-gray-600 focus:outline-none"
          />
          <svg className="absolute right-3 top-2.5 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      {/* Custom Virtual List */}
      <div className="flex-1">
        <VirtualList
          height={600} // Adjust based on your container height
          itemCount={virtualItems.length}
          itemSize={getItemSize}
        >
          {Row}
        </VirtualList>
      </div>
    </div>
  );
};

export default ApiList; 