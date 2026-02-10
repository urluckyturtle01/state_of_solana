"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface ChartItem {
  id: string;
  title: string;
  subtitle?: string;
  page: string;
  section?: string;
  chartType: string;
}

interface ChartDirectoryProps {
  maxItems?: number;
  showSearch?: boolean;
  category?: string;
  className?: string;
}

const ChartDirectory: React.FC<ChartDirectoryProps> = ({ 
  maxItems = 50, 
  showSearch = true,
  category,
  className = ""
}) => {
  const [charts, setCharts] = useState<ChartItem[]>([]);
  const [filteredCharts, setFilteredCharts] = useState<ChartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all charts on component mount
  useEffect(() => {
    const fetchCharts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/charts/list');
        
        if (!response.ok) {
          throw new Error('Failed to fetch charts');
        }
        
        const data = await response.json();
        const chartList = data.charts || [];
        
        // Filter by category if specified
        let filtered = chartList;
        if (category) {
          filtered = chartList.filter((chart: ChartItem) => 
            chart.page?.toLowerCase().includes(category.toLowerCase()) ||
            chart.section?.toLowerCase().includes(category.toLowerCase())
          );
        }
        
        // Sort by title and limit
        const sorted = filtered
          .sort((a: ChartItem, b: ChartItem) => a.title.localeCompare(b.title))
          .slice(0, maxItems);
        
        setCharts(sorted);
        setFilteredCharts(sorted);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load charts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCharts();
  }, [maxItems, category]);

  // Filter charts based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCharts(charts);
    } else {
      const filtered = charts.filter(chart =>
        chart.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chart.subtitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chart.page.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCharts(filtered);
    }
  }, [searchTerm, charts]);

  // Group charts by page/category
  const groupedCharts = filteredCharts.reduce((acc, chart) => {
    const key = chart.page || 'Other';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(chart);
    return acc;
  }, {} as Record<string, ChartItem[]>);

  // Format page name for display
  const formatPageName = (page: string) => {
    return page
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get chart type icon
  const getChartIcon = (chartType: string) => {
    switch (chartType.toLowerCase()) {
      case 'bar':
      case 'stacked-bar':
        return '📊';
      case 'line':
        return '📈';
      case 'area':
      case 'stacked-area':
        return '📈';
      case 'pie':
        return '🥧';
      case 'dual-axis':
        return '📊📈';
      default:
        return '📊';
    }
  };

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-400 p-4 bg-red-900/20 rounded ${className}`}>
        Error loading charts: {error}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          {category ? `${formatPageName(category)} Charts` : 'Chart Directory'}
        </h2>
        <p className="text-gray-400 text-sm">
          Explore {filteredCharts.length} interactive charts and analytics
        </p>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search charts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Charts grouped by page */}
      <div className="space-y-8">
        {Object.entries(groupedCharts).map(([page, pageCharts]) => (
          <div key={page}>
            <h3 className="text-lg font-semibold text-gray-300 mb-4 border-b border-gray-800 pb-2">
              {formatPageName(page)} ({pageCharts.length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pageCharts.map((chart) => (
                <Link
                  key={chart.id}
                  href={`/share/chart/${chart.id}`}
                  className="group block p-4 bg-gray-900/50 rounded-lg border border-gray-800 hover:border-gray-600 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{getChartIcon(chart.chartType)}</span>
                        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                          {chart.chartType}
                        </span>
                      </div>
                      
                      <h4 className="text-white font-medium text-sm group-hover:text-blue-400 transition-colors truncate">
                        {chart.title}
                      </h4>
                      
                      {chart.subtitle && (
                        <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                          {chart.subtitle}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">
                          {formatPageName(chart.page)}
                        </span>
                        {chart.section && (
                          <span className="text-xs text-gray-600">
                            • {chart.section}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* No results */}
      {filteredCharts.length === 0 && searchTerm && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">No charts found</div>
          <p className="text-gray-500 text-sm">
            Try adjusting your search terms
          </p>
        </div>
      )}

      {/* View all link */}
      {!category && charts.length >= maxItems && (
        <div className="mt-8 text-center">
          <Link 
            href="/charts"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View All Charts
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
};

export default ChartDirectory; 