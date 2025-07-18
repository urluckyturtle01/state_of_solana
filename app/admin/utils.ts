import { ChartConfig, ChartFormData } from './types';
import { CounterConfig } from './types';
import { TableConfig } from './types';

// Generate a unique ID for a new chart
export function generateChartId(): string {
  return 'chart_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

// Convert form data to chart config
export function formDataToConfig(formData: ChartFormData, isDualAxis?: boolean): ChartConfig {
  const now = new Date().toISOString();
  
  // Set chart type to dual-axis if specified
  let updatedFormData = { ...formData };
  if (isDualAxis) {
    updatedFormData.chartType = 'dual-axis';
  }
  
  return {
    id: generateChartId(),
    ...updatedFormData,
    createdAt: now,
    updatedAt: now,
  };
}

// Helper function to find a matching field with flexible matching
const findMatchingField = (obj: any, fieldName: string): string | null => {
  // Direct match
  if (fieldName in obj) return fieldName;
  
  // Case insensitive match
  const lowerField = fieldName.toLowerCase();
  const keys = Object.keys(obj);
  
  // First try exact match with lowercase
  for (const key of keys) {
    if (key.toLowerCase() === lowerField) return key;
  }
  
  // Then try replacing spaces with underscores and vice versa
  const spaceToUnderscore = lowerField.replace(/ /g, '_');
  const underscoreToSpace = lowerField.replace(/_/g, ' ');
  
  for (const key of keys) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === spaceToUnderscore || lowerKey === underscoreToSpace) {
      return key;
    }
  }
  
  return null;
};

// Function to validate an API endpoint
export const validateApiEndpoint = async (
  apiEndpoint: string, 
  apiKey?: string,
  parameters?: Record<string, any>
): Promise<{ 
  valid: boolean; 
  message?: string; 
  data?: { columns: string[], sampleRows?: any[] } 
}> => {
  try {
    // Create URL object to validate and manipulate the URL
    let apiUrl;
    try {
      apiUrl = new URL(apiEndpoint);
    } catch (error) {
      return {
        valid: false,
        message: `Invalid URL format: ${apiEndpoint}`
      };
    }
    
    // Add API key to URL parameters if provided
    if (apiKey) {
      // Check if the apiKey contains max_age parameter
      const apiKeyValue = apiKey.trim();
      
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
    
    // Prepare fetch options
    const options: RequestInit = {
      method: parameters ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    };
    
    // Add parameters for POST request if provided - using data-raw format from the example
    if (parameters && Object.keys(parameters).length > 0) {
      // Format exactly as in the cURL example: {"parameters":{"Date Part":"W"}}
      options.body = JSON.stringify({ parameters });
      
      // Log parameters in a more readable format
      console.log(`API request parameters:`, JSON.stringify(parameters, null, 2));
      console.log(`Full request body:`, options.body);
      
      // Log parameter validation info for debugging
      const paramKeys = Object.keys(parameters);
      if (paramKeys.length > 1) {
        console.log(`Multiple parameters detected (${paramKeys.length}): ${paramKeys.join(', ')}`);
      }
    }
    
    // Log the API request being made for debugging
    console.log(`Validating API endpoint: ${apiUrl.toString()} with method: ${options.method}`);
    
    // Fetch data with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(apiUrl.toString(), {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Log the response status
      console.log(`API response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        // Try to get error details from the response body
        let errorDetail = '';
        let errorJson = null;
        
        try {
          const errorText = await response.text();
          errorDetail = errorText.length > 0 ? ` Error details: ${errorText}` : '';
          
          // Try to parse the error as JSON for more specific handling
          try {
            errorJson = JSON.parse(errorText);
          } catch {
            // Not JSON, continue with text error
          }
          
          // Check for common parameter errors and provide helpful messages
          if (errorJson && errorJson.message) {
            if (errorJson.message.includes('parameter values are incompatible')) {
              // Extract the parameter name if possible
              const paramMatch = errorJson.message.match(/parameter values are incompatible.*?: (.+?)($|\})/i);
              const paramName = paramMatch ? paramMatch[1].trim() : null;
              
              if (paramName) {
                return {
                  valid: false,
                  message: `Parameter error: "${paramName}" appears to be incompatible. This might be due to incorrect case sensitivity - ensure the parameter name matches exactly what the API expects (e.g., "currency" vs "Currency").`
                };
              }
            }
          }
        } catch (_) { /* Ignore error reading body */ }
        
        return {
          valid: false,
          message: `API request failed with status ${response.status}: ${response.statusText}.${errorDetail} Check if the URL is correct and accessible.`
        };
      }
      
      const data = await response.json();
      
      // Handle different API response formats
      let rows = [];
      let columns = [];
      
      // Log the top-level structure of the response
      console.log(`API response structure:`, Object.keys(data));
      
      // Format 1: Standard Redash format with query_result.data.rows
      if (data?.query_result?.data?.rows) {
        rows = data.query_result.data.rows;
        columns = data.query_result.data.columns.map((col: any) => col.name);
      } 
      // Format 2: Direct array response
      else if (Array.isArray(data)) {
        rows = data;
        if (rows.length > 0) {
          columns = Object.keys(rows[0]);
        }
      } 
      // Format 3: Data property containing array
      else if (data?.data && Array.isArray(data.data)) {
        rows = data.data;
        if (rows.length > 0) {
          columns = Object.keys(rows[0]);
        }
      }
      // Format 4: Rows property containing array
      else if (data?.rows && Array.isArray(data.rows)) {
        rows = data.rows;
        if (rows.length > 0) {
          columns = Object.keys(rows[0]);
        }
      }
      // Format 5: Results property containing array
      else if (data?.results && Array.isArray(data.results)) {
        rows = data.results;
        if (rows.length > 0) {
          columns = Object.keys(rows[0]);
        }
      }
      // Format 6: If we have an 'error' property in the response
      else if (data?.error) {
        return {
          valid: false,
          message: `API returned an error: ${data.error}`
        };
      }
      else {
        console.error('Unrecognized API response structure:', data);
        return {
          valid: false,
          message: 'API response does not have a recognized structure. Check the console for details.'
        };
      }
      
      if (rows.length === 0) {
        return {
          valid: true,
          message: 'API endpoint is valid but returned no data',
          data: { columns: [] }
        };
      }
      
      // Include parameter info in success message
      const paramInfo = parameters && Object.keys(parameters).length > 0 
        ? ` (with ${Object.keys(parameters).length} filter parameters)` 
        : '';
      
      return {
        valid: true,
        message: `API endpoint is valid${paramInfo}. Found ${rows.length} rows and ${columns.length} columns.`,
        data: {
          columns,
          sampleRows: rows.slice(0, 3) // Return first 3 rows as sample
        }
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError; // Re-throw to be caught by the outer try-catch
    }
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          valid: false,
          message: 'API request timed out after 10 seconds'
        };
      }
      
      // Network errors
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        return {
          valid: false,
          message: `Network error: Unable to reach the API. Check if the endpoint is accessible from your current network.`
        };
      }
      
      // CORS issues
      if (error.message.includes('CORS')) {
        return {
          valid: false,
          message: `CORS error: The API doesn't allow requests from this origin. You may need to enable CORS on the API server.`
        };
      }
      
      console.error('API validation error:', error);
      return {
        valid: false,
        message: `Error validating API: ${error.message}`
      };
    }
    
    console.error('Unknown API validation error:', error);
    return {
      valid: false,
      message: 'Unknown error validating API endpoint'
    };
  }
};

