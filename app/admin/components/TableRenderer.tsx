"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { TableConfig, TableColumnConfig, ComputedColumnConfig } from '../types';
import DataTable, { Column } from '@/app/components/shared/DataTable';
import { ExpandIcon, DownloadIcon } from '@/app/components/shared/Icons';
import PrettyLoader from '@/app/components/shared/PrettyLoader';
import TimeFilter from '@/app/components/shared/filters/TimeFilter';
import CurrencyFilter from '@/app/components/shared/filters/CurrencyFilter';

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

  // Function to format time period headers for horizontal tables
  const formatTimePeriodHeader = (period: string | number): string => {
    const periodStr = String(period);
    
    // Quarterly format: 2024-Q1, 2024-Q2, etc. -> Q1 2024, Q2 2024
    const quarterlyMatch = periodStr.match(/^(\d{4})[-_]?[qQ]([1-4])$/);
    if (quarterlyMatch) {
      const [, year, quarter] = quarterlyMatch;
      return `Q${quarter} ${year}`;
    }
    
    // Alternative quarterly format: Q1-2024, Q2-2024, etc.
    const altQuarterlyMatch = periodStr.match(/^[qQ]([1-4])[-_]?(\d{4})$/);
    if (altQuarterlyMatch) {
      const [, quarter, year] = altQuarterlyMatch;
      return `Q${quarter} ${year}`;
    }
    
    // Quarterly format with space: 2024 Q1, 2024 Q2, etc.
    const spaceQuarterlyMatch = periodStr.match(/^(\d{4})\s+[qQ]([1-4])$/);
    if (spaceQuarterlyMatch) {
      const [, year, quarter] = spaceQuarterlyMatch;
      return `Q${quarter} ${year}`;
    }
    
    // Monthly format: 2024-01, 2024-02, etc. -> Jan 2024, Feb 2024
    const monthlyMatch = periodStr.match(/^(\d{4})[-_](\d{1,2})$/);
    if (monthlyMatch) {
      const [, year, month] = monthlyMatch;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = parseInt(month) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${monthNames[monthIndex]} ${year}`;
      }
    }
    
    // Alternative monthly format: Jan-2024, Feb-2024, etc.
    const altMonthlyMatch = periodStr.match(/^([A-Za-z]{3,})[-_]?(\d{4})$/);
    if (altMonthlyMatch) {
      const [, month, year] = altMonthlyMatch;
      return `${month} ${year}`;
    }
    
    // Month name format: January, February, etc. with year detection from context
    const monthNameMatch = periodStr.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)$/i);
    if (monthNameMatch) {
      const [, month] = monthNameMatch;
      return month; // Return month name as-is if no year found
    }
    
    // Numeric month with year: 01/2024, 02/2024, etc.
    const numericMonthMatch = periodStr.match(/^(\d{1,2})\/(\d{4})$/);
    if (numericMonthMatch) {
      const [, month, year] = numericMonthMatch;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = parseInt(month) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${monthNames[monthIndex]} ${year}`;
      }
    }
    
    // Yearly format: just year numbers -> 2024, 2025
    const yearlyMatch = periodStr.match(/^(\d{4})$/);
    if (yearlyMatch) {
      return periodStr;
    }
    
    // Quarterly start dates: 2024-01-01, 2024-04-01, 2024-07-01, 2024-10-01
    const quarterlyStartDateMatch = periodStr.match(/^(\d{4})-(01|04|07|10)-01$/);
    if (quarterlyStartDateMatch) {
      const [, year, month] = quarterlyStartDateMatch;
      const quarterMap: { [key: string]: string } = {
        '01': 'Q1',
        '04': 'Q2', 
        '07': 'Q3',
        '10': 'Q4'
      };
      return `${quarterMap[month]} ${year}`;
    }
    
    // Date format: 2024-01-15 -> keep as is
    const dateMatch = periodStr.match(/^\d{4}-\d{2}-\d{2}$/);
    if (dateMatch) {
      return periodStr;
    }
    
    // Week format: 2024-W01, 2024-W02 -> keep as is
    const weekMatch = periodStr.match(/^\d{4}-W\d{2}$/);
    if (weekMatch) {
      return periodStr;
    }
    
    // If no pattern matches, return as-is
    return periodStr;
  };

  // Transform data for horizontal tables
  const transformedData = useMemo(() => {
    if (tableConfig.orientation !== 'horizontal' || data.length === 0) {
      return data;
    }

    // For horizontal tables, we transpose the data structure
    // This is particularly useful for financial data where you want:
    // - Time periods as columns (Q1 2024, Q2 2024, etc.)
    // - Metrics as rows (Net Revenue, Gross Profit, etc.)
    
    try {
      // Strategy 1: If data has identifiable time/period columns and metric identifiers
      // Look for common time-based field names
      const timeFields = visibleColumns.filter(col => 
        /^(date|time|period|quarter|month|year|block_date)$/i.test(col.field) ||
        /^(q[1-4]|Q[1-4]|\d{4}[-_]?[qQ]?[1-4]?)/.test(col.field)
      );
      
      // Also check if any column contains quarterly start dates in the data
      if (timeFields.length === 0) {
        const potentialTimeFields = visibleColumns.filter(col => {
          const sampleValues = data.slice(0, 5).map(row => row[col.field]);
          return sampleValues.some(value => {
            const valueStr = String(value);
            // Check if value looks like a quarterly start date
            return /^\d{4}-(01|04|07|10)-01$/.test(valueStr) ||
                   /^\d{4}[-_][qQ][1-4]$/.test(valueStr) ||
                   /^[qQ][1-4][-_]\d{4}$/.test(valueStr) ||
                   /^\d{4}[-_]\d{1,2}$/.test(valueStr) ||
                   /^\d{4}$/.test(valueStr);
          });
        });
        timeFields.push(...potentialTimeFields);
      }
      
      if (timeFields.length > 0) {
        // Use the first time field as the pivot
        const timeField = timeFields[0];
        const dataColumns = visibleColumns.filter(col => col.field !== timeField.field);
        
        // Get unique time periods
        let timePeriods = [...new Set(data.map(row => row[timeField.field]))];
        
        // Sort time periods properly using date/time aware sorting
        timePeriods = timePeriods.sort((a, b) => {
          const aPeriod = String(a);
          const bPeriod = String(b);
          
          // Try to parse as dates for proper chronological sorting
          const parseDate = (period: string) => {
            // Handle quarterly formats: 2024-Q1, Q1-2024, 2024 Q1
            const quarterMatch = period.match(/^(\d{4})[-_\s]*[qQ]([1-4])$/) || 
                                period.match(/^[qQ]([1-4])[-_\s]*(\d{4})$/);
            if (quarterMatch) {
              const year = quarterMatch[1] || quarterMatch[2];
              const quarter = quarterMatch[2] || quarterMatch[1];
              return new Date(parseInt(year), (parseInt(quarter) - 1) * 3, 1);
            }
            
            // Handle quarterly start dates: 2024-01-01, 2024-04-01, etc.
            const quarterStartMatch = period.match(/^(\d{4})-(01|04|07|10)-01$/);
            if (quarterStartMatch) {
              return new Date(period);
            }
            
            // Handle monthly formats: 2024-01, 2024-02, Jan-2024, etc.
            const monthMatch = period.match(/^(\d{4})[-_](\d{1,2})$/);
            if (monthMatch) {
              return new Date(parseInt(monthMatch[1]), parseInt(monthMatch[2]) - 1, 1);
            }
            
            // Handle yearly formats: 2024
            const yearMatch = period.match(/^(\d{4})$/);
            if (yearMatch) {
              return new Date(parseInt(yearMatch[1]), 0, 1);
            }
            
            // Try to parse as regular date
            const date = new Date(period);
            if (!isNaN(date.getTime())) {
              return date;
            }
            
            // Fallback to string comparison for unrecognized formats
            return null;
          };
          
          const dateA = parseDate(aPeriod);
          const dateB = parseDate(bPeriod);
          
          if (dateA && dateB) {
            return dateA.getTime() - dateB.getTime();
          } else {
            // Fallback to string comparison
            return aPeriod.localeCompare(bPeriod);
          }
        });
        
        // Apply default sort direction if specified and this is likely a time-based sort
        if (tableConfig.defaultSortDirection === 'desc') {
          timePeriods.reverse();
        }
        
        // Transform each metric into a row
        const horizontalData: any[] = [];
        
        dataColumns.forEach(metricCol => {
          const row: any = { metric: metricCol.header || metricCol.field };
          
          timePeriods.forEach(period => {
            const dataRow = data.find(d => d[timeField.field] === period);
            row[period] = dataRow ? dataRow[metricCol.field] : null;
          });
          
          horizontalData.push(row);
        });
        
        return horizontalData;
      }
      
      // Strategy 2: If the data is already in financial report format 
      // (each row is a metric, columns are time periods)
      // Check if we have multiple numeric columns that could represent time periods
      const numericColumns = visibleColumns.filter(col => 
        col.format?.type === 'number' || col.format?.type === 'currency'
      );
      
      if (numericColumns.length >= 2) {
        // Assume first column is the metric name, rest are time periods
        const metricColumn = visibleColumns[0];
        const timeColumns = visibleColumns.slice(1);
        
        // Data might already be in the right format, just return as is
        return data;
      }
      
      // Strategy 3: Fallback - basic transpose assuming first column is identifier
      const firstColumn = visibleColumns[0];
      const dataColumns = visibleColumns.slice(1);
      
      const horizontalData: any[] = [];
      const identifiers = [...new Set(data.map(row => row[firstColumn.field]))];
      
      dataColumns.forEach(col => {
        const row: any = { metric: col.header || col.field };
        
        identifiers.forEach(id => {
          const dataRow = data.find(d => d[firstColumn.field] === id);
          row[id] = dataRow ? dataRow[col.field] : null;
        });
        
        horizontalData.push(row);
      });
      
      return horizontalData;
      
    } catch (error) {
      console.error('Error transforming data for horizontal layout:', error);
      return data; // Fallback to original data
    }
  }, [data, visibleColumns, tableConfig.orientation]);

  // Create columns for horizontal display
  const horizontalColumns = useMemo(() => {
    if (tableConfig.orientation !== 'horizontal' || data.length === 0) {
      return visibleColumns;
    }

    try {
      // Strategy 1: Time-based transformation
      const timeFields = visibleColumns.filter(col => 
        /^(date|time|period|quarter|month|year|block_date)$/i.test(col.field) ||
        /^(q[1-4]|Q[1-4]|\d{4}[-_]?[qQ]?[1-4]?)/.test(col.field)
      );
      
      // Also check if any column contains quarterly start dates in the data
      if (timeFields.length === 0) {
        const potentialTimeFields = visibleColumns.filter(col => {
          const sampleValues = data.slice(0, 5).map(row => row[col.field]);
          return sampleValues.some(value => {
            const valueStr = String(value);
            // Check if value looks like a quarterly start date
            return /^\d{4}-(01|04|07|10)-01$/.test(valueStr) ||
                   /^\d{4}[-_][qQ][1-4]$/.test(valueStr) ||
                   /^[qQ][1-4][-_]\d{4}$/.test(valueStr) ||
                   /^\d{4}[-_]\d{1,2}$/.test(valueStr) ||
                   /^\d{4}$/.test(valueStr);
          });
        });
        timeFields.push(...potentialTimeFields);
      }
      
      if (timeFields.length > 0) {
        const timeField = timeFields[0];
        let timePeriods = [...new Set(data.map(row => row[timeField.field]))];
        
        // Sort time periods properly using date/time aware sorting
        timePeriods = timePeriods.sort((a, b) => {
          const aPeriod = String(a);
          const bPeriod = String(b);
          
          // Try to parse as dates for proper chronological sorting
          const parseDate = (period: string) => {
            // Handle quarterly formats: 2024-Q1, Q1-2024, 2024 Q1
            const quarterMatch = period.match(/^(\d{4})[-_\s]*[qQ]([1-4])$/) || 
                                period.match(/^[qQ]([1-4])[-_\s]*(\d{4})$/);
            if (quarterMatch) {
              const year = quarterMatch[1] || quarterMatch[2];
              const quarter = quarterMatch[2] || quarterMatch[1];
              return new Date(parseInt(year), (parseInt(quarter) - 1) * 3, 1);
            }
            
            // Handle quarterly start dates: 2024-01-01, 2024-04-01, etc.
            const quarterStartMatch = period.match(/^(\d{4})-(01|04|07|10)-01$/);
            if (quarterStartMatch) {
              return new Date(period);
            }
            
            // Handle monthly formats: 2024-01, 2024-02, Jan-2024, etc.
            const monthMatch = period.match(/^(\d{4})[-_](\d{1,2})$/);
            if (monthMatch) {
              return new Date(parseInt(monthMatch[1]), parseInt(monthMatch[2]) - 1, 1);
            }
            
            // Handle yearly formats: 2024
            const yearMatch = period.match(/^(\d{4})$/);
            if (yearMatch) {
              return new Date(parseInt(yearMatch[1]), 0, 1);
            }
            
            // Try to parse as regular date
            const date = new Date(period);
            if (!isNaN(date.getTime())) {
              return date;
            }
            
            // Fallback to string comparison for unrecognized formats
            return null;
          };
          
          const dateA = parseDate(aPeriod);
          const dateB = parseDate(bPeriod);
          
          if (dateA && dateB) {
            return dateA.getTime() - dateB.getTime();
          } else {
            // Fallback to string comparison
            return aPeriod.localeCompare(bPeriod);
          }
        });
        
        // Apply default sort direction if specified and this is likely a time-based sort
        if (tableConfig.defaultSortDirection === 'desc') {
          timePeriods.reverse();
        }
        
        const newColumns: TableColumnConfig[] = [
          {
            field: 'metric',
            header: 'Metric',
            sortable: false,
            filterable: false,
            hidden: false,
            format: { type: 'text' }
          },
          ...timePeriods.map(period => ({
            field: String(period),
            header: formatTimePeriodHeader(period),
            sortable: true,
            filterable: false,
            hidden: false,
            format: { type: 'currency', prefix: '$', decimals: 0 }
          } as TableColumnConfig))
        ];
        
        return newColumns;
      }
      
      // Strategy 2: Already in financial format
      const numericColumns = visibleColumns.filter(col => 
        col.format?.type === 'number' || col.format?.type === 'currency'
      );
      
      if (numericColumns.length >= 2) {
        return visibleColumns; // Use as-is
      }
      
      // Strategy 3: Fallback transpose
      const firstColumn = visibleColumns[0];
      const identifiers = [...new Set(data.map(row => row[firstColumn.field]))];
      
      const newColumns: TableColumnConfig[] = [
        {
          field: 'metric',
          header: 'Metric',
          sortable: false,
          filterable: false,
          hidden: false,
          format: { type: 'text' }
        },
        ...identifiers.map(id => {
          // Check if the identifier looks like a time period
          const idStr = String(id);
          const isTimePeriod = /^(\d{4}[-_]?[qQ]?[1-4]?|\d{4}[-_]\d{1,2}|[qQ][1-4][-_]?\d{4}|\d{4}\s+[qQ][1-4]|[A-Za-z]{3,}[-_]?\d{4}|\d{1,2}\/\d{4}|(January|February|March|April|May|June|July|August|September|October|November|December)|\d{4}-(01|04|07|10)-01|\d{4})$/i.test(idStr);
          
          return {
            field: String(id),
            header: isTimePeriod ? formatTimePeriodHeader(id) : String(id),
            sortable: true,
            filterable: false,
            hidden: false,
            format: { type: 'currency', prefix: '$', decimals: 0 }
          } as TableColumnConfig;
        })
      ];
      
      return newColumns;
      
    } catch (error) {
      console.error('Error creating horizontal columns:', error);
      return visibleColumns; // Fallback to original columns
    }
  }, [visibleColumns, tableConfig.orientation, data]);

  // Use the appropriate columns and data based on orientation
  const finalColumns = tableConfig.orientation === 'horizontal' ? horizontalColumns : visibleColumns;
  const finalData = tableConfig.orientation === 'horizontal' ? transformedData : data;

  // Calculate computed columns/rows
  const dataWithComputedColumns = useMemo(() => {
    if (!tableConfig.computedColumns || tableConfig.computedColumns.length === 0) {
      return finalData;
    }

    const computeValue = (row: any, computedColumn: ComputedColumnConfig): number => {
      const values = computedColumn.sourceColumns
        .map(field => {
          const value = row[field];
          return typeof value === 'number' ? value : parseFloat(value) || 0;
        })
        .filter(val => !isNaN(val));

      if (values.length === 0) return 0;

      switch (computedColumn.operation) {
        case 'sum':
          return values.reduce((acc, val) => acc + val, 0);
        case 'average':
          return values.reduce((acc, val) => acc + val, 0) / values.length;
        case 'difference':
          return values.length > 1 ? values[0] - values.slice(1).reduce((acc, val) => acc + val, 0) : values[0];
        default:
          return 0;
      }
    };

    if (tableConfig.orientation === 'horizontal') {
      // For horizontal tables, add computed columns as new rows
      const newRows = [...finalData];
      
      tableConfig.computedColumns.forEach(computedColumn => {
        const computedRow: any = { metric: computedColumn.header };
        
        // Calculate computed value for each time period column
        const timeColumns = finalColumns.slice(1); // Skip the metric column
        timeColumns.forEach(timeCol => {
          // Find values from all rows for this time period
          const sourceValues: number[] = [];
          
          computedColumn.sourceColumns.forEach(sourceField => {
            // Find the row that corresponds to this source field
            const sourceRow = finalData.find(row => row.metric === sourceField);
            if (sourceRow && sourceRow[timeCol.field] !== undefined) {
              const value = parseFloat(sourceRow[timeCol.field]) || 0;
              if (!isNaN(value)) {
                sourceValues.push(value);
              }
            }
          });
          
          let computedValue = 0;
          if (sourceValues.length > 0) {
            switch (computedColumn.operation) {
              case 'sum':
                computedValue = sourceValues.reduce((acc, val) => acc + val, 0);
                break;
              case 'average':
                computedValue = sourceValues.reduce((acc, val) => acc + val, 0) / sourceValues.length;
                break;
              case 'difference':
                computedValue = sourceValues.length > 1 ? sourceValues[0] - sourceValues.slice(1).reduce((acc, val) => acc + val, 0) : sourceValues[0];
                break;
            }
          }
          
          computedRow[timeCol.field] = computedValue;
        });
        
        newRows.push(computedRow);
      });
      
      return newRows;
    } else {
      // For vertical tables, add computed columns as new columns to each row
      return finalData.map(row => {
        const newRow = { ...row };
        
        tableConfig.computedColumns!.forEach(computedColumn => {
          const computedValue = computeValue(row, computedColumn);
          newRow[computedColumn.id] = computedValue;
        });
        
        return newRow;
      });
    }
  }, [finalData, tableConfig.computedColumns, tableConfig.orientation, finalColumns]);

  // Add computed columns to the columns list for vertical tables
  const columnsWithComputed = useMemo(() => {
    if (!tableConfig.computedColumns || tableConfig.computedColumns.length === 0 || tableConfig.orientation === 'horizontal') {
      return finalColumns;
    }

    // For vertical tables, add computed columns to the columns list
    const computedColumnConfigs: TableColumnConfig[] = tableConfig.computedColumns.map(computedColumn => ({
      field: computedColumn.id,
      header: computedColumn.header,
      sortable: true,
      filterable: false,
      hidden: false,
      format: computedColumn.format
    }));

    return [...finalColumns, ...computedColumnConfigs];
  }, [finalColumns, tableConfig.computedColumns, tableConfig.orientation]);

  // Use final processed data and columns
  const processedData = dataWithComputedColumns;
  const processedColumns = columnsWithComputed;

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!tableConfig.enableSearch || !searchTerm.trim()) {
      return processedData;
    }
    
    const term = searchTerm.toLowerCase().trim();
    return processedData.filter(row => {
      return Object.values(row).some(value => 
        value !== null && 
        value !== undefined && 
        String(value).toLowerCase().includes(term)
      );
    });
  }, [processedData, searchTerm, tableConfig.enableSearch]);

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
    if (processedData.length === 0 || isDownloading) return;
    
    setIsDownloading(true);
    try {
      // Convert data to CSV
      const headers = processedColumns.map(col => col.header);
      const csvRows = [
        headers.join(','), // Header row
        ...processedData.map(row => 
          processedColumns.map(col => {
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
  }, [processedData, processedColumns, isDownloading, tableConfig.title]);

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
    return processedColumns.map(column => ({
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
              
              const formattedNumber = num.toLocaleString('en-US', { 
                minimumFractionDigits: Math.max(column.format.decimals || 0, 1),
                maximumFractionDigits: Math.max(column.format.decimals || 0, 1)
              });
              
              return num < 0 ? (
                <span className="text-red-400">{formattedNumber}</span>
              ) : formattedNumber;
              
            case 'currency':
              const currency = Number(value);
              if (isNaN(currency)) return value;
              const prefix = column.format.prefix || '$';
              const formattedCurrency = `${prefix}${currency.toLocaleString('en-US', { 
                minimumFractionDigits: column.format.decimals || 2,
                maximumFractionDigits: column.format.decimals || 2
              })}`;
              
              return currency < 0 ? (
                <span className="text-red-400">{formattedCurrency}</span>
              ) : formattedCurrency;
              
            case 'percentage':
              const percentage = Number(value);
              if (isNaN(percentage)) return value;
              const formattedPercentage = `${percentage.toLocaleString('en-US', { 
                minimumFractionDigits: column.format.decimals || 1,
                maximumFractionDigits: column.format.decimals || 1
              })}${column.format.suffix || '%'}`;
              
              return percentage < 0 ? (
                <span className="text-red-400">{formattedPercentage}</span>
              ) : formattedPercentage;
              
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
        
        // Handle unformatted numeric values
        if (typeof value === 'number' && value < 0) {
          return <span className="text-red-400">{value}</span>;
        }
        
        // Try to parse string numbers for negative detection
        if (typeof value === 'string') {
          const numericValue = parseFloat(value);
          if (!isNaN(numericValue) && numericValue < 0 && String(numericValue) === value.trim()) {
            return <span className="text-red-400">{value}</span>;
          }
        }
        
        return value;
      }
    }));
  }, [processedColumns]);

  // Fix: Only show loading spinner if there is no data at all
  const showLoading = loading && processedData.length === 0;

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
              disabled={isDownloading || processedData.length === 0}
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
              disabled={isDownloading || processedData.length === 0}
            >
              {isDownloading ? (
                <PrettyLoader size="sm" />
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
          cellClassName={tableConfig.orientation === 'horizontal' ? "px-3 py-4 text-[11px] text-gray-300" : "px-6 py-4 whitespace-nowrap text-sm text-gray-300"}
          containerClassName="overflow-x-auto"
          noDataMessage="No data available"
          stickyFirstColumn={tableConfig.orientation === 'horizontal'}
          isHorizontal={tableConfig.orientation === 'horizontal'}
        />
        )}
      </div>
    </div>
  );
};

export default TableRenderer; 