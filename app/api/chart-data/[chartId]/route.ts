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

    // Parse URL parameters for filters
    const { searchParams } = new URL(req.url);
    const filters: Record<string, string> = {};
    
    // Extract filter parameters
    for (const [key, value] of searchParams.entries()) {
      if (key !== 'chartId') {
        filters[key] = value;
      }
    }

    // Create cache key
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
    
    // Add API key to URL
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

    // Add filter parameters to API call
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

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TopLedger-Charts/1.0'
      }
    });

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