/**
 * Save a chart configuration
 */
export async function saveChartConfig(config: ChartConfig): Promise<boolean> {
  try {
    console.log(`Saving chart with title: ${config.title}`);
    
    // Update timestamps
    config.updatedAt = new Date().toISOString();
    if (!config.createdAt) {
      config.createdAt = config.updatedAt;
    }
    
    // Get proper base URL - use window.location in browser, or fallback to relative path in SSR
    const baseUrl = typeof window !== 'undefined' 
      ? `${window.location.protocol}//${window.location.host}`
      : '';
        
    const url = `${baseUrl}/api/charts`;
    console.log(`Sending POST request to ${url}`);
    
    // Use safeFetch instead of fetch
    const response = await safeFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    
    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} - ${response.statusText}`;
      let errorDetails = '';
        
      try {
        const errorData = await response.json();
        errorDetails = errorData.error || errorData.details || 'Unknown error';
        errorMessage += ` - ${errorDetails}`;
      } catch (e) {
        // Ignore JSON parsing error
      }
      console.error(errorMessage);
        
      // Fall back to localStorage if we have an API error
      if (typeof window !== 'undefined') {
        console.warn('API error, falling back to localStorage temporarily');
        const storageKey = 'solana-charts';
        
        // Get existing configs
        let existingConfigs: ChartConfig[] = [];
        const storedCharts = localStorage.getItem(storageKey);
        if (storedCharts) {
          existingConfigs = JSON.parse(storedCharts) as ChartConfig[];
        }
        
        // Check if we're updating an existing config
        const existingIndex = existingConfigs.findIndex(c => c.id === config.id);
        
        if (existingIndex >= 0) {
          // Update existing
          existingConfigs[existingIndex] = config;
        } else {
          // Add new
          existingConfigs.push(config);
        }
        
        // Save to local storage
        localStorage.setItem(storageKey, JSON.stringify(existingConfigs));
        console.log('Chart saved temporarily to localStorage');
      }
      
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('Chart saved successfully to S3:', result);
    return true;
  } catch (error) {
    console.error('Error saving chart config:', error);
    
    // Alert user about the error with improved message
    if (typeof window !== 'undefined') {
      let errorMessage = 'Failed to save chart.';
      
      // Add more specific guidance based on error type
      if (error instanceof Error) {
        if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
          errorMessage += ' There was a server error processing your request.';
          errorMessage += ' The chart may have been saved locally as a temporary backup.';
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          errorMessage += ' There appears to be a network or connection issue.';
        } else if (error.message.includes('S3')) {
          errorMessage += ' There was an issue with S3 storage.';
        } else {
          errorMessage += ' ' + error.message;
        }
      }
      
      errorMessage += ' Please try again later or contact support if the issue persists.';
      alert(errorMessage);
    }
    
    return false;
  }
}

/**
 * Get all chart configurations
 */
export async function getAllChartConfigs(): Promise<ChartConfig[]> {
  // Store for localStorage charts in case we need to merge them
  let localStorageCharts: ChartConfig[] = [];
  
  // Try to get localStorage charts regardless of API success
  if (typeof window !== 'undefined') {
    const storageKey = 'solana-charts';
    const storedCharts = localStorage.getItem(storageKey);
    if (storedCharts) {
      localStorageCharts = JSON.parse(storedCharts) as ChartConfig[];
      console.log('Found charts in localStorage:', localStorageCharts.length);
    }
  }
  
  try {
    // Get proper base URL - use window.location in browser, or fallback to relative path in SSR
    const baseUrl = typeof window !== 'undefined' 
      ? `${window.location.protocol}//${window.location.host}`
      : '';
    
    console.log('Fetching charts from API');
    // Use safeFetch to handle browser extension interference
    const response = await safeFetch(`${baseUrl}/api/charts`);
    
    if (!response.ok) {
      console.warn(`API error: ${response.status} - ${response.statusText} - Using localStorage charts only`);
      return localStorageCharts;
    }
    
    const data = await response.json();
    console.log('Received charts from API:', data.charts?.length || 0);
    
    // Combine API charts with localStorage charts
    // Use a Map to ensure no duplicates by ID
    const chartsMap = new Map<string, ChartConfig>();
    
    // Add API charts first (they take precedence)
    (data.charts || []).forEach((chart: ChartConfig) => {
      chartsMap.set(chart.id, chart);
    });
    
    // Add localStorage charts that don't exist in API response
    localStorageCharts.forEach(chart => {
      if (!chartsMap.has(chart.id)) {
        chartsMap.set(chart.id, chart);
      }
    });
    
    const combinedCharts = Array.from(chartsMap.values());
    console.log('Combined charts count:', combinedCharts.length);
    return combinedCharts;
  } catch (error) {
    console.warn('Error calling charts API - Using localStorage charts only', error);
    return localStorageCharts;
  }
}

