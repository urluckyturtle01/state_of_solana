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
      throw new Error('No data returned from API');
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
 * Fetches volume by program data (no fallback)
 */
export const fetchVolumeByProgramDataWithFallback = async (): Promise<VolumeByProgramDataPoint[]> => {
  try {
    return await fetchVolumeByProgramData();
  } catch (error) {
    console.error("No data available for this period.", error);
    throw error;
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