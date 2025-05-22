"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { TableConfig } from '../types';
import DataTable, { Column } from '@/app/components/shared/DataTable';
import { ExpandIcon, DownloadIcon } from '@/app/components/shared/Icons';
import Loader from '@/app/components/shared/Loader';

interface TableRendererProps {
  tableConfig: TableConfig;
  isLoading?: boolean;
  onRetry?: () => void;
  onExpandClick?: () => void;
  onDownloadClick?: () => void;
}

const TableRenderer: React.FC<TableRendererProps> = ({ 
  tableConfig,
  isLoading = false,
  onRetry,
  onExpandClick,
  onDownloadClick
}) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(isLoading || true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Calculate visible columns (exclude hidden ones)
  const visibleColumns = useMemo(() => {
    return tableConfig.columns.filter(column => !column.hidden);
  }, [tableConfig.columns]);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!tableConfig.enableSearch || !searchTerm.trim()) {
      return data;
    }
    
    const term = searchTerm.toLowerCase().trim();
    return data.filter(row => {
      return Object.values(row).some(value => 
        value !== null && 
        value !== undefined && 
        String(value).toLowerCase().includes(term)
      );
    });
  }, [data, searchTerm, tableConfig.enableSearch]);

  // Apply pagination
  const paginatedData = useMemo(() => {
    if (!tableConfig.enablePagination) return filteredData;
    
    const rowsPerPage = tableConfig.rowsPerPage || 10;
    const startIndex = currentPage * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, currentPage, tableConfig.enablePagination, tableConfig.rowsPerPage]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    if (!tableConfig.enablePagination) return 0;
    const rowsPerPage = tableConfig.rowsPerPage || 10;
    return Math.ceil(filteredData.length / rowsPerPage);
  }, [filteredData.length, tableConfig.enablePagination, tableConfig.rowsPerPage]);

  // Format cell value based on column configuration
  const formatCellValue = (value: any, column: TableConfig['columns'][0]) => {
    // This function is no longer used as we're handling everything in the column render functions
    // Keeping this as a stub in case it's called elsewhere in the code
    if (value === null || value === undefined) return '-';
    return value;
  };

  // Define fetchData function outside useEffect so it can be referenced elsewhere
  const fetchData = useCallback(async (retry = 0) => {
    if (isLoading) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Create a URL object to handle API key properly
      let url;
      try {
        url = new URL(tableConfig.apiEndpoint);
      } catch (error) {
        throw new Error(`Invalid URL format: ${tableConfig.apiEndpoint}`);
      }
      
      // Add API key as a URL parameter if provided
      if (tableConfig.apiKey) {
        // Check if the apiKey contains max_age parameter
        const apiKeyValue = tableConfig.apiKey.trim();
        
        if (apiKeyValue.includes('&max_age=')) {
          // Split by &max_age= and add each part separately
          const [baseApiKey, maxAgePart] = apiKeyValue.split('&max_age=');
          if (baseApiKey) {
            url.searchParams.append('api_key', baseApiKey.trim());
          }
          if (maxAgePart) {
            url.searchParams.append('max_age', maxAgePart.trim());
          }
        } else {
          // Just a regular API key
          url.searchParams.append('api_key', apiKeyValue);
        }
      }
      
      // Log the actual URL being fetched for debugging
      console.log('Fetching data from URL:', url.toString());
      
      // Add timeout for the fetch request
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
        const response = await fetch(url.toString(), {
          // No need for Authorization header as we're using URL params
          headers: {
            'Content-Type': 'application/json',
          },
          // Prevent caching issues
          cache: 'no-store',
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText} (${response.status})`);
        }
        
        const result = await response.json();
        
        // Extract data based on API response format
        let rows: any[] = [];
        if (result?.query_result?.data?.rows) {
          rows = result.query_result.data.rows;
        } else if (Array.isArray(result)) {
          rows = result;
        } else if (result?.data && Array.isArray(result.data)) {
          rows = result.data;
        } else if (result?.rows && Array.isArray(result.rows)) {
          rows = result.rows;
        } else if (result?.results && Array.isArray(result.results)) {
          rows = result.results;
        } else {
          throw new Error('API response does not have a recognized structure');
        }
        
        setData(rows);
        setLoading(false);
        setError(null);
      } catch (fetchError) {
        clearTimeout(timeout);
        throw fetchError; // Rethrow to be handled by the retry logic
      }
      
    } catch (error) {
      // Check if we should retry
      const maxRetries = 2;
      if (retry < maxRetries) {
        console.log(`Retrying fetch (${retry + 1}/${maxRetries})...`);
        // Exponential backoff: 2s, 4s
        const delay = 2000 * Math.pow(2, retry);
        setTimeout(() => fetchData(retry + 1), delay);
        return;
      }
      
      console.error('Error fetching table data:', error);
      setError(error instanceof Error ? error.message : String(error));
      setLoading(false);
    }
  }, [tableConfig.apiEndpoint, tableConfig.apiKey, isLoading]);

  // Function to handle manual retry
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setLoading(true);
    fetchData(0);
    if (onRetry) onRetry();
  }, [fetchData, onRetry]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Handle download data
  const handleDownload = useCallback(async () => {
    if (data.length === 0 || isDownloading) return;
    
    setIsDownloading(true);
    try {
      // Convert data to CSV
      const headers = visibleColumns.map(col => col.header);
      const csvRows = [
        headers.join(','), // Header row
        ...data.map(row => 
          visibleColumns.map(col => {
            let value = row[col.field];
            // Handle values that need quotes
            if (value === null || value === undefined) value = '';
            const stringValue = String(value);
            return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
          }).join(',')
        )
      ];
      
      const csvContent = csvRows.join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${tableConfig.title.replace(/\s+/g, '_')}_data.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error downloading data:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [data, visibleColumns, isDownloading, tableConfig.title]);

  // Fetch data from API when component mounts or when retryCount changes
  useEffect(() => {
    fetchData(0);
    
    // Set up refresh interval if specified
    let intervalId: NodeJS.Timeout | null = null;
    if (tableConfig.refreshInterval && tableConfig.refreshInterval > 0) {
      intervalId = setInterval(() => fetchData(0), tableConfig.refreshInterval * 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [tableConfig.refreshInterval, fetchData, retryCount]);

  // Convert TableConfig columns to DataTable Column format
  const dataTableColumns: Column<any>[] = useMemo(() => {
    return visibleColumns.map(column => ({
      key: column.field,
      header: column.header,
      sortable: column.sortable !== false,
      align: column.format?.type === 'number' || column.format?.type === 'currency' ? 'right' : 'left',
      width: column.width,
      format: column.format,
      // Add custom render function for all columns to handle HTML content
      render: (row) => {
        const value = row[column.field];
        
        // Handle null/undefined values
        if (value === null || value === undefined) return '-';
        
        // Check if the value is a string containing an HTML anchor tag
        if (typeof value === 'string' && (value.includes('<a href=') || value.includes('&lt;a href='))) {
          // Decode HTML entities if needed
          const decodedValue = value.replace(/&lt;/g, '<')
                                   .replace(/&gt;/g, '>')
                                   .replace(/&quot;/g, '"')
                                   .replace(/&amp;/g, '&');
          
          try {
            // Extract href URL and link text using regex
            const hrefRegex = /<a\s+href=["'](.*?)["'].*?>(.*?)<\/a>/i;
            const match = decodedValue.match(hrefRegex);
            
            if (match && match.length >= 3) {
              const url = match[1];
              const text = match[2];
              
              // Return a properly styled React link element
              return (
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 hover:underline"
                >
                  {text}
                </a>
              );
            }
          } catch (e) {
            console.error('Error parsing HTML in table cell:', e);
          }
        }
        
        // For all other values, use the standard formatter
        if (column.format) {
          switch (column.format.type) {
            case 'number':
              const num = Number(value);
              if (isNaN(num)) return value;
              return num.toLocaleString('en-US', { 
                minimumFractionDigits: column.format.decimals || 0,
                maximumFractionDigits: column.format.decimals || 0
              });
              
            case 'currency':
              const currency = Number(value);
              if (isNaN(currency)) return value;
              const prefix = column.format.prefix || '$';
              return `${prefix}${currency.toLocaleString('en-US', { 
                minimumFractionDigits: column.format.decimals || 2,
                maximumFractionDigits: column.format.decimals || 2
              })}`;
              
            case 'percentage':
              const percentage = Number(value);
              if (isNaN(percentage)) return value;
              return `${percentage.toLocaleString('en-US', { 
                minimumFractionDigits: column.format.decimals || 1,
                maximumFractionDigits: column.format.decimals || 1
              })}${column.format.suffix || '%'}`;
              
            case 'date':
              try {
                const date = new Date(value);
                if (isNaN(date.getTime())) return value;
                if (column.format.dateFormat) {
                  const options: Intl.DateTimeFormatOptions = { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  };
                  return date.toLocaleDateString('en-US', options);
                }
                return date.toLocaleDateString();
              } catch (e) {
                return value;
              }
          }
        }
        
        return value;
      }
    }));
  }, [visibleColumns]);

  return (
    <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-blue-900/20 transition-all duration-300">
      {/* Header Section with Title and Action Buttons */}
      <div className="flex justify-between items-center mb-3">
        <div className="-mt-1">
          <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">{tableConfig.title}</h2>
          {tableConfig.description && <p className="text-gray-500 text-[10px] tracking-wide">{tableConfig.description}</p>}
        </div>
        
        <div className="flex space-x-2">
          {onDownloadClick ? (
            <button 
              className={`p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-md transition-colors ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={onDownloadClick || handleDownload}
              title="Download CSV"
              disabled={isDownloading || data.length === 0}
            >
              {isDownloading ? (
                <Loader size="xs" className="w-4 h-4" />
              ) : (
                <DownloadIcon className="w-4 h-4" />
              )}
            </button>
          ) : (
            <button 
              className={`p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-md transition-colors ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleDownload}
              title="Download CSV"
              disabled={isDownloading || data.length === 0}
            >
              {isDownloading ? (
                <Loader size="xs" className="w-4 h-4" />
              ) : (
                <DownloadIcon className="w-4 h-4" />
              )}
            </button>
          )}
          
          {onExpandClick && (
            <button 
              className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-md transition-colors"
              onClick={onExpandClick}
              title="Expand Table"
            >
              <ExpandIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* First Divider */}
      <div className="h-px bg-gray-900 w-full"></div>
      
      {/* Search Bar (similar to filter bar in ChartCard) */}
      {tableConfig.enableSearch && (
        <>
          <div className="flex items-center justify-start pl-0 py-2 overflow-visible relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-6 pr-4 py-1.5 rounded-md border border-gray-900 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-900/50 w-60"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5 absolute left-2 top-2 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
          {/* Second Divider after search */}
          <div className="h-px bg-gray-900 w-full"></div>
        </>
      )}
      
      {/* Table content using enhanced DataTable component */}
      <div className="mt-3">
        <DataTable
          columns={dataTableColumns}
          data={paginatedData}
          keyExtractor={(row) => row.id || JSON.stringify(row)}
          isLoading={loading}
          error={error}
          initialSortColumn={tableConfig.defaultSortColumn || undefined}
          initialSortDirection={tableConfig.defaultSortDirection || 'asc'}
          variant={tableConfig.variant}
          pagination={undefined} // Disable built-in pagination
          searchTerm={searchTerm}
          onRetry={handleRetry}
          cellClassName="px-6 py-4 whitespace-nowrap text-sm text-gray-300"
          containerClassName="overflow-x-auto"
          noDataMessage="No data available"
        />
      </div>
      
      {/* Custom Pagination - only show if needed and enabled */}
      {tableConfig.enablePagination && filteredData.length > (tableConfig.rowsPerPage || 10) && (
        <>
          <div className="h-px bg-gray-900 w-full mt-3"></div>
          <div className="flex items-center justify-between pt-3">
            <div>
              <p className="text-xs text-gray-500">
                Showing {currentPage * (tableConfig.rowsPerPage || 10) + 1} to {Math.min((currentPage + 1) * (tableConfig.rowsPerPage || 10), filteredData.length)} of {filteredData.length} results
              </p>
            </div>
            <div className="flex gap-1">
              {/* First Page Button */}
              <button
                onClick={() => handlePageChange(0)}
                disabled={currentPage === 0}
                className={`relative inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${
                  currentPage === 0
                    ? 'text-gray-500 bg-gray-800/50 cursor-not-allowed'
                    : 'text-gray-300 bg-gray-800 hover:bg-gray-700'
                }`}
              >
                ⟪
              </button>
              
              {/* Previous Page Button */}
              <button
                onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className={`relative inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${
                  currentPage === 0
                    ? 'text-gray-500 bg-gray-800/50 cursor-not-allowed'
                    : 'text-gray-300 bg-gray-800 hover:bg-gray-700'
                }`}
              >
                ←
              </button>
              
              {/* Page Indicator */}
              <span className="relative inline-flex items-center px-3 py-1 text-xs font-medium bg-gray-800/80 text-gray-300 rounded-md">
                {currentPage + 1} / {totalPages}
              </span>
              
              {/* Next Page Button */}
              <button
                onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage >= totalPages - 1}
                className={`relative inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${
                  currentPage >= totalPages - 1
                    ? 'text-gray-500 bg-gray-800/50 cursor-not-allowed'
                    : 'text-gray-300 bg-gray-800 hover:bg-gray-700'
                }`}
              >
                →
              </button>
              
              {/* Last Page Button */}
              <button
                onClick={() => handlePageChange(totalPages - 1)}
                disabled={currentPage >= totalPages - 1}
                className={`relative inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${
                  currentPage >= totalPages - 1
                    ? 'text-gray-500 bg-gray-800/50 cursor-not-allowed'
                    : 'text-gray-300 bg-gray-800 hover:bg-gray-700'
                }`}
              >
                ⟫
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TableRenderer; 