/**
 * Get chart configurations for a specific page
 */
export async function getChartConfigsByPage(pageId: string): Promise<ChartConfig[]> {
  console.log(`Getting charts for page: ${pageId}`);
  try {
    // Get all charts and filter by page
    const allCharts = await getAllChartConfigs();
    const pageCharts = allCharts.filter((chart: ChartConfig) => chart.page === pageId);
    
    // Sort by position if available, otherwise by creation date
    return pageCharts.sort((a, b) => {
      const positionA = a.position ?? 999999;
      const positionB = b.position ?? 999999;
      
      if (positionA !== positionB) {
        return positionA - positionB;
      }
      
      // Fallback to creation date if positions are equal
      const dateA = new Date(a.createdAt || '').getTime();
      const dateB = new Date(b.createdAt || '').getTime();
      return dateA - dateB;
    });
  } catch (error) {
    console.error('Error fetching charts:', error);
    return [];
  }
}

/**
 * Update a chart configuration
 */
export async function updateChartConfig(updatedConfig: ChartConfig): Promise<void> {
  await saveChartConfig(updatedConfig);
}

/**
 * Delete a chart configuration
 */
export async function deleteChartConfig(chartId: string): Promise<boolean> {
  try {
    console.log(`Deleting chart ${chartId}`);
    
    // First, remove from localStorage if it exists there
    let deletedFromLocalStorage = false;
    if (typeof window !== 'undefined') {
      const storageKey = 'solana-charts';
      const storedCharts = localStorage.getItem(storageKey);
      if (storedCharts) {
        const existingConfigs = JSON.parse(storedCharts) as ChartConfig[];
        const initialLength = existingConfigs.length;
        const updatedConfigs = existingConfigs.filter(c => c.id !== chartId);
        
        // Only update localStorage if we actually removed something
        if (updatedConfigs.length < initialLength) {
          localStorage.setItem(storageKey, JSON.stringify(updatedConfigs));
          console.log(`Chart ${chartId} removed from localStorage`);
          deletedFromLocalStorage = true;
        }
      }
    }
    
    // Use API endpoint to delete from S3
    const baseUrl = typeof window !== 'undefined' 
      ? `${window.location.protocol}//${window.location.host}`
      : '';
      
    // Use safeFetch instead of fetch
    const response = await safeFetch(`${baseUrl}/api/charts/${chartId}`, {
      method: 'DELETE',
    });
    
    // Handle different API response statuses
    if (!response.ok) {
      // 404 is fine - it just means the chart wasn't in S3
      if (response.status === 404) {
        console.log(`Chart ${chartId} not found in S3 (404) - this is OK if it was only in localStorage`);
        
        // If we successfully deleted from localStorage, consider the operation successful
        if (deletedFromLocalStorage) {
          return true;
        }
        
        // If not in localStorage either, it truly doesn't exist
        console.warn(`Chart ${chartId} was not found in localStorage or S3`);
        return false;
      }
      
      // For other errors, log but don't throw if we already deleted from localStorage
      console.warn(`API error: ${response.status} - ${response.statusText}`);
      
      if (deletedFromLocalStorage) {
        console.log(`Chart was deleted from localStorage but API deletion failed`);
        return true;
      }
      
      // If not deleted from localStorage, and API failed, then it's a true error
      throw new Error(`API error: ${response.statusText}`);
    }
    
    console.log(`Chart ${chartId} deleted successfully from S3`);
    return true;
  } catch (error) {
    console.error('Error deleting chart:', error);
    
    // Alert user about the error
    if (typeof window !== 'undefined') {
      let errorMessage = 'Failed to delete chart.';
      if (error instanceof Error) {
        errorMessage += ' ' + error.message;
      }
      alert(errorMessage);
    }
    
    return false;
  }
}

/**
 * Helper function for more resilient API calls that can handle browser extension interference
 */
async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    // First attempt - regular fetch
    return await fetch(url, options);
  } catch (error) {
    console.warn('Initial fetch failed, trying XMLHttpRequest fallback:', error);
    
    // If fetch fails, try XMLHttpRequest as fallback
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(options?.method || 'GET', url);
      
      // Set headers
      if (options?.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value as string);
        });
      }
      
      xhr.onload = function() {
        // Create a Response-like object
        const response = {
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          statusText: xhr.statusText,
          headers: new Headers(),
          text: () => Promise.resolve(xhr.responseText),
          json: () => Promise.resolve(JSON.parse(xhr.responseText)),
        } as unknown as Response;
        
        resolve(response);
      };
      
      xhr.onerror = function() {
        reject(new Error('Network error with XMLHttpRequest'));
      };
      
      xhr.ontimeout = function() {
        reject(new Error('Timeout with XMLHttpRequest'));
      };
      
      // Send with body if provided
      if (options?.body) {
        xhr.send(options.body as string);
      } else {
        xhr.send();
      }
    });
  }
}

