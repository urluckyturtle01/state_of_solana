interface VolumeDataPoint {
  year: string;
  volume: number;
  cumulative_volume: number;
}

export const fetchVolumeData = async (): Promise<VolumeDataPoint[]> => {
  try {
    const response = await fetch(
      'https://analytics.topledger.xyz/tl/api/queries/12253/results.json?api_key=AhAqEtjP6gKfND9TLKPRzSbB2IYdXlAFcBa2vSoQ'
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    // Parse JSON data
    const jsonData = await response.json();
    const rows = jsonData.query_result?.data?.rows || [];
    
    const result: VolumeDataPoint[] = rows.map((row: any) => ({
      year: row.year,
      volume: row.volume,
      cumulative_volume: row.cumulative_volume
    }));
    
    // Sort by year in descending order (newest first)
    return result.sort((a, b) => new Date(b.year).getTime() - new Date(a.year).getTime());
  } catch (error) {
    console.error('Error fetching volume data:', error);
    throw new Error('Failed to fetch volume data');
  }
};

export const getLatestVolumeStats = async () => {
  try {
    const volumeData = await fetchVolumeData();
    
    if (volumeData.length < 2) {
      return {
        cumulativeVolume: 0,
        percentChange: 0,
        isPositive: false
      };
    }
    
    // Get the latest and previous year data
    const currentYear = volumeData[0];
    const previousYear = volumeData[1];
    
    // Calculate cumulative volume in trillions
    const cumulativeVolume = currentYear.cumulative_volume;
    
    // Calculate percentage change
    const percentChange = ((currentYear.cumulative_volume - previousYear.cumulative_volume) / previousYear.cumulative_volume) * 100;
    
    return {
      cumulativeVolume,
      percentChange,
      isPositive: percentChange > 0
    };
  } catch (error) {
    console.error('Error calculating volume stats:', error);
    return {
      cumulativeVolume: 0,
      percentChange: 0,
      isPositive: false
    };
  }
}; 