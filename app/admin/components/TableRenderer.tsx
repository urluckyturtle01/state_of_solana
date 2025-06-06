"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { TableConfig } from '../types';
import DataTable, { Column } from '@/app/components/shared/DataTable';
import { ExpandIcon, DownloadIcon } from '@/app/components/shared/Icons';
import PrettyLoader from '@/app/components/shared/PrettyLoader';
import TimeFilter from '@/app/components/shared/filters/TimeFilter';
import CurrencyFilter from '@/app/components/shared/filters/CurrencyFilter';
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
  const [autoRetryIntervalId, setAutoRetryIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Filter states
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  // Initialize filter states from table config
  useEffect(() => {
    if (tableConfig.additionalOptions?.filters) {
      const initialFilters: Record<string, string> = {};
      const filters = tableConfig.additionalOptions.filters;
      
      if (filters.timeFilter?.activeValue) {
        initialFilters[filters.timeFilter.paramName] = filters.timeFilter.activeValue;
      }
      
      if (filters.currencyFilter?.activeValue) {
        initialFilters[filters.currencyFilter.paramName] = filters.currencyFilter.activeValue;
      }
      
      setActiveFilters(initialFilters);
    }
  }, [tableConfig.additionalOptions?.filters]);

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
      
      // Prepare request options
      let requestOptions: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      };
      
      // Check if this is a parameterized query (contains /queries/ in the URL)
      const isParameterizedQuery = url.pathname.includes('/queries/');
      
      if (isParameterizedQuery && Object.keys(activeFilters).length > 0) {
        // For parameterized queries, send parameters in the request body via POST
        requestOptions.method = 'POST';
        requestOptions.body = JSON.stringify({
          parameters: activeFilters
        });
      } else {
        // For regular APIs, add filter parameters to the URL
        Object.entries(activeFilters).forEach(([key, value]) => {
          if (value) {
            url.searchParams.append(key, value);
          }
        });
      }
      
      // Log the actual URL being fetched for debugging
      if (requestOptions.body) {
      }
      
      // Add timeout for the fetch request
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
        const response = await fetch(url.toString(), {
          ...requestOptions,
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText} (${response.status})`);
        }
        
        const result = await response.json();
        
        // Handle different response formats
        let rows: any[] = [];
        
        // Check if this is a job response (for parameterized queries)
        if (result?.job) {
          if (result.job.status === 4 && result.job.error) {
            throw new Error(`Query error: ${result.job.error}`);
          } else if (result.job.status === 3) {
            // Job completed successfully, get the result
            if (result.job.query_result?.data?.rows) {
              rows = result.job.query_result.data.rows;
            } else {
              throw new Error('Query completed but no data found');
            }
          } else {
            throw new Error(`Query is still running (status: ${result.job.status}). Please try again in a moment.`);
          }
        }
        // Standard response formats
        else if (result?.query_result?.data?.rows) {
          rows = result.query_result.data.rows;
        } else if (Array.isArray(result)) {
          rows = result;
        } else if (result?.data && Array.isArray(result.data)) {
          rows = result.data;
        } else if (result?.rows && Array.isArray(result.rows)) {
          rows = result.rows;
        } else if (result?.results && Array.isArray(result.results)) {
          rows = result.results;
        } else if (result?.message === "No cached result found for this query.") {
          throw new Error('No cached result found. The query may need to be executed first or may require parameters.');
        } else {
          throw new Error('API response does not have a recognized structure');
        }
        
        setData(rows);
        setLoading(false);
        setError(null);
        // Clear auto-retry interval if it exists
        if (autoRetryIntervalId) {
          clearInterval(autoRetryIntervalId);
          setAutoRetryIntervalId(null);
        }
      } catch (fetchError) {
        clearTimeout(timeout);
        throw fetchError; // Rethrow to be handled by the retry logic
      }
      
    } catch (error) {
      // Check if we should retry
      const maxRetries = 2;
      if (retry < maxRetries) {
        // Exponential backoff: 2s, 4s
        const delay = 2000 * Math.pow(2, retry);
        setTimeout(() => fetchData(retry + 1), delay);
        return;
      }
      
      // If all retries failed, set up an auto-retry interval
      if (!autoRetryIntervalId) {
        const intervalId = setInterval(() => {
          fetchData(0);
        }, 5000); // retry every 5 seconds
        setAutoRetryIntervalId(intervalId);
      }
      
      console.error('Error fetching table data:', error);
      setError(error instanceof Error ? error.message : String(error));
      setLoading(false);
    }
  }, [tableConfig.apiEndpoint, tableConfig.apiKey, isLoading, activeFilters, autoRetryIntervalId]);

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
                  minimumFractionDigits: Math.max(column.format.decimals || 0, 1),
                  maximumFractionDigits: Math.max(column.format.decimals || 0, 1)
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

  // Fix: Only show loading spinner if there is no data at all
  const showLoading = loading && data.length === 0;

  // Clear auto-retry interval on unmount
  useEffect(() => {
    return () => {
      if (autoRetryIntervalId) clearInterval(autoRetryIntervalId);
    };
  }, [autoRetryIntervalId]);

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
                <div className="flex justify-center items-center h-full">
                <PrettyLoader size="sm" />
              </div>
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
      
      {/* Search Bar and Filters - Combined in one row */}
      {(tableConfig.enableSearch || tableConfig.additionalOptions?.filters) && (
        <>
          <div className="flex items-center pl-0 py-2 overflow-visible relative gap-3">
            {/* Search Bar */}
            {tableConfig.enableSearch && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-6 pr-4 py-0.5 rounded-md border border-gray-900 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-900/50 w-35 md:w-60 lg:w-60"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 absolute left-2 top-2 text-gray-500"
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
            )}
            
            {/* Filters */}
            {tableConfig.additionalOptions?.filters && (
              <div className="flex items-center gap-3">
                {tableConfig.additionalOptions.filters.timeFilter && (
                  <TimeFilter
                    value={activeFilters[tableConfig.additionalOptions.filters.timeFilter.paramName] || tableConfig.additionalOptions.filters.timeFilter.activeValue || tableConfig.additionalOptions.filters.timeFilter.options[0]}
                    onChange={(value) => {
                      setActiveFilters(prev => ({
                        ...prev,
                        [tableConfig.additionalOptions!.filters!.timeFilter!.paramName]: value
                      }));
                    }}
                    options={tableConfig.additionalOptions.filters.timeFilter.options.map(option => ({
                      value: option,
                      label: option
                    }))}
                  />
                )}
                
                {tableConfig.additionalOptions.filters.currencyFilter && (
                  <CurrencyFilter
                    currency={activeFilters[tableConfig.additionalOptions.filters.currencyFilter.paramName] || tableConfig.additionalOptions.filters.currencyFilter.activeValue || tableConfig.additionalOptions.filters.currencyFilter.options[0]}
                    onChange={(value) => {
                      setActiveFilters(prev => ({
                        ...prev,
                        [tableConfig.additionalOptions!.filters!.currencyFilter!.paramName]: value
                      }));
                    }}
                    options={tableConfig.additionalOptions.filters.currencyFilter.options}
                    label={tableConfig.additionalOptions.filters.currencyFilter.label}
                  />
                )}
              </div>
            )}
          </div>
          {/* Divider after search and filters */}
          <div className="h-px bg-gray-900 w-full"></div>
        </>
      )}
      
      {/* Table content using enhanced DataTable component */}
      <div className="mt-3">
        {showLoading ? (
          <div className="flex justify-center items-center h-full">
            <PrettyLoader size="sm" />
          </div>
        ) : (
        <DataTable
          columns={dataTableColumns}
            data={filteredData}
          keyExtractor={(row) => row.id || JSON.stringify(row)}
            isLoading={false}
          error={error}
          initialSortColumn={tableConfig.defaultSortColumn || undefined}
          initialSortDirection={tableConfig.defaultSortDirection || 'asc'}
          variant={tableConfig.variant}
            pagination={tableConfig.enablePagination ? {
              enabled: true,
              rowsPerPage: tableConfig.rowsPerPage || 10,
              onPageChange: handlePageChange,
              currentPage: currentPage
            } : undefined}
            searchTerm={undefined}
          onRetry={handleRetry}
          cellClassName="px-6 py-4 whitespace-nowrap text-sm text-gray-300"
          containerClassName="overflow-x-auto"
          noDataMessage="No data available"
        />
        )}
      </div>
    </div>
  );
};

export default TableRenderer; 