/**
 * Get all counter configurations for a specific page
 * @param pageId ID of the page to get counters for
 * @returns Promise with array of counter configurations
 */
export const getCounterConfigsByPage = async (pageId: string): Promise<CounterConfig[]> => {
  try {
    // Use performance monitoring
    const startTime = performance.now();
    
    // Check if we need to force a refresh (flag set by CounterForm)
    const needsRefresh = typeof window !== 'undefined' && localStorage.getItem('counters_need_refresh') === 'true';
    const refreshedPage = typeof window !== 'undefined' && localStorage.getItem('counters_refreshed_page');
    const refreshTime = typeof window !== 'undefined' ? parseInt(localStorage.getItem('counters_refresh_time') || '0', 10) : 0;
    const cacheMaxAge = 5 * 60 * 1000; // 5 minutes in milliseconds
    const shouldForceRefresh = needsRefresh && 
                              refreshedPage === pageId && 
                              (refreshTime > Date.now() - cacheMaxAge);
    
    // Initialize local cache variable
    let localCachedCounters: CounterConfig[] = [];
    
    // Skip cache if we need a refresh for this specific page
    if (shouldForceRefresh) {
      console.log(`Force refreshing counters for page ${pageId} due to new counter creation`);
    } else {
      // Check local storage cache first for instant display
      if (typeof window !== 'undefined') {
        try {
          const localCache = localStorage.getItem(`counters_page_${pageId}`);
          if (localCache) {
            const cachedData = JSON.parse(localCache);
            if (cachedData.expires > Date.now()) {
              console.log(`Using local cache for counters on page ${pageId}, expires in ${Math.round((cachedData.expires - Date.now()) / 1000)}s`);
              localCachedCounters = cachedData.counters;
              
              // If we're not forcing a refresh, return the cached data
              if (!shouldForceRefresh) {
                // Add performance timing
                const endTime = performance.now();
                console.log(`Loaded ${localCachedCounters.length} counters from cache in ${Math.round(endTime - startTime)}ms`);
                
                return localCachedCounters;
              }
            } else {
              console.log(`Cache for counters on page ${pageId} has expired`);
            }
          }
        } catch (e) {
          console.warn('Error reading from local cache:', e);
        }
      }
    }
    
    // Try to get counters from the API
    try {
      console.log(`Fetching counters for page ${pageId} from API`);
      
      // Include cache-busting parameter when forcing refresh
      const cacheBuster = shouldForceRefresh ? `&_t=${Date.now()}` : '';
      
      // Make the API request with retry
      const MAX_RETRIES = 2;
      let apiResponse = null;
      let retries = 0;
      
      while (retries <= MAX_RETRIES) {
        try {
          const response = await fetch(`/api/counters?page=${encodeURIComponent(pageId)}${cacheBuster}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': shouldForceRefresh ? 'no-cache' : 'default',
            },
          });
          
          if (response.ok) {
            apiResponse = await response.json();
            break; // Exit loop on success
          } else {
            console.warn(`API request failed (attempt ${retries + 1}/${MAX_RETRIES + 1}):`, response.status, response.statusText);
          }
        } catch (fetchError) {
          console.error(`API fetch error (attempt ${retries + 1}/${MAX_RETRIES + 1}):`, fetchError);
        }
        
        retries++;
        if (retries <= MAX_RETRIES) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retries - 1)));
        }
      }
      
      // If we got a response, process it
      if (apiResponse && apiResponse.counters) {
        console.log(`Loaded ${apiResponse.counters.length} counters from API for page ${pageId}`);
        
        // Cache the response if we have counters
        if (typeof window !== 'undefined' && apiResponse.counters.length > 0) {
          const cacheExpiry = Date.now() + (30 * 60 * 1000); // 30 minutes cache
          localStorage.setItem(`counters_page_${pageId}`, JSON.stringify({
            counters: apiResponse.counters,
            expires: cacheExpiry,
            fetchTime: Date.now(),
          }));
          console.log(`Cached ${apiResponse.counters.length} counters for page ${pageId}, expires in 30min`);
          
          // If this was a forced refresh, clear the flag
          if (shouldForceRefresh && refreshedPage === pageId) {
            localStorage.setItem('counters_need_refresh', 'false');
            console.log('Cleared counters refresh flag after successful refresh');
          }
        }
        
        // Add performance timing
        const endTime = performance.now();
        console.log(`Loaded ${apiResponse.counters.length} counters from API in ${Math.round(endTime - startTime)}ms`);
        
        return apiResponse.counters;
      }
    } catch (apiError) {
      console.error('Error fetching counters from API:', apiError);
    }
    
    // Use our local cache if API fails but we have cached data
    if (localCachedCounters.length > 0) {
      console.log(`Using ${localCachedCounters.length} counters from local cache as fallback`);
      return localCachedCounters;
    }
    
    // Fall back to localStorage if API fails and no local cache
    if (typeof window !== 'undefined') {
      try {
        // Try all_counters first (might have been fetched by dashboard manager)
        const allCountersStr = localStorage.getItem('all_counters');
        if (allCountersStr) {
          const allCountersData = JSON.parse(allCountersStr);
          const allCounters = Array.isArray(allCountersData) ? allCountersData : (allCountersData.counters || []);
          
          // Filter counters by page
          const pageCounters = allCounters.filter((counter: CounterConfig) => counter.page === pageId);
          if (pageCounters.length > 0) {
            console.log(`Using ${pageCounters.length} counters from all_counters as fallback`);
            return pageCounters;
          }
        }
        
        // Then try counterConfigs
        const storedCounters = localStorage.getItem('counterConfigs');
        if (storedCounters) {
          const counters: CounterConfig[] = JSON.parse(storedCounters);
          
          // Filter counters by page
          const pageCounters = counters.filter(counter => counter.page === pageId);
          console.log(`Using ${pageCounters.length} counters from localStorage counterConfigs as last resort`);
          return pageCounters;
        }
      } catch (e) {
        console.error('Error reading from localStorage:', e);
      }
    }
    
    console.log(`No counters found for page ${pageId}`);
    return [];
  } catch (error) {
    console.error('Error getting counters for page:', error);
    
    // Try our local cache first if we have it
    if (typeof window !== 'undefined') {
      try {
        const localCache = localStorage.getItem(`counters_page_${pageId}`);
        if (localCache) {
          const cachedData = JSON.parse(localCache);
          console.log(`Using local cache due to error`);
          return cachedData.counters || [];
        }
      } catch (e) {
        console.warn('Error reading from local cache:', e);
      }
      
      // Fall back to legacy localStorage as last resort
      const storedCounters = localStorage.getItem('counterConfigs');
      const counters: CounterConfig[] = storedCounters ? JSON.parse(storedCounters) : [];
      
      // Filter counters by page
      return counters.filter(counter => counter.page === pageId);
    }
    
    return [];
  }
};

/**
 * Save a counter configuration to S3 and localStorage as backup
 * @param counterConfig The counter configuration to save
 * @returns Promise with the saved counter configuration
 */
export const saveCounterConfig = async (counterConfig: CounterConfig): Promise<CounterConfig> => {
  try {
    // Handle legacy summary pages by checking if this is one of the prefixed pages
    const pageId = counterConfig.page;
    const compatibilityPageId = pageId === 'protocol-revenue-summary' || 
                               pageId === 'dex-summary' || 
                               pageId === 'mev-summary' 
                               ? 'summary' : null;
    
    // Set createdAt if new counter
    const now = new Date().toISOString();
    const counterWithTimestamps = {
      ...counterConfig,
      updatedAt: now,
    };

    // If this is a new counter (no createdAt), set it now
    if (!counterConfig.createdAt) {
      counterWithTimestamps.createdAt = now;
    }
    
    // First try to save to the API (S3)
    const response = await fetch('/api/counters', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(counterWithTimestamps),
    });

    if (!response.ok) {
      console.warn(`API save failed with status ${response.status}:`, await response.text());
      throw new Error('API save failed');
    }

    console.log(`Counter saved to S3 successfully: ${counterConfig.id}`);
    
    // Also save to localStorage as backup (and for offline support)
    if (typeof window !== 'undefined') {
      // Update the main counters storage
      const storedCounters = localStorage.getItem('counterConfigs');
      const counters: CounterConfig[] = storedCounters ? JSON.parse(storedCounters) : [];
      
      // Find the index of the counter if it exists
      const existingIndex = counters.findIndex(c => c.id === counterConfig.id);
      
      if (existingIndex >= 0) {
        // Update existing counter
        counters[existingIndex] = counterWithTimestamps;
      } else {
        // Add as new counter
        counters.push(counterWithTimestamps);
      }
      
      // Save to localStorage
      localStorage.setItem('counterConfigs', JSON.stringify(counters));
      
      // Clear all page-specific caches to ensure counter appears
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('counters_page_')) {
          console.log(`Clearing cache for ${key}`);
          localStorage.removeItem(key);
        }
      }
      
      // Also clear session storage caches if any
      if (typeof sessionStorage !== 'undefined') {
        const sessionKeys = Object.keys(sessionStorage);
        for (const key of sessionKeys) {
          if (key.startsWith('counters_page_')) {
            console.log(`Clearing session cache for ${key}`);
            sessionStorage.removeItem(key);
          }
        }
      }
      
      // Set flags to force refresh
      localStorage.setItem('counters_need_refresh', 'true');
      localStorage.setItem('counters_refreshed_page', pageId);
      localStorage.setItem('counters_refresh_time', Date.now().toString());
      
      // If this is a prefixed page, also set a flag for the 'summary' compatibility page
      if (compatibilityPageId) {
        localStorage.setItem('counters_compat_page', compatibilityPageId);
      }
      
      // Update all_counters if it exists
      try {
        const allCountersStr = localStorage.getItem('all_counters');
        if (allCountersStr) {
          const allCountersData = JSON.parse(allCountersStr);
          let allCounters = Array.isArray(allCountersData) ? allCountersData : (allCountersData.counters || []);
          
          // Remove existing counter if present
          allCounters = allCounters.filter((c: CounterConfig) => c.id !== counterConfig.id);
          
          // Add the updated counter
          allCounters.push(counterWithTimestamps);
          
          // Save back
          if (Array.isArray(allCountersData)) {
            localStorage.setItem('all_counters', JSON.stringify(allCounters));
          } else {
            localStorage.setItem('all_counters', JSON.stringify({
              ...allCountersData,
              counters: allCounters
            }));
          }
        }
      } catch (e) {
        console.warn('Error updating all_counters:', e);
      }
    }
    
    // Add a small delay before returning to allow API processing time
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return counterWithTimestamps;
  } catch (error) {
    console.error('Error saving counter config:', error);
    
    // Fall back to localStorage only if API call fails
    if (typeof window !== 'undefined') {
      const now = new Date().toISOString();
      const counterWithTimestamps = {
        ...counterConfig,
        updatedAt: now,
      };

      // If this is a new counter (no createdAt), set it now
      if (!counterConfig.createdAt) {
        counterWithTimestamps.createdAt = now;
      }
      
      const storedCounters = localStorage.getItem('counterConfigs');
      const counters: CounterConfig[] = storedCounters ? JSON.parse(storedCounters) : [];
      
      // Find the index of the counter if it exists
      const existingIndex = counters.findIndex(c => c.id === counterConfig.id);
      
      if (existingIndex >= 0) {
        // Update existing counter
        counters[existingIndex] = counterWithTimestamps;
      } else {
        // Add as new counter
        counters.push(counterWithTimestamps);
      }
      
      // Save to localStorage
      localStorage.setItem('counterConfigs', JSON.stringify(counters));
      
      // Clear relevant page cache to force refresh
      if (counterConfig.page) {
        localStorage.removeItem(`counters_page_${counterConfig.page}`);
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(`counters_page_${counterConfig.page}`);
        }
        
        // Set flags to force refresh
        localStorage.setItem('counters_need_refresh', 'true');
        localStorage.setItem('counters_refreshed_page', counterConfig.page);
        localStorage.setItem('counters_refresh_time', Date.now().toString());
      }
      
      return counterWithTimestamps;
    }
    
    throw new Error('Failed to save counter configuration');
  }
};

/**
 * Delete a counter configuration by ID
 * @param counterId ID of the counter to delete
 * @returns Promise indicating success
 */
export const deleteCounterConfig = async (counterId: string): Promise<boolean> => {
  try {
    // First try to delete from the API (S3)
    const response = await fetch(`/api/counters?id=${encodeURIComponent(counterId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('API delete failed, falling back to localStorage');
      throw new Error('API delete failed');
    }

    console.log(`Counter deleted from S3 successfully: ${counterId}`);
    
    // Also delete from localStorage
    if (typeof window !== 'undefined') {
      const storedCounters = localStorage.getItem('counterConfigs');
      const counters: CounterConfig[] = storedCounters ? JSON.parse(storedCounters) : [];
      
      // Filter out the counter to delete
      const filteredCounters = counters.filter(counter => counter.id !== counterId);
      
      // Save back to localStorage
      localStorage.setItem('counterConfigs', JSON.stringify(filteredCounters));
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting counter config:', error);
    
    // Fall back to localStorage only if API call fails
    if (typeof window !== 'undefined') {
      const storedCounters = localStorage.getItem('counterConfigs');
      const counters: CounterConfig[] = storedCounters ? JSON.parse(storedCounters) : [];
      
      // Filter out the counter to delete
      const filteredCounters = counters.filter(counter => counter.id !== counterId);
      
      // Save back to localStorage
      localStorage.setItem('counterConfigs', JSON.stringify(filteredCounters));
      
      return true;
    }
    
    return false;
  }
};

/**
 * Get all counter configurations
 * @returns Promise with array of all counter configurations
 */
export const getAllCounterConfigs = async (): Promise<CounterConfig[]> => {
  try {
    // First try to get counters from the API (S3)
    const response = await fetch('/api/counters', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`Retrieved ${result.counters.length} counters from S3`);
      return result.counters || [];
    }
    
    console.warn('API request failed, falling back to localStorage');
    // Fall back to localStorage if API fails
    if (typeof window !== 'undefined') {
      const storedCounters = localStorage.getItem('counterConfigs');
      return storedCounters ? JSON.parse(storedCounters) : [];
    }
    
    return [];
  } catch (error) {
    console.error('Error getting all counter configs:', error);
    
    // Fall back to localStorage if API call throws an error
    if (typeof window !== 'undefined') {
      const storedCounters = localStorage.getItem('counterConfigs');
      return storedCounters ? JSON.parse(storedCounters) : [];
    }
    
    return [];
  }
};

/**
 * Save a table configuration to S3 and localStorage as backup
 * @param tableConfig The table configuration to save
 * @returns Promise with the saved table configuration
 */
export const saveTableConfig = async (tableConfig: TableConfig): Promise<TableConfig> => {
  try {
    // Set createdAt if new table
    const now = new Date().toISOString();
    const tableWithTimestamps = {
      ...tableConfig,
      updatedAt: now,
    };

    // If this is a new table (no createdAt), set it now
    if (!tableConfig.createdAt) {
      tableWithTimestamps.createdAt = now;
    }
    
    // First try to save to the API (S3)
    const response = await fetch('/api/tables', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tableWithTimestamps),
    });

    if (!response.ok) {
      console.warn('API save failed, falling back to localStorage');
      throw new Error('API save failed');
    }

    console.log(`Table saved to S3 successfully: ${tableConfig.id}`);
    
    // Also save to localStorage as backup (and for offline support)
    if (typeof window !== 'undefined') {
      // Update the main tables storage
      const storedTables = localStorage.getItem('tableConfigs');
      const tables: TableConfig[] = storedTables ? JSON.parse(storedTables) : [];
      
      // Find the index of the table if it exists
      const existingIndex = tables.findIndex(t => t.id === tableConfig.id);
      
      if (existingIndex >= 0) {
        // Update existing table
        tables[existingIndex] = tableWithTimestamps;
      } else {
        // Add as new table
        tables.push(tableWithTimestamps);
      }
      
      // Save to localStorage
      localStorage.setItem('tableConfigs', JSON.stringify(tables));
      
      // Clear all page-specific caches to ensure table appears in correct location and is removed from old page
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('tables_page_')) {
          console.log(`Clearing table cache for ${key}`);
          localStorage.removeItem(key);
        }
      }
      
      // Also clear session storage caches if any
      if (typeof sessionStorage !== 'undefined') {
        const sessionKeys = Object.keys(sessionStorage);
        for (const key of sessionKeys) {
          if (key.startsWith('tables_page_')) {
            console.log(`Clearing session table cache for ${key}`);
            sessionStorage.removeItem(key);
          }
        }
      }
      
      // Set flags to force refresh
      localStorage.setItem('tables_need_refresh', 'true');
      localStorage.setItem('tables_refreshed_page', tableConfig.page);
      localStorage.setItem('tables_refresh_time', Date.now().toString());
    }
    
    return tableWithTimestamps;
  } catch (error) {
    console.error('Error saving table config:', error);
    
    // Fall back to localStorage only if API call fails
    if (typeof window !== 'undefined') {
      const now = new Date().toISOString();
      const tableWithTimestamps = {
        ...tableConfig,
        updatedAt: now,
      };

      // If this is a new table (no createdAt), set it now
      if (!tableConfig.createdAt) {
        tableWithTimestamps.createdAt = now;
      }
      
      const storedTables = localStorage.getItem('tableConfigs');
      const tables: TableConfig[] = storedTables ? JSON.parse(storedTables) : [];
      
      // Find the index of the table if it exists
      const existingIndex = tables.findIndex(t => t.id === tableConfig.id);
      
      if (existingIndex >= 0) {
        // Update existing table
        tables[existingIndex] = tableWithTimestamps;
      } else {
        // Add as new table
        tables.push(tableWithTimestamps);
      }
      
      // Save to localStorage
      localStorage.setItem('tableConfigs', JSON.stringify(tables));
      
      // Clear all page-specific caches to ensure table appears in correct location and is removed from old page
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('tables_page_')) {
          console.log(`Clearing table cache for ${key} (fallback)`);
          localStorage.removeItem(key);
        }
      }
      
      // Also clear session storage caches if any
      if (typeof sessionStorage !== 'undefined') {
        const sessionKeys = Object.keys(sessionStorage);
        for (const key of sessionKeys) {
          if (key.startsWith('tables_page_')) {
            console.log(`Clearing session table cache for ${key} (fallback)`);
            sessionStorage.removeItem(key);
          }
        }
      }
      
      // Set flags to force refresh
      localStorage.setItem('tables_need_refresh', 'true');
      localStorage.setItem('tables_refreshed_page', tableConfig.page);
      localStorage.setItem('tables_refresh_time', Date.now().toString());
      
      return tableWithTimestamps;
    }
    
    throw new Error('Failed to save table configuration');
  }
};

