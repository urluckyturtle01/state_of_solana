interface VolumeByProgramResponseRow {
  year: string;
  dex: string;
  volume: number;
  rn1: number;
}

export interface VolumeByProgramDataPoint {
  dex: string;
  volume: number;
  percentage: number;
}

/**
 * Fetches volume by program data from the API
 */
export const fetchVolumeByProgramData = async (): Promise<VolumeByProgramDataPoint[]> => {
  try {
    // Use AbortController to set a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      "https://analytics.topledger.xyz/tl/api/queries/13222/results.json?api_key=zDjwKXvTQCdB16ViEfeQbVavTt3LmNYFe5KRTSZA",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rows = data.query_result?.data?.rows || [];

    if (!rows || rows.length === 0) {
      return [];
    }

    // Calculate total volume to determine percentages
    const totalVolume = rows.reduce(
      (sum: number, row: VolumeByProgramResponseRow) => sum + row.volume,
      0
    );

    // Process and transform the data
    const processedData: VolumeByProgramDataPoint[] = rows.map(
      (row: VolumeByProgramResponseRow) => ({
        dex: row.dex,
        volume: row.volume,
        percentage: (row.volume / totalVolume) * 100,
      })
    );

    return processedData;
  } catch (error) {
    console.error("Error fetching volume by program data:", error);
    throw error;
  }
};

/**
 * Gets preloaded volume by program data to avoid API calls during development
 */
export const getPreloadedVolumeByProgramData = (): VolumeByProgramDataPoint[] => {
  // Sample data in case API is unavailable (based on actual API response)
  const totalVolume = 753670726735.0; // Approximate total of all values
  
  return [
    { dex: "Jupiter", volume: 315763185973.88, percentage: 41.9 },
    { dex: "Raydium", volume: 179695975749.29, percentage: 23.8 },
    { dex: "Others", volume: 124512264813.70, percentage: 16.5 },
    { dex: "OKX", volume: 31692550672.43, percentage: 4.2 },
    { dex: "Orca", volume: 29619675738.89, percentage: 3.9 },
    { dex: "Meteora", volume: 24222365007.58, percentage: 3.2 },
    { dex: "Pump Fun", volume: 20505592296.73, percentage: 2.7 },
    { dex: "SolFi", volume: 10682186830.76, percentage: 1.4 },
    { dex: "Lifinity", volume: 10628296161.39, percentage: 1.4 },
    { dex: "Others (Low Volume)", volume: 6348633490.36, percentage: 0.8 }
  ];
};

/**
 * Fetches volume by program data with fallback to preloaded data
 */
export const fetchVolumeByProgramDataWithFallback = async (): Promise<VolumeByProgramDataPoint[]> => {
  try {
    return await fetchVolumeByProgramData();
  } catch (error) {
    console.warn("Failed to fetch volume by program data, using preloaded data:", error);
    return getPreloadedVolumeByProgramData();
  }
};

/**
 * Formats the volume for display
 */
export const formatVolume = (volume: number): string => {
  if (volume >= 1_000_000_000) {
    return `$${(volume / 1_000_000_000).toFixed(1)}B`;
  } else if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(1)}M`;
  } else if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(1)}K`;
  } else {
    return `$${volume.toFixed(1)}`;
  }
}; 