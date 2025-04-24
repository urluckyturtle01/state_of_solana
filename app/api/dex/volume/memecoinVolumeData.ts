import { VolumeTimeFilter } from "./volumeHistoryData";

// Extend VolumeTimeFilter to include 'D' for daily view
export type MemecoinVolumeTimeFilter = VolumeTimeFilter | 'D';

export interface MemecoinVolumeDataPoint {
  date: string;
  mint: string;
  symbol: string;
  volume: number;
}

export interface FormattedMemecoinVolumeData {
  dates: string[];
  series: {
    name: string;
    data: number[];
  }[];
  totalsByToken: {
    token: string;
    volume: number;
    percentage?: number;
  }[];
}

// Function to format the volume value for display
export const formatVolume = (volume: number): string => {
  if (volume >= 1_000_000_000) {
    return `$${(volume / 1_000_000_000).toFixed(1)}B`;
  } else if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(1)}M`;
  } else if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(1)}K`;
  } else {
    return `$${volume.toFixed(0)}`;
  }
};

// Function to format date based on time filter
export const formatMemecoinDate = (dateStr: string, timeFilter: MemecoinVolumeTimeFilter): string => {
  // Create a valid date object regardless of whether the date is in the future
  const date = new Date(dateStr);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.warn(`Invalid date string: ${dateStr}, using fallback`);
    return dateStr; // Return original string as fallback
  }
  
  switch (timeFilter) {
    case 'D':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'W':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'M':
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    default:
      return dateStr;
  }
};

