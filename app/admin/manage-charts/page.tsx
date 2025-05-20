"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllChartConfigs, deleteChartConfig, getChartConfigsByPage } from '../utils';
import { AVAILABLE_PAGES, ChartConfig } from '../types';
import Button from '../components/Button';
import dynamic from 'next/dynamic';

// Dynamic import DashboardRenderer to avoid SSR issues
const DashboardRenderer = dynamic(() => import('../components/dashboard-renderer'), {
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

export default function ManageChartsPage() {
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<string>('');
  const [selectedPage, setSelectedPage] = useState<string>('all');
  const [availablePages, setAvailablePages] = useState<Array<{id: string, name: string, path: string}>>([]);
  const [isClient, setIsClient] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<Record<string, boolean>>({});

  // Update available pages when menu selection changes
  useEffect(() => {
    if (!selectedMenu) {
      setAvailablePages([]);
      return;
    }
    
    // Define pages for each menu
    switch (selectedMenu) {
      case 'overview':
        setAvailablePages([
          { id: 'dashboard', name: 'User Activity', path: '/dashboard' },
          { id: 'network-usage', name: 'Network Usage', path: '/network-usage' },
          { id: 'protocol-rev', name: 'Protocol Revenue', path: '/protocol-rev' },
          { id: 'market-dynamics', name: 'Market Dynamics', path: '/market-dynamics' }
        ]);
        break;
      case 'dex':
        setAvailablePages([
          { id: 'summary', name: 'Summary', path: '/dex/summary' },
          { id: 'volume', name: 'Volume', path: '/dex/volume' },
          { id: 'tvl', name: 'TVL', path: '/dex/tvl' },
          { id: 'traders', name: 'Traders', path: '/dex/traders' },
          { id: 'aggregators', name: 'DEX Aggregators', path: '/dex/aggregators' }
        ]);
        break;
      case 'rev':
        setAvailablePages([
          { id: 'overview', name: 'Summary', path: '/rev' },
          { id: 'cost-capacity', name: 'Cost & Capacity', path: '/rev/cost-capacity' },
          { id: 'issuance-burn', name: 'Issuance & Burn', path: '/rev/issuance-burn' },
          { id: 'total-economic-value', name: 'Total Economic Value', path: '/rev/total-economic-value' },
          { id: 'breakdown', name: 'Breakdown', path: '/rev/breakdown' }
        ]);
        break;
      case 'stablecoins':
        setAvailablePages([
          { id: 'stablecoin-usage', name: 'Stablecoin Usage', path: '/stablecoins/stablecoin-usage' },
          { id: 'transaction-activity', name: 'Transaction Activity', path: '/stablecoins/transaction-activity' },
          { id: 'liquidity-velocity', name: 'Liquidity Velocity', path: '/stablecoins/liquidity-velocity' },
          { id: 'mint-burn', name: 'Mint & Burn', path: '/stablecoins/mint-burn' },
          { id: 'platform-exchange', name: 'Platform & Exchange', path: '/stablecoins/platform-exchange' },
          { id: 'tvl', name: 'TVL', path: '/stablecoins/tvl' }
        ]);
        break;
      case 'protocol-revenue':
        setAvailablePages([
          { id: 'summary', name: 'Summary', path: '/protocol-revenue/summary' },
          { id: 'total', name: 'Total', path: '/protocol-revenue/total' },
          { id: 'dex-ecosystem', name: 'DEX Ecosystem', path: '/protocol-revenue/dex-ecosystem' },
          { id: 'nft-ecosystem', name: 'NFT Ecosystem', path: '/protocol-revenue/nft-ecosystem' },
          { id: 'depin', name: 'DePin', path: '/protocol-revenue/depin' }
        ]);
        break;
      default:
        setAvailablePages([]);
    }
    
    // Reset the page selection when menu changes
    setSelectedPage('all');
  }, [selectedMenu]);

  // Load charts from local storage when component mounts or filters change
  useEffect(() => {
    setIsClient(true);
    
    const loadCharts = async () => {
      try {
        let allCharts;
        if (selectedPage === 'all' && !selectedMenu) {
          // All charts from all menus
          allCharts = await getAllChartConfigs();
        } else if (selectedPage === 'all' && selectedMenu) {
          // All charts from selected menu
          const menuCharts = await getAllChartConfigs();
          allCharts = menuCharts.filter(chart => {
            // Check if chart page matches any page in the selected menu
            return availablePages.some(page => page.id === chart.page);
          });
        } else {
          // Specific page charts
          allCharts = await getChartConfigsByPage(selectedPage);
        }
        
        // Ensure we're always setting an array, even if the API returns something else
        setCharts(Array.isArray(allCharts) ? allCharts : []);
      } catch (error) {
        console.error('Error loading charts:', error);
        setCharts([]);
      }
    };
    
    loadCharts();
  }, [selectedMenu, selectedPage, availablePages]);

  // Handle chart deletion
  const handleDeleteChart = async (chartId: string) => {
    if (window.confirm('Are you sure you want to delete this chart?')) {
      try {
        const success = await deleteChartConfig(chartId);
        if (success) {
          setCharts(prevCharts => prevCharts.filter(chart => chart.id !== chartId));
          // Also update the isPreviewOpen state
          setIsPreviewOpen(prev => {
            const updated = { ...prev };
            delete updated[chartId];
            return updated;
          });
        } else {
          throw new Error("Failed to delete chart");
        }
      } catch (error) {
        console.error('Error deleting chart:', error);
        alert(`Failed to delete chart: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  // Toggle chart preview
  const togglePreview = (chartId: string) => {
    setIsPreviewOpen(prev => ({
      ...prev,
      [chartId]: !prev[chartId]
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
          <p className="text-gray-400">Loading charts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen text-gray-100 sm:pt-8">
      <div className="border-b border-gray-800 pb-5 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-medium text-white tracking-tight">Manage Charts</h1>
          <p className="mt-2 text-sm text-gray-600">View, preview, and manage your analytics visualizations</p>
        </div>
        <Link href="/admin/chart-creator">
          <Button variant="primary" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
            Create New Chart
          </Button>
        </Link>
      </div>
      
      {/* Filter section */}
      <div className="flex flex-row gap-4 mb-6">
        <div className="mb-4">
          <select
            id="menuFilter"
            value={selectedMenu}
            onChange={handleMenuChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-gray-300 bg-gray-800 rounded-md border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm sm:text-sm"
          >
            <option value="">All Menus</option>
            <option value="overview">Overview</option>
            <option value="dex">DEX</option>
            <option value="rev">REV</option>
            <option value="stablecoins">Stablecoins</option>
            <option value="protocol-revenue">Protocol Revenue</option>
          </select>
        </div>
        
        <div className="mb-6">
          <select
            id="pageFilter"
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-gray-300 bg-gray-800 rounded-md border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm sm:text-sm"
            disabled={!selectedMenu && selectedPage !== 'all'}
          >
            <option value="all">All Pages</option>
            {availablePages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* No charts message */}
      {charts.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 p-8 rounded-xl text-center shadow-lg">
          <svg className="h-12 w-12 text-gray-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-white mb-2">No charts found</h3>
          <p className="text-gray-400 mb-4">
            {selectedMenu === '' && selectedPage === 'all'
              ? "You haven't created any charts yet."
              : selectedMenu !== '' && selectedPage === 'all'
                ? `No charts found for the selected menu: ${selectedMenu}`
                : `No charts found for the selected page: ${availablePages.find(p => p.id === selectedPage)?.name || selectedPage}`}
          </p>
          <Link href="/admin/chart-creator">
            <Button variant="primary" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Create your first chart
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {charts.map((chart) => (
            <div key={chart.id} className="bg-gray-800 border border-gray-700 shadow-lg rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-white">{chart.title}</h3>
                  <p className="text-sm text-gray-400">
                    {chart.subtitle || 'No subtitle'} • 
                    <span className="ml-1">
                      {(() => {
                        // Find the page info
                        const allPages = [...AVAILABLE_PAGES, ...availablePages] as Array<{id: string, name: string, path: string}>;
                        const pageInfo = allPages.find(p => p.id === chart.page);
                        return pageInfo ? pageInfo.name : chart.page;
                      })()}
                    </span>
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => togglePreview(chart.id)}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600"
                  >
                    {isPreviewOpen[chart.id] ? 'Hide Preview' : 'Show Preview'}
                  </Button>
                  <Link href={`/admin/chart-creator?editId=${chart.id}`}>
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      Edit
                    </Button>
                  </Link>
                  <Link 
                    href={(() => {
                      // Find the page path
                      const allPages = [...AVAILABLE_PAGES, ...availablePages] as Array<{id: string, name: string, path: string}>;
                      const pageInfo = allPages.find(p => p.id === chart.page);
                      return pageInfo?.path || '#';
                    })()}
                    target="_blank"
                  >
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      View on Page
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteChart(chart.id)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete
                  </Button>
                </div>
              </div>
              
              {/* Chart details */}
              <div className="p-4 bg-gray-850 text-sm border-b border-gray-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="font-medium text-gray-400">Type:</span>{' '}
                    <span className="text-gray-200">{chart.chartType}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-400">Created:</span>{' '}
                    <span className="text-gray-200">{new Date(chart.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-400">X-Axis:</span>{' '}
                    <span className="text-gray-200">{chart.dataMapping?.xAxis || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-400">Y-Axis:</span>{' '}
                    <span className="text-gray-200">{chart.dataMapping ? formatYAxisValue(chart.dataMapping.yAxis) : 'N/A'}</span>
                  </div>
                </div>
              </div>
              
              {/* Chart preview */}
              {isPreviewOpen[chart.id] && (
                <div className="p-4 border-t border-gray-700 bg-gray-800">
                  <div className="h-[500px] overflow-auto">
                    <DashboardRenderer 
                      pageId="preview" 
                      overrideCharts={[chart]}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 