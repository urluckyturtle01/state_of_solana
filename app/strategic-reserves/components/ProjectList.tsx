"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import DataTable, { Column } from '@/app/components/shared/DataTable';
import { ChevronDownIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

// Project data interface
interface Project {
  id: string;
  name: string;
  ticker: string;
  category: string;
  liquidValue: number;
  totalValue: number;
  price: number;
  priceChange: number;
  marketCap: number;
  marketCapChange: number;
  volume24h: number;
  volumeChange: number;
  ratio: number;
  totalShares: number;
  shareValue: number;
  isLive: boolean;
  icon?: string;
}

// Category options
const CATEGORIES = [
  { value: 'all', label: 'All Categories', count: 0 },
  { value: 'public-companies', label: 'Public Companies', count: 0 },
  { value: 'foundations', label: 'Foundations', count: 0 },
  { value: 'defi-protocols', label: 'DeFi Protocols', count: 0 },
  { value: 'exchanges', label: 'Exchanges', count: 0 },
  { value: 'wallet-providers', label: 'Wallet Providers', count: 0 },
  { value: 'infrastructure', label: 'Infrastructure', count: 0 },
  { value: 'investment', label: 'Investment', count: 0 },
  { value: 'biotechnology', label: 'Biotechnology', count: 0 },
  { value: 'mining', label: 'Mining', count: 0 },
  { value: 'real-estate', label: 'Real Estate', count: 0 },
  { value: 'digital-assets', label: 'Digital Assets', count: 0 },
];

// Mock data - in a real app, this would come from an API
const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'Forward Industries Inc',
    ticker: 'FORD',
    category: 'public-companies',
    liquidValue: 6822000,
    totalValue: 1690000000,
    price: 3.9705,
    priceChange: 0.0,
    marketCap: 2670000000,
    marketCapChange: -5.88,
    volume24h: 31.54,
    volumeChange: -5.88,
    ratio: 1.6109,
    totalShares: 586400,
    shareValue: 18500000,
    isLive: true,
    icon: 'T'
  },
  {
    id: '2',
    name: 'Sharps Technology, Inc.',
    ticker: 'STSS',
    category: 'biotechnology',
    liquidValue: 2096000,
    totalValue: 400000000,
    price: 0.0816,
    priceChange: 0.0,
    marketCap: 453900000,
    marketCapChange: -0.89,
    volume24h: 17.75,
    volumeChange: -0.89,
    ratio: 0.8929,
    totalShares: 2400000,
    shareValue: 42900000,
    isLive: true,
    icon: '🔬'
  },
  {
    id: '3',
    name: 'Digital First Development',
    ticker: 'DFDV',
    category: 'digital-assets',
    liquidValue: 433785,
    totalValue: 78700000,
    price: 0.0000,
    priceChange: 0.0,
    marketCap: 201900000,
    marketCapChange: -7.65,
    volume24h: 0.42,
    volumeChange: -7.65,
    ratio: 341.1326,
    totalShares: 656000,
    shareValue: 274100,
    isLive: true,
    icon: '₿'
  },
  {
    id: '4',
    name: 'Solmate (Brera Holdings)',
    ticker: 'SOLM',
    category: 'defi-protocols',
    liquidValue: 1215000,
    totalValue: 300000000,
    price: 1.5611,
    priceChange: 0.0,
    marketCap: 21800000,
    marketCapChange: 225.49,
    volume24h: 29.36,
    volumeChange: 225.49,
    ratio: 0.0739,
    totalShares: 16100000,
    shareValue: 472700000,
    isLive: true,
    icon: '🔗'
  },
  {
    id: '5',
    name: 'Artelo Biosciences',
    ticker: 'ARTL',
    category: 'biotechnology',
    liquidValue: 850000,
    totalValue: 150000000,
    price: 2.3400,
    priceChange: 12.08,
    marketCap: 125000000,
    marketCapChange: 8.45,
    volume24h: 15.2,
    volumeChange: 8.45,
    ratio: 0.8333,
    totalShares: 53400000,
    shareValue: 125000000,
    isLive: true,
    icon: '🧬'
  },
  {
    id: '6',
    name: 'BIT Mining Limited',
    ticker: 'BTCM',
    category: 'mining',
    liquidValue: 2100000,
    totalValue: 500000000,
    price: 0.4500,
    priceChange: -2.15,
    marketCap: 320000000,
    marketCapChange: -2.15,
    volume24h: 45.8,
    volumeChange: -2.15,
    ratio: 0.64,
    totalShares: 711000000,
    shareValue: 320000000,
    isLive: true,
    icon: '⛏️'
  },
  {
    id: '7',
    name: 'Real Estate Technology',
    ticker: 'RET',
    category: 'real-estate',
    liquidValue: 1500000,
    totalValue: 250000000,
    price: 1.2500,
    priceChange: 5.67,
    marketCap: 180000000,
    marketCapChange: 5.67,
    volume24h: 22.3,
    volumeChange: 5.67,
    ratio: 0.72,
    totalShares: 144000000,
    shareValue: 180000000,
    isLive: true,
    icon: '🏢'
  },
  {
    id: '8',
    name: 'Foundation Treasury',
    ticker: 'FOUND',
    category: 'foundations',
    liquidValue: 5000000,
    totalValue: 1000000000,
    price: 5.0000,
    priceChange: 0.0,
    marketCap: 1000000000,
    marketCapChange: 0.0,
    volume24h: 0.0,
    volumeChange: 0.0,
    ratio: 1.0,
    totalShares: 200000000,
    shareValue: 1000000000,
    isLive: true,
    icon: '🏛️'
  },
  {
    id: '9',
    name: 'Exchange Reserve',
    ticker: 'EXCH',
    category: 'exchanges',
    liquidValue: 8000000,
    totalValue: 2000000000,
    price: 8.0000,
    priceChange: 1.25,
    marketCap: 2000000000,
    marketCapChange: 1.25,
    volume24h: 125.5,
    volumeChange: 1.25,
    ratio: 1.0,
    totalShares: 250000000,
    shareValue: 2000000000,
    isLive: true,
    icon: '💱'
  },
  {
    id: '10',
    name: 'Wallet Security',
    ticker: 'WALL',
    category: 'wallet-providers',
    liquidValue: 3200000,
    totalValue: 800000000,
    price: 3.2000,
    priceChange: -0.5,
    marketCap: 800000000,
    marketCapChange: -0.5,
    volume24h: 50.2,
    volumeChange: -0.5,
    ratio: 1.0,
    totalShares: 250000000,
    shareValue: 800000000,
    isLive: true,
    icon: '🔐'
  }
];

