import { ChartConfig, YAxisConfig } from "../admin/types";

// Format values with appropriate unit and scale
export const formatValue = (value: number, unit?: string): string => {
  // Add null/undefined check
  if (value === undefined || value === null) {
    return '0.00';
  }
  
  // Get the unit symbol (don't use a default)
  const unitSymbol = unit || '';
  const isUnitPrefix = unitSymbol && unitSymbol !== '%' && unitSymbol !== 'SOL';
  
  // Format with appropriate scale
  let formattedValue: string;
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1000000000) {
    formattedValue = `${sign}${(absValue / 1000000000).toFixed(2)}B`;
  } else if (absValue >= 1000000) {
    formattedValue = `${sign}${(absValue / 1000000).toFixed(2)}M`;
  } else if (absValue >= 1000) {
    formattedValue = `${sign}${(absValue / 1000).toFixed(2)}K`;
  } else {
    formattedValue = `${sign}${absValue.toFixed(2)}`;
  }
  
  // Return with correct unit placement
  if (!unitSymbol) return formattedValue;
  return isUnitPrefix ? `${unitSymbol}${formattedValue}` : `${formattedValue}\u00A0${unitSymbol}`;
};

// Format tick value for y-axis
export const formatTickValue = (value: number): string => {
  if (value === 0) return '0';
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1000000000) {
    const formattedValue = (absValue / 1000000000).toFixed(1);
    return formattedValue.endsWith('.0') 
      ? `${sign}${formattedValue.slice(0, -2)}B` 
      : `${sign}${formattedValue}B`;
  } else if (absValue >= 1000000) {
    const formattedValue = (absValue / 1000000).toFixed(1);
    return formattedValue.endsWith('.0') 
      ? `${sign}${formattedValue.slice(0, -2)}M` 
      : `${sign}${formattedValue}M`;
  } else if (absValue >= 1000) {
    const formattedValue = (absValue / 1000).toFixed(1);
    return formattedValue.endsWith('.0') 
      ? `${sign}${formattedValue.slice(0, -2)}K` 
      : `${sign}${formattedValue}K`;
  } else if (absValue < 1) {
    return `${sign}${absValue.toFixed(1)}`;
  } else {
    return `${sign}${absValue.toFixed(0)}`;
  }
};

// Format field names for display
export const formatFieldName = (fieldName: string): string => {
  if (!fieldName) return '';
  
  // Convert snake_case or kebab-case to space-separated
  const spaceSeparated = fieldName.replace(/[_-]/g, ' ');
  
  // Split into words and capitalize each word
  return spaceSeparated
    .split(' ')
    .map(word => {
      if (word.length === 0) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

// Format X-axis tick labels
export const formatXAxisLabel = (value: string, filterValues?: Record<string, string>): string => {
  // Check if the value is a date format
  const isDateFormat = /^\d{4}-\d{2}-\d{2}/.test(value) || 
                     /^\d{2}\/\d{2}\/\d{4}/.test(value) ||
                     /^\d{1,2}-[A-Za-z]{3}-\d{4}/.test(value);
  
  if (isDateFormat) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      // Format based on timeFilter
      if (filterValues?.timeFilter === 'D' || filterValues?.timeFilter === 'W') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (filterValues?.timeFilter === 'M') {
        return date.toLocaleDateString('en-US', { month: 'short' });
      } else if (filterValues?.timeFilter === 'Q') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `Q${quarter}`;
      } else if (filterValues?.timeFilter === 'Y') {
        return date.getFullYear().toString();
      }
      
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }
  
  // For quarter format (Q1, Q2, etc.)
  if (/^Q[1-4]\s\d{4}$/.test(value)) {
    return value.substring(0, 2);
  }
  
  // For month-year format (Jan 2023)
  if (/^[A-Za-z]{3}\s\d{4}$/.test(value)) {
    return value.substring(0, 3);
  }
  
  // Don't shorten other values that are already short
  if (value.length <= 5) {
    return value;
  }
  
  // For other longer text, truncate with ellipsis
  return `${value.substring(0, 3)}...`;
};

// Get unit from YAxisConfig or component prop
export const getYAxisUnit = (field: string | YAxisConfig | (string | YAxisConfig)[], defaultUnit?: string): string | undefined => {
  if (typeof field === 'string') {
    return defaultUnit;
  } else if (Array.isArray(field)) {
    if (field.length === 0) return defaultUnit;
    return typeof field[0] === 'string' ? defaultUnit : field[0].unit || defaultUnit;
  } else {
    return field.unit || defaultUnit;
  }
};

// Create a cache key from filter values
export const createFilterCacheKey = (filters: Record<string, string>): string => {
  if (!filters || Object.keys(filters).length === 0) return 'default';
  return Object.entries(filters).sort().map(([k, v]) => `${k}:${v}`).join('|');
};

// Parse date from various formats
export const parseDate = (rawDateValue: any): Date | null => {
  try {
    if (rawDateValue instanceof Date) {
      return rawDateValue;
    } else if (typeof rawDateValue === 'string') {
      // ISO format: YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}/.test(rawDateValue)) {
        return new Date(rawDateValue);
      } 
      // US format: MM/DD/YYYY
      else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(rawDateValue)) {
        const [month, day, year] = rawDateValue.split('/').map(Number);
        return new Date(year, month - 1, day);
      }
      // Month Year format: Jan 2023, February 2023, etc.
      else if (/^[A-Za-z]+\s+\d{4}$/.test(rawDateValue)) {
        const [month, year] = rawDateValue.split(' ');
        const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
        return new Date(parseInt(year), monthIndex, 1);
      }
      // Quarter format: Q1 2023, Q2 2023, etc.
      else if (/^Q[1-4]\s+\d{4}$/.test(rawDateValue)) {
        const quarter = parseInt(rawDateValue.charAt(1));
        const year = parseInt(rawDateValue.split(' ')[1]);
        const month = (quarter - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9
        return new Date(year, month, 1);
      }
      // Year only: 2023
      else if (/^\d{4}$/.test(rawDateValue)) {
        return new Date(parseInt(rawDateValue), 0, 1);
      } else {
        // Try generic date parsing as fallback
        return new Date(rawDateValue);
      }
    } else if (typeof rawDateValue === 'number') {
      // Unix timestamp (milliseconds)
      return new Date(rawDateValue);
    }
  } catch (err) {
    console.warn(`Failed to parse date: ${rawDateValue}`, err);
  }
  return null;
};

// Calculate cutoff date based on time filter
export const calculateCutoffDate = (timeFilter: string): Date | null => {
  const now = new Date();
  switch (timeFilter) {
    case 'D': // Last day (24 hours)
      const lastDay = new Date(now);
      lastDay.setDate(now.getDate() - 1);
      return lastDay;
    case 'W': // Last week (7 days)
      const lastWeek = new Date(now);
      lastWeek.setDate(now.getDate() - 7);
      return lastWeek;
    case 'M': // Last month (30 days)
      const lastMonth = new Date(now);
      lastMonth.setMonth(now.getMonth() - 1);
      return lastMonth;
    case 'Q': // Last quarter (3 months)
      const lastQuarter = new Date(now);
      lastQuarter.setMonth(now.getMonth() - 3);
      return lastQuarter;
    case 'Y': // Last year (12 months)
      const lastYear = new Date(now);
      lastYear.setFullYear(now.getFullYear() - 1);
      return lastYear;
    default:
      return null;
  }
}; 