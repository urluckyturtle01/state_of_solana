import { NextRequest, NextResponse } from 'next/server';
import { ChartConfig } from '@/app/admin/types';
import { getFromS3 } from '@/lib/s3';

/*
 * Secure server-side proxy for fetching chart data
 * This keeps API keys safe on the server and prevents CORS issues
 */

// Cache for chart data to avoid repeated API calls
const CHART_DATA_CACHE: Record<string, {
  data: any[];
  timestamp: number;
  expiresIn: number;
}> = {};

// Cache TTL (5 minutes for fresh data)
const CACHE_TTL = 5 * 60 * 1000;

// Helper function to set nested property using dot notation
const setNestedProperty = (obj: any, path: string, value: any) => {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
};

// Helper function to transform parameter values
const transformParameterValue = (value: string, transform?: string): any => {
  if (!transform) return value;
  
  switch (transform) {
    case 'number':
      return Number(value);
    case 'boolean':
      return value === 'true';
    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    case 'date_yyyy_mm_dd':
      // Convert date from dd/MM/yy to yyyy-mm-dd format
      try {
        const parts = value.split('/');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          let year = parts[2];
          
          // Convert 2-digit year to 4-digit
          if (year.length === 2) {
            const yearNum = parseInt(year, 10);
            year = yearNum >= 50 ? `19${year}` : `20${year}`;
          }
          
          return `${year}-${month}-${day}`;
        }
        return value; // Return as-is if format doesn't match
      } catch {
        return value;
      }
    default:
      return value;
  }
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chartId: string }> }
): Promise<NextResponse> {
  const { chartId } = await params;

  try {
    console.log(`Chart Data API: Fetching data for chart ${chartId}`);
    
    // Get chart configuration from S3 (with full API info)
    const chart = await getFromS3<ChartConfig>(`charts/${chartId}.json`);
    
    if (!chart) {
      return NextResponse.json(
        { error: 'Chart not found' },
        { status: 404 }
      );
    }

    if (!chart.apiEndpoint) {
      return NextResponse.json(
        { error: 'Chart has no API endpoint configured' },
        { status: 400 }
      );
    }

    // Parse URL parameters for filters and POST API parameters
    const { searchParams } = new URL(req.url);
    const filters: Record<string, string> = {};
    const urlParams: Record<string, string> = {};
    
    // Extract all URL parameters
    for (const [key, value] of searchParams.entries()) {
      if (key !== 'chartId') {
        filters[key] = value;
        urlParams[key] = value;
      }
    }

    // Create cache key including all parameters
    const cacheKey = `${chartId}-${JSON.stringify(filters)}`;
    
    // Check cache first
    if (CHART_DATA_CACHE[cacheKey]) {
      const cachedItem = CHART_DATA_CACHE[cacheKey];
      const now = Date.now();
      
      if (now - cachedItem.timestamp < cachedItem.expiresIn) {
        console.log(`Using cached data for chart ${chartId}`);
        return NextResponse.json({
          query_result: {
            data: {
              rows: cachedItem.data
            }
          },
          fromCache: true
        });
      }
    }

    // Fetch data from external API
    console.log(`Fetching fresh data from: ${chart.apiEndpoint}`);
    
    const apiUrl = new URL(chart.apiEndpoint);
    
    // Add API key to URL (for both GET and POST)
    if (chart.apiKey) {
      const apiKeyValue = chart.apiKey.trim();
      if (apiKeyValue.includes('max_age=')) {
        // Handle API key with parameters
        const [key, ...params] = apiKeyValue.split('&');
        apiUrl.searchParams.set('api_key', key);
        params.forEach(param => {
          const [paramKey, paramValue] = param.split('=');
          apiUrl.searchParams.set(paramKey, paramValue);
        });
      } else {
        apiUrl.searchParams.set('api_key', apiKeyValue);
      }
    }

    // Determine if this is a POST API chart
    const isPostApi = chart.postApiConfig?.enabled && chart.postApiConfig.parameterMappings;
    let requestBody: any = null;
    let requestMethod = 'GET';

    if (isPostApi) {
      console.log(`POST API chart detected, building parameter mappings from URL params`);
      requestMethod = 'POST';
      
      // Build parameters object from URL params using parameter mappings
      const parameters: Record<string, any> = {};
      
      chart.postApiConfig!.parameterMappings!.forEach(mapping => {
        // Try to get value from URL params
        let value: string | undefined = urlParams[mapping.urlParam] || urlParams[mapping.apiParamPath];
        
        // Fall back to default value if not found
        if (!value && mapping.defaultValue) {
          value = mapping.defaultValue;
        }
        
        if (value) {
          // Transform the value if needed
          const transformedValue = transformParameterValue(value, mapping.transform);
          
          // Set the value in the parameters object using dot notation
          setNestedProperty(parameters, mapping.apiParamPath, transformedValue);
          
          console.log(`Mapped ${mapping.apiParamPath}=${transformedValue} (from URL param: ${value})`);
        }
      });
      
      requestBody = { parameters };
      console.log('POST request body:', JSON.stringify(requestBody, null, 2));
    } else {
      // Regular GET request - add filter parameters to URL
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'timeFilter') {
        // Handle time filter mapping
        const timeMap: Record<string, string> = {
          'D': '1',
          'W': '7', 
          'M': '30',
          'Q': '90',
          'Y': '365'
        };
        const days = timeMap[value] || value;
        apiUrl.searchParams.set('days', days);
      } else {
        apiUrl.searchParams.set(key, value);
      }
    });
    }

    const fetchOptions: RequestInit = {
      method: requestMethod,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TopLedger-Charts/1.0',
        ...(requestMethod === 'POST' ? { 'Content-Type': 'application/json' } : {})
      },
      ...(requestBody ? { body: JSON.stringify(requestBody) } : {})
    };

    const response = await fetch(apiUrl.toString(), fetchOptions);

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();
    
    // Extract data from the response structure
    let chartData: any[] = [];
    
    if (responseData.query_result && responseData.query_result.data) {
      // TopLedger API format
      chartData = responseData.query_result.data.rows || [];
    } else if (Array.isArray(responseData)) {
      // Direct array format
      chartData = responseData;
    } else if (responseData.data && Array.isArray(responseData.data)) {
      // Nested data format
      chartData = responseData.data;
    } else {
      console.warn('Unexpected API response format:', responseData);
      chartData = [];
    }

    // Cache the data
    CHART_DATA_CACHE[cacheKey] = {
      data: chartData,
      timestamp: Date.now(),
      expiresIn: CACHE_TTL
    };

    console.log(`Successfully fetched ${chartData.length} data points for chart ${chartId}`);

    // Return data in the format expected by ChartRenderer (TopLedger format)
    return NextResponse.json({
      query_result: {
        data: {
          rows: chartData
        }
      },
      fromCache: false
    });

  } catch (error) {
    console.error(`Error fetching chart data for ${chartId}:`, error);
    
    // Try to return cached data if available
    const cacheKey = `${chartId}-${JSON.stringify({})}`;
    if (CHART_DATA_CACHE[cacheKey]) {
      console.log(`Returning stale cached data for chart ${chartId}`);
      return NextResponse.json({
        query_result: {
          data: {
            rows: CHART_DATA_CACHE[cacheKey].data
          }
        },
        fromCache: true,
        stale: true
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch chart data', details: String(error) },
      { status: 500 }
    );
  }
}