export default function ProjectList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isCategoryDropdownOpen && dropdownButtonRef.current) {
      const rect = dropdownButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isCategoryDropdownOpen]);

  // Calculate category counts
  const categoriesWithCounts = useMemo(() => {
    return CATEGORIES.map(category => {
      if (category.value === 'all') {
        return { ...category, count: MOCK_PROJECTS.length };
      }
      const count = MOCK_PROJECTS.filter(project => project.category === category.value).length;
      return { ...category, count };
    });
  }, []);

  // Filter projects based on search and category
  const filteredProjects = useMemo(() => {
    let filtered = MOCK_PROJECTS;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(project => project.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(project => 
        project.name.toLowerCase().includes(term) ||
        project.ticker.toLowerCase().includes(term) ||
        project.category.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [searchTerm, selectedCategory]);

  // Table columns configuration
  const columns: Column<Project>[] = [
    {
      key: 'name',
      header: 'Project',
      sortable: true,
      width: '200px',
      render: (project) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
              {project.icon || project.name.charAt(0)}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <Link 
                href={`/strategic-reserve-projects/${project.id}/info`}
                className="text-sm font-medium text-white hover:text-blue-400 transition-colors duration-200 truncate"
              >
                {project.name}
              </Link>
              {project.isLive && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                  LIVE
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-xs text-gray-400">
                {project.ticker}
              </p>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-700/50 text-gray-300">
                {categoriesWithCounts.find(cat => cat.value === project.category)?.label}
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'liquidValue',
      header: 'Liquid Value',
      sortable: true,
      align: 'right',
      format: { type: 'currency', decimals: 0 },
      render: (project) => (
        <div className="text-right">
          <p className="text-sm font-medium text-white">
            ${(project.liquidValue / 1000000).toFixed(3)}M
          </p>
          <p className="text-xs text-gray-400">Liquid</p>
        </div>
      )
    },
    {
      key: 'totalValue',
      header: 'Total Value',
      sortable: true,
      align: 'right',
      format: { type: 'currency', decimals: 0 },
      render: (project) => (
        <div className="text-right">
          <p className="text-sm font-medium text-white">
            ${(project.totalValue / 1000000000).toFixed(1)}B
          </p>
        </div>
      )
    },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      align: 'right',
      format: { type: 'number', decimals: 4 },
      render: (project) => (
        <div className="text-right">
          <p className="text-sm font-medium text-white">
            {project.price.toFixed(4)}
          </p>
          <p className={`text-xs ${project.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {project.priceChange >= 0 ? '+' : ''}{project.priceChange.toFixed(1)}%
          </p>
        </div>
      )
    },
    {
      key: 'marketCap',
      header: 'Market Cap',
      sortable: true,
      align: 'right',
      format: { type: 'currency', decimals: 0 },
      render: (project) => (
        <div className="text-right">
          <p className="text-sm font-medium text-white">
            ${(project.marketCap / 1000000000).toFixed(1)}B
          </p>
          <p className={`text-xs ${project.marketCapChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            (${project.volume24h.toFixed(2)} {project.marketCapChange >= 0 ? '+' : ''}{project.marketCapChange.toFixed(2)}%)
          </p>
        </div>
      )
    },
    {
      key: 'volume24h',
      header: '24h Volume',
      sortable: true,
      align: 'right',
      format: { type: 'currency', decimals: 2 },
      render: (project) => (
        <div className="text-right">
          <p className="text-sm font-medium text-white">
            ${project.volume24h.toFixed(2)}M
          </p>
          <p className={`text-xs ${project.volumeChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {project.volumeChange >= 0 ? '+' : ''}{project.volumeChange.toFixed(2)}%
          </p>
        </div>
      )
    },
    {
      key: 'ratio',
      header: 'Ratio',
      sortable: true,
      align: 'right',
      format: { type: 'number', decimals: 4 },
      render: (project) => (
        <div className="text-right">
          <p className="text-sm font-medium text-white">
            {project.ratio.toFixed(4)}x
          </p>
        </div>
      )
    },
    {
      key: 'shareValue',
      header: 'Total Value',
      sortable: true,
      align: 'right',
      format: { type: 'currency', decimals: 0 },
      render: (project) => (
        <div className="text-right">
          <p className="text-sm font-medium text-white">
            ${(project.shareValue / 1000000).toFixed(1)}M
          </p>
          <p className="text-xs text-gray-400">
            ({project.totalShares.toLocaleString()} shares)
          </p>
        </div>
      )
    }
  ];

  const selectedCategoryLabel = categoriesWithCounts.find(cat => cat.value === selectedCategory)?.label || 'All Categories';

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-gray-800/50 py-2 px-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Title and stats */}
          <div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <span>{filteredProjects.length} projects</span>
              <span>•</span>
              <span>${(filteredProjects.reduce((sum, p) => sum + p.totalValue, 0) / 1000000000).toFixed(1)}B total value</span>
              <span>•</span>
              <span>${(filteredProjects.reduce((sum, p) => sum + p.liquidValue, 0) / 1000000).toFixed(1)}M liquid</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-10 py-2 text-sm bg-gray-900/50 border border-[0.5px] border-gray-800 rounded-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="relative">
              <button
                ref={dropdownButtonRef}
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className="flex items-center justify-between w-full sm:w-48 px-3 py-2 text-sm bg-gray-900/50 border border-[0.5px] border-gray-800 rounded-sm text-white hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200"
              >
                <span className="truncate">{selectedCategoryLabel}</span>
                <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-gray-800/50 overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredProjects}
          keyExtractor={(project) => project.id}
          searchTerm={searchTerm}
          className="min-w-full"
          containerClassName="overflow-x-auto"
          headerClassName="bg-gray-900/30"
          rowClassName={(index) => index % 2 === 0 ? 'bg-black/20' : 'bg-gray-900/10'}
          cellClassName="px-4 py-3 text-sm"
          variant="striped"
          pagination={{
            enabled: true,
            rowsPerPage: 10
          }}
        />
      </div>

      {/* Portal-based Dropdown */}
      {mounted && isCategoryDropdownOpen && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsCategoryDropdownOpen(false)}
          />
          
          {/* Dropdown */}
          <div
            className="fixed z-[9999] bg-gray-900/98 backdrop-blur-md border border-gray-600/50 rounded-lg shadow-2xl shadow-black/50"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: Math.max(dropdownPosition.width, 256),
              maxWidth: '200px'
            }}
          >
            <div className="py-1 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              {categoriesWithCounts.map((category) => (
                <button
                  key={category.value}
                  onClick={() => {
                    setSelectedCategory(category.value);
                    setIsCategoryDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors duration-150 ${
                    selectedCategory === category.value
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{category.label}</span>
                    
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .scrollbar-thin {
          scrollbar-width: thin;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(75, 85, 99, 0.8);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.9);
        }
      `}</style>
    </div>
  );
}