// Function to fetch memecoin volume data
export const fetchMemecoinVolumeData = async (timeFilter: MemecoinVolumeTimeFilter): Promise<FormattedMemecoinVolumeData> => {
  try {
    console.log('Fetching memecoin volume data with timeFilter:', timeFilter);
    
    // The curl command is:
    // curl --location --request POST 'https://analytics.topledger.xyz/tl/api/queries/13231/results?api_key=gFXy7839FSeqNL8PFFT8rVNNBWt9IJ9Jp7UOKzSu' --data-raw '{"parameters":{"Date Part":"W"}}'
    
    // Convert time filter to required parameter format
    const datePart = timeFilter;
    
    // Use the exact format from curl command with data-raw
    const url = 'https://analytics.topledger.xyz/tl/api/queries/13231/results?api_key=gFXy7839FSeqNL8PFFT8rVNNBWt9IJ9Jp7UOKzSu';

    // Important: Use the exact JSON structure expected by the API
    const bodyObj = {
      parameters: {
        "Date Part": datePart
      }
    };
    
    console.log('Request URL:', url);
    console.log('Request body:', JSON.stringify(bodyObj));
    
    // Use XMLHttpRequest instead of fetch to avoid CORS issues in browser
    // This is a workaround for client-side API calls
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined') {
        // Client-side: use XMLHttpRequest
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.withCredentials = false; // This can help with CORS in some cases
        
        // Add a timeout
        xhr.timeout = 10000; // 10 seconds
        xhr.ontimeout = function() {
          console.error('Request timed out');
          reject(new Error('Request timed out'));
        };
        
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              try {
                const responseData = JSON.parse(xhr.responseText);
                console.log('API response structure keys:', Object.keys(responseData));
                
                // Check for expected structure
                if (!responseData.query_result?.data?.rows) {
                  console.error('API response missing expected data structure.');
                  reject(new Error('API response missing expected data structure'));
                  return;
                }
                
                const rawRows = responseData.query_result.data.rows;
                console.log(`Received ${rawRows.length} data points from API`);
                
                if (rawRows.length === 0) {
                  console.warn('API returned 0 data points');
                  resolve({ dates: [], series: [], totalsByToken: [] });
                  return;
                }
                
                // Log a few rows to understand the structure
                console.log('First few data points:', rawRows.slice(0, 3));
                
                // Add debug logging for raw response structure
                if (rawRows.length > 0) {
                  const sampleRow = rawRows[0];
                  console.log('Sample row keys:', Object.keys(sampleRow));
                  console.log('Sample row values:', Object.values(sampleRow));
                }
                
                // Process data as in the existing code
                const typedRows: MemecoinVolumeDataPoint[] = rawRows.map((row: any) => ({
                  date: row.block_date || row.date || row.period_start || row.time || '',
                  mint: row.Mint || row.mint || row.token || '',
                  symbol: row.Mint || row.symbol || row.name || '',
                  volume: typeof row.Volume === 'number' ? row.Volume : 
                          typeof row.volume === 'number' ? row.volume : 
                          parseFloat(row.Volume || row.volume || '0')
                }))
                // Filter out entries with empty dates upfront
                .filter((item: MemecoinVolumeDataPoint) => !!item.date);
                
                // After processing
                console.log('Processed typedRows sample:', typedRows.slice(0, 3));
                
                // Process the data for the chart - same as before
                // Group data by date and token
                const groupedByDate = new Map<string, Map<string, number>>();
                const tokenSet = new Set<string>();
                
                // Initialize data structure
                typedRows.forEach((item: MemecoinVolumeDataPoint) => {
                  // Make sure the properties exist before accessing them
                  const date = item.date;
                  const mint = item.mint || '';
                  const token = item.symbol || `Unknown (${mint.substring(0, 6)}...)`;
                  const volume = typeof item.volume === 'number' ? item.volume : parseFloat(item.volume || '0');
                  
                  if (!groupedByDate.has(date)) {
                    groupedByDate.set(date, new Map<string, number>());
                  }
                  
                  const dateData = groupedByDate.get(date)!;
                  const currentVolume = dateData.get(token) || 0;
                  dateData.set(token, currentVolume + volume);
                  
                  tokenSet.add(token);
                });
                
                // After grouping by date
                console.log('Dates after grouping:', Array.from(groupedByDate.keys()).slice(0, 5));
                console.log('Tokens after grouping:', Array.from(tokenSet).slice(0, 5));
                
                // Extract unique dates and sort them
                const dates = Array.from(groupedByDate.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
                
                // Format dates based on time filter
                const formattedDates = dates.map(date => formatMemecoinDate(date, timeFilter));
                
                // Extract unique tokens and create series data
                const tokens = Array.from(tokenSet);
                
                // Track totals by token for percentage calculation
                const tokenTotals: Record<string, number> = {};
                tokens.forEach(token => { tokenTotals[token] = 0; });
                
                // Create series for each token
                const series = tokens.map(token => {
                  const data = dates.map(date => {
                    const dateData = groupedByDate.get(date);
                    const volume = dateData?.get(token) || 0;
                    tokenTotals[token] += volume;
                    return volume;
                  });
                  
                  return { name: token, data };
                });
                
                // Calculate total volume to determine percentages
                const totalVolume = Object.values(tokenTotals).reduce((sum, volume) => sum + volume, 0);
                
                // Create totalsByToken array for the legend
                const totalsByToken = Object.entries(tokenTotals)
                  .map(([token, volume]) => ({
                    token,
                    volume
                  }))
                  .sort((a, b) => b.volume - a.volume);
                
                const result = {
                  dates: formattedDates,
                  series,
                  totalsByToken
                };
                
                console.log('Successfully processed memecoin data:', {
                  datesCount: result.dates.length,
                  seriesCount: result.series.length,
                  tokensCount: result.totalsByToken.length
                });
                
                resolve(result);
              } catch (err) {
                console.error('Failed to parse or process response:', err);
                reject(err);
              }
            } else {
              console.error('API request failed with status:', xhr.status);
              reject(new Error(`API request failed with status: ${xhr.status}`));
            }
          }
        };
        xhr.onerror = function() {
          console.error('Request failed due to network error');
          reject(new Error('Network error'));
        };
        xhr.send(JSON.stringify(bodyObj));
      } else {
        // Server-side: use fetch since CORS is not an issue
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyObj),
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
          }
          return response.json();
        })
        .then(responseData => {
          // Process data same as above, but for server-side
          // Check for expected structure
          if (!responseData.query_result?.data?.rows) {
            throw new Error('API response missing expected data structure');
          }
          
          const rawRows = responseData.query_result.data.rows;
          console.log(`Received ${rawRows.length} data points from API (server-side)`);
          
          if (rawRows.length === 0) {
            resolve({ dates: [], series: [], totalsByToken: [] });
            return;
          }
          
          // Continue processing as in the client-side XHR branch
          // (This is repeated code - in a real scenario we'd refactor to avoid duplication)
          const typedRows: MemecoinVolumeDataPoint[] = rawRows.map((row: any) => ({
            date: row.block_date || row.date || row.period_start || row.time || '',
            mint: row.Mint || row.mint || row.token || '',
            symbol: row.Mint || row.symbol || row.name || '',
            volume: typeof row.Volume === 'number' ? row.Volume : 
                    typeof row.volume === 'number' ? row.volume : 
                    parseFloat(row.Volume || row.volume || '0')
          }))
          // Filter out entries with empty dates upfront
          .filter((item: MemecoinVolumeDataPoint) => !!item.date);
          
          // Group by date and token
          const groupedByDate = new Map<string, Map<string, number>>();
          const tokenSet = new Set<string>();
          
          typedRows.forEach((item: MemecoinVolumeDataPoint) => {
            const date = item.date;
            const mint = item.mint || '';
            const token = item.symbol || `Unknown (${mint.substring(0, 6)}...)`;
            const volume = typeof item.volume === 'number' ? item.volume : parseFloat(item.volume || '0');
            
            if (!groupedByDate.has(date)) {
              groupedByDate.set(date, new Map<string, number>());
            }
            
            const dateData = groupedByDate.get(date)!;
            const currentVolume = dateData.get(token) || 0;
            dateData.set(token, currentVolume + volume);
            
            tokenSet.add(token);
          });
          
          // Extract dates and series
          const dates = Array.from(groupedByDate.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
          const formattedDates = dates.map(date => formatMemecoinDate(date, timeFilter));
          const tokens = Array.from(tokenSet);
          
          const tokenTotals: Record<string, number> = {};
          tokens.forEach(token => { tokenTotals[token] = 0; });
          
          const series = tokens.map(token => {
            const data = dates.map(date => {
              const dateData = groupedByDate.get(date);
              const volume = dateData?.get(token) || 0;
              tokenTotals[token] += volume;
              return volume;
            });
            
            return { name: token, data };
          });
          
          const totalVolume = Object.values(tokenTotals).reduce((sum, volume) => sum + volume, 0);
          
          const totalsByToken = Object.entries(tokenTotals)
            .map(([token, volume]) => ({
              token,
              volume
            }))
            .sort((a, b) => b.volume - a.volume);
          
          resolve({
            dates: formattedDates,
            series,
            totalsByToken
          });
        })
        .catch(err => {
          console.error('Server-side fetch error:', err);
          reject(err);
        });
      }
    });
  } catch (error) {
    console.error('Error in fetchMemecoinVolumeData:', error);
    throw error; // Let the parent function handle fallback
  }
};

