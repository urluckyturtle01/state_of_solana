"use client";

import { useState, useEffect } from 'react';
import ApiList from './components/ApiList';
import ExplorerDataView from './components/ExplorerDataView';

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
}

// Column data interface
interface ColumnData {
  apiId: string;
  apiName: string;
  columnName: string;
  data: any[];
  loading: boolean;
  error?: string;
}

export default function ExplorerPage() {
  const [apis, setApis] = useState<ApiConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedApis, setExpandedApis] = useState<Set<string>>(new Set());
  const [selectedColumns, setSelectedColumns] = useState<Record<string, Set<string>>>({});
  const [columnData, setColumnData] = useState<Record<string, ColumnData>>({});
  const [selectedParameters, setSelectedParameters] = useState<Record<string, Record<string, string>>>({});
  const [dateColumnMapping, setDateColumnMapping] = useState<Record<string, string>>({});

  // Fetch APIs from S3 charts
  useEffect(() => {
    const fetchApis = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all chart configurations from S3
        const response = await fetch('/api/charts');
        if (!response.ok) {
          throw new Error(`Failed to fetch charts: ${response.statusText}`);
        }
        
        const data = await response.json();
        const charts = data.charts || [];
        
        // Extract unique APIs from charts
        const apiMap = new Map<string, ApiConfig>();
        
        charts.forEach((chart: any) => {
          if (chart.apiEndpoint) {
            const apiId = `${chart.apiEndpoint}_${chart.method || 'GET'}`;
            
            if (!apiMap.has(apiId)) {
              apiMap.set(apiId, {
                id: apiId,
                name: chart.title || chart.apiEndpoint.split('/').pop() || 'API',
                endpoint: chart.apiEndpoint,
                method: chart.method || 'GET',
                columns: [],
                chartTitle: chart.title,
                apiKey: chart.apiKey,
                additionalOptions: chart.additionalOptions
              });
            }
            
            // Add columns from data mapping
            const apiConfig = apiMap.get(apiId)!;
            
            // Extract columns from different mapping types
            if (chart.xAxisMapping?.column) {
              apiConfig.columns.push(chart.xAxisMapping.column);
            }
            if (chart.yAxisMapping?.column) {
              apiConfig.columns.push(chart.yAxisMapping.column);
            }
            
            // Handle dataMapping object
            if (chart.dataMapping) {
              if (typeof chart.dataMapping === 'object') {
                Object.entries(chart.dataMapping).forEach(([key, mapping]: [string, any]) => {
                  if (typeof mapping === 'string') {
                    apiConfig.columns.push(mapping);
                  } else if (mapping?.column) {
                    apiConfig.columns.push(mapping.column);
                  } else if (mapping?.field) {
                    apiConfig.columns.push(mapping.field);
                  }
                  
                  // Handle array of field mappings (for yAxis)
                  if (Array.isArray(mapping)) {
                    mapping.forEach((item: any) => {
                      if (item?.field) {
                        apiConfig.columns.push(item.field);
                      }
                      if (item?.column) {
                        apiConfig.columns.push(item.column);
                      }
                    });
                  }
                });
                
                // Add direct string values from dataMapping
                if (chart.dataMapping.xAxis && typeof chart.dataMapping.xAxis === 'string') {
                  apiConfig.columns.push(chart.dataMapping.xAxis);
                }
                if (chart.dataMapping.yAxis && typeof chart.dataMapping.yAxis === 'string') {
                  apiConfig.columns.push(chart.dataMapping.yAxis);
                }
                if (chart.dataMapping.groupBy && typeof chart.dataMapping.groupBy === 'string') {
                  apiConfig.columns.push(chart.dataMapping.groupBy);
                }
              }
            }
            
            // Remove duplicates and empty values
            apiConfig.columns = [...new Set(apiConfig.columns.filter(col => col && col.trim()))];
          }
        });
        
        // Convert to array and sort by name
        const apisArray = Array.from(apiMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        
        setApis(apisArray);
      } catch (error) {
        console.error('Failed to fetch APIs:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchApis();
  }, []);

  // Get parameter values for an API (selected or default)
  const getApiParameters = (api: ApiConfig): Record<string, string> => {
    const params: Record<string, string> = {};
    
    if (api.additionalOptions?.filters) {
      const filters = api.additionalOptions.filters;
      const selectedParams = selectedParameters[api.id] || {};
      
      // Add time filter 
      if (filters.timeFilter?.paramName && filters.timeFilter?.options?.length > 0) {
        const paramName = filters.timeFilter.paramName;
        params[paramName] = selectedParams[paramName] || filters.timeFilter.options[0];
      }
      
      // Add currency filter
      if (filters.currencyFilter?.paramName && filters.currencyFilter?.options?.length > 0) {
        const paramName = filters.currencyFilter.paramName;
        params[paramName] = selectedParams[paramName] || filters.currencyFilter.options[0];
      }
    }
    
    return params;
  };

  // Fetch data for a specific API
  const fetchApiData = async (api: ApiConfig): Promise<any[]> => {
    let url = api.endpoint;
    
    // Ensure the URL has proper format - some endpoints might be missing .json
    if (!url.includes('.json') && !url.endsWith('/results')) {
      if (url.endsWith('/results')) {
        // Keep as is
      } else if (url.includes('/results')) {
        // Might need .json extension
        url = url.replace('/results', '/results.json');
      }
    }
    
    // Parse the API key to handle cases where max_age is included
    let apiKey = api.apiKey;
    
    // Clean the API key - remove any &max_age or other parameters
    if (apiKey && apiKey.includes('&')) {
      apiKey = apiKey.split('&')[0];
    }
    
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (error) {
      console.error('Invalid URL:', url, error);
      throw new Error(`Invalid API endpoint URL: ${url}`);
    }
    
    // Add API key if it exists
    if (apiKey) {
      urlObj.searchParams.set('api_key', apiKey);
    }
    
    // Get default parameters for filters
    const defaultParams = getApiParameters(api);
    const hasParameters = Object.keys(defaultParams).length > 0;
    
    const finalUrl = urlObj.toString();
    console.log('=== ENHANCED API DEBUGGING ===');
    console.log('Chart Title:', api.chartTitle);
    console.log('API Name:', api.name);
    console.log('API ID:', api.id);
    console.log('Original endpoint:', api.endpoint);
    console.log('Cleaned endpoint:', url);
    console.log('Original apiKey:', api.apiKey);
    console.log('Cleaned apiKey:', apiKey);
    console.log('Default params:', defaultParams);
    console.log('Has parameters:', hasParameters);
    console.log('Final URL:', finalUrl);
    console.log('Additional Options:', api.additionalOptions);
    
    try {
      let response;
      
      if (hasParameters) {
        // Use POST request with parameters in body for APIs with parameters
        console.log('Making POST request with parameters in body');
        const postBody = {
          url: finalUrl,
          parameters: defaultParams
        };
        console.log('POST body:', JSON.stringify(postBody, null, 2));
        
        response = await fetch('/api/proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postBody)
        });
      } else {
        // Use GET request for APIs without parameters
        console.log('Making GET request');
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(finalUrl)}`;
        console.log('Proxy URL:', proxyUrl);
        response = await fetch(proxyUrl);
      }
      
      console.log('Response status:', response.status);
      console.log('Response statusText:', response.statusText);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        // For debugging, let's also try to get the response body even if it's an error
        let errorBody = 'Could not read error response';
        try {
          errorBody = await response.text();
          console.log('Error response body:', errorBody);
        } catch (e) {
          console.log('Could not read error response body');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorBody}`);
      }
      
      const result = await response.json();
      console.log('API response type:', typeof result);
      console.log('API response keys:', Object.keys(result || {}));
      console.log('Full API response:', result);
      
      // Check if the API returned a "No cached result found" message
      if (result.message && result.message.includes('No cached result found')) {
        // This is a valid response but with no data available
        throw new Error('No cached data available for this query');
      }
      
      // Handle different response formats
      let data: any[] = [];
      
      if (result.query_result?.data?.rows) {
        data = result.query_result.data.rows;
      } else if (result.data?.results) {
        data = result.data.results;
      } else if (result.data?.data) {
        data = result.data.data;
      } else if (Array.isArray(result.data)) {
        data = result.data;
      } else if (Array.isArray(result)) {
        data = result;
      }
      
      console.log(`Extracted ${data.length} rows from API response`);
      console.log('Sample data (first 2 rows):', data.slice(0, 2));
      return data;
    } catch (fetchError) {
      console.error('=== API FETCH ERROR ===');
      console.error('Chart Title:', api.chartTitle);
      console.error('API Name:', api.name);
      console.error('Final URL:', finalUrl);
      console.error('Error details:', fetchError);
      throw fetchError;
    }
  };

  // Fetch data for a selected column
  const fetchColumnData = async (api: ApiConfig, columnName: string) => {
    const columnKey = `${api.id}_${columnName}`;
    
    setColumnData(prev => ({
      ...prev,
      [columnKey]: {
        apiId: api.id,
        apiName: api.name,
        columnName,
        data: [],
        loading: true,
        error: undefined
      }
    }));

    try {
      console.log(`Fetching data for API: ${api.name} (${api.id})`);
      console.log(`Endpoint: ${api.endpoint}`);
      console.log(`Parameters:`, getApiParameters(api));
      
      const data = await fetchApiData(api);
      console.log(`Received ${data.length} rows for ${api.name}`);
      
      if (data.length === 0) {
        console.warn(`API ${api.name} returned no data`);
      }
      
      // Limit to 100 rows for performance
      const limitedData = data.slice(0, 100);
      
      // Auto-detect date columns for this API if not already mapped
      if (!dateColumnMapping[api.id]) {
        const potentialDateColumns = detectDateColumns(api, limitedData);
        if (potentialDateColumns.length > 0) {
          // Auto-select the first detected date column
          setDateColumnMapping(prev => ({
            ...prev,
            [api.id]: potentialDateColumns[0]
          }));
        }
      }
      
      setColumnData(prev => ({
        ...prev,
        [columnKey]: {
          apiId: api.id,
          apiName: api.name,
          columnName,
          data: limitedData,
          loading: false,
          error: undefined
        }
      }));
    } catch (error) {
      console.error(`Error fetching data for ${api.name}:`, error);
      let errorMessage = 'Failed to load data';
      
      if (error instanceof Error) {
        if (error.message.includes('No cached data available')) {
          errorMessage = 'No cached data available for this query';
        } else if (error.message.includes('HTTP 404')) {
          errorMessage = 'API endpoint not found (404)';
        } else if (error.message.includes('HTTP')) {
          errorMessage = `Network error: ${error.message}`;
        } else {
          errorMessage = error.message;
        }
      }
      
      setColumnData(prev => ({
        ...prev,
        [columnKey]: {
          apiId: api.id,
          apiName: api.name,
          columnName,
          data: [],
          loading: false,
          error: errorMessage
        }
      }));
    }
  };

  const toggleApiExpansion = (apiId: string) => {
    const newExpanded = new Set(expandedApis);
    if (newExpanded.has(apiId)) {
      newExpanded.delete(apiId);
    } else {
      newExpanded.add(apiId);
    }
    setExpandedApis(newExpanded);
  };

  const toggleColumnSelection = (apiId: string, column: string) => {
    const newSelected = { ...selectedColumns };
    if (!newSelected[apiId]) {
      newSelected[apiId] = new Set();
    }
    
    const apiColumns = newSelected[apiId];
    const key = `${apiId}_${column}`;
    
    if (apiColumns.has(column)) {
      // Remove column
      apiColumns.delete(column);
      // Remove column data
      setColumnData(prev => {
        const newData = { ...prev };
        delete newData[key];
        return newData;
      });
    } else {
      // Add column
      apiColumns.add(column);
      // Fetch column data
      fetchColumnData(apis.find(a => a.id === apiId)!, column);
    }
    
    setSelectedColumns(newSelected);
  };

  // Handle parameter changes for APIs
  const handleParameterChange = (apiId: string, paramName: string, value: string) => {
    setSelectedParameters(prev => ({
      ...prev,
      [apiId]: {
        ...prev[apiId],
        [paramName]: value
      }
    }));

    // Refetch data for all selected columns of this API
    const api = apis.find(a => a.id === apiId);
    if (api && selectedColumns[apiId]) {
      selectedColumns[apiId].forEach(column => {
        fetchColumnData(api, column);
      });
    }
  };

  // Get all selected column data
  const getSelectedColumnData = () => {
    return Object.values(columnData).filter(col => !col.loading && !col.error);
  };

  // Generate table data from selected columns with date-based joining
  const generateJoinedTableData = () => {
    const selectedData = getSelectedColumnData();
    if (selectedData.length === 0) return { headers: [], rows: [], needsDateMapping: false };

    // Group columns by API
    const apiGroups = selectedData.reduce((groups, col) => {
      if (!groups[col.apiId]) {
        groups[col.apiId] = [];
      }
      groups[col.apiId].push(col);
      return groups;
    }, {} as Record<string, ColumnData[]>);

    const apiIds = Object.keys(apiGroups);
    
    // If only one API, use simple table generation
    if (apiIds.length === 1) {
      const apiData = apiGroups[apiIds[0]];
      const maxLength = Math.max(...apiData.map(col => col.data.length));
      
      const headers = apiData.map(col => ({
        name: col.columnName,
        apiName: col.apiName,
        key: `${col.apiId}_${col.columnName}`,
        isDateColumn: false
      }));
      
      const rows = [];
      for (let i = 0; i < Math.min(maxLength, 100); i++) {
        const row: any = { index: i + 1 };
        apiData.forEach(col => {
          const key = `${col.apiId}_${col.columnName}`;
          const rowData = col.data[i];
          row[key] = rowData ? (rowData[col.columnName] || '-') : '-';
        });
        rows.push(row);
      }
      
      return { headers, rows, needsDateMapping: false };
    }

    // Multiple APIs - determine which columns are date columns and which need alignment
    const selectedDateColumns = selectedData.filter(col => {
      const api = apis.find(a => a.id === col.apiId);
      if (!api) return false;
      const potentialDateColumns = detectDateColumns(api, col.data);
      return potentialDateColumns.includes(col.columnName);
    });

    // Check if we need date column mapping
    const needsMapping = apiIds.some(apiId => {
      const apiCols = apiGroups[apiId];
      const hasSelectedDateCol = apiCols.some(col => {
        const api = apis.find(a => a.id === col.apiId);
        if (!api) return false;
        const potentialDateColumns = detectDateColumns(api, col.data);
        return potentialDateColumns.includes(col.columnName);
      });
      
      // If this API doesn't have a selected date column, we need to know which column to use for alignment
      if (!hasSelectedDateCol && !dateColumnMapping[apiId]) {
        return true;
      }
      return false;
    });

    if (needsMapping) {
      return { headers: [], rows: [], needsDateMapping: true, apiGroups };
    }

    // Perform date-based join
    const joinedData = new Map<string, any>();
    
    // Process each API's data
    apiIds.forEach(apiId => {
      const apiCols = apiGroups[apiId];
      const api = apis.find(a => a.id === apiId);
      if (!api) return;
      
      // Find the date column for this API (either selected or mapped)
      let dateColumn = dateColumnMapping[apiId];
      
      // If no mapped date column, check if any selected column is a date column
      if (!dateColumn) {
        const selectedDateCol = apiCols.find(col => {
          const potentialDateColumns = detectDateColumns(api, col.data);
          return potentialDateColumns.includes(col.columnName);
        });
        if (selectedDateCol) {
          dateColumn = selectedDateCol.columnName;
        } else {
          // Auto-detect from API columns
          const potentialDateColumns = detectDateColumns(api, apiCols[0]?.data || []);
          if (potentialDateColumns.length > 0) {
            dateColumn = potentialDateColumns[0];
          }
        }
      }
      
      if (!dateColumn) return;
      
      // Find the column that contains the date data (might not be selected for display)
      let dateColData = apiCols.find(col => col.columnName === dateColumn);
      
      // If date column is not in selected columns, we need to get its data for alignment
      if (!dateColData && apiCols.length > 0) {
        // Use any selected column's data structure to find date values
        const sampleData = apiCols[0].data;
        dateColData = {
          apiId: apiId,
          apiName: api.name,
          columnName: dateColumn,
          data: sampleData, // Same data rows, we'll extract date column values
          loading: false,
          error: undefined
        };
      }
      
      if (!dateColData) return;
      
      dateColData.data.forEach((row, index) => {
        const dateValue = row[dateColumn];
        if (!dateValue) return;
        
        // Normalize date format (handle different date formats)
        const normalizedDate = normalizeDate(dateValue);
        
        if (!joinedData.has(normalizedDate)) {
          joinedData.set(normalizedDate, { date: normalizedDate });
        }
        
        const joinedRow = joinedData.get(normalizedDate)!;
        
        // Add data from all SELECTED columns of this API for this date
        apiCols.forEach(col => {
          const colData = col.data[index];
          if (colData) {
            const key = `${col.apiId}_${col.columnName}`;
            joinedRow[key] = colData[col.columnName] || '-';
          }
        });
      });
    });

    // Create headers (only for selected columns)
    const headers = selectedData.map(col => {
      const api = apis.find(a => a.id === col.apiId);
      const potentialDateColumns = api ? detectDateColumns(api, col.data) : [];
      return {
        name: col.columnName,
        apiName: col.apiName,
        key: `${col.apiId}_${col.columnName}`,
        isDateColumn: potentialDateColumns.includes(col.columnName)
      };
    });

    // Sort joined data by date and convert to array
    const sortedDates = Array.from(joinedData.keys()).sort();
    const rows = sortedDates.slice(0, 100).map((date, index) => ({
      index: index + 1,
      date,
      ...joinedData.get(date)
    }));

    return { headers, rows, needsDateMapping: false };
  };

  // Normalize date values for consistent joining
  const normalizeDate = (dateValue: any): string => {
    if (!dateValue) return '';
    
    const dateStr = String(dateValue);
    
    // Handle common date formats
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      return dateStr.substring(0, 10); // YYYY-MM-DD
    }
    if (dateStr.match(/^\d{4}-\d{2}/)) {
      return dateStr; // YYYY-MM
    }
    if (dateStr.match(/^\d{4}$/)) {
      return dateStr; // YYYY
    }
    
    // Try to parse as date
    try {
      const parsed = new Date(dateValue);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().substring(0, 10);
      }
    } catch (e) {
      // Ignore parsing errors
    }
    
    return dateStr;
  };

  // Detect potential date columns based on name patterns and data
  const detectDateColumns = (api: ApiConfig, data: any[]): string[] => {
    const dateKeywords = ['date', 'time', 'day', 'month', 'year', 'created', 'updated', 'block_date', 'partition_0'];
    const potentialDateColumns: string[] = [];
    
    // Check column names for date-like patterns
    api.columns.forEach(column => {
      const columnLower = column.toLowerCase();
      if (dateKeywords.some(keyword => columnLower.includes(keyword))) {
        potentialDateColumns.push(column);
      }
    });
    
    // If we have sample data, check for date-like values
    if (data.length > 0) {
      const sampleRow = data[0];
      Object.keys(sampleRow).forEach(key => {
        const value = sampleRow[key];
        if (typeof value === 'string') {
          // Check if it looks like a date (YYYY-MM-DD, ISO format, etc.)
          const dateRegex = /^\d{4}-\d{2}-\d{2}|^\d{4}-\d{2}|\d{4}$/;
          if (dateRegex.test(value) && !potentialDateColumns.includes(key)) {
            potentialDateColumns.push(key);
          }
        }
      });
    }
    
    return potentialDateColumns;
  };

  // Handle date column mapping selection
  const handleDateColumnMapping = (apiId: string, columnName: string) => {
    setDateColumnMapping(prev => ({
      ...prev,
      [apiId]: columnName
    }));
  };

  const { headers, rows, needsDateMapping, apiGroups } = generateJoinedTableData();
  const selectedData = getSelectedColumnData();
  const loadingColumns = Object.values(columnData).filter(col => col.loading);
  const errorColumns = Object.values(columnData).filter(col => col.error);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            {/* Outer spinning ring */}
            <div className="absolute inset-0 border-t-2 border-r-2 border-blue-400/60 rounded-full animate-spin"></div>
            
            {/* Middle spinning ring - reverse direction */}
            <div className="absolute inset-2 border-b-2 border-l-2 border-purple-400/80 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
            
            {/* Inner pulse */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-gray-400 text-sm">Loading APIs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-gray-200 mb-2">Error Loading APIs</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mt-0 mb-3">
        <h1 className="text-lg font-medium text-gray-200">Explorer</h1>
        <p className="text-gray-400 text-xs pb-2">Browse and explore APIs from chart configurations</p>
        <div className="h-px bg-gradient-to-r from-gray-900 via-gray-800 to-transparent mb-1"></div>
      </div>

      <div className="flex h-[700px] bg-black/60 backdrop-blur-sm rounded-lg border border-gray-900/50 overflow-hidden">
        {/* Left Sidebar - API List */}
        <ApiList
          apis={apis}
          expandedApis={expandedApis}
          selectedColumns={selectedColumns}
          selectedParameters={selectedParameters}
          onToggleApiExpansion={toggleApiExpansion}
          onToggleColumnSelection={toggleColumnSelection}
          onParameterChange={handleParameterChange}
        />
        
        {/* Right Pane - Data View */}
        <ExplorerDataView
          apis={apis}
          columnData={columnData}
          dateColumnMapping={dateColumnMapping}
          onDateColumnMapping={handleDateColumnMapping}
          generateJoinedTableData={generateJoinedTableData}
          detectDateColumns={detectDateColumns}
        />
      </div>
    </div>
  );
} 