/**
 * Delete a table configuration
 * @param tableId The ID of the table to delete
 * @returns Promise indicating success/failure
 */
export const deleteTableConfig = async (tableId: string): Promise<boolean> => {
  try {
    console.log(`Deleting table ${tableId}`);
    
    // First, remove from localStorage if it exists there
    let deletedFromLocalStorage = false;
    if (typeof window !== 'undefined') {
      // Clear all tables cache
      const allTablesKey = 'all_tables';
      const storedTables = localStorage.getItem(allTablesKey);
      if (storedTables) {
        try {
          const parsedData = JSON.parse(storedTables);
          
          // Handle different possible formats of stored data
          let existingConfigs: TableConfig[] = [];
          
          if (Array.isArray(parsedData)) {
            existingConfigs = parsedData;
          } else if (parsedData && typeof parsedData === 'object' && 'tables' in parsedData && Array.isArray(parsedData.tables)) {
            existingConfigs = parsedData.tables;
          } else {
            console.warn('Stored tables data is not in expected format:', parsedData);
            // Still mark as deleted from localStorage to avoid errors
            deletedFromLocalStorage = true;
            // Remove the invalid data
            localStorage.removeItem(allTablesKey);
          }
          
          if (Array.isArray(existingConfigs)) {
            const initialLength = existingConfigs.length;
            const updatedConfigs = existingConfigs.filter(t => t.id !== tableId);
            
            // Only update localStorage if we actually removed something
            if (updatedConfigs.length < initialLength) {
              localStorage.setItem(allTablesKey, JSON.stringify(updatedConfigs));
              console.log(`Table ${tableId} removed from localStorage`);
              deletedFromLocalStorage = true;
            }
          }
        } catch (e) {
          console.error('Error parsing stored tables:', e);
          // Remove potentially corrupted data
          localStorage.removeItem(allTablesKey);
        }
      }
      
      // Clear page-specific caches
      // We need to clear all page caches since we don't know which page the table belonged to
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('tables_page_')) {
          localStorage.removeItem(key);
        }
      });
    }
    
    // Use API endpoint to delete from S3
    const response = await fetch(`/api/tables/${tableId}`, {
      method: 'DELETE',
    });
    
    // Handle different API response statuses
    if (!response.ok) {
      // 404 is fine - it just means the table wasn't in S3
      if (response.status === 404) {
        console.log(`Table ${tableId} not found in S3 (404) - this is OK if it was only in localStorage`);
        
        // If we successfully deleted from localStorage, consider the operation successful
        if (deletedFromLocalStorage) {
          return true;
        }
        
        // If not in localStorage either, it truly doesn't exist
        console.warn(`Table ${tableId} was not found in localStorage or S3`);
        return false;
      }
      
      // For other errors, log but don't throw if we already deleted from localStorage
      console.warn(`API error: ${response.status} - ${response.statusText}`);
      
      if (deletedFromLocalStorage) {
        console.log(`Table was deleted from localStorage but API deletion failed`);
        return true;
      }
      
      // If not deleted from localStorage, and API failed, then it's a true error
      throw new Error(`API error: ${response.statusText}`);
    }
    
    console.log(`Table ${tableId} deleted successfully from S3`);
    return true;
  } catch (error) {
    console.error('Error deleting table:', error);
    
    // Alert user about the error
    if (typeof window !== 'undefined') {
      let errorMessage = 'Failed to delete table.';
      if (error instanceof Error) {
        errorMessage += ' ' + error.message;
      }
      alert(errorMessage);
    }
    
    return false;
  }
};

