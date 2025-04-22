// Types for the API response and transformed data
export interface TvlByPoolApiResponse {
  query_result: {
    data: {
      rows: Array<{
        pool: string;
        TVL: number;
      }>;
    };
  };
}

export interface TvlByPoolDataPoint {
  pool: string;
  tvl: number;
  percentage: number;
}

// Function to fetch TVL by Pool data from the API
export async function fetchTvlByPoolData(): Promise<TvlByPoolDataPoint[]> {
  try {
    const response = await fetch(
      'https://analytics.topledger.xyz/tl/api/queries/13225/results.json?api_key=6rNImjI05B6uxQzhrJcoOkrYN4Upw6oFkN1yqm76',
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      console.error('No data available for this period.', response.statusText);
      throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
    }

    const data: TvlByPoolApiResponse = await response.json();
    return transformApiData(data);
  } catch (error) {
    console.error('Error fetching TVL by Pool data:', error);
    throw error;
  }
}

// Function to transform API data into chart-friendly format
function transformApiData(apiResponse: TvlByPoolApiResponse): TvlByPoolDataPoint[] {
  const rows = apiResponse.query_result.data.rows;
  
  // Calculate total TVL
  const totalTvl = rows.reduce((sum, row) => sum + row.TVL, 0);
  
  // Transform data and calculate percentages
  return rows.map(row => ({
    pool: row.pool,
    tvl: row.TVL,
    percentage: (row.TVL / totalTvl) * 100
  }));
}

// Format TVL values for display
export const formatTvl = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  } else if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  } else {
    return `$${value.toFixed(1)}`;
  }
};

// Function to fetch with fallback
export async function fetchTvlByPoolDataWithFallback(): Promise<TvlByPoolDataPoint[]> {
  try {
    return await fetchTvlByPoolData();
  } catch (error) {
    console.error('Error fetching TVL by Pool data:', error);
    throw error;
  }
} 