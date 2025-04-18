interface TvlDataPoint {
  block_date: string;
  program_type: string;
  tvl: number;
  daily_total_volume: number;
}

interface DailyTvlData {
  date: string;
  totalTvl: number;
  programBreakdown: {
    [key: string]: number;
  };
}

/**
 * Fetches TVL data from the API and transforms it into a more usable format
 */
export const fetchTvlData = async (): Promise<DailyTvlData[]> => {
  try {
    const response = await fetch(
      'https://analytics.topledger.xyz/tl/api/queries/12435/results.json?api_key=QoHzXXunvuLg0rrTWyFTNzmIjIoqY5MJhHo3ltZg'
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    // Parse JSON data
    const jsonData = await response.json();
    const rows = jsonData.query_result?.data?.rows || [];
    
    // Transform the data
    const dataByDate = new Map<string, DailyTvlData>();
    
    rows.forEach((row: TvlDataPoint) => {
      const date = row.block_date;
      
      if (!dataByDate.has(date)) {
        dataByDate.set(date, {
          date,
          totalTvl: row.daily_total_volume,
          programBreakdown: {}
        });
      }
      
      const dateData = dataByDate.get(date)!;
      dateData.programBreakdown[row.program_type] = row.tvl;
    });
    
    // Convert map to array and sort by date (most recent first)
    return Array.from(dataByDate.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error fetching TVL data:', error);
    throw new Error('Failed to fetch TVL data');
  }
};

/**
 * Gets the latest TVL stats for display in the counter
 */
export const getLatestTvlStats = async () => {
  try {
    const tvlData = await fetchTvlData();
    
    if (tvlData.length < 2) {
      return {
        currentTvl: 0,
        percentChange: 0,
        isPositive: false
      };
    }
    
    // Get today's and yesterday's data
    const today = tvlData[0];
    const yesterday = tvlData[1];
    
    // Current TVL in billions
    const currentTvl = today.totalTvl / 1e9;
    
    // Calculate percentage change
    const percentChange = ((today.totalTvl - yesterday.totalTvl) / yesterday.totalTvl) * 100;
    
    return {
      currentTvl,
      percentChange,
      isPositive: percentChange > 0
    };
  } catch (error) {
    console.error('Error calculating TVL stats:', error);
    return {
      currentTvl: 0,
      percentChange: 0,
      isPositive: false
    };
  }
}; 