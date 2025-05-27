"use client";

import React, { ReactNode, useState, useMemo } from 'react';
import PrettyLoader from './PrettyLoader';

// Column definition
export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  format?: {
    type: "text" | "number" | "currency" | "percentage" | "date";
    decimals?: number;
    prefix?: string;
    suffix?: string;
    dateFormat?: string;
  };
}

// Props for the DataTable component
export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  error?: string | null;
  noDataMessage?: string;
  initialSortColumn?: string;
  initialSortDirection?: 'asc' | 'desc';
  className?: string;
  containerClassName?: string;
  headerClassName?: string;
  rowClassName?: (index: number) => string;
  cellClassName?: string;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
  variant?: 'simple' | 'striped' | 'bordered' | 'compact';
  pagination?: {
    enabled: boolean;
    rowsPerPage: number;
    onPageChange?: (page: number) => void;
    currentPage?: number;
  };
  searchTerm?: string;
  onRetry?: () => void;
}

// Sort direction type
type SortDirection = 'asc' | 'desc';

/**
 * A reusable data table component for displaying tabular data
 */
export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  error = null,
  noDataMessage = 'No data available',
  initialSortColumn,
  initialSortDirection = 'asc',
  className = '',
  containerClassName = 'overflow-x-auto',
  headerClassName = 'bg-gray-900/50',
  rowClassName = (index) => index % 2 === 0 ? 'bg-black/30' : 'bg-gray-900/10',
  cellClassName = 'px-3 py-2 text-[11px] text-gray-300',
  loadingComponent,
  errorComponent,
  variant = 'simple',
  pagination,
  searchTerm,
  onRetry
}: DataTableProps<T>) {
  // State for sorting
  const [sortColumn, setSortColumn] = useState<string | undefined>(initialSortColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);
  // State for pagination - use external currentPage if provided
  const [internalCurrentPage, setInternalCurrentPage] = useState<number>(0);
  const currentPage = pagination?.currentPage !== undefined ? pagination.currentPage : internalCurrentPage;

  // Format cell value based on column configuration and value type
  const formatCellValue = (value: any, column: Column<T>) => {
    if (value === null || value === undefined) return '-';
    
    // Apply formatting if configured
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
          
        default:
          // Text or unsupported format type
          return value;
      }
    }
    
    // Default display for different types
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    
    return value;
  };

  // Filter data by search term
  const filteredData = useMemo(() => {
    if (!searchTerm || !searchTerm.trim()) return data;
    
    const term = searchTerm.toLowerCase().trim();
    return data.filter(row => {
      // Cast to Record<string, any> to fix TypeScript error with Object.entries
      const record = row as Record<string, any>;
      return Object.entries(record).some(([key, value]) => {
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(term);
      });
    });
  }, [data, searchTerm]);

  // Get sorted data
  const sortedData = useMemo(() => {
    if (!sortColumn || !filteredData.length) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = (a as any)[sortColumn];
      const bVal = (b as any)[sortColumn];
      
      // Handle undefined values
      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (bVal === undefined) return sortDirection === 'asc' ? -1 : 1;
      
      // Handle different types
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      // Handle dates (try to convert to date objects)
      const dateA = new Date(aVal);
      const dateB = new Date(bVal);
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        return sortDirection === 'asc' 
          ? dateA.getTime() - dateB.getTime() 
          : dateB.getTime() - dateA.getTime();
      }
      
      // Default numeric comparison
      return sortDirection === 'asc' 
        ? (aVal > bVal ? 1 : -1)
        : (aVal < bVal ? 1 : -1);
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Apply pagination
  const paginatedData = useMemo(() => {
    if (!pagination?.enabled || !pagination.rowsPerPage) return sortedData;
    
    const startIndex = currentPage * pagination.rowsPerPage;
    return sortedData.slice(startIndex, startIndex + pagination.rowsPerPage);
  }, [sortedData, pagination, currentPage]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    if (!pagination?.enabled || !pagination.rowsPerPage || sortedData.length === 0) return 0;
    return Math.ceil(sortedData.length / pagination.rowsPerPage);
  }, [sortedData.length, pagination]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setInternalCurrentPage(newPage);
    if (pagination?.onPageChange) {
      pagination.onPageChange(newPage);
    }
  };

  // Handle column header click for sorting
  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;
    
    const columnKey = column.key;
    if (sortColumn === columnKey) {
      // Toggle direction if clicking on the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    
    // Reset to first page when sorting changes
    setInternalCurrentPage(0);
  };

  // Render sort indicator
  const renderSortIndicator = (column: Column<T>) => {
    if (!column.sortable || sortColumn !== column.key) return null;
    
    return (
      <span className="ml-1 text-blue-400">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  // Get table class based on variant
  const getTableClass = () => {
    const baseClass = "min-w-full divide-y divide-gray-800";
    
    switch (variant) {
      case 'striped':
        return `${baseClass} ${className}`;
      case 'bordered':
        return `${baseClass} border border-gray-700 ${className}`;
      case 'compact':
        return `${baseClass} text-xs ${className}`;
      default:
        return `${baseClass} ${className}`;
    }
  };

  // Get row class based on variant and index
  const getRowClass = (index: number) => {
    let rowClass = rowClassName(index);
    
    if (variant === 'striped' && index % 2 === 0) {
      rowClass += ' bg-gray-800/30';
    }
    
    if (variant === 'compact') {
      rowClass += ' text-xs';
    }
    
    return rowClass;
  };

  // Render column header
  const renderColumnHeader = (column: Column<T>) => (
    <th 
      key={column.key}
      className={`text-${column.align || 'left'} text-[9px] font-medium text-gray-400 uppercase tracking-wider px-3 py-2 whitespace-nowrap ${column.sortable ? 'cursor-pointer hover:text-gray-200 transition-colors' : ''}`}
      onClick={() => column.sortable && handleSort(column)}
      style={{ width: column.width || 'auto' }}
    >
      {column.header}
      {renderSortIndicator(column)}
    </th>
  );

  // Custom render function that applies formatting
  const renderCell = (row: T, column: Column<T>) => {
    if (column.render) {
      return column.render(row);
    }
    
    const value = (row as any)[column.key];
    return formatCellValue(value, column);
  };

  // Render loading state
  if (isLoading) {
    return loadingComponent || (
      <div className="flex justify-center items-center h-64">
        <PrettyLoader size="sm" />
      </div>
    );
  }

  // Render error state
  if (error) {
    return errorComponent || (
      <div className="flex flex-col justify-center items-center h-64">
        <p className="text-red-400 text-[12px] mb-2">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs text-white"
          >
            Retry Loading
          </button>
        )}
      </div>
    );
  }

  // Render empty state
  if (!data.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-400 text-[12px]">{noDataMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className={containerClassName}>
        <table className={getTableClass()}>
          <thead className={headerClassName}>
            <tr>
              {columns.map(renderColumnHeader)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {paginatedData.map((row, index) => (
              <tr key={keyExtractor(row)} className={getRowClass(index)}>
                {columns.map(column => (
                  <td 
                    key={`${keyExtractor(row)}-${column.key}`} 
                    className={`text-[12px] ${cellClassName} ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'} ${
                      variant === 'bordered' ? 'border-x border-gray-700' : ''
                    }`}
                  >
                    {renderCell(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination?.enabled && totalPages > 1 && (
        <>
          <div className="h-px bg-gray-900 w-full mt-3"></div>
          <div className="flex items-center justify-between pt-0">
            <div>
              <p className="text-xs text-gray-500">
                Showing {currentPage * pagination.rowsPerPage + 1} to {Math.min((currentPage + 1) * pagination.rowsPerPage, sortedData.length)} of {sortedData.length} results
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
} 