// Fallback data for testing or when API is unavailable
export const getMemecoinVolumeFallbackData = (timeFilter: MemecoinVolumeTimeFilter): FormattedMemecoinVolumeData => {
  const dates: string[] = [];
  const today = new Date();
  
  // Generate dates based on time filter
  if (timeFilter === 'D') {
    for (let i = 14; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(formatMemecoinDate(date.toISOString(), timeFilter));
    }
  } else if (timeFilter === 'W') {
    for (let i = 8; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - (i * 7));
      dates.push(formatMemecoinDate(date.toISOString(), timeFilter));
    }
  } else {
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      dates.push(formatMemecoinDate(date.toISOString(), timeFilter));
    }
  }
  
  // Sample tokens
  const tokens = ['BONK', 'WIF', 'POPCAT', 'DOGE', 'SLERF', 'Other'];
  
  // Sample data for each token
  const series = tokens.map(token => {
    let baseVolume = 0;
    switch (token) {
      case 'BONK': baseVolume = 5000000; break;
      case 'WIF': baseVolume = 3000000; break;
      case 'POPCAT': baseVolume = 2000000; break;
      case 'DOGE': baseVolume = 1500000; break;
      case 'SLERF': baseVolume = 1000000; break;
      case 'Other': baseVolume = 500000; break;
      default: baseVolume = 200000;
    }
    
    // Generate random data with a trend
    const data = dates.map((_, i) => {
      const randomFactor = 0.5 + Math.random();
      const trendFactor = timeFilter === 'D' ? (15 - i) / 15 : (dates.length - i) / dates.length;
      return Math.round(baseVolume * randomFactor * trendFactor);
    });
    
    return { name: token, data };
  });
  
  // Calculate totals by token for the legend
  const totalsByToken = tokens.map((token, index) => {
    const tokenData = series[index].data;
    const volume = tokenData.reduce((sum, val) => sum + val, 0);
    return { token, volume };
  });
  
  // Sort by volume
  totalsByToken.sort((a, b) => b.volume - a.volume);
  
  return { dates, series, totalsByToken };
};

// Main function to fetch data with fallback
export const fetchMemecoinVolumeDataWithFallback = async (timeFilter: MemecoinVolumeTimeFilter): Promise<FormattedMemecoinVolumeData> => {
  console.log('Attempting to fetch memecoin volume data for timeFilter:', timeFilter);

  // Clear any previously memoized data for this time filter
  if (typeof window !== 'undefined' && window.__memoizedChartData) {
    const memoKey = `memecoin_data_${timeFilter}`;
    delete window.__memoizedChartData[memoKey];
    console.log(`Cleared memoized data for ${memoKey}`);
  }

  // Try up to 3 retries
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt} for timeFilter ${timeFilter}`);
        // Add increasing delay between retries
        await new Promise(resolve => setTimeout(resolve, 300 * attempt));
      }
      
      // First attempt - try to get real data
      const data = await fetchMemecoinVolumeData(timeFilter);
      
      // Verify the data is usable
      if (data.dates.length > 0 && data.series.length > 0 && data.totalsByToken.length > 0) {
        console.log('Successfully retrieved real data from API with', 
          data.dates.length, 'dates and', 
          data.series.length, 'tokens');
        
        // Log the first few dates to verify they're correct
        console.log('First few dates from real data:', data.dates.slice(0, 5));
        console.log('First few tokens from real data:', data.totalsByToken.slice(0, 5).map(t => t.token));
        
        return data;
      }
      
      console.warn(`API returned incomplete data on attempt ${attempt}, ${attempt < 2 ? 'retrying' : 'using fallback data'}`);
      
      if (attempt < 2) {
        // Continue to next retry
        continue;
      }
    } catch (error) {
      console.error(`Error on attempt ${attempt}:`, error);
      
      if (attempt < 2) {
        // Continue to next retry
        continue;
      }
      
      console.warn('All API attempts failed, using fallback data');
    }
  }
  
  // If we reach here, all attempts failed or returned incomplete data
  // We need fallback data
  const fallbackData = getMemecoinVolumeFallbackData(timeFilter);
  console.log('Using fallback data with', 
    fallbackData.dates.length, 'dates and', 
    fallbackData.series.length, 'tokens');
  
  // Only memoize fallback data if we want to use it consistently
  if (typeof window !== 'undefined') {
    // Only run on client
    const memoKey = `memecoin_data_${timeFilter}`;
    if (!window.__memoizedChartData) {
      window.__memoizedChartData = {};
    }
    window.__memoizedChartData[memoKey] = fallbackData;
  }
  
  return fallbackData;
};

// Add this to the global Window interface
declare global {
  interface Window {
    __memoizedChartData?: Record<string, FormattedMemecoinVolumeData>;
  }
}