// API endpoints and keys
const API_KEY = 'MwgPFDxoN9SCpEC6I6nhBH85dtNkXndNYcRtHLYA';
const API_BASE_URL = 'https://analytics.topledger.xyz/tl/api';

// Chart data types
export interface TvlVelocityDataPoint {
  date: string;
  tvl: number;

  velocity: number;
}

// Time filter options
export type TimeFilter = 'D' | 'M' | 'Q' | 'Y';

/**
 * Simple function to fetch TVL and Velocity data from the API.
 */
export async function fetchTvlVelocityData(timeFilter: TimeFilter): Promise<TvlVelocityDataPoint[]> {
  try {
    // Direct POST request to get data
    const response = await fetch(`${API_BASE_URL}/queries/12459/results?api_key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parameters: { "Date Part": timeFilter } }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract rows from the response
    const rows = data.query_result?.data?.rows || [];
    
    // Simple transformation to the required format
    return rows.map((row: any) => ({
      date: row.block_date || '',
      tvl: parseFloat(row.TVL || 0),
      velocity: parseFloat(row.Velocity || 0)
    })).filter((item: TvlVelocityDataPoint) => item.date);
    
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return []; // Return empty array on error
  }
} 