// Helper function to normalize table objects
const normalizeTableConfig = (table: any): TableConfig => {
  // If the table doesn't have a page property or it's null/undefined, set it to a default
  if (!table.page) {
    console.log(`[NORMALIZE] Table ${table.id || 'unknown'} missing page property, setting to default`);
    table.page = 'dashboard'; // Default to dashboard as a fallback
  }
  
  return table as TableConfig;
};

/**
 * Get all table configurations
 * @returns Promise with an array of table configurations
 */
export const getAllTableConfigs = async (): Promise<TableConfig[]> => {
  try {
    console.log('[DEBUG] Fetching all table configurations');
    
    // First try to get from localStorage
    if (typeof window !== 'undefined') {
      const storedTables = localStorage.getItem('all_tables');
      if (storedTables) {
        try {
          const parsedTables = JSON.parse(storedTables);
          console.log(`[DEBUG] Found ${Array.isArray(parsedTables) ? parsedTables.length : 0} tables in localStorage`);
          
          if (Array.isArray(parsedTables) && parsedTables.length > 0) {
            // Normalize tables to ensure they have valid page properties
            return parsedTables.map(normalizeTableConfig);
          } else {
            console.log('[DEBUG] No valid tables found in localStorage, fetching from API');
          }
        } catch (e) {
          console.error('Error parsing stored tables:', e);
        }
      } else {
        console.log('[DEBUG] No tables found in localStorage, fetching from API');
      }
    }
    
    // If not in localStorage, fetch from API
    console.log('[DEBUG] Fetching all tables from API');
    const response = await fetch('/api/tables');
    if (!response.ok) {
      throw new Error(`Failed to fetch tables: ${response.statusText}`);
    }
    
    const result = await response.json();
    const rawTables = Array.isArray(result) ? result : Array.isArray(result.tables) ? result.tables : [];
    // Normalize tables to ensure they have valid page properties
    const tables = rawTables.map(normalizeTableConfig);
    console.log(`[DEBUG] API returned ${tables.length} tables`);
    
    // Store in localStorage for future use
    if (typeof window !== 'undefined') {
      localStorage.setItem('all_tables', JSON.stringify(tables));
      console.log(`[DEBUG] Saved ${tables.length} tables to localStorage`);
    }
    
    return tables;
  } catch (error) {
    console.error('Error fetching table configs:', error);
    // Return an empty array as fallback
    return [];
  }
};

