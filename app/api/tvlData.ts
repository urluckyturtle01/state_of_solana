/**
 * Interface for TVL data returned from API
 */
interface TvlResponseRow {
  block_date: string;
  daily_total_tvl?: number;   // New API might use this field
  daily_total_volume?: number; // Old API used this field
  program_type?: string;
  tvl?: number;
  // Add other fields as needed
}

export interface TvlDataPoint {
  date: string;
  dailyTotalTvl: number;
  percentChange: number;
}

// Cache for TVL data to avoid frequent API calls
let cachedTvlData: TvlDataPoint[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Fetches TVL data from TopLedger API and processes it to include daily TVL and percent change
 */
export const fetchDailyTvlData = async (): Promise<TvlDataPoint[]> => {
  try {
    console.log('Fetching TVL data from TopLedger API...');
    // Use fetch with a longer timeout to avoid potential timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const url = 'https://analytics.topledger.xyz/tl/api/queries/12435/results.json?api_key=QoHzXXunvuLg0rrTWyFTNzmIjIoqY5MJhHo3ltZg';
    console.log('API URL:', url);
    
    const response = await fetch(url, { 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API request failed:', response.status, response.statusText, errorText);
      throw new Error(`Failed to fetch TVL data: ${response.status} ${response.statusText}`);
    }

    // Parse the response to get data rows
    const data = await response.json();
    console.log('API response data structure:', Object.keys(data));
    
    if (!data.query_result || !data.query_result.data) {
      console.error('Unexpected API response structure:', data);
      throw new Error('Invalid API response structure');
    }
    
    const rows = data.query_result?.data?.rows || [];
    console.log(`Found ${rows.length} TVL data rows`);

    if (!rows || rows.length === 0) {
      console.warn('No TVL data rows found in API response');
      throw new Error('No data returned from API');
    }

    // Log a sample row to debug the data format
    if (rows.length > 0) {
      console.log('Sample data row:', rows[0]);
    }

    // Sort rows by date (oldest first to calculate percent change)
    const sortedRows = [...rows].sort((a: TvlResponseRow, b: TvlResponseRow) => 
      new Date(a.block_date).getTime() - new Date(b.block_date).getTime()
    );

    // Calculate percent change from previous day
    const processedData: TvlDataPoint[] = sortedRows.map((row: TvlResponseRow, index: number) => {
      // Check which field is present in the data
      const currentTvl = row.daily_total_tvl !== undefined ? row.daily_total_tvl : (row.daily_total_volume || 0);
      const previousRow = index > 0 ? sortedRows[index - 1] : row;
      const previousTvl = previousRow.daily_total_tvl !== undefined ? 
        previousRow.daily_total_tvl : (previousRow.daily_total_volume || 0);
      
      const percentChange = previousTvl === 0 
        ? 0 
        : ((currentTvl - previousTvl) / previousTvl) * 100;
      
      return {
        date: row.block_date,
        dailyTotalTvl: currentTvl,
        percentChange: parseFloat(percentChange.toFixed(2))
      };
    });

    console.log(`Processed ${processedData.length} TVL data points`);
    if (processedData.length > 0) {
      console.log('First processed data point:', processedData[0]);
    }

    // Return sorted by most recent date first for display purposes
    return processedData.reverse();
  } catch (error) {
    console.error('Error fetching or processing TVL data:', error);
    throw error;
  }
};

/**
 * Fetches TVL data (no fallback)
 */
export const fetchTvlDataWithFallback = async (): Promise<TvlDataPoint[]> => {
  try {
    return await fetchDailyTvlData();
  } catch (error) {
    console.error('Failed to fetch TVL data from API:', error);
    throw error;
  }
};

/**
 * Fetches TVL data with caching to reduce API calls
 * Only fetches new data if the cache is expired (default: 1 hour)
 */
export const fetchCachedTvlData = async (): Promise<TvlDataPoint[]> => {
  const now = Date.now();
  
  // If we have cached data and it's still fresh, return it
  if (cachedTvlData && now - lastFetchTime < CACHE_DURATION) {
    return cachedTvlData;
  }
  
  try {
    // Fetch new data
    const data = await fetchTvlDataWithFallback();
    
    // Update cache
    cachedTvlData = data;
    lastFetchTime = now;
    
    return data;
  } catch (error) {
    // If we have stale cached data, still return it on error
    if (cachedTvlData) {
      console.warn('Error fetching fresh data, using stale cached data', error);
      return cachedTvlData;
    }
    
    // Otherwise, throw the error
    console.error('Failed to fetch TVL data and no cache available', error);
    throw error;
  }
};

/**
 * Gets the latest TVL stats for display
 */
export const getLatestTvlStats = async () => {
  try {
    const tvlData = await fetchCachedTvlData();
    console.log('TVL data from fetchCachedTvlData:', tvlData.length, 'items');
    
    if (tvlData.length === 0) {
      console.warn('No TVL data points available');
      return {
        currentTvl: 0,
        percentChange: 0,
        isPositive: false
      };
    }
    
    // Get the latest data (first item in the array)
    const latest = tvlData[0];
    console.log('Latest TVL data point:', latest);
    
    // Current TVL in billions
    const currentTvl = latest.dailyTotalTvl / 1e9;
    
    // Make sure percentage change exists and is a number
    if (typeof latest.percentChange !== 'number') {
      console.warn('Percent change is not a number:', latest.percentChange);
    }
    
    const result = {
      currentTvl: parseFloat(currentTvl.toFixed(2)),
      percentChange: latest.percentChange,
      isPositive: latest.percentChange > 0
    };
    
    console.log('Returning TVL stats:', result);
    return result;
  } catch (error) {
    console.error('Error calculating TVL stats:', error);
    return {
      currentTvl: 0,
      percentChange: 0,
      isPositive: false
    };
  }
}; 