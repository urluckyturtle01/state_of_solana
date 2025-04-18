interface TradersDataPoint {
  partition_0: string;
  active_signer: number;
  new_signer: number;
  new_traders_activation_ratio: number;
  cumulative_signer: number;
}

/**
 * Fetches traders data from the API
 */
export const fetchTradersData = async (): Promise<TradersDataPoint[]> => {
  try {
    const response = await fetch(
      'https://analytics.topledger.xyz/tl/api/queries/13181/results.json?api_key=fLzwXGF8j4St6XvrckEAe1gjQRHKveWvvCafx2Zz'
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    // Parse JSON data
    const jsonData = await response.json();
    const rows = jsonData.query_result?.data?.rows || [];
    
    // Transform the data to our interface
    const result: TradersDataPoint[] = rows.map((row: any) => ({
      partition_0: row.partition_0,
      active_signer: parseInt(row.active_signer),
      new_signer: parseInt(row.new_signer),
      new_traders_activation_ratio: parseFloat(row.new_traders_activation_ratio),
      cumulative_signer: parseInt(row.cumulative_signer)
    }));
    
    // Sort by date (most recent first)
    return result.sort((a, b) => new Date(b.partition_0).getTime() - new Date(a.partition_0).getTime());
  } catch (error) {
    console.error('Error fetching traders data:', error);
    throw new Error('Failed to fetch traders data');
  }
};

/**
 * Gets the latest traders stats for display in the counter
 */
export const getLatestTradersStats = async () => {
  try {
    const tradersData = await fetchTradersData();
    
    if (tradersData.length < 2) {
      return {
        cumulativeTraders: 0,
        percentChange: 0,
        isPositive: false
      };
    }
    
    // Get today's and yesterday's data
    const today = tradersData[0];
    const yesterday = tradersData[1];
    
    // Cumulative traders in millions
    const cumulativeTraders = today.cumulative_signer / 1000000;
    
    // Calculate percentage change in cumulative traders (not active traders)
    const percentChange = ((today.cumulative_signer - yesterday.cumulative_signer) / yesterday.cumulative_signer) * 100;
    
    return {
      cumulativeTraders,
      percentChange,
      isPositive: percentChange > 0
    };
  } catch (error) {
    console.error('Error calculating traders stats:', error);
    return {
      cumulativeTraders: 0,
      percentChange: 0,
      isPositive: false
    };
  }
}; 