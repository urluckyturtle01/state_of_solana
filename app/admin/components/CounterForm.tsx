"use client";

import React, { useState, useEffect } from 'react';
import { CounterConfig, CounterVariant, AVAILABLE_PAGES } from '../types';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { saveCounterConfig } from '../utils';

// Define menu options like in chart-creator/page.tsx
const MENU_OPTIONS = [
  { id: 'overview', name: 'Overview', icon: 'home' },
  { id: 'dex', name: 'DEX', icon: 'chart-bar' },
  { id: 'rev', name: 'REV', icon: 'currency-dollar' },
  { id: 'mev', name: 'MEV', icon: 'currency-dollar' },
  { id: 'stablecoins', name: 'Stablecoins', icon: 'coin' },
  { id: 'protocol-revenue', name: 'Protocol Revenue', icon: 'chart-pie' }
];

interface CounterFormProps {
  initialData?: CounterConfig;
  onSubmit?: (data: CounterConfig) => void;
  onCancel?: () => void;
}

const CounterForm: React.FC<CounterFormProps> = ({
  initialData,
  onSubmit,
  onCancel
}) => {
  const router = useRouter();
  const [formData, setFormData] = useState<CounterConfig>({
    id: initialData?.id || nanoid(),
    title: initialData?.title || '',
    apiEndpoint: initialData?.apiEndpoint || '',
    apiKey: initialData?.apiKey || '',
    valueField: initialData?.valueField || '',
    rowIndex: initialData?.rowIndex || 0,
    prefix: initialData?.prefix || '',
    suffix: initialData?.suffix || '',
    variant: initialData?.variant || 'blue',
    icon: initialData?.icon || 'chart',
    page: initialData?.page || 'overview',
    width: initialData?.width || 1, // Default to 1 column width
    trendConfig: initialData?.trendConfig || undefined,
  });

  // Add state for menu selection
  const [selectedMenu, setSelectedMenu] = useState<string>('');
  const [availablePages, setAvailablePages] = useState<Array<{id: string, name: string, path: string}>>([]);
  
  const [showTrendConfig, setShowTrendConfig] = useState<boolean>(!!initialData?.trendConfig);
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Add state for auto-calculating trend
  const [autoCalculateTrend, setAutoCalculateTrend] = useState<boolean>(false);

  // Determine initial menu based on page when form loads with initialData
  useEffect(() => {
    if (initialData?.page) {
      // Find which menu contains this page
      for (const menu of MENU_OPTIONS) {
        let found = false;
        
        switch (menu.id) {
          case 'overview':
            found = ['dashboard', 'network-usage', 'protocol-rev', 'market-dynamics'].includes(initialData.page);
            break;
          case 'dex':
            found = ['volume', 'tvl', 'traders', 'aggregators', 'dex-summary'].includes(initialData.page);
            break;
          case 'rev':
            found = ['overview', 'cost-capacity', 'issuance-burn', 'total-economic-value', 'breakdown'].includes(initialData.page);
            break;
          case 'mev':
            found = ['dex-token-hotspots', 'extracted-value-pnl', 'mev-summary'].includes(initialData.page);
            break;
          case 'stablecoins':
            found = ['stablecoin-usage', 'transaction-activity', 'liquidity-velocity', 'mint-burn', 'platform-exchange', 'tvl'].includes(initialData.page);
            break;
          case 'protocol-revenue':
            found = ['total', 'dex-ecosystem', 'nft-ecosystem', 'depin', 'protocol-revenue-summary', 'summary'].includes(initialData.page);
            break;
        }
        
        if (found) {
          setSelectedMenu(menu.id);
          break;
        }
      }
    }
  }, [initialData]);

  // Update available pages when component mounts or when selectedMenu changes
  useEffect(() => {
    // Only update availablePages if we have a selectedMenu (set by the above effect)
    if (selectedMenu) {
      // Define pages for each menu - same logic as in the original useEffect
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
            { id: 'dex-summary', name: 'Summary', path: '/dex/summary' },
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
        case 'mev':
          setAvailablePages([
            { id: 'mev-summary', name: 'Summary', path: '/mev/summary' },
            { id: 'dex-token-hotspots', name: 'DEX & Token Hotspots', path: '/mev/dex-token-hotspots' },
            { id: 'extracted-value-pnl', name: 'Extracted Value & PNL', path: '/mev/extracted-value-pnl' }
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
            { id: 'protocol-revenue-summary', name: 'Summary', path: '/protocol-revenue/summary' },
            { id: 'total', name: 'Total', path: '/protocol-revenue/total' },
            { id: 'dex-ecosystem', name: 'DEX Ecosystem', path: '/protocol-revenue/dex-ecosystem' },
            { id: 'nft-ecosystem', name: 'NFT Ecosystem', path: '/protocol-revenue/nft-ecosystem' },
            { id: 'depin', name: 'DePin', path: '/protocol-revenue/depin' }
          ]);
          break;
        default:
          setAvailablePages([]);
      }
    }
  }, [selectedMenu]); // Dependency only on selectedMenu, not initialData

  // Reset the form when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        title: initialData.title || '',
        apiEndpoint: initialData.apiEndpoint || '',
        apiKey: initialData.apiKey || '',
        valueField: initialData.valueField || '',
        rowIndex: initialData.rowIndex || 0,
        prefix: initialData.prefix || '',
        suffix: initialData.suffix || '',
        variant: initialData.variant || 'blue',
        icon: initialData.icon || 'chart',
        page: initialData.page || 'overview',
        width: initialData.width || 1, // Default to 1 column if not specified
        trendConfig: initialData.trendConfig,
      });
      setShowTrendConfig(!!initialData.trendConfig);
      // Set autoCalculateTrend to false when initialData changes
      setAutoCalculateTrend(false);
    }
  }, [initialData]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: name === 'rowIndex' || name === 'width' ? parseInt(value, 10) : value,
    }));
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

  // Handle trend config changes
  const handleTrendConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => {
      // Ensure trendConfig exists and has the required fields
      const currentTrendConfig = prevData.trendConfig || { 
        valueField: '', 
        label: 'vs. previous period' 
      };
      
      return {
        ...prevData,
        trendConfig: {
          ...currentTrendConfig,
          [name]: value,
        },
      };
    });
  };

  // Toggle trend config section
  const toggleTrendConfig = () => {
    setShowTrendConfig(!showTrendConfig);
    if (!showTrendConfig) {
      // Initialize empty trend config when enabling
      setFormData(prevData => ({
        ...prevData,
        trendConfig: {
          valueField: '',
          label: 'vs. previous period',
        },
      }));
    } else {
      // Remove trend config when disabling
      setFormData(prevData => ({
        ...prevData,
        trendConfig: undefined,
      }));
      // Reset auto-calculate when hiding trend config
      setAutoCalculateTrend(false);
    }
  };

  // Toggle auto-calculate trend
  const toggleAutoCalculateTrend = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAutoCalculateTrend(checked);
    
    if (checked) {
      // When auto-calculate is enabled, set valueField to 'auto'
      setFormData(prevData => ({
        ...prevData,
        trendConfig: {
          ...prevData.trendConfig!,
          valueField: 'auto_calculate',
        },
      }));
    } else {
      // When auto-calculate is disabled, reset valueField
      setFormData(prevData => ({
        ...prevData,
        trendConfig: {
          ...prevData.trendConfig!,
          valueField: '',
        },
      }));
    }
  };

  // Handle test API
  const testApi = async () => {
    setTestLoading(true);
    setTestResult(null);

    try {
      // Create URL with API key if provided
      let apiUrl;
      try {
        apiUrl = new URL(formData.apiEndpoint);
        
        // Check if the apiKey contains max_age parameter
        if (formData.apiKey) {
          const apiKeyValue = formData.apiKey.trim();
          // Check if the apiKey contains max_age
          if (apiKeyValue.includes('&max_age=')) {
            // Split by &max_age= and add each part separately
            const [baseApiKey, maxAgePart] = apiKeyValue.split('&max_age=');
            if (baseApiKey) {
              apiUrl.searchParams.append('api_key', baseApiKey.trim());
            }
            if (maxAgePart) {
              apiUrl.searchParams.append('max_age', maxAgePart.trim());
            }
          } else {
            // Just a regular API key
            apiUrl.searchParams.append('api_key', apiKeyValue);
          }
        }
      } catch (error) {
        throw new Error(`Invalid URL: ${formData.apiEndpoint}`);
      }

      console.log('Testing API endpoint:', apiUrl.toString());

      // Fetch data
      const response = await fetch(apiUrl.toString());
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Log the response for debugging
      console.log('API Response:', result);

      // Advanced data extraction logic to handle various API structures
      let data: any[] = [];
      let foundData = false;
      
      // Helper function to recursively search for array data
      const findArrayData = (obj: any, maxDepth = 3, currentDepth = 0): any[] | null => {
        // Stop recursion if we've gone too deep
        if (currentDepth > maxDepth) return null;
        
        // If it's an array with items, return it
        if (Array.isArray(obj) && obj.length > 0) {
          // Check if array items are objects
          if (typeof obj[0] === 'object' && obj[0] !== null) {
            return obj;
          }
        }
        
        // If it's an object, search its properties
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          // Check common array property names first
          const commonArrayProps = ['data', 'results', 'rows', 'items', 'values', 'records', 'content'];
          for (const prop of commonArrayProps) {
            if (obj[prop] && Array.isArray(obj[prop]) && obj[prop].length > 0) {
              // Again check if array items are objects
              if (typeof obj[prop][0] === 'object' && obj[prop][0] !== null) {
                return obj[prop];
              }
            }
          }
          
          // Recursively search nested objects
          for (const key in obj) {
            if (obj[key] && typeof obj[key] === 'object') {
              const found = findArrayData(obj[key], maxDepth, currentDepth + 1);
              if (found) return found;
            }
          }
        }
        
        return null;
      };
      
      // First try with our recursive function
      const foundArray = findArrayData(result);
      if (foundArray) {
        data = foundArray;
        foundData = true;
        console.log('Found array data through recursive search:', data);
      }
      
      // If recursive search didn't find anything, try the original explicit checks
      if (!foundData) {
        if (Array.isArray(result)) {
          data = result;
          foundData = true;
          console.log('Found data in array format');
        } else if (result.data && Array.isArray(result.data)) {
          data = result.data;
          foundData = true;
          console.log('Found data in result.data array');
        } else if (result.results && Array.isArray(result.results)) {
          data = result.results;
          foundData = true;
          console.log('Found data in result.results array');
        } else if (result.rows && Array.isArray(result.rows)) {
          data = result.rows;
          foundData = true;
          console.log('Found data in result.rows array');
        } else if (result.query_result && result.query_result.data && Array.isArray(result.query_result.data.rows)) {
          // Redash format
          data = result.query_result.data.rows;
          foundData = true;
          console.log('Found data in Redash format');
        } else if (typeof result === 'object' && result !== null) {
          // When all else fails, try to use the result object directly
          // This is useful for APIs that return a simple object with values
          // Common for single-value metrics APIs
          
          // If the object has numeric properties that could be values
          const hasNumericValues = Object.values(result).some(val => 
            typeof val === 'number' || 
            (typeof val === 'string' && !isNaN(parseFloat(val as string)))
          );
          
          if (hasNumericValues) {
            data = [result];
            foundData = true;
            console.log('Using result object directly as single-row data - contains numeric values');
          } else {
            // Last resort: convert the entire response to a single row object
            data = [result];
            foundData = true;
            console.log('Using result object directly as single-row data - fallback approach');
          }
        }
      }
      
      if (!foundData) {
        console.error('Unexpected API response format:', result);
        throw new Error('Unexpected API response format. The API did not return data in a recognized format. Please check the console for details.');
      }

      if (data.length === 0) {
        throw new Error('API returned no data');
      }

      // Get the row specified by rowIndex (or the first row if not specified)
      const rowIndex = formData.rowIndex || 0;
      const row = data[Math.min(rowIndex, data.length - 1)];
      
      console.log('Selected row:', row);
      
      // Show all available fields to help user
      const availableFields = Object.keys(row);
      console.log('Available fields:', availableFields);
      
      // Check if the specified field exists
      if (formData.valueField && !row.hasOwnProperty(formData.valueField)) {
        // Try a case-insensitive match for better user experience
        const fieldLower = formData.valueField.toLowerCase();
        const matchingField = availableFields.find(f => f.toLowerCase() === fieldLower);
        
        if (matchingField) {
          // Found a case-insensitive match, suggest it to the user
          setTestResult({
            success: false,
            message: `Field "${formData.valueField}" not found exactly, but found similar field "${matchingField}". Please use the exact field name.`,
          });
          return;
        }
        
        // Suggest fields that might be similar or contain similar substrings
        const possiblyRelated = availableFields.filter(f => 
          f.toLowerCase().includes(fieldLower) || 
          fieldLower.includes(f.toLowerCase())
        );
        
        let fieldSuggestion = '';
        if (possiblyRelated.length > 0) {
          fieldSuggestion = `\n\nSimilar fields: ${possiblyRelated.join(', ')}`;
        }
        
        if (availableFields.length > 0) {
          fieldSuggestion += `\n\nAll available fields: ${availableFields.join(', ')}`;
        }
        
        throw new Error(`Field "${formData.valueField}" not found in data.${fieldSuggestion}`);
      }

      // If no field is specified yet, just show success with field list
      if (!formData.valueField) {
        setTestResult({
          success: true,
          message: `API connection successful. Please select a field from: ${availableFields.join(', ')}`,
        });
        return;
      }

      // Success with the value
      const value = row[formData.valueField];
      let displayValue = value;
      
      // Format the display value based on type for better readability
      if (typeof value === 'number') {
        displayValue = value.toLocaleString();
      } else if (typeof value === 'object' && value !== null) {
        displayValue = JSON.stringify(value);
      }
      
      setTestResult({
        success: true,
        message: `Value found: ${displayValue} (${typeof value})`,
      });
    } catch (error) {
      console.error('API test error:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setTestLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Save counter config
      const savedConfig = await saveCounterConfig(formData);
      
      // Clear any caches for this page to ensure counter appears
      if (typeof window !== 'undefined' && formData.page) {
        try {
          // Clear localStorage cache for this page
          localStorage.removeItem(`counters_page_${formData.page}`);
          console.log(`Cleared localStorage cache for page ${formData.page}`);
          
          // Also clear session storage if it exists
          sessionStorage.removeItem(`counters_page_${formData.page}`);
          
          // Force browser to reload data by setting a flag
          localStorage.setItem('counters_need_refresh', 'true');
          localStorage.setItem('counters_refreshed_page', formData.page);
          localStorage.setItem('counters_refresh_time', Date.now().toString());
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
      console.error('Error saving counter:', error);
      alert('Failed to save counter. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-gray-900 p-6 rounded-lg">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">{initialData ? 'Edit Counter' : 'Add Counter'}</h2>
        
        {/* Basic Information */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-400">
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Active Users"
              required
            />
          </div>
          
          {/* Menu and Page Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Replace single page dropdown with menu + page dropdowns */}
            <div>
              <label htmlFor="menu" className="block text-sm font-medium text-gray-400">
                Menu Option
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
                Dashboard Page
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
                 "Select the page where this counter will appear"}
              </p>
            </div>
          </div>
          
          {/* Counter Width Selection */}
          <div>
            <label htmlFor="width" className="block text-sm font-medium text-gray-400">
              Counter Width
            </label>
            <select
              id="width"
              name="width"
              value={formData.width || 1}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={1}>1/3 - One third width</option>
              <option value={2}>1/2 - Half width</option>
              <option value={3}>3/3 - Full width</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select how wide the counter should be on desktop. On mobile, all counters will be full width.
            </p>
          </div>
        </div>
        
        {/* API Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-300">API Settings</h3>
          
          <div>
            <label htmlFor="apiEndpoint" className="block text-sm font-medium text-gray-400">
              API Endpoint
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="valueField" className="block text-sm font-medium text-gray-400">
                Value Field
              </label>
              <input
                type="text"
                id="valueField"
                name="valueField"
                value={formData.valueField}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="value"
                required
              />
            </div>
            
            <div>
              <label htmlFor="rowIndex" className="block text-sm font-medium text-gray-400">
                Row Index
              </label>
              <input
                type="number"
                id="rowIndex"
                name="rowIndex"
                value={formData.rowIndex}
                onChange={handleChange}
                min="0"
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>
          </div>
        </div>
        
        {/* Display Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-300">Display Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="prefix" className="block text-sm font-medium text-gray-400">
                Prefix (Optional)
              </label>
              <input
                type="text"
                id="prefix"
                name="prefix"
                value={formData.prefix}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="$"
              />
            </div>
            
            <div>
              <label htmlFor="suffix" className="block text-sm font-medium text-gray-400">
                Suffix (Optional)
              </label>
              <input
                type="text"
                id="suffix"
                name="suffix"
                value={formData.suffix}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="%"
              />
            </div>

            <div>
              <label htmlFor="icon" className="block text-sm font-medium text-gray-400">
                Icon
              </label>
              <select
                id="icon"
                name="icon"
                value={formData.icon}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="users">Users</option>
                <option value="revenue">Revenue</option>
                <option value="chart">Chart</option>
                <option value="percent">Percent</option>
                <option value="fire">Fire</option>
                <option value="globe">Globe</option>
              </select>
            </div>
          </div>
          
          <div>
            <label htmlFor="variant" className="block text-sm font-medium text-gray-400">
              Color Variant
            </label>
            <select
              id="variant"
              name="variant"
              value={formData.variant}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="blue">Blue</option>
              <option value="indigo">Indigo</option>
              <option value="purple">Purple</option>
              <option value="emerald">Emerald</option>
              <option value="amber">Amber</option>
              <option value="rose">Rose</option>
            </select>
          </div>
        </div>
        
        {/* Trend Configuration */}
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showTrend"
              checked={showTrendConfig}
              onChange={toggleTrendConfig}
              className="mr-2 h-4 w-4 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500"
            />
            <label htmlFor="showTrend" className="text-md font-medium text-gray-300">
              Show Trend Indicator
            </label>
          </div>
          
          {showTrendConfig && (
            <div className="grid grid-cols-1 gap-4 ml-6 pt-2">
              {/* Auto calculate option */}
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="autoCalculateTrend"
                  checked={autoCalculateTrend}
                  onChange={toggleAutoCalculateTrend}
                  className="mr-2 h-4 w-4 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500"
                />
                <label htmlFor="autoCalculateTrend" className="text-sm font-medium text-gray-400">
                  Auto calculate trend from previous value
                </label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="trendValueField" className="block text-sm font-medium text-gray-400">
                    Trend Value Field
                  </label>
                  <input
                    type="text"
                    id="trendValueField"
                    name="valueField"
                    value={autoCalculateTrend ? 'auto_calculate' : formData.trendConfig?.valueField || ''}
                    onChange={handleTrendConfigChange}
                    className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder={autoCalculateTrend ? "Auto calculated" : "percent_change"}
                    required={showTrendConfig && !autoCalculateTrend}
                    disabled={autoCalculateTrend}
                  />
                  {autoCalculateTrend && (
                    <p className="mt-1 text-xs text-gray-500">
                      Trend will be automatically calculated from previous values in the data
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="trendLabel" className="block text-sm font-medium text-gray-400">
                    Trend Label
                  </label>
                  <input
                    type="text"
                    id="trendLabel"
                    name="label"
                    value={formData.trendConfig?.label || 'vs. previous period'}
                    onChange={handleTrendConfigChange}
                    className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="vs. previous period"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Test Button */}
        <div className="mt-4">
          <button
            type="button"
            onClick={testApi}
            disabled={testLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            {testLoading ? 'Testing...' : 'Test Configuration'}
          </button>
          
          {testResult && (
            <div className={`mt-3 p-3 rounded-md ${testResult.success ? 'bg-green-900/30 border border-green-800/40 text-green-400' : 'bg-red-900/30 border border-red-800/40 text-red-400'}`}>
              {testResult.message}
            </div>
          )}
        </div>
      </div>
      
      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel || (() => router.back())}
          className="px-4 py-2 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-transparent hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {initialData ? 'Update Counter' : 'Create Counter'}
        </button>
      </div>
    </form>
  );
};

export default CounterForm; 