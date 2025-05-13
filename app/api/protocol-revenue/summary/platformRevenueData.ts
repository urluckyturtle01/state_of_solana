import { TimeFilter } from './chartData';
import { colors } from '@/app/utils/chartColors';

// Re-export TimeFilter to be used by components
export type { TimeFilter };

// Define platform revenue data point structure
export interface PlatformRevenueDataPoint {
  block_date: string;
  platform: string;
  protocol_revenue_usd: number;
}

// Define API response structure
interface ApiResponse {
  query_result?: {
    data?: {
      rows?: any[];
    };
  };
}

// Function to fetch platform revenue data
export const fetchPlatformRevenueData = async (timeFilter: TimeFilter): Promise<PlatformRevenueDataPoint[]> => {
  try {
    const apiUrl = "https://analytics.topledger.xyz/solana/api/queries/12589/results?api_key=oiGI7qFLlC7o3etCqCywaqnYbY2Z2bGFxOOKdJwO";
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parameters: { "Date Part": timeFilter } })
    });
    
    if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
    
    const data: ApiResponse = await response.json();
    if (!data.query_result?.data?.rows) return [];
    
    return data.query_result.data.rows.map((row: any) => ({
      block_date: row.block_date,
      platform: normalizePlatformName(row.Platform || row.platform),
      protocol_revenue_usd: parseFloat(row.protocol_revenue_usd || 0)
    }));
  } catch (error) {
    console.error('Error fetching platform revenue data:', error);
    throw error;
  }
};

// Helper function to normalize platform names
export function normalizePlatformName(name: string): string {
  if (!name) return 'Unknown';
  return name.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Format functions
export const formatCurrency = (value: number): string => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Platform-specific colors mapping
export const platformColors: Record<string, string> = {
  // Use a distinct color for each platform
  'Phantom': colors[0], // blue
  'Pump fun': colors[1], // purple
  'Radium': colors[2], // green
  'Pump.Fun AMM': colors[3], // orange
  'Photon': colors[1], // red
  'Axiom': colors[5], // yellow
  'BullX': colors[6], // teal
  'Orca': colors[7], // dark purple
  'Trojan': colors[8], // pink
  'GMGN': colors[9], // gray
  'Jito': colors[10], // blue (darker)
  'Metaplex': colors[11], // green (darker)
  'Other': colors[12], // blue (lighter)
  'Magiceden': colors[13], // purple (lighter)
  'Bloxroute': colors[14], // orange (lighter)
  'Tensorswap': colors[15], // red (lighter)
  'Helio': colors[16], // yellow (lighter)
  'Banana Gun': colors[17], // slate
  'Sol Trading Bot': colors[18], // sky blue
  'DexScreener': colors[19], // indigo
  'Lifinity': colors[20], // violet
  'Bloom trading bot': colors[21], // violet (darker)
  'Gmgn': colors[9], // gray (same as GMGN, case variant)
  'Raydium': colors[2], // green (same as Radium, case variant)
  'Dexscreener': colors[19], // indigo (same as DexScreener, case variant)
  
  // Add more platforms with new colors
  'MEW': colors[22], // rose (darker)
  'Jupiter': colors[23], // cyan
  'Drift': colors[24], // orange (darker)
  
  // If we run out of colors from the main array, we'll use combinations
  'LFG': '#38bdf8', // sky blue (custom)
  'Kamino': '#fb7185', // light pink (custom)
  'Marginfi': '#84cc16', // lime (custom)
  'Tensor': '#9333ea', // purple (custom)
};

// Function to get color for a platform
export const getPlatformColor = (platform: string): string => {
  // Handle direct overrides for critical platforms
  if (platform.toLowerCase() === 'phantom') {
    return colors[0]; // Force blue for Phantom regardless of case
  }
  
  // Try to get the color for the exact platform name
  if (platformColors[platform]) {
    return platformColors[platform];
  }
  
  // Try case-insensitive matching
  const lowerCasePlatform = platform.toLowerCase();
  const platformKey = Object.keys(platformColors).find(key => 
    key.toLowerCase() === lowerCasePlatform
  );
  
  if (platformKey) {
    return platformColors[platformKey];
  }
  
  // If not found, use a hash-based color generation for consistency
  const hash = Array.from(platform)
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Use the hash to pick a color from the array
  return colors[hash % colors.length];
}; 