/**
 * Get table configurations for a specific page
 * @param pageId The page ID to filter by
 * @returns Promise with an array of table configurations for the specified page
 */
export const getTableConfigsByPage = async (pageId: string): Promise<TableConfig[]> => {
  try {
    console.log(`[DEBUG] Fetching tables for page ${pageId}`);
    
    // First try to get from localStorage
    if (typeof window !== 'undefined') {
      const key = `tables_page_${pageId}`;
      const storedTables = localStorage.getItem(key);
      if (storedTables) {
        try {
          console.log(`[DEBUG] Found tables in localStorage for page ${pageId}`);
          const parsedTables = JSON.parse(storedTables);
          if (Array.isArray(parsedTables) && parsedTables.length > 0) {
            // Normalize tables to ensure they have valid page properties
            return parsedTables.map(normalizeTableConfig);
          } else {
            console.log(`[DEBUG] No valid tables found in localStorage for page ${pageId}, fetching from API`);
          }
        } catch (e) {
          console.error('Error parsing stored tables:', e);
        }
      } else {
        console.log(`[DEBUG] No tables found in localStorage for page ${pageId}`);
      }
    }
    
    // If not in localStorage, fetch from API
    console.log(`[DEBUG] Fetching tables from API for page ${pageId}`);
    const response = await fetch(`/api/tables?page=${pageId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch tables: ${response.statusText}`);
    }
    
    const result = await response.json();
    const rawTables = Array.isArray(result) ? result : Array.isArray(result.tables) ? result.tables : [];
    // Normalize tables to ensure they have valid page properties
    const tables = rawTables.map(normalizeTableConfig);
    console.log(`[DEBUG] API returned ${tables.length} tables for page ${pageId}`);
    
    // Store in localStorage for future use
    if (typeof window !== 'undefined') {
      localStorage.setItem(`tables_page_${pageId}`, JSON.stringify(tables));
      console.log(`[DEBUG] Saved ${tables.length} tables to localStorage for page ${pageId}`);
    }
    
    return tables;
  } catch (error) {
    console.error(`Error fetching tables for page ${pageId}:`, error);
    
    // Try to get all tables and filter
    try {
      console.log(`[DEBUG] Trying fallback: fetching all tables and filtering for page ${pageId}`);
      const allTables = await getAllTableConfigs();
      const pageTables = allTables.filter(table => table.page === pageId);
      console.log(`[DEBUG] Fallback found ${pageTables.length} tables for page ${pageId}`);
      return pageTables;
    } catch (e) {
      console.error('Error filtering all tables:', e);
      return [];
    }
  }
};

// Function to generate menu structure
export async function generateMenuStructure(menuId: string, menuName: string, description: string, pages: { id: string, name: string }[]) {
  try {
    // Create a simple file structure description without actually generating files
    const fileStructure = [
      {
        path: `app/${menuId}/layout.tsx`,
        description: 'Layout file for the menu section'
      },
      {
        path: `app/${menuId}/page.tsx`,
        description: 'Root page that redirects to the first page'
      },
      {
        path: `app/${menuId}/components/${menuId.charAt(0).toUpperCase() + menuId.slice(1)}TabsHeader.tsx`,
        description: 'Navigation component for the menu section'
      },
      ...pages.map(page => ({
        path: `app/${menuId}/${page.id}/page.tsx`,
        description: `Page component for ${page.name}`
      }))
    ];
    
    return {
      success: true,
      message: `Successfully generated menu structure for ${menuName}`,
      fileStructure
    };
  } catch (error) {
    console.error('Error generating menu structure:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error creating menu structure'
    };
  }
}
