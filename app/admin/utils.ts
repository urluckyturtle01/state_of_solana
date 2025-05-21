import { ChartConfig, ChartFormData } from './types';
import { CounterConfig } from './types';

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
    return allCharts.filter((chart: ChartConfig) => chart.page === pageId);
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
 * Get all counter configs for a specific page
 * @param pageId ID of the page to get counters for
 * @returns Promise with array of counter configurations
 */
export const getCounterConfigsByPage = async (pageId: string): Promise<CounterConfig[]> => {
  try {
    // Check browser localStorage for counter configs
    if (typeof window !== 'undefined') {
      const storedCounters = localStorage.getItem('counterConfigs');
      const counters: CounterConfig[] = storedCounters ? JSON.parse(storedCounters) : [];
      
      // Filter counters by page
      return counters.filter(counter => counter.page === pageId);
    }
    
    return [];
  } catch (error) {
    console.error('Error getting counters for page:', error);
    return [];
  }
};

/**
 * Save a counter configuration
 * @param counterConfig The counter configuration to save
 * @returns Promise with the saved counter configuration
 */
export const saveCounterConfig = async (counterConfig: CounterConfig): Promise<CounterConfig> => {
  try {
    // Set createdAt if new counter
    const now = new Date().toISOString();
    const counterWithTimestamps = {
      ...counterConfig,
      updatedAt: now,
    };
    
    // Check browser localStorage for existing counter configs
    if (typeof window !== 'undefined') {
      const storedCounters = localStorage.getItem('counterConfigs');
      const counters: CounterConfig[] = storedCounters ? JSON.parse(storedCounters) : [];
      
      // Find the index of the counter if it exists
      const existingIndex = counters.findIndex(c => c.id === counterConfig.id);
      
      if (existingIndex >= 0) {
        // Update existing counter
        counters[existingIndex] = counterWithTimestamps;
      } else {
        // Add as new counter with createdAt
        counters.push({
          ...counterWithTimestamps,
          createdAt: now
        });
      }
      
      // Save to localStorage
      localStorage.setItem('counterConfigs', JSON.stringify(counters));
      
      return counterWithTimestamps;
    }
    
    return counterWithTimestamps;
  } catch (error) {
    console.error('Error saving counter config:', error);
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
    // Check browser localStorage for counter configs
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
  } catch (error) {
    console.error('Error deleting counter config:', error);
    return false;
  }
};

/**
 * Get all counter configurations
 * @returns Promise with array of all counter configurations
 */
export const getAllCounterConfigs = async (): Promise<CounterConfig[]> => {
  try {
    // Check browser localStorage for counter configs
    if (typeof window !== 'undefined') {
      const storedCounters = localStorage.getItem('counterConfigs');
      return storedCounters ? JSON.parse(storedCounters) : [];
    }
    
    return [];
  } catch (error) {
    console.error('Error getting all counter configs:', error);
    return [];
  }
}; 