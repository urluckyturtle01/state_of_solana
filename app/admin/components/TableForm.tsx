"use client";

import React, { useState, useEffect } from 'react';
import { TableConfig, TableColumnConfig, TableVariant, AvailablePage } from '../types';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { saveTableConfig } from '../utils';
import Button from './Button';
import { MENU_OPTIONS, MENU_PAGES, getPagesForMenu, findMenuForPage } from '../config/menuPages';
import FormMultiInput from './FormMultiInput';

interface TableFormProps {
  initialData?: TableConfig;
  onSubmit?: (data: TableConfig) => void;
  onCancel?: () => void;
}

const TableForm: React.FC<TableFormProps> = ({
  initialData,
  onSubmit,
  onCancel
}) => {
  const router = useRouter();
  const [formData, setFormData] = useState<TableConfig>({
    id: initialData?.id || nanoid(),
    title: initialData?.title || '',
    description: initialData?.description || '',
    apiEndpoint: initialData?.apiEndpoint || '',
    apiKey: initialData?.apiKey || '',
    columns: initialData?.columns || [],
    defaultSortColumn: initialData?.defaultSortColumn || '',
    defaultSortDirection: initialData?.defaultSortDirection || 'asc',
    rowsPerPage: initialData?.rowsPerPage || 10,
    enablePagination: initialData?.enablePagination ?? true,
    enableSearch: initialData?.enableSearch ?? true,
    enableRowSelection: initialData?.enableRowSelection ?? false,
    variant: initialData?.variant || 'simple',
    page: initialData?.page || 'dashboard',
    width: initialData?.width || 3, // Default to full width
    refreshInterval: initialData?.refreshInterval || 0,
    additionalOptions: initialData?.additionalOptions || {},
  });

  // Add state for menu selection
  const [selectedMenu, setSelectedMenu] = useState<string>('');
  const [availablePages, setAvailablePages] = useState<Array<{id: string, name: string, path: string}>>([]);
  
  // State for API testing
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; columns?: string[] } | null>(null);
  
  // State for column management
  const [columns, setColumns] = useState<TableColumnConfig[]>(initialData?.columns || []);
  const [newColumn, setNewColumn] = useState<TableColumnConfig>({
    field: '',
    header: '',
    width: '',
    format: {
      type: 'text'
    },
    sortable: true,
    filterable: false,
    hidden: false
  });

  // Add state for filter configuration
  const [enableFilters, setEnableFilters] = useState({
    timeFilter: false,
    currencyFilter: false
  });
  
  // Add state for filter parameters
  const [filterParams, setFilterParams] = useState({
    timeFilter: {
      options: ['D', 'W', 'M', 'Q', 'Y'],
      paramName: 'Date Part'
    },
    currencyFilter: {
      options: ['USD', 'SOL', 'USDe'],
      paramName: 'currency'
    }
  });

  // Initialize filter states from existing data
  useEffect(() => {
    if (initialData?.additionalOptions?.filters) {
      const filters = initialData.additionalOptions.filters;
      setEnableFilters({
        timeFilter: !!filters.timeFilter,
        currencyFilter: !!filters.currencyFilter
      });
      
      // Update filter params if they exist
      if (filters.timeFilter && filters.timeFilter.options && filters.timeFilter.paramName) {
        setFilterParams(prev => ({
          ...prev,
          timeFilter: {
            options: filters.timeFilter!.options,
            paramName: filters.timeFilter!.paramName
          }
        }));
      }
      
      if (filters.currencyFilter && filters.currencyFilter.options && filters.currencyFilter.paramName) {
        setFilterParams(prev => ({
          ...prev,
          currencyFilter: {
            options: filters.currencyFilter!.options,
            paramName: filters.currencyFilter!.paramName
          }
        }));
      }
    }
  }, [initialData]);

  // Determine initial menu based on page when form loads with initialData
  useEffect(() => {
    if (initialData?.page) {
      // Find which menu contains this page using the helper function
      const menuId = findMenuForPage(initialData.page);
      if (menuId) {
        setSelectedMenu(menuId);
      }
    }
  }, [initialData]);

  // Update available pages when component mounts or when selectedMenu changes
  useEffect(() => {
    // Only update availablePages if we have a selectedMenu
    if (selectedMenu) {
      // Get pages for the selected menu using the helper function
      setAvailablePages(getPagesForMenu(selectedMenu));
    } else {
      setAvailablePages([]);
    }
  }, [selectedMenu]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox inputs differently
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prevData => ({
        ...prevData,
        [name]: checked,
      }));
    } else {
      // For numeric fields, parse the value as a number
      const numericFields = ['rowsPerPage', 'width', 'refreshInterval'];
      if (numericFields.includes(name)) {
        setFormData(prevData => ({
          ...prevData,
          [name]: value === '' ? undefined : parseInt(value, 10),
        }));
      } else {
        // For other fields, use the value as is
        setFormData(prevData => ({
          ...prevData,
          [name]: value,
        }));
      }
    }
  };

  // Handle menu selection change
  const handleMenuChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const menuId = e.target.value;
    setSelectedMenu(menuId);
    
    // Reset page selection when menu changes
    setFormData(prev => ({
      ...prev,
      page: '' as any // Using 'any' to work around type checking
    }));
  };

  // Function to handle adding a new column
  const handleAddColumn = () => {
    if (!newColumn.field || !newColumn.header) {
      alert("Field name and header are required!");
      return;
    }
    
    // Add new column to the list
    setColumns([...columns, { ...newColumn }]);
    
    // Update form data
    setFormData(prevData => ({
      ...prevData,
      columns: [...columns, { ...newColumn }],
    }));
    
    // Reset new column form
    setNewColumn({
      field: '',
      header: '',
      width: '',
      format: {
        type: 'text'
      },
      sortable: true,
      filterable: false,
      hidden: false
    });
  };

  // Function to handle column input changes
  const handleColumnChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('format.')) {
      // Handle format properties
      const formatProp = name.split('.')[1];
      setNewColumn(prev => {
        // Ensure format exists with a default type
        const currentFormat = prev.format || { type: 'text' as const };
        
        return {
          ...prev,
          format: {
            ...currentFormat,
            [formatProp]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
          }
        };
      });
    } else if (type === 'checkbox') {
      // Handle checkbox inputs
      setNewColumn(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else {
      // Handle other inputs
      setNewColumn(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Function to remove a column
  const handleRemoveColumn = (index: number) => {
    const updatedColumns = [...columns];
    updatedColumns.splice(index, 1);
    setColumns(updatedColumns);
    
    // Update form data
    setFormData(prevData => ({
      ...prevData,
      columns: updatedColumns,
    }));
  };

  // Test API endpoint
  const testApi = async () => {
    if (!formData.apiEndpoint) {
      setTestResult({
        success: false,
        message: 'Please enter an API endpoint first'
      });
      return;
    }
    
    setTestLoading(true);
    setTestResult(null);
    
    try {
      // Create URL object to handle potential query parameters
      let url;
      try {
        url = new URL(formData.apiEndpoint);
      } catch (error) {
        throw new Error(`Invalid URL format: ${formData.apiEndpoint}`);
      }
      
      // Add API key if provided
      if (formData.apiKey) {
        // Check if the apiKey contains max_age parameter
        const apiKeyValue = formData.apiKey.trim();
        
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
      
      // Create test parameters from enabled filters
      const testParameters: Record<string, any> = {};
      
      if (enableFilters.timeFilter && filterParams.timeFilter.options.length > 0) {
        testParameters[filterParams.timeFilter.paramName] = filterParams.timeFilter.options[0];
      }
      
      if (enableFilters.currencyFilter && filterParams.currencyFilter.options.length > 0) {
        testParameters[filterParams.currencyFilter.paramName] = filterParams.currencyFilter.options[0];
      }
      
      if (isParameterizedQuery && Object.keys(testParameters).length > 0) {
        // For parameterized queries, send parameters in the request body via POST
        requestOptions.method = 'POST';
        requestOptions.body = JSON.stringify({
          parameters: testParameters
        });
      } else if (Object.keys(testParameters).length > 0) {
        // For regular APIs, add filter parameters to the URL
        Object.entries(testParameters).forEach(([key, value]) => {
          if (value) {
            url.searchParams.append(key, value);
          }
        });
      }
      
      if (requestOptions.body) {
      }
      
      // Add timeout for the fetch request
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      // Fetch the data
      const response = await fetch(url.toString(), requestOptions);
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle different response formats
      let rows = [];
      
      // Check if this is a job response (for parameterized queries)
      if (data?.job) {
        if (data.job.status === 4 && data.job.error) {
          throw new Error(`Query error: ${data.job.error}`);
        } else if (data.job.status === 3) {
          // Job completed successfully, get the result
          if (data.job.query_result?.data?.rows) {
            rows = data.job.query_result.data.rows;
          } else {
            throw new Error('Query completed but no data found');
          }
        } else {
          throw new Error(`Query is still running (status: ${data.job.status}). Please try again in a moment.`);
        }
      }
      // Standard response formats
      else if (data?.query_result?.data?.rows) {
        rows = data.query_result.data.rows;
      } else if (Array.isArray(data)) {
        rows = data;
      } else if (data?.data && Array.isArray(data.data)) {
        rows = data.data;
      } else if (data?.rows && Array.isArray(data.rows)) {
        rows = data.rows;
      } else if (data?.results && Array.isArray(data.results)) {
        rows = data.results;
      } else if (data?.message === "No cached result found for this query.") {
        throw new Error('No cached result found. The query may need to be executed first or may require parameters.');
      } else if (data?.error) {
        throw new Error(`API returned an error: ${data.error}`);
      } else {
        console.error('Unrecognized API response structure:', data);
        throw new Error('API response does not have a recognized structure');
      }
      
      if (rows.length === 0) {
        setTestResult({
          success: false,
          message: 'API returned no data rows'
        });
        return;
      }
      
      // Extract column information from the first row
      const firstRow = rows[0];
      const detectedColumns = Object.keys(firstRow).map(key => {
        // Determine the value type
        const value = firstRow[key];
        let valueType: 'text' | 'number' | 'currency' | 'percentage' | 'date' = 'text';
        
        if (typeof value === 'number') {
          valueType = 'number';
        } else if (typeof value === 'string') {
          // Check if it's a date
          const dateRegex = /^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}/;
          if (dateRegex.test(value)) {
            valueType = 'date';
          }
          // Check if it's a currency
          else if (/^\$[\d,.]+$/.test(value)) {
            valueType = 'currency';
          }
          // Check if it's a percentage
          else if (/[\d.]+%$/.test(value)) {
            valueType = 'percentage';
          }
        }
        
        // Create a suggested column config
        return {
          field: key,
          header: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '), // Convert snake_case to Title Case
          format: {
            type: valueType,
            ...(valueType === 'currency' && { prefix: '$' }),
            ...(valueType === 'number' && { decimals: 0 }),
            ...(valueType === 'date' && { dateFormat: 'MM/DD/YYYY' })
          },
          sortable: true,
          filterable: false,
          hidden: false
        } as TableColumnConfig;
      });
      
      // Update the columns state with the detected columns
      setColumns(detectedColumns);
      
      // Update the form data
      setFormData(prevData => ({
        ...prevData,
        columns: detectedColumns,
      }));
      
      setTestResult({
        success: true,
        message: `Successfully detected ${detectedColumns.length} columns from API data`,
        columns: detectedColumns.map(col => col.field)
      });
      
    } catch (error) {
      console.error('Error testing API:', error);
      setTestResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setTestLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.title) {
      alert("Please enter a title for the table");
      return;
    }
    
    if (!formData.apiEndpoint) {
      alert("Please enter an API endpoint");
      return;
    }
    
    if (!formData.page) {
      alert("Please select a page");
      return;
    }
    
    if (formData.columns.length === 0) {
      alert("Please add at least one column");
      return;
    }
    
    try {
      // Save table config
      const savedConfig = await saveTableConfig(formData);
      
      // Clear any caches for this page to ensure table appears
      if (typeof window !== 'undefined' && formData.page) {
        try {
          // Clear localStorage cache for this page
          localStorage.removeItem(`tables_page_${formData.page}`);
          
          // Also clear session storage if it exists
          sessionStorage.removeItem(`tables_page_${formData.page}`);
          
          // Force browser to reload data by setting a flag
          localStorage.setItem('tables_need_refresh', 'true');
          localStorage.setItem('tables_refreshed_page', formData.page);
          localStorage.setItem('tables_refresh_time', Date.now().toString());
        } catch (e) {
          console.warn('Error clearing cache:', e);
        }
      }
      
      // Call onSubmit callback if provided
      if (onSubmit) {
        onSubmit(savedConfig);
      } else {
        // Navigate back to dashboard manager
        router.push('/admin/manage-dashboard');
      }
    } catch (error) {
      console.error('Error saving table:', error);
      alert('Failed to save table. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">
        {initialData ? 'Edit Table' : 'Create Table'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-8 bg-gray-900 p-6 rounded-lg">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-300">Basic Information</h3>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-400">
                Table Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Active Users Table"
                required
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-400">
                Description (Optional)
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                rows={2}
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="A brief description of what this table shows..."
              />
            </div>
          </div>
          
          {/* Menu and Page Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="menu" className="block text-sm font-medium text-gray-400">
                Menu Option *
              </label>
              <select
                id="menu"
                name="menu"
                value={selectedMenu}
                onChange={handleMenuChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Menu</option>
                {MENU_OPTIONS.map((menu) => (
                  <option key={menu.id} value={menu.id}>
                    {menu.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="page" className="block text-sm font-medium text-gray-400">
                Dashboard Page *
              </label>
              <select
                id="page"
                name="page"
                value={formData.page}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={!selectedMenu || availablePages.length === 0}
              >
                <option value="">Select Page</option>
                {availablePages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {!selectedMenu ? "Select a menu option first" : 
                 availablePages.length === 0 ? "No pages available for this menu" : 
                 "Select the page where this table will appear"}
              </p>
            </div>
          </div>
          
          {/* Section Selection - Only show for sectioned pages */}
          {(formData.page === 'sf-overview' || formData.page === 'sf-depin') && (
            <div>
              <label htmlFor="section" className="block text-sm font-medium text-gray-400">
                Section
              </label>
              <select
                id="section"
                name="section"
                value={formData.additionalOptions?.section || ''}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    additionalOptions: {
                      ...prev.additionalOptions,
                      section: e.target.value
                    }
                  }));
                }}
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Sections</option>
                {formData.page === 'sf-overview' && (
                  <>
                    <option value="network-rev-gdp">Network REV and GDP</option>
                    <option value="validator">Validator</option>
                    <option value="onchain-activity">Onchain Activity</option>
                    <option value="defi">DEFI</option>
                    <option value="stablecoins">Stablecoins</option>
                  </>
                )}
                {formData.page === 'sf-depin' && (
                  <>
                    <option value="overview">Overview</option>
                    <option value="rewards">Rewards</option>
                    <option value="token-burns">Token Burns</option>
                    <option value="top-program-interactions">Top Program Interactions - L30 days</option>
                    <option value="token-marketcap-share">Token Marketcap Share</option>
                    <option value="depin-project-revenue">DePIN Project Revenue by Chain</option>
                    <option value="solana-depin-fundraising">Solana DePIN Fundraising</option>
                  </>
                )}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Select which section this table should appear in (optional)
              </p>
            </div>
          )}
          
          {/* Table Width Selection */}
          <div>
            <label htmlFor="width" className="block text-sm font-medium text-gray-400">
              Table Width
            </label>
            <select
              id="width"
              name="width"
              value={formData.width || 3}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={2}>1/2 - Half width</option>
              <option value={3}>3/3 - Full width</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select how wide the table should be on desktop. On mobile, all tables will be full width.
            </p>
          </div>
        </div>
        
        {/* API Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-300">API Settings</h3>
          
          <div>
            <label htmlFor="apiEndpoint" className="block text-sm font-medium text-gray-400">
              API Endpoint *
            </label>
            <input
              type="url"
              id="apiEndpoint"
              name="apiEndpoint"
              value={formData.apiEndpoint}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://api.example.com/data"
              required
            />
          </div>
          
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-400">
              API Key (Optional)
            </label>
            <input
              type="text"
              id="apiKey"
              name="apiKey"
              value={formData.apiKey}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="your-api-key"
            />
            <p className="mt-1 text-xs text-gray-500">
              You can include max_age with your API key like: your-api-key&max_age=86400
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={testApi}
              disabled={!formData.apiEndpoint || testLoading}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                !formData.apiEndpoint || testLoading
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {testLoading ? 'Testing...' : 'Test API & Fetch Columns'}
            </button>
            
            {testResult && (
              <div className={`text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                {testResult.message}
              </div>
            )}
          </div>
        </div>
        
        {/* Column Management */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-300">Column Management</h3>
          
          {/* Add New Column Form */}
          <div className="bg-gray-800 p-4 rounded-md border border-gray-700">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Add New Column</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="field" className="block text-sm font-medium text-gray-400">
                  Field Name *
                </label>
                <input
                  type="text"
                  id="field"
                  name="field"
                  value={newColumn.field}
                  onChange={handleColumnChange}
                  className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. username"
                />
              </div>
              
              <div>
                <label htmlFor="header" className="block text-sm font-medium text-gray-400">
                  Header Text *
                </label>
                <input
                  type="text"
                  id="header"
                  name="header"
                  value={newColumn.header}
                  onChange={handleColumnChange}
                  className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Username"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label htmlFor="format.type" className="block text-sm font-medium text-gray-400">
                  Format Type
                </label>
                <select
                  id="format.type"
                  name="format.type"
                  value={newColumn.format?.type || 'text'}
                  onChange={handleColumnChange}
                  className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="currency">Currency</option>
                  <option value="percentage">Percentage</option>
                  <option value="date">Date</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="width" className="block text-sm font-medium text-gray-400">
                  Column Width (Optional)
                </label>
                <input
                  type="text"
                  id="width"
                  name="width"
                  value={newColumn.width || ''}
                  onChange={handleColumnChange}
                  className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 100px or 20%"
                />
              </div>
              
              {(newColumn.format?.type === 'number' || 
                newColumn.format?.type === 'currency' || 
                newColumn.format?.type === 'percentage') && (
                <div>
                  <label htmlFor="format.decimals" className="block text-sm font-medium text-gray-400">
                    Decimal Places
                  </label>
                  <input
                    type="number"
                    id="format.decimals"
                    name="format.decimals"
                    value={newColumn.format?.decimals || 0}
                    onChange={handleColumnChange}
                    min="0"
                    max="10"
                    className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
              
              {newColumn.format?.type === 'currency' && (
                <div>
                  <label htmlFor="format.prefix" className="block text-sm font-medium text-gray-400">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    id="format.prefix"
                    name="format.prefix"
                    value={newColumn.format?.prefix || '$'}
                    onChange={handleColumnChange}
                    className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="$"
                  />
                </div>
              )}
              
              {newColumn.format?.type === 'date' && (
                <div>
                  <label htmlFor="format.dateFormat" className="block text-sm font-medium text-gray-400">
                    Date Format
                  </label>
                  <input
                    type="text"
                    id="format.dateFormat"
                    name="format.dateFormat"
                    value={newColumn.format?.dateFormat || 'MM/DD/YYYY'}
                    onChange={handleColumnChange}
                    className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="MM/DD/YYYY"
                  />
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="sortable"
                  name="sortable"
                  checked={newColumn.sortable ?? true}
                  onChange={handleColumnChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                />
                <label htmlFor="sortable" className="ml-2 block text-sm text-gray-400">
                  Sortable
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="filterable"
                  name="filterable"
                  checked={newColumn.filterable ?? false}
                  onChange={handleColumnChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                />
                <label htmlFor="filterable" className="ml-2 block text-sm text-gray-400">
                  Filterable
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hidden"
                  name="hidden"
                  checked={newColumn.hidden ?? false}
                  onChange={handleColumnChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                />
                <label htmlFor="hidden" className="ml-2 block text-sm text-gray-400">
                  Hidden by Default
                </label>
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleAddColumn}
              disabled={!newColumn.field || !newColumn.header}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                !newColumn.field || !newColumn.header
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              Add Column
            </button>
          </div>
          
          {/* Column List */}
          {columns.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Configured Columns ({columns.length})</h4>
              <div className="bg-gray-800 rounded-md border border-gray-700 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-800">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Field</th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Header</th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Format</th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Properties</th>
                      <th scope="col" className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-900 divide-y divide-gray-800">
                    {columns.map((column, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">{column.field}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">{column.header}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                          {column.format?.type}
                          {column.format?.type === 'currency' && column.format?.prefix && ` (${column.format.prefix})`}
                          {column.format?.decimals !== undefined && ` (${column.format.decimals} decimals)`}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                          <div className="flex space-x-2">
                            {column.sortable && <span className="px-2 py-0.5 text-xs bg-blue-900/30 text-blue-400 rounded">Sortable</span>}
                            {column.filterable && <span className="px-2 py-0.5 text-xs bg-green-900/30 text-green-400 rounded">Filterable</span>}
                            {column.hidden && <span className="px-2 py-0.5 text-xs bg-gray-700/50 text-gray-400 rounded">Hidden</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            type="button"
                            onClick={() => handleRemoveColumn(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* Display Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-300">Display Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="variant" className="block text-sm font-medium text-gray-400">
                Table Style
              </label>
              <select
                id="variant"
                name="variant"
                value={formData.variant || 'simple'}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="simple">Simple</option>
                <option value="striped">Striped Rows</option>
                <option value="bordered">Bordered</option>
                <option value="compact">Compact</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="rowsPerPage" className="block text-sm font-medium text-gray-400">
                Rows Per Page
              </label>
              <input
                type="number"
                id="rowsPerPage"
                name="rowsPerPage"
                value={formData.rowsPerPage || 10}
                onChange={handleChange}
                min="5"
                max="100"
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="defaultSortColumn" className="block text-sm font-medium text-gray-400">
                Default Sort Column
              </label>
              <select
                id="defaultSortColumn"
                name="defaultSortColumn"
                value={formData.defaultSortColumn || ''}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">None</option>
                {columns.map((column, index) => (
                  <option key={index} value={column.field}>{column.header}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="defaultSortDirection" className="block text-sm font-medium text-gray-400">
                Default Sort Direction
              </label>
              <select
                id="defaultSortDirection"
                name="defaultSortDirection"
                value={formData.defaultSortDirection || 'asc'}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="refreshInterval" className="block text-sm font-medium text-gray-400">
                Auto-Refresh Interval (seconds)
              </label>
              <input
                type="number"
                id="refreshInterval"
                name="refreshInterval"
                value={formData.refreshInterval || 0}
                onChange={handleChange}
                min="0"
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="0 (disabled)"
              />
              <p className="mt-1 text-xs text-gray-500">
                Set to 0 to disable auto-refresh
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-6 mt-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enablePagination"
                name="enablePagination"
                checked={formData.enablePagination ?? true}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
              />
              <label htmlFor="enablePagination" className="ml-2 block text-sm text-gray-400">
                Enable Pagination
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableSearch"
                name="enableSearch"
                checked={formData.enableSearch ?? true}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
              />
              <label htmlFor="enableSearch" className="ml-2 block text-sm text-gray-400">
                Enable Search
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableRowSelection"
                name="enableRowSelection"
                checked={formData.enableRowSelection ?? false}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
              />
              <label htmlFor="enableRowSelection" className="ml-2 block text-sm text-gray-400">
                Enable Row Selection
              </label>
            </div>
          </div>
          
          {/* Filter Configuration */}
          <div className="mt-6 space-y-4">
            <h4 className="text-sm font-medium text-gray-300">Filter Configuration</h4>
            
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableTimeFilter"
                  checked={enableFilters.timeFilter}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEnableFilters(prev => ({ ...prev, timeFilter: checked }));
                    
                    // Update formData with filter configuration
                    setFormData(prev => ({
                      ...prev,
                      additionalOptions: {
                        ...prev.additionalOptions,
                        filters: {
                          ...prev.additionalOptions?.filters,
                          timeFilter: checked ? {
                            label: 'Time Period',
                            paramName: filterParams.timeFilter.paramName,
                            options: filterParams.timeFilter.options,
                            activeValue: filterParams.timeFilter.options[0]
                          } : undefined
                        }
                      }
                    }));
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                />
                <label htmlFor="enableTimeFilter" className="ml-2 block text-sm text-gray-400">
                  Enable Time Filter
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableCurrencyFilter"
                  checked={enableFilters.currencyFilter}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEnableFilters(prev => ({ ...prev, currencyFilter: checked }));
                    
                    // Update formData with filter configuration
                    setFormData(prev => ({
                      ...prev,
                      additionalOptions: {
                        ...prev.additionalOptions,
                        filters: {
                          ...prev.additionalOptions?.filters,
                          currencyFilter: checked ? {
                            label: 'Currency',
                            paramName: filterParams.currencyFilter.paramName,
                            options: filterParams.currencyFilter.options,
                            activeValue: filterParams.currencyFilter.options[0]
                          } : undefined
                        }
                      }
                    }));
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                />
                <label htmlFor="enableCurrencyFilter" className="ml-2 block text-sm text-gray-400">
                  Enable Currency Filter
                </label>
              </div>
            </div>
            
            {/* Filter Parameter Configuration */}
            {(enableFilters.timeFilter || enableFilters.currencyFilter) && (
              <div className="mt-4 p-4 bg-gray-800 rounded-md border border-gray-700">
                <h5 className="text-sm font-medium text-gray-300 mb-3">Filter Parameters</h5>
                
                {enableFilters.timeFilter && (
                  <div className="mb-4">
                    <h6 className="text-xs font-medium text-gray-400 mb-2">Time Filter</h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Parameter Name</label>
                        <input
                          type="text"
                          value={filterParams.timeFilter.paramName}
                          onChange={(e) => setFilterParams(prev => ({
                            ...prev,
                            timeFilter: { ...prev.timeFilter, paramName: e.target.value }
                          }))}
                          className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-gray-300"
                          placeholder="Date Part"
                        />
                      </div>
                      <div>
                        <FormMultiInput
                          id="timeFilterOptions"
                          label="Filter Options"
                          values={filterParams.timeFilter.options}
                          onChange={(fieldName, values) => {
                            setFilterParams(prev => ({
                              ...prev,
                              timeFilter: { 
                                ...prev.timeFilter, 
                                options: values
                              }
                            }));
                            
                            // Update formData immediately
                            if (enableFilters.timeFilter) {
                              setFormData(prev => ({
                                ...prev,
                                additionalOptions: {
                                  ...prev.additionalOptions,
                                  filters: {
                                    ...prev.additionalOptions?.filters,
                                    timeFilter: {
                                      label: 'Time Period',
                                      paramName: filterParams.timeFilter.paramName,
                                      options: values,
                                      activeValue: values[0] || ''
                                    }
                                  }
                                }
                              }));
                            }
                          }}
                          placeholder="D, W, M, Q, Y"
                          helpText="Add time filter options (D=Day, W=Week, M=Month, Q=Quarter, Y=Year)"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {enableFilters.currencyFilter && (
                  <div>
                    <h6 className="text-xs font-medium text-gray-400 mb-2">Currency Filter</h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Parameter Name</label>
                        <input
                          type="text"
                          value={filterParams.currencyFilter.paramName}
                          onChange={(e) => setFilterParams(prev => ({
                            ...prev,
                            currencyFilter: { ...prev.currencyFilter, paramName: e.target.value }
                          }))}
                          className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-gray-300"
                          placeholder="currency"
                        />
                      </div>
                      <div>
                        <FormMultiInput
                          id="currencyFilterOptions"
                          label="Filter Options"
                          values={filterParams.currencyFilter.options}
                          onChange={(fieldName, values) => {
                            setFilterParams(prev => ({
                              ...prev,
                              currencyFilter: { 
                                ...prev.currencyFilter, 
                                options: values
                              }
                            }));
                            
                            // Update formData immediately
                            if (enableFilters.currencyFilter) {
                              setFormData(prev => ({
                                ...prev,
                                additionalOptions: {
                                  ...prev.additionalOptions,
                                  filters: {
                                    ...prev.additionalOptions?.filters,
                                    currencyFilter: {
                                      label: 'Currency',
                                      paramName: filterParams.currencyFilter.paramName,
                                      options: values,
                                      activeValue: values[0] || ''
                                    }
                                  }
                                }
                              }));
                            }
                          }}
                          placeholder="USD, SOL, USDe"
                          helpText="Add currency filter options"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Form Actions */}
        <div className="flex space-x-4 pt-4">
          <Button
            type="submit"
            disabled={formData.columns.length === 0}
            className={`px-4 py-2 text-white font-medium rounded-md ${
              formData.columns.length === 0
                ? 'bg-gray-700 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {initialData ? 'Update Table' : 'Create Table'}
          </Button>
          
          <Button
            type="button"
            onClick={onCancel || (() => router.push('/admin/manage-dashboard'))}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-md"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TableForm; 