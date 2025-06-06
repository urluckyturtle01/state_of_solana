import { parseDate, calculateCutoffDate, createFilterCacheKey } from './chartUtils';

/**
 * Apply client-side filters to data
 * 
 * @param sourceData - The source data to filter
 * @param filters - The filters to apply
 * @param xKey - The x-axis key field for date filtering
 * @param dataCache - Optional cache to store filtered results
 * @param setDataCache - Optional function to update the cache
 * @returns The filtered data array
 */
export const applyClientFilters = (
  sourceData: any[], 
  filters: Record<string, string>,
  xKey: string,
  dataCache?: Record<string, any[]>,
  setDataCache?: (cache: Record<string, any[]>) => void
): any[] => {
  if (!filters || Object.keys(filters).length === 0) return sourceData;
  
  // Create a cache key from the filter values
  const cacheKey = createFilterCacheKey(filters);
  
  // Return cached result if available
  if (dataCache && dataCache[cacheKey]) {
    console.log('Using cached data for filters:', cacheKey);
    return dataCache[cacheKey];
  }
  
  console.log('Applying client-side filters:', filters);
  let filteredResult = [...sourceData];
  
  // Time filter - improved implementation
  if (filters.timeFilter && filters.timeFilter !== 'ALL') {
    // Calculate cutoff date based on filter
    const cutoffDate = calculateCutoffDate(filters.timeFilter);
    
    // Only apply date filtering if we have a valid cutoff date
    if (cutoffDate !== null) {
      console.log(`Filtering dates after: ${cutoffDate.toISOString()}`);
      
      filteredResult = filteredResult.filter(item => {
        // Get the date value from the item
        const rawDateValue = item[xKey];
        if (!rawDateValue) return true; // Keep items without date values
        
        // Parse the date value
        const itemDate = parseDate(rawDateValue);
        
        // Skip invalid dates
        if (!itemDate || isNaN(itemDate.getTime())) {
          return true;
        }
        
        // Keep items with dates after the cutoff
        return itemDate >= cutoffDate;
      });
      
      console.log(`After date filtering: ${filteredResult.length} items remain`);
    }
  }
  
  // Apply other filter types
  // Currency filter
  if (filters.currencyFilter && filters.currencyFilter !== 'ALL') {
    const before = filteredResult.length;
    filteredResult = filteredResult.filter(item => {
      // Check if item has currency field
      if (item.currency) {
        return item.currency === filters.currencyFilter;
      }
      return true;
    });
    console.log(`After currency filtering: ${filteredResult.length}/${before} items remain`);
  }
  
  // Display mode filter
  if (filters.displayMode) {
    // Display mode typically doesn't filter items, but transforms the data
    // This is handled in the chart component itself
    console.log(`Using display mode: ${filters.displayMode}`);
  }

  // Additional custom filters can be added here
  // Example: Project filter
  if (filters.projectFilter && filters.projectFilter !== 'ALL') {
    const before = filteredResult.length;
    filteredResult = filteredResult.filter(item => {
      if (item.project) {
        return item.project === filters.projectFilter;
      }
      return true;
    });
    console.log(`After project filtering: ${filteredResult.length}/${before} items remain`);
  }
  
  // Cache the results for future use if setter is provided
  if (setDataCache && dataCache) {
    setDataCache({
      ...dataCache,
      [cacheKey]: filteredResult
    });
  }
  
  return filteredResult;
};

/**
 * Create a synthetic dataset for client-side filtering
 * 
 * @param data - The source data
 * @param xKey - The key field for x-axis values
 * @returns A uniform dataset with all values filled in
 */
export const createUniformDataset = (data: any[], xKey: string): any[] => {
  if (!data || data.length === 0) return [];
  
  // Get all unique x-axis values
  const xValues = new Set(data.map(item => item[xKey]));
  
  // Get all data fields (columns) excluding the x-axis field
  const dataFields = new Set<string>();
  data.forEach(item => {
    Object.keys(item).forEach(key => {
      if (key !== xKey) dataFields.add(key);
    });
  });
  
  // Create a lookup map for quick access
  const dataMap: Record<string, any> = {};
  data.forEach(item => {
    dataMap[item[xKey]] = item;
  });
  
  // Create uniform dataset with all values filled in
  const uniformData = Array.from(xValues).map(xValue => {
    const baseItem = dataMap[xValue] || { [xKey]: xValue };
    const newItem = { ...baseItem };
    
    // Ensure all fields exist with at least zero values
    dataFields.forEach(field => {
      if (newItem[field] === undefined) {
        newItem[field] = 0;
      }
    });
    
    return newItem;
  });
  
  return uniformData;
}; 