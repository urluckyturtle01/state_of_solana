// API endpoints and keys
const API_KEY = 'PSDSE4K3HsoXJX8a3dgeps4GF1ilSejrVjmkF8Fe';
const API_BASE_URL = 'https://analytics.topledger.xyz/tl/api';
const QUERY_ID = '13192';

// Volume history data types
export interface VolumeHistoryDataPoint {
  date: string; // Expecting date in format like 'YYYY-MM-DD' or ISO string
  volume: number;
}

// Specific time filter for VolumeHistoryChart
export type VolumeTimeFilter = 'W' | 'M' | 'Q';

/**
 * Function to fetch volume history data from the API.
 */
export async function fetchVolumeHistoryData(timeFilter: VolumeTimeFilter): Promise<VolumeHistoryDataPoint[]> {
  try {
    console.log('fetchVolumeHistoryData called with timeFilter:', timeFilter);
    
    const response = await fetch(`${API_BASE_URL}/queries/${QUERY_ID}/results?api_key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parameters: { "Date Part": timeFilter } }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const rows = data.query_result?.data?.rows || [];
    
    if (!rows || rows.length === 0) {
      console.warn('No volume history rows returned from API for filter:', timeFilter);
      return [];
    }
    
    // Transform data to match VolumeHistoryDataPoint interface
    // Important: Adjust field names based on the actual API response (e.g., 'dt', 'volume', 'period_start', 'Volume')
    const transformedData = rows.map((row: any) => ({
      date: row.period_start || row.dt || '', // Adjust based on actual field name
      volume: parseFloat(row.Volume || row.volume || 0) // Adjust based on actual field name
    })).filter((item: VolumeHistoryDataPoint) => item.date);
    
    // Sort data by date (oldest first) for charting
    transformedData.sort((a: VolumeHistoryDataPoint, b: VolumeHistoryDataPoint) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log(`Transformed ${transformedData.length} data points`);
    return transformedData;
    
  } catch (error) {
    console.error('Error fetching volume history data:', error);
    return []; // Return empty array on error
  }
}

// Helper function to format volume numbers for display
export function formatVolume(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

// Helper function to format dates based on filter for display
export function formatDisplayDate(dateStr: string, timeFilter?: VolumeTimeFilter): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // Return original string if date is invalid
    
    switch(timeFilter) {
      case 'Q': return `Q${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;
      case 'M': return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
      case 'W': 
      default: return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    }
  } catch (e) {
    console.error('Error formatting date:', e);
    return dateStr; // Fallback to original string on error
  }
}

// Alias for formatDisplayDate to match function name used in VolumeHistoryChart
export const formatVolumeDate = formatDisplayDate; 