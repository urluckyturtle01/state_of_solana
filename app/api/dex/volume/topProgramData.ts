// API endpoints and keys
const API_KEY = 'AvT7L3YnkRqJDzpEs6CwgfXN4mBGUxb9H5PaKZW2';
const API_BASE_URL = 'https://analytics.topledger.xyz/tl/api';

// Top Program data types
export interface TopProgramDataPoint {
  program_id: string;
  program_name: string;
  program_type: string;
  volume: number;
  volume_share: number;
}

// Time filter options
export type TimeFilter = 'W' | 'M' | 'Q' | 'Y' | 'ALL';

/**
 * Function to fetch top programs by volume from the API.
 */
export async function fetchTopProgramsData(timeFilter: TimeFilter, limit: number = 20): Promise<TopProgramDataPoint[]> {
  try {
    // Direct POST request to get data
    const response = await fetch(`${API_BASE_URL}/queries/14592/results?api_key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        parameters: { 
          "Time Period": timeFilter,
          "Limit": limit
        } 
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract rows from the response
    const rows = data.query_result?.data?.rows || [];
    
    // Calculate total volume for share percentage
    const totalVolume = rows.reduce((sum: number, row: any) => sum + parseFloat(row.volume || 0), 0);
    
    // Transform data to the required format
    return rows.map((row: any) => {
      const volume = parseFloat(row.volume || 0);
      return {
        program_id: row.program_id || '',
        program_name: row.program_name || 'Unknown',
        program_type: row.program_type || 'Other',
        volume: volume,
        volume_share: totalVolume > 0 ? (volume / totalVolume) * 100 : 0
      };
    }).filter((item: TopProgramDataPoint) => item.program_id);
    
  } catch (error) {
    console.error('Error fetching top programs data:', error);
    return []; // Return empty array on error
  }
}

/**
 * Function to group programs by type and calculate aggregate volumes
 */
export function getProgramVolumeByType(data: TopProgramDataPoint[]): {type: string, volume: number, share: number}[] {
  const volumeByType = new Map<string, number>();
  
  // Aggregate volume by program type
  data.forEach(item => {
    if (!volumeByType.has(item.program_type)) {
      volumeByType.set(item.program_type, 0);
    }
    volumeByType.set(item.program_type, volumeByType.get(item.program_type)! + item.volume);
  });
  
  // Calculate total volume for share percentage
  const totalVolume = Array.from(volumeByType.values()).reduce((sum, volume) => sum + volume, 0);
  
  // Convert map to array of data points
  return Array.from(volumeByType.entries()).map(([type, volume]) => ({
    type,
    volume,
    share: totalVolume > 0 ? (volume / totalVolume) * 100 : 0
  })).sort((a, b) => b.volume - a.volume);
} 