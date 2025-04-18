// API endpoints and keys
const API_KEY = 'zFtRMSKAAC8nTdp6JX2NebxyP6YCct9poXLe5WfN';
const API_BASE_URL = 'https://analytics.topledger.xyz/tl/api';

// Chart data types
export interface VelocityByDexDataPoint {
  date: string;
  program_type: string;
  velocity: number;
}

// Time filter options
export type TimeFilter = 'D' | 'M' | 'Q' | 'Y';

/**
 * Function to fetch Velocity by DEX Program Category data from the API.
 */
export async function fetchVelocityByDexData(timeFilter: TimeFilter): Promise<VelocityByDexDataPoint[]> {
  try {
    // Direct POST request to get data
    const response = await fetch(`${API_BASE_URL}/queries/12439/results?api_key=${API_KEY}`, {
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
    
    // Transform data to the required format
    return rows.map((row: any) => ({
      date: row.block_date || '',
      program_type: row.program_type || '',
      velocity: parseFloat(row.Velocity || 0)
    })).filter((item: VelocityByDexDataPoint) => item.date && item.program_type);
    
  } catch (error) {
    console.error('Error fetching velocity by DEX data:', error);
    return []; // Return empty array on error
  }
}

/**
 * Helper function to get unique program types from the data
 */
export function getUniqueProgramTypes(data: VelocityByDexDataPoint[]): string[] {
  const programTypesSet = new Set<string>();
  
  data.forEach(item => {
    if (item.program_type) {
      programTypesSet.add(item.program_type);
    }
  });
  
  return Array.from(programTypesSet);
}

/**
 * Helper function to get unique dates from the data
 */
export function getUniqueDates(data: VelocityByDexDataPoint[]): string[] {
  const datesSet = new Set<string>();
  
  data.forEach(item => {
    if (item.date) {
      datesSet.add(item.date);
    }
  });
  
  return Array.from(datesSet).sort();
} 