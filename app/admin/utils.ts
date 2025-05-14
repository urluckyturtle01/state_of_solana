import { ChartConfig, ChartFormData } from './types';

// Generate a unique ID for a new chart
export function generateChartId(): string {
  return 'chart_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

// Convert form data to chart config
export function formDataToConfig(formData: ChartFormData): ChartConfig {
  const now = new Date().toISOString();
  
  return {
    id: generateChartId(),
    ...formData,
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
      apiUrl.searchParams.append('api_key', apiKey);
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

// Save chart config to local storage
export function saveChartConfig(config: ChartConfig): boolean {
  try {
    const storageKey = 'solana-charts';
    
    // Get existing configs
    const existingConfigs = getAllChartConfigs();
    
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
    return true;
  } catch (error) {
    console.error('Error saving chart config:', error);
    return false;
  }
}

/**
 * Get all chart configurations from local storage
 */
export function getAllChartConfigs(): ChartConfig[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const storageKey = 'solana-charts';
    const storedCharts = localStorage.getItem(storageKey);
    if (!storedCharts) return [];
    
    return JSON.parse(storedCharts) as ChartConfig[];
  } catch (error) {
    console.error('Error getting chart configs:', error);
    return [];
  }
}

/**
 * Get chart configurations for a specific page
 */
export function getChartConfigsByPage(pageId: string): ChartConfig[] {
  const allCharts = getAllChartConfigs();
  return allCharts.filter(chart => chart.page === pageId);
}

// Update an existing chart config
export function updateChartConfig(updatedConfig: ChartConfig): void {
  try {
    const allCharts = getAllChartConfigs();
    const index = allCharts.findIndex(chart => chart.id === updatedConfig.id);
    
    if (index !== -1) {
      // Update the chart config
      allCharts[index] = {
        ...updatedConfig,
        updatedAt: new Date().toISOString(),
      };
      
      // Save back to local storage
      localStorage.setItem('chartConfigs', JSON.stringify(allCharts));
    } else {
      throw new Error(`Chart with ID ${updatedConfig.id} not found`);
    }
  } catch (error) {
    console.error('Error updating chart config:', error);
    throw new Error('Failed to update chart configuration');
  }
}

/**
 * Delete a chart configuration by ID
 */
export function deleteChartConfig(chartId: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const storageKey = 'solana-charts';
    const allCharts = getAllChartConfigs();
    const filteredCharts = allCharts.filter(chart => chart.id !== chartId);
    
    localStorage.setItem(storageKey, JSON.stringify(filteredCharts));
    return true;
  } catch (error) {
    console.error('Error deleting chart config:', error);
    return false;
  }
} 