import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft, AxisRight } from '@visx/axis';
import { Bar } from '@visx/shape';
import { LinePath } from '@visx/shape';
import { ChartConfig, YAxisConfig } from '../../types';
import { blue, getColorByIndex } from '@/app/utils/chartColors';
import ChartTooltip from '@/app/components/shared/ChartTooltip';
import ButtonSecondary from "@/app/components/shared/buttons/ButtonSecondary";
import PrettyLoader from "@/app/components/shared/PrettyLoader";
import BrushTimeScale from "@/app/components/shared/BrushTimeScale";
import { curveCatmullRom } from '@visx/curve';
import Modal from '@/app/components/shared/Modal';
import TimeFilterSelector from '@/app/components/shared/filters/TimeFilter';
import CurrencyFilter from '@/app/components/shared/filters/CurrencyFilter';
import DisplayModeFilter, { DisplayMode } from '@/app/components/shared/filters/DisplayModeFilter';
import LegendItem from "@/app/components/shared/LegendItem";

// Define RefreshIcon component
const RefreshIcon = ({ className = "w-4 h-4" }) => {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
      />
    </svg>
  );
};

// Helper function to parse aggregated date formats for time aggregation
const parseAggregatedDate = (dateString: string): Date => {
  // Handle different aggregated date formats
  if (/^\d{4}-\d{2}$/.test(dateString)) {
    // Monthly format: 2025-01 -> 2025-01-01
    return new Date(`${dateString}-01`);
  } else if (/^\d{4}-Q[1-4]$/.test(dateString)) {
    // Quarterly format: 2025-Q1 -> 2025-01-01, 2025-Q2 -> 2025-04-01, etc.
    const [year, quarterStr] = dateString.split('-');
    const quarter = parseInt(quarterStr.substring(1));
    const month = (quarter - 1) * 3 + 1; // Q1->1, Q2->4, Q3->7, Q4->10
    return new Date(`${year}-${String(month).padStart(2, '0')}-01`);
  } else if (/^\d{4}$/.test(dateString)) {
    // Yearly format: 2025 -> 2025-01-01
    return new Date(`${dateString}-01-01`);
  } else {
    // Standard date formats (YYYY-MM-DD, etc.)
    return new Date(dateString);
  }
};

export interface DualAxisChartProps {
  chartConfig: ChartConfig;
  data: any[];
  width?: number;
  height?: number;
  isExpanded?: boolean;
  onCloseExpanded?: () => void;
  colorMap?: Record<string, string>;
  filterValues?: Record<string, string>;
  yAxisUnit?: string;
  hiddenSeries?: string[];
  onFilterChange?: (newFilters: Record<string, string>) => void;
  onModalFilterUpdate?: (newFilters: Record<string, string>) => void;
  maxXAxisTicks?: number;
}

// Helper function to get field from YAxisConfig or use string directly
function getYAxisField(field: string | YAxisConfig): string {
  return typeof field === 'string' ? field : field.field;
}

// Helper function to get unit from YAxisConfig or use a default
function getYAxisUnit(field: string | YAxisConfig, currencyFilter?: string): string | undefined {
  // If field has explicit unit specified, use that
  const specifiedUnit = typeof field === 'string' ? undefined : field.unit;
  if (specifiedUnit) {
    return specifiedUnit;
  }
  
  // If no unit specified, fall back to currency filter if available
  if (currencyFilter) {
    return currencyFilter;
  }
  
  return undefined;
}

// Format value with appropriate units
function formatWithUnit(value: number, unit?: string, defaultUnit?: string): string {
  // Get the unit symbol - explicit unit takes precedence, only use defaultUnit if unit is undefined/null
  const unitSymbol = unit !== undefined ? unit : (defaultUnit || '');
  const isUnitPrefix = unitSymbol && unitSymbol !== '%' && unitSymbol !== 'SOL'; // Most units are prefixed, but some go after
  
  // Handle negative values
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  // Format with appropriate scale
  let formattedValue: string;
  if (absValue >= 1000000000) {
    formattedValue = `${sign}${(absValue / 1000000000).toFixed(2)}B`;
  } else if (absValue >= 1000000) {
    formattedValue = `${sign}${(absValue / 1000000).toFixed(2)}M`;
  } else if (absValue >= 1000) {
    formattedValue = `${sign}${(absValue / 1000).toFixed(2)}K`;
  } else {
    formattedValue = `${sign}${absValue.toFixed(2)}`;
  }
  
  // Return with correct unit placement (or no unit if not specified)
  if (!unitSymbol) return formattedValue;
  return isUnitPrefix ? `${unitSymbol}${formattedValue}` : `${formattedValue}\u00A0${unitSymbol}`;
}

// Helper function to format field names for display
const formatFieldName = (fieldName: string): string => {
  if (!fieldName) return '';
  
  // Convert snake_case or kebab-case to space-separated
  const spaceSeparated = fieldName.replace(/[_-]/g, ' ');
  
  // Always capitalize the first letter of the entire string
  if (spaceSeparated.length === 0) return '';
  
  // Split into words and capitalize each word
  return spaceSeparated
    .split(' ')
    .map(word => {
      if (word.length === 0) return '';
      // Capitalize first letter, lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

// Helper function to extract base field name for consistent coloring
function getBaseFieldName(fieldName: string): string {
  // Remove common currency/chain suffixes to group similar fields together
  const suffixesToRemove = ['_usd', '_sol', '_btc', '_eth', '_usdc', '_usdt'];
  
  let baseName = fieldName.toLowerCase();
  
  // Remove suffix if found AT THE END (not in the middle)
  for (const suffix of suffixesToRemove) {
    if (baseName.endsWith(suffix)) {
      baseName = baseName.substring(0, baseName.length - suffix.length);
      break;
    }
  }
  
  console.log(`getBaseFieldName: "${fieldName}" -> "${baseName}"`);
  return baseName;
}

// Helper function to create smart color mapping for fields
function createSmartColorMapping(
  visibleFields: string[], 
  allOriginalFields: string[], 
  preferredColorMap: Record<string, string>
): Record<string, string> {
  const resultColors: Record<string, string> = {};
  const baseFieldToColorIndex: Record<string, number> = {};
  
  console.log('=== DUAL AXIS SMART COLOR MAPPING DEBUG ===');
  console.log('All original fields:', allOriginalFields);
  console.log('Visible fields:', visibleFields);
  console.log('Preferred color map:', preferredColorMap);
  
  // Check if we have currency suffixes in any of the fields
  const hasCurrencySuffixes = allOriginalFields.some(field => {
    const baseFieldName = getBaseFieldName(field);
    return field.toLowerCase() !== baseFieldName;
  });
  
  console.log('Has currency suffixes in dataset:', hasCurrencySuffixes);
  
  // Strategy 1: If we have currency suffixes, use base field mapping for consistency
  if (hasCurrencySuffixes) {
    // First pass: Analyze ALL original fields to establish consistent base field color indices
    const allBaseFields = new Set<string>();
    allOriginalFields.forEach(field => {
      const baseFieldName = getBaseFieldName(field);
      allBaseFields.add(baseFieldName);
    });
    
    // Sort base fields for consistent ordering
    const sortedBaseFields = Array.from(allBaseFields).sort();
    console.log('Sorted base fields:', sortedBaseFields);
    
    sortedBaseFields.forEach((baseField, index) => {
      baseFieldToColorIndex[baseField] = index;
    });
    
    console.log('Base field color mapping:', baseFieldToColorIndex);
    
    // Assign colors to visible fields based on base field mapping
    visibleFields.forEach(field => {
      const baseFieldName = getBaseFieldName(field);
      const fieldHasCurrencySuffix = field.toLowerCase() !== baseFieldName;
      
      console.log(`\n--- Processing field: ${field} ---`);
      console.log(`Base field name: ${baseFieldName}`);
      console.log(`Has currency suffix: ${fieldHasCurrencySuffix}`);
      
      // For currency suffix fields, always use smart mapping for consistency
      if (fieldHasCurrencySuffix) {
        const colorIndex = baseFieldToColorIndex[baseFieldName] ?? 0;
        resultColors[field] = getColorByIndex(colorIndex);
        console.log(`✓ Color assignment (smart): ${field} -> base:"${baseFieldName}" -> color[${colorIndex}] = ${resultColors[field]}`);
      } else {
        // For non-currency fields, prefer external color map
        if (preferredColorMap[field]) {
          resultColors[field] = preferredColorMap[field];
          console.log(`✓ Color assignment (preferred): ${field} -> ${preferredColorMap[field]}`);
        } else {
          const colorIndex = baseFieldToColorIndex[baseFieldName] ?? 0;
          resultColors[field] = getColorByIndex(colorIndex);
          console.log(`✓ Color assignment (smart fallback): ${field} -> base:"${baseFieldName}" -> color[${colorIndex}] = ${resultColors[field]}`);
        }
      }
    });
  } else {
    // Strategy 2: No currency suffixes detected - use ALL original fields for consistent color assignment
    console.log('No currency suffixes detected - using field position mapping for consistency');
    
    // Sort all original fields to establish consistent color indices
    const sortedOriginalFields = [...allOriginalFields].sort();
    console.log('Sorted original fields:', sortedOriginalFields);
    
    // Create color mapping based on position in sorted original fields
    const originalFieldColorMap: Record<string, number> = {};
    sortedOriginalFields.forEach((field, index) => {
      originalFieldColorMap[field] = index;
    });
    
    console.log('Original field color mapping:', originalFieldColorMap);
    
    // Assign colors to visible fields based on their position in original field list
    visibleFields.forEach(field => {
      console.log(`\n--- Processing field: ${field} ---`);
      
      // Check if we have a preferred color first
      if (preferredColorMap[field]) {
        resultColors[field] = preferredColorMap[field];
        console.log(`✓ Color assignment (preferred): ${field} -> ${preferredColorMap[field]}`);
      } else {
        // Use the field's position in the original sorted list for consistency
        const colorIndex = originalFieldColorMap[field] ?? 0;
        resultColors[field] = getColorByIndex(colorIndex);
        console.log(`✓ Color assignment (position-based): ${field} -> color[${colorIndex}] = ${resultColors[field]}`);
      }
    });
  }
  
  console.log('\n=== DUAL AXIS FINAL COLOR MAPPING RESULT ===');
  console.log('Result colors:', resultColors);
  console.log('================================================');
  
  return resultColors;
}

// Helper function to calculate safe tooltip position for mobile
const calculateSafeTooltipPosition = (
  mouseX: number, 
  mouseY: number, 
  containerRect: DOMRect,
  tooltipEstimatedWidth = 200, // Estimated tooltip width
  tooltipEstimatedHeight = 100 // Estimated tooltip height
) => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isMobile = viewportWidth < 768;
  
  if (!isMobile) {
    // Desktop: use original positioning
    return {
      left: mouseX,
      top: Math.max(mouseY - 10, 10)
    };
  }
  
  // Mobile: calculate safe position
  const absoluteX = containerRect.left + mouseX;
  const absoluteY = containerRect.top + mouseY;
  
  let safeLeft = mouseX;
  let safeTop = mouseY - 10;
  
  // Check right boundary
  if (absoluteX + tooltipEstimatedWidth > viewportWidth) {
    safeLeft = mouseX - tooltipEstimatedWidth;
    // Ensure it doesn't go off the left edge
    if (containerRect.left + safeLeft < 0) {
      safeLeft = 10 - containerRect.left;
    }
  }
  
  // Check left boundary
  if (absoluteX < tooltipEstimatedWidth / 2) {
    safeLeft = 10;
  }
  
  // Check top boundary
  if (absoluteY - tooltipEstimatedHeight < 0) {
    safeTop = mouseY + 20; // Position below cursor
  }
  
  // Check bottom boundary
  if (absoluteY + tooltipEstimatedHeight > viewportHeight) {
    safeTop = mouseY - tooltipEstimatedHeight - 10;
    // Ensure it doesn't go above the top
    if (containerRect.top + safeTop < 0) {
      safeTop = 10 - containerRect.top;
    }
  }
  
  return {
    left: Math.max(safeLeft, 0),
    top: Math.max(safeTop, 0)
  };
};

const DualAxisChart: React.FC<DualAxisChartProps> = ({ 
  chartConfig, 
  data, 
  width = 500, 
  height = 300,
  isExpanded = false,
  onCloseExpanded,
  colorMap: externalColorMap,
  filterValues,
  yAxisUnit,
  hiddenSeries = [],
  onFilterChange,
  onModalFilterUpdate,
  maxXAxisTicks
}) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const modalChartRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [legendItems, setLegendItems] = useState<Array<{id: string, label: string, color: string}>>([]);
  
  // Brush state
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  
  // Filtered data based on brush
  const [filteredData, setFilteredData] = useState<any[]>([]);

  // Modal-specific filtered data
  const [modalFilteredData, setModalFilteredData] = useState<any[]>([]);

  // Update tooltip state definition
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    left: number;
    top: number;
    key: string;
    items: { label: string, value: string | number, color: string, shape?: 'circle' | 'square' }[];
  }>({
    visible: false,
    left: 0,
    top: 0,
    key: '',
    items: []
  });

  // Modal brush state
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  
  // Add state for filter values in modal
  const [modalFilterValues, setModalFilterValues] = useState<Record<string, string>>(filterValues || {});

  // Sync modalFilterValues with filterValues when filterValues prop changes
  useEffect(() => {
    if (filterValues) {
      console.log(`DualAxisChart: Syncing filter values for ${chartConfig.title}`, filterValues);
      setModalFilterValues(filterValues);
    }
  }, [filterValues, chartConfig.title]);
  
  // Add state to track client-side rendering
  const [isClient, setIsClient] = useState(false);

  // Track hidden series (by field id)
  const [hiddenSeriesState, setHiddenSeriesState] = useState<string[]>(hiddenSeries || []);

  // Debounce timer ref for filter changes
  const filterDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Extract mapping fields with safety checks
  if (!chartConfig.dataMapping) {
    console.error('Chart configuration is missing dataMapping:', chartConfig);
    return <div className="p-4 text-red-500">Error: Chart configuration is incomplete</div>;
  }
  
  const xField = chartConfig.dataMapping.xAxis;
  const yField = chartConfig.dataMapping.yAxis;
  
  // For type safety, ensure we use string values for indexing
  const xKey = typeof xField === 'string' ? xField : xField[0];
  
  // Set isClient to true when component mounts in browser
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Helper function to format X-axis tick labels
  const formatXAxisLabel = useCallback((value: string): string => {
    // Check if the value is a date format (YYYY-MM-DD or similar)
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
        
        // Default format if no timeFilter is specified
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }
    
    // For quarter format (Q1, Q2, etc.)
    if (/^Q[1-4]\s\d{4}$/.test(value)) {
      return value.substring(0, 2); // Just "Q1", "Q2", etc.
    }
    
    // For month-year format (Jan 2023)
    if (/^[A-Za-z]{3}\s\d{4}$/.test(value)) {
      return value.substring(0, 3); // Just "Jan", "Feb", etc.
    }
    
    // Don't shorten other values that are already short
    if (value.length <= 5) {
      return value;
    }
    
    // For other longer text, truncate with ellipsis
    return `${value.substring(0, 3)}...`;
  }, [filterValues]);

  // Format value for tooltip
  const formatValue = useCallback((value: number) => {
    // Add null/undefined check
    if (value === undefined || value === null) {
      return '$0.00';
    }
    
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    if (absValue >= 1000000000) {
      return `${sign}$${(absValue / 1000000000).toFixed(2)}B`;
    } else if (absValue >= 1000000) {
      return `${sign}$${(absValue / 1000000).toFixed(2)}M`;
    } else if (absValue >= 1000) {
      return `${sign}$${(absValue / 1000).toFixed(2)}K`;
    } else {
      return `${sign}$${absValue.toFixed(2)}`;
    }
  }, []);

  // Format y-axis tick value with appropriate units
  const formatTickValue = useCallback((value: number) => {
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
      // For values between 0 and 1, show decimal places
      return `${sign}${absValue.toFixed(1)}`;
    } else {
      return `${sign}${absValue.toFixed(0)}`;
    }
  }, []);

  // Format right y-axis tick value with higher scale units (0.1M instead of 100K)
  const formatRightAxisTickValue = useCallback((value: number) => {
    if (value === 0) return '0';
    
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    if (absValue >= 1000000000000) {
      // Use T for trillions
      const formattedValue = (absValue / 1000000000000).toFixed(2);
      // Remove trailing zeros after decimal
      const cleanValue = parseFloat(formattedValue).toString();
      return `${sign}${cleanValue}T`;
    } else if (absValue >= 100000000) {
      // Use B for values >= 100M (show as 0.1B instead of 100M)
      const formattedValue = (absValue / 1000000000).toFixed(2);
      // Remove trailing zeros after decimal
      const cleanValue = parseFloat(formattedValue).toString();
      return `${sign}${cleanValue}B`;
    } else if (absValue >= 100000) {
      // Use M for values >= 100K (show as 0.1M instead of 100K)
      const formattedValue = (absValue / 1000000).toFixed(2);
      // Remove trailing zeros after decimal
      const cleanValue = parseFloat(formattedValue).toString();
      return `${sign}${cleanValue}M`;
    } else if (absValue >= 1000) {
      const formattedValue = (absValue / 1000).toFixed(1);
      return formattedValue.endsWith('.0') 
        ? `${sign}${formattedValue.slice(0, -2)}K` 
        : `${sign}${formattedValue}K`;
    } else if (absValue < 1) {
      // For values between 0 and 1, show decimal places
      return `${sign}${absValue.toFixed(1)}`;
    } else {
      return `${sign}${absValue.toFixed(0)}`;
    }
  }, []);

  // Placeholder for refresh data functionality
  const refreshData = useCallback(() => {
    // If onFilterChange exists in chartConfig, call it with current filters
    if (onFilterChange) {
      onFilterChange(filterValues || {});
    }
    
    setError(null);
  }, [filterValues, onFilterChange]);

  // Extract data for the chart
  const { chartData, fields, fieldColors } = useMemo(() => {
    // Use appropriate data based on context
    const currentData = 
      (isExpanded && isModalBrushActive && modalFilteredData.length > 0) ? modalFilteredData :
      (!isExpanded && isBrushActive && filteredData.length > 0) ? filteredData : 
      data;
    
    if (!currentData || currentData.length === 0) {
      return { chartData: [], fields: [], fieldColors: {} };
    }

    // Use external color map if available
    const preferredColorMap = externalColorMap || {};
    
    // Filter data first to remove any undefined x values
    const processedData = currentData.filter(d => d[xKey] !== undefined && d[xKey] !== null);
    
    // Sort by date if applicable
    if (processedData.length > 0) {
      // Detect if data contains dates
      const isDateField = typeof processedData[0][xKey] === 'string' && 
        (processedData[0][xKey].match(/^\d{4}-\d{2}-\d{2}/) || 
        /^\w+\s\d{4}$/.test(processedData[0][xKey]) || 
        /^\d{4}$/.test(processedData[0][xKey]));
      
      if (isDateField) {
        // Sort dates chronologically (past to present)
        processedData.sort((a, b) => {
          const dateA = new Date(a[xKey]);
          const dateB = new Date(b[xKey]);
          return dateA.getTime() - dateB.getTime();
        });
      }
    }
    
    // Apply currency field filtering for field-switcher type currency filters
    let filteredYField = yField;
    const currencyFilter = chartConfig.additionalOptions?.filters?.currencyFilter;
    
    // Get the correct currency filter value based on context
    let selectedCurrency: string | undefined;
    if (isExpanded) {
      // In modal: prioritize modalFilterValues, but ensure it's properly set
      selectedCurrency = modalFilterValues?.currencyFilter || filterValues?.currencyFilter;
      console.log('DualAxis Modal currency selection:', {
        modalCurrency: modalFilterValues?.currencyFilter,
        fallbackCurrency: filterValues?.currencyFilter,
        selectedCurrency,
        isExpanded
      });
    } else {
      // In regular view: use filterValues
      selectedCurrency = filterValues?.currencyFilter;
    }
    
    // Handle initial state: if no currency is selected but we have a currency filter, default to first option
    if (currencyFilter?.type === 'field_switcher' && currencyFilter.columnMappings && !selectedCurrency) {
      const availableCurrencies = Object.keys(currencyFilter.columnMappings);
      if (availableCurrencies.length > 0) {
        selectedCurrency = availableCurrencies[0];
        console.log('DualAxis: No currency selected, defaulting to first available:', selectedCurrency);
      }
    }
    
    console.log('DualAxis Currency filter context:', { selectedCurrency, isExpanded, currencyFilterType: currencyFilter?.type });
    
    if (currencyFilter?.type === 'field_switcher' && currencyFilter.columnMappings && selectedCurrency) {
      console.log('DualAxis: Applying currency field filtering:', {
        selectedCurrency,
        columnMappings: currencyFilter.columnMappings,
        originalFields: Array.isArray(yField) ? yField.map(f => typeof f === 'string' ? f : f.field) : [typeof yField === 'string' ? yField : yField.field]
      });
      
      // Get all currency-related fields from the column mappings
      const currencyFields = Object.values(currencyFilter.columnMappings);
      const targetFields = currencyFilter.columnMappings[selectedCurrency];
      
      if (targetFields && Array.isArray(yField)) {
        // Parse target fields (could be comma-separated)
        const targetFieldList = targetFields.split(',').map(f => f.trim());
        
        // Filter yAxis to only include:
        // 1. Fields that match the selected currency's target fields
        // 2. Non-currency fields (fields not in any currency mapping)
        filteredYField = yField.filter(field => {
          const fieldName = typeof field === 'string' ? field : field.field;
          
          // Include if it's a target field for the selected currency
          if (targetFieldList.includes(fieldName)) {
            return true;
          }
          
          // Include if it's not a currency field at all (not in any mapping)
          if (!currencyFields.some(mapping => {
            const mappingFields = mapping.split(',').map(f => f.trim());
            return mappingFields.includes(fieldName);
          })) {
            return true;
          }
          
          // Exclude currency fields that don't match the selected currency
          return false;
        });
        
        console.log('DualAxis: Filtered yField result:', {
          originalCount: yField.length,
          filteredCount: filteredYField.length,
          filteredFields: filteredYField.map(f => typeof f === 'string' ? f : f.field)
        });
      }
    }
    
    // Get all field names that should appear in the chart
    let allFields: string[] = [];
    if (Array.isArray(filteredYField)) {
      allFields = filteredYField.map(field => getYAxisField(field));
    } else {
      allFields = [getYAxisField(filteredYField)];
    }
    
    // Separate fields by axis for sequential color assignment using first two colors
    const leftAxisFields = allFields.filter(field => !chartConfig.dualAxisConfig?.rightAxisFields.includes(field));
    const rightAxisFields = allFields.filter(field => chartConfig.dualAxisConfig?.rightAxisFields.includes(field));
    
    // Get all original field names to determine consistent base field mapping
    const allOriginalFields = Array.isArray(yField) ? yField.map(f => typeof f === 'string' ? f : f.field) : [typeof yField === 'string' ? yField : yField.field];
    
    // Create base field mapping for consistent colors across currency switches
    const baseFieldToColorIndex: Record<string, number> = {};
    const seenBaseFields = new Set<string>();
    let colorIndex = 0;
    
    // First pass: establish base field color indices from ALL original fields
    allOriginalFields.forEach(field => {
      const baseFieldName = getBaseFieldName(field);
      if (!seenBaseFields.has(baseFieldName)) {
        baseFieldToColorIndex[baseFieldName] = colorIndex; // Use colors[0], colors[1], colors[2], colors[3]...
        seenBaseFields.add(baseFieldName);
      colorIndex++;
      }
    });
    
    console.log('=== DUAL AXIS COLOR ASSIGNMENT DEBUG ===');
    console.log('All original fields:', allOriginalFields);
    console.log('Current visible fields:', allFields);
    console.log('Base field to color index mapping:', baseFieldToColorIndex);
    console.log('Left axis fields:', leftAxisFields);
    console.log('Right axis fields:', rightAxisFields);
    console.log('Preferred color map:', preferredColorMap);
    console.log('getColorByIndex(0):', getColorByIndex(0));
    console.log('getColorByIndex(1):', getColorByIndex(1));
    
    // Prepare color mapping using base field names for consistency
    const colorMapping: Record<string, string> = {};
    
    // Assign colors based on base field name (consistent across currencies)
    // Ignore preferredColorMap to ensure consistent base field coloring
    allFields.forEach((field) => {
      const baseFieldName = getBaseFieldName(field);
      const colorIdx = baseFieldToColorIndex[baseFieldName] ?? 0;
      colorMapping[field] = getColorByIndex(colorIdx);
      console.log(`Field "${field}" -> base:"${baseFieldName}" -> color[${colorIdx}] = ${colorMapping[field]} (ignoring preferred: ${preferredColorMap[field] || 'none'})`);
    });
    
    console.log('Final color mapping:', colorMapping);
    console.log('==========================================');
    
    return { 
      chartData: processedData,
      fields: allFields,
      fieldColors: colorMapping
    };
  }, [data, filteredData, modalFilteredData, isBrushActive, isModalBrushActive, xKey, yField, externalColorMap, isExpanded, filterValues?.currencyFilter, modalFilterValues?.currencyFilter, chartConfig.additionalOptions?.filters?.currencyFilter]);

  // Utility to determine if a field belongs to the right axis
  const isRightAxisField = useCallback((field: string): boolean => {
    if (!chartConfig.dualAxisConfig) return false;
    return chartConfig.dualAxisConfig.rightAxisFields.includes(field);
  }, [chartConfig.dualAxisConfig]);

  // Utility to check if a field should be rendered as a line
  const shouldRenderAsLine = useCallback((field: string): boolean => {
    if (!chartConfig.dualAxisConfig) return false;
    
    // Check field configuration in yField if available
    if (Array.isArray(yField) && typeof yField[0] !== 'string') {
      const fieldConfig = (yField as YAxisConfig[]).find(config => config.field === field);
      if (fieldConfig) {
        return fieldConfig.type === 'line';
      }
    }
    
    // Otherwise use axis type from dual axis config
    const isRight = isRightAxisField(field);
    return isRight ? 
      chartConfig.dualAxisConfig.rightAxisType === 'line' : 
      chartConfig.dualAxisConfig.leftAxisType === 'line';
  }, [chartConfig.dualAxisConfig, yField, isRightAxisField]);
  
  // Handle interaction (mouse or touch) for tooltips
  const handleInteraction = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, isModal = false) => {
    // Get the correct coordinates based on event type
    const isTouchEvent = 'touches' in e;
    const clientX = isTouchEvent ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = isTouchEvent ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const containerRef = isModal ? modalChartRef : chartRef;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Get position relative to chart container
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    
    // Use current data based on brush state
    const currentData = isModal 
      ? (isModalBrushActive && modalFilteredData.length > 0 ? modalFilteredData : data)
      : (isBrushActive && filteredData.length > 0 ? filteredData : data);
    
    // Check if we have data to work with
    if (currentData.length === 0) return;
    
    // Calculate available chart space for dual-axis chart
    const margin = { top: 10, right: 28, bottom: 30, left: 40 };
    const innerWidth = rect.width - margin.left - margin.right;
    
    // Adjust mouseX to account for margin
    const adjustedMouseX = mouseX - margin.left;
    
    // Early exit if mouse is outside the chart area
    if (adjustedMouseX < 0 || adjustedMouseX > innerWidth) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    // Calculate bar width and find closest bar
    const barWidth = innerWidth / chartData.length;
    const barIndex = Math.floor(adjustedMouseX / barWidth);
    
    // Validate the index
    if (barIndex < 0 || barIndex >= chartData.length) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    // Get the data point at this index
    const dataPoint = chartData[barIndex];
    if (!dataPoint) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }

    const xValue = dataPoint[xKey];
    
    // Calculate safe tooltip position for mobile
    const safePosition = calculateSafeTooltipPosition(mouseX, mouseY, rect);
    
    // Only update if showing a new x-value or hiding previous one
    if (!tooltip.visible || tooltip.key !== xValue) {
      // For dual-axis, show all field values
      const visibleFields = fields.filter(field => !hiddenSeriesState.includes(field));
      if (visibleFields.length === 0) {
        if (tooltip.visible) {
          setTooltip(prev => ({ ...prev, visible: false }));
        }
        return;
      }
      let tooltipItems = visibleFields
        .filter(field => {
          const value = Number(dataPoint[field]);
          return !isNaN(value) && value !== 0;
        })
        .map(field => {
          // Get the unit specific to this field only
          const fieldConfig = Array.isArray(yField) 
            ? yField.find(f => getYAxisField(f) === field) 
            : yField;
          
          const fieldUnit = getYAxisUnit(fieldConfig || field, filterValues?.currencyFilter);
          
          return {
            label: formatFieldName(field),
            value: formatWithUnit(Number(dataPoint[field]) || 0, fieldUnit),
            color: fieldColors[field] || blue,
            shape: shouldRenderAsLine(field) ? 'circle' as 'circle' : 'square' as 'square'
          };
        });
      // If no items passed the filter, show placeholder for first visible field
      if (tooltipItems.length === 0 && visibleFields.length > 0) {
        const firstVisibleField = visibleFields[0];
        const firstFieldConfig = Array.isArray(yField) 
          ? yField.find(f => getYAxisField(f) === firstVisibleField) 
          : yField;
        
        const firstFieldUnit = getYAxisUnit(firstFieldConfig || firstVisibleField, filterValues?.currencyFilter);
        
        tooltipItems = [{
          label: formatFieldName(firstVisibleField),
          value: formatWithUnit(0, firstFieldUnit),
          color: fieldColors[firstVisibleField] || blue,
          shape: shouldRenderAsLine(firstVisibleField) ? 'circle' as 'circle' : 'square' as 'square'
        }];
      }
      if (tooltipItems.length === 0) {
        if (tooltip.visible) {
          setTooltip(prev => ({ ...prev, visible: false }));
        }
        return;
      }
      setTooltip({
        visible: true,
        key: xValue,
        items: tooltipItems,
        left: safePosition.left,
        top: safePosition.top
      });
    } else {
      // If tooltip content isn't changing, just update position
      setTooltip(prev => ({
        ...prev,
        left: safePosition.left,
        top: safePosition.top
      }));
    }
  }, [data, filteredData, modalFilteredData, isBrushActive, isModalBrushActive, chartData, fields, xKey, yField, 
      fieldColors, formatValue, tooltip.visible, tooltip.key, tooltip.items, shouldRenderAsLine, getYAxisUnit, hiddenSeriesState]);

  // For backward compatibility
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    handleInteraction(e, isModal);
  }, [handleInteraction]);

  // Optimized touch handlers that don't interfere with page scrolling
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>, isModal = false) => {
    // Handle touch interaction without preventing default to allow normal scrolling
    const containerRef = isModal ? modalChartRef : chartRef;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const touch = e.touches[0];
    const mouseX = touch.clientX - rect.left;
    const mouseY = touch.clientY - rect.top;
    
    // Calculate available chart space
    const margin = { top: 10, right: 28, bottom: 30, left: 40 };
    const innerWidth = rect.width - margin.left - margin.right;
    const adjustedMouseX = mouseX - margin.left;
    
    // Only handle touch if it's within the chart area
    if (adjustedMouseX >= 0 && adjustedMouseX <= innerWidth && chartData.length > 0) {
      // Note: Cannot preventDefault in touch handlers due to passive event listeners
      handleInteraction(e, isModal);
    }
  }, [handleInteraction, chartData.length]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>, isModal = false) => {
    // Only handle if tooltip is already visible (user is interacting with chart)
    if (tooltip.visible) {
      // Note: Cannot preventDefault in touch move handler due to passive event listeners
      handleInteraction(e, isModal);
    }
    // Otherwise, allow normal page scrolling
  }, [handleInteraction, tooltip.visible]);

  // Handle mouse leave for tooltip
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);

  // Handle touch end to close tooltip when user stops touching
  const handleTouchEnd = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);

  // Process brush data
  const brushData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Filter and ensure x values are valid
    let processedData = data.filter(d => d[xKey] !== undefined && d[xKey] !== null);
    
    // Sort by date if applicable
    if (processedData.length > 0) {
      // Detect if data contains dates (including aggregated date formats)
      const isDateField = typeof processedData[0][xKey] === 'string' && 
        (processedData[0][xKey].match(/^\d{4}-\d{2}-\d{2}/) || 
         /^\d{2}\/\d{2}\/\d{4}/.test(processedData[0][xKey]) ||
         /^[A-Za-z]{3}\s\d{4}$/.test(processedData[0][xKey]) || 
         /^\d{4}$/.test(processedData[0][xKey]) ||
         /^\d{4}-\d{2}$/.test(processedData[0][xKey]) || // Monthly format: 2025-01
         /^\d{4}-Q[1-4]$/.test(processedData[0][xKey])); // Quarterly format: 2025-Q1
      
      if (isDateField) {
        // Sort dates chronologically (oldest to newest)
        processedData.sort((a, b) => {
          const dateA = parseAggregatedDate(a[xKey]);
          const dateB = parseAggregatedDate(b[xKey]);
          return dateA.getTime() - dateB.getTime();
        });
      }
    }
    
    // Create synthetic dates for brush
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    
    // Get the first field for brush data
    const firstField = fields.length > 0 ? fields[0] : '';
    
    // Create date points for the brush
    const brushPoints = processedData.map((d, i) => {
      // Try to parse date from x value or use synthetic date
      let date;
      if (typeof d[xKey] === 'string' && 
         (d[xKey].match(/^\d{4}-\d{2}-\d{2}/) || 
          /^\d{2}\/\d{2}\/\d{4}/.test(d[xKey]) ||
          /^[A-Za-z]{3}\s\d{4}$/.test(d[xKey]) || 
          /^\d{4}$/.test(d[xKey]) ||
          /^\d{4}-\d{2}$/.test(d[xKey]) ||
          /^\d{4}-Q[1-4]$/.test(d[xKey]))) {
        date = parseAggregatedDate(d[xKey]);
        if (isNaN(date.getTime())) {
          date = new Date(baseDate);
          date.setDate(baseDate.getDate() + i);
        }
      } else {
        date = new Date(baseDate);
        date.setDate(baseDate.getDate() + i);
      }
      
      return {
        date,
        value: Number(d[firstField]) || 0,
        originalData: d
      };
    });
    
    // Return sorted brush data (should already be sorted from processedData sort)
    return brushPoints;
  }, [data, xKey, fields]);

  // Handle brush change
  const handleBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isBrushActive) {
        setBrushDomain(null);
        setIsBrushActive(false);
        setFilteredData([]);
      }
      return;
    }
    
    const { x0, x1 } = domain;
    
    // Update brush domain
    setBrushDomain([new Date(x0), new Date(x1)]);
    
    // Filter data based on brush selection
    const selectedItems = brushData
      .filter(item => item.date >= new Date(x0) && item.date <= new Date(x1))
      .map(item => item.originalData);
      
    setFilteredData(selectedItems);
    
    if (!isBrushActive) {
      setIsBrushActive(true);
    }
  }, [isBrushActive, brushData]);
  
  // Handle modal brush change
  const handleModalBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isModalBrushActive) {
        setModalBrushDomain(null);
        setIsModalBrushActive(false);
        setModalFilteredData([]);
      }
      return;
    }
    
    const { x0, x1 } = domain;
    
    // Update modal brush domain
    setModalBrushDomain([new Date(x0), new Date(x1)]);
    
    // Filter data based on brush selection
    const selectedItems = brushData
      .filter(item => item.date >= new Date(x0) && item.date <= new Date(x1))
      .map(item => item.originalData);
      
    setModalFilteredData(selectedItems);
    
    if (!isModalBrushActive) {
      setIsModalBrushActive(true);
    }
  }, [isModalBrushActive, brushData]);
  
  // Enhanced filter change handler for modal
  const handleModalFilterChange = useCallback((key: string, value: string) => {
    console.log(`Modal filter changed: ${key} = ${value}`);
    
    const updatedFilters = {
      ...modalFilterValues,
      [key]: value
    };
    
    setModalFilterValues(updatedFilters);
    
    // For time aggregation charts, use onModalFilterUpdate for internal state management
    // and only call onFilterChange for non-time filters that need API calls
    const isTimeAggregationEnabled = chartConfig.additionalOptions?.enableTimeAggregation;
    
    if (onModalFilterUpdate) {
      onModalFilterUpdate(updatedFilters);
    }
    
    if (isTimeAggregationEnabled) {
      // For time aggregation charts, time filter changes are handled client-side
      // Only call onFilterChange for currency filters that might need API calls
      if (key === 'currencyFilter' && onFilterChange) {
        onFilterChange(updatedFilters);
      }
    } else if (onFilterChange) {
      // For non-time aggregation charts, all filter changes trigger API calls
      onFilterChange(updatedFilters);
    }
  }, [modalFilterValues, onFilterChange, onModalFilterUpdate, chartConfig.additionalOptions?.enableTimeAggregation]);
  
  // Update legend items based on chart data
  const updateLegendItems = useCallback(() => {
    if (fields.length > 0) {
      // Calculate total value for each field across all data points
      const fieldTotals: Record<string, number> = {};
      
      fields.forEach(field => {
        fieldTotals[field] = chartData.reduce((sum, d) => sum + (Number(d[field]) || 0), 0);
      });
      
      // Create and sort legend items by total value (descending)
      const items = fields
        .map(field => ({
          id: field,
          label: formatFieldName(field),
          color: fieldColors[field] || blue,
          value: fieldTotals[field]
        }))
        .sort((a, b) => b.value - a.value);
      
      setLegendItems(items);
    }
  }, [fields, fieldColors, chartData]);
  
  // Sync modal brush domain with main brush domain when modal opens
  useEffect(() => {
    if (isExpanded) {
      console.log('Modal opened, syncing brush domains');
      // When modal opens, sync the brush domains
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
      
      // Also sync filtered data
      if (isBrushActive && filteredData.length > 0) {
        console.log('Syncing filtered data to modal:', filteredData.length, 'items');
        setModalFilteredData(filteredData);
      } else {
        setModalFilteredData(data);
      }
      
      // Update legend items for modal
      updateLegendItems();
    }
  }, [isExpanded, brushDomain, isBrushActive, filteredData, data, updateLegendItems]);

  // Render chart content function
  const renderChartContent = useCallback((chartWidth: number, chartHeight: number, isModal = false) => {
    // Show error state or no data
    if (error) {
      return (
        <div className="flex flex-col justify-center items-center h-full">
          <div className="text-gray-400/80 text-xs mb-2">{error}</div>
          <ButtonSecondary onClick={refreshData}>
            <div className="flex items-center gap-1.5">
              <RefreshIcon className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </div>
          </ButtonSecondary>
        </div>
      );
    }
    
    // Show loader when no data is available yet
    if (chartData.length === 0) {
      return (
        <div className="flex justify-center items-center h-full">
          <PrettyLoader size="sm" />
        </div>
      );
    }
    
    // Define margins for chart
    const margin = { top: 10, right: 28, bottom: 30, left: 40 };
    const innerWidth = chartWidth - margin.left - margin.right;
    const innerHeight = chartHeight - margin.top - margin.bottom;
    
    if (innerWidth <= 0 || innerHeight <= 0) return null;
    
    // Use appropriate data based on view and brush state
    const currentData = isModal 
      ? (isModalBrushActive && modalFilteredData.length > 0 ? modalFilteredData : data)
      : (isBrushActive && filteredData.length > 0 ? filteredData : data);
    
    // Create scales for dual-axis chart
    const xScale = scaleBand<string>({
      domain: currentData
        .map(d => d[xKey])
        .sort((a, b) => {
          // If they're dates, sort chronologically 
          if (typeof a === 'string' && typeof b === 'string' &&
             (a.match(/^\d{4}-\d{2}-\d{2}/) || /^\w+\s\d{1,2}$/.test(a)) &&
             (b.match(/^\d{4}-\d{2}-\d{2}/) || /^\w+\s\d{1,2}$/.test(b))) {
            const dateA = new Date(a);
            const dateB = new Date(b);
            if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
              return dateA.getTime() - dateB.getTime();
            }
          }
          
          // If they're numeric values, sort numerically (lowest to highest)
          const numA = Number(a);
          const numB = Number(b);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          
          // For strings, sort alphabetically
          if (typeof a === 'string' && typeof b === 'string') {
            return a.localeCompare(b);
          }
          
          return 0; // No change in order if not handled above
        }),
      range: [0, innerWidth],
      padding: 0.2,
    });
    
    // Calculate min and max values for left and right axes
    const leftAxisFields = fields.filter(field => !isRightAxisField(field));
    const rightAxisFields = fields.filter(field => isRightAxisField(field));
    
    const leftMax = Math.max(
      ...currentData.flatMap(d => leftAxisFields.map(field => Number(d[field]) || 0)),
      1
    );
    
    const leftMin = Math.min(
      ...currentData.flatMap(d => leftAxisFields.map(field => Number(d[field]) || 0)),
      0
    );
    
    const rightMax = Math.max(
      ...currentData.flatMap(d => rightAxisFields.map(field => Number(d[field]) || 0)),
      1
    );
    
    const rightMin = Math.min(
      ...currentData.flatMap(d => rightAxisFields.map(field => Number(d[field]) || 0)),
      0
    );
    
    // Create scales for left and right y-axes
    const leftYScale = scaleLinear<number>({
      domain: [leftMin * 1.1, leftMax * 1.1], // Add 10% padding on both sides
      range: [innerHeight, 0],
      nice: true,
      clamp: true,
    });
    
    const rightYScale = scaleLinear<number>({
      domain: [rightMin * 1.1, rightMax * 1.1], // Add 10% padding on both sides
      range: [innerHeight, 0],
      nice: true,
      clamp: true,
    });
    
    // Create line data for series that should be rendered as lines
    const lineDataByField: Record<string, Array<{x: number, y: number}>> = {};
    
    // Initialize data structure for each field that should be a line
    fields.forEach(field => {
      if (shouldRenderAsLine(field)) {
        lineDataByField[field] = [];
      }
    });
    
    // Build line points
    currentData.forEach(d => {
      fields.forEach(field => {
        if (shouldRenderAsLine(field)) {
          const x = xScale(d[xKey]) || 0;
          const centerX = x + (xScale.bandwidth() / 2); // Center of the bar
          
          // Use appropriate scale based on axis
          const y = isRightAxisField(field)
            ? rightYScale(Number(d[field]) || 0)
            : leftYScale(Number(d[field]) || 0);
          
          lineDataByField[field].push({ x: centerX, y });
        }
      });
    });
    
    // Sort line data by x position
    Object.keys(lineDataByField).forEach(field => {
      lineDataByField[field].sort((a, b) => a.x - b.x);
    });
    
    // Calculate x-axis tick values - limit for dates/integers, show all for text strings
    const xTickValues = (() => {
      // Check if the data contains dates
      const isDateData = chartData.length > 0 && 
        typeof chartData[0][xKey] === 'string' && 
        (/^\d{4}-\d{2}-\d{2}/.test(chartData[0][xKey]) || 
         /^\d{2}\/\d{2}\/\d{4}/.test(chartData[0][xKey]) ||
         /^\d{1,2}-[A-Za-z]{3}-\d{4}/.test(chartData[0][xKey]) ||
         /^[A-Za-z]{3}\s\d{4}$/.test(chartData[0][xKey]) || 
         /^\d{4}$/.test(chartData[0][xKey]));
      
      // Check if all values are integers
      const areAllIntegers = chartData.every(item => {
        const num = Number(item[xKey]);
        return Number.isInteger(num) && !isNaN(num);
      });
      
      // Detect mobile screen size
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      
      // For text strings (non-dates, non-integers), always show all ticks
      if (!isDateData && !areAllIntegers) {
        return chartData.map(d => d[xKey]);
      }
      
      // Use maxXAxisTicks if provided (for integer sequences/dates), otherwise use default limits
      const maxTicks = maxXAxisTicks || (isMobile ? 5 : 8);
      
      // For date data or integers, limit ticks based on configuration
      if (chartData.length > maxTicks) {
        const tickInterval = Math.ceil(chartData.length / maxTicks);
        return chartData
          .filter((_, i) => i % tickInterval === 0)
          .map(d => d[xKey]);
      }
      
      // Show all values if under the limit
      return chartData.map(d => d[xKey]);
    })();
    
    // Use appropriate handlers based on modal state
    const mouseMoveFn = isModal 
      ? (e: React.MouseEvent<HTMLDivElement>) => handleMouseMove(e, true) 
      : (e: React.MouseEvent<HTMLDivElement>) => handleMouseMove(e, false);
    
    // Render the chart content
    return (
      <div 
        className="relative w-full h-full touch-pan-y" 
        style={{ touchAction: 'pan-y' }}
        onMouseMove={(e) => handleMouseMove(e, isModal)}
        onTouchStart={(e) => handleTouchStart(e, isModal)}
        onTouchMove={(e) => handleTouchMove(e, isModal)}
        onTouchEnd={handleTouchEnd}
        onMouseLeave={handleMouseLeave}
        ref={isModal ? modalChartRef : chartRef}
      >
        {/* Tooltip - only show for non-modal version, modal handles its own */}
        {tooltip.visible && tooltip.items && !isModal && (
          <ChartTooltip
            title={String(tooltip.key)}
            items={tooltip.items}
            left={tooltip.left}
            top={tooltip.top}
            isModal={false}
            timeFilter={filterValues?.timeFilter}
            currencyFilter={filterValues?.currencyFilter}
            showTotal={chartConfig.additionalOptions?.showTooltipTotal}
          />
        )}
        
        <svg width={chartWidth} height={chartHeight}>
          <Group left={margin.left} top={margin.top}>
            {/* Y-axis grid lines */}
            <GridRows
              scale={leftYScale}
              width={innerWidth}
              stroke="#1f2937"
              strokeOpacity={0.5}
              strokeDasharray="2,3"
            />
            
            {/* Zero line with special styling when we have negative values on left axis */}
            {leftMin < 0 && (
              <line
                x1={0}
                y1={leftYScale(0)}
                x2={innerWidth}
                y2={leftYScale(0)}
                stroke="#374151"
                strokeWidth={1}
                strokeOpacity={0.8}
              />
            )}
            
            {/* Left Y-axis */}
            <AxisLeft
              scale={leftYScale}
              stroke="#374151"
              strokeWidth={0.5}
              tickStroke="transparent"
              tickLength={0}
              hideZero={false}
              numTicks={5}
              tickFormat={(value) => formatTickValue(Number(value))}
              tickLabelProps={() => ({
                fill: '#6b7280',
                fontSize: 11,
                fontWeight: 300,
                letterSpacing: '0.05em',
                textAnchor: 'end',
                dy: '0.33em',
                dx: '-0.25em'
              })}
            />
            
            {/* Right Y-axis */}
            <AxisRight
              scale={rightYScale}
              left={innerWidth}
              stroke="#374151"
              strokeWidth={0.5}
              tickStroke="transparent"
              tickLength={0}
              hideZero={false}
              numTicks={5}
              tickFormat={(value) => formatRightAxisTickValue(Number(value))}
              tickLabelProps={() => ({
                fill: '#6b7280',
                fontSize: 11,
                fontWeight: 300,
                letterSpacing: '0.05em',
                textAnchor: 'start',
                dy: '0.33em',
                dx: '0.25em'
              })}
            />
            
            {/* X-axis */}
            <AxisBottom
              top={innerHeight}
              scale={xScale}
              stroke="#374151"
              strokeWidth={0.5}
              tickStroke="transparent"
              hideAxisLine={false}
              tickLength={0}
              tickValues={xTickValues}
              tickFormat={(value) => {
                // Format date labels based on timeFilter
                if (typeof value === 'string') {
                  // For ISO dates (YYYY-MM-DD)
                  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
                    const date = new Date(value);
                    
                    if (!isNaN(date.getTime())) {
                      // Format based on timeFilter if available
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
                      
                      // Default format if no timeFilter is specified
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }
                  }
                  
                  // For other text strings (non-dates), truncate to 3 letters + ellipsis
                  if (typeof value === 'string') {
                    // Check if it's NOT a date format and NOT an integer
                    const isDate = /^\d{4}-\d{2}-\d{2}/.test(value) || 
                                  /^\d{2}\/\d{2}\/\d{4}/.test(value) ||
                                  /^\d{1,2}-[A-Za-z]{3}-\d{4}/.test(value) ||
                                  /^[A-Za-z]{3}\s\d{4}$/.test(value) || 
                                  /^\d{4}$/.test(value);
                    
                    const isInteger = Number.isInteger(Number(value)) && !isNaN(Number(value));
                    
                    if (!isDate && !isInteger && value.length > 3) {
                      return value.substring(0, 3) + '...';
                    }
                  }
                  
                  // For other date formats, use the helper function
                  return formatXAxisLabel(value);
                }
                
                // For non-date values, format using our helper function
                return formatXAxisLabel(String(value));
              }}
              tickLabelProps={() => ({
                fill: '#6b7280',
                fontSize: 11,
                fontWeight: 300,
                textAnchor: 'middle',
                dy: '0.5em'
              })}
              // Ensure first tick doesn't start before origin
              left={0}
            />
            
            {/* Render bars first (so lines appear on top) */}
            {currentData.map((d, i) => (
              <React.Fragment key={`bars-${i}`}>
                {fields.map((field, fieldIndex) => {
                  // Skip if this field should be rendered as a line or is hidden
                  if (shouldRenderAsLine(field) || hiddenSeriesState.includes(field)) return null;
                  
                  // Determine how many fields should be rendered as bars
                  const barFields = fields.filter(f => !shouldRenderAsLine(f));
                  const barWidth = xScale.bandwidth() / barFields.length;
                  
                  // Find this field's position in the barFields array
                  const barFieldIndex = barFields.indexOf(field);
                  
                  // Calculate bar dimensions
                  const value = Number(d[field]) || 0;
                  const scale = isRightAxisField(field) ? rightYScale : leftYScale;
                  // For positive values, the bar starts at the value position and extends down to zero
                  // For negative values, the bar starts at zero and extends down to the value position
                  const barHeight = Math.abs(scale(0) - scale(value));
                  const barX = (xScale(d[xKey]) || 0) + (barFieldIndex * barWidth);
                  // For positive values, the bar's y position is at the value's y coordinate
                  // For negative values, the bar's y position is at the zero line
                  const barY = value >= 0 ? scale(value) : scale(0);
                  
                  return (
                    <Bar
                      key={`bar-${i}-${field}`}
                      x={barX}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      fill={fieldColors[field]}
                      opacity={tooltip.visible && tooltip.key === d[xKey] ? 1 : 0.8}
                      rx={0}
                    />
                  );
                })}
              </React.Fragment>
            ))}
            
            {/* Render lines on top of bars */}
            {fields.map(field => {
              // Only render fields configured as lines and not hidden
              if (!shouldRenderAsLine(field) || hiddenSeriesState.includes(field)) return null;
              
              const lineData = lineDataByField[field];
              if (!lineData || lineData.length === 0) return null;
              
              return (
                <LinePath
                  key={`line-${field}`}
                  data={lineData}
                  x={d => d.x}
                  y={d => d.y}
                  stroke={fieldColors[field]}
                  strokeWidth={1}
                  curve={curveCatmullRom}
                />
              );
            })}
          </Group>
        </svg>
      </div>
    );
  }, [
    chartData, fields, xKey, error, refreshData, 
    handleMouseMove, handleMouseLeave,
    tooltip, fieldColors, isRightAxisField, shouldRenderAsLine, formatTickValue, formatXAxisLabel,
    isBrushActive, isModalBrushActive, filteredData, modalFilteredData, data, yAxisUnit, 
    filterValues, modalFilterValues, formatRightAxisTickValue, hiddenSeriesState
  ]);

  // Render the brush with time scale
  const renderBrushArea = useCallback((modalView = false) => {
    if (!brushData || brushData.length === 0) return null;
    
    return (
      <div className="h-[15%] w-full mt-2">
        <BrushTimeScale
          data={brushData}
          activeBrushDomain={modalView ? modalBrushDomain : brushDomain}
          onBrushChange={modalView ? handleModalBrushChange : handleBrushChange}
          onClearBrush={() => {
            if (modalView) {
              setModalBrushDomain(null);
              setIsModalBrushActive(false);
              setModalFilteredData([]);
            } else {
              setBrushDomain(null);
              setIsBrushActive(false);
              setFilteredData([]);
            }
          }}
          getDate={(d) => d.date}
          getValue={(d) => d.value}

          lineColor="#3b82f6"
          margin={{ top: 0, right: 28, bottom: 20, left: 30 }}

          isModal={modalView}
          curveType="catmullRom"
          
          filterValues={modalView ? modalFilterValues : filterValues}
        />
      </div>
    );
  }, [
    brushData, modalBrushDomain, brushDomain, 
    handleModalBrushChange, handleBrushChange,
    modalFilterValues, filterValues
  ]);

  // Handler to toggle series visibility
  const handleLegendClick = (fieldId: string) => {
    setHiddenSeriesState(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  // Handler for double-click: isolate series or restore all
  const handleLegendDoubleClick = (fieldId: string) => {
    const allFields = fields;
    if (hiddenSeriesState.length === allFields.length - 1 && !hiddenSeriesState.includes(fieldId)) {
      // Restore all
      setHiddenSeriesState([]);
    } else {
      // Isolate this series
      setHiddenSeriesState(allFields.filter(f => f !== fieldId));
    }
  };

  // Update hidden series when prop changes
  useEffect(() => {
    console.log('DualAxisChart: hiddenSeries prop changed:', hiddenSeries);
    console.log('DualAxisChart: fields are:', fields);
    setHiddenSeriesState(hiddenSeries || []);
  }, [hiddenSeries, fields]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (filterDebounceTimer.current) {
        clearTimeout(filterDebounceTimer.current);
      }
    };
  }, []);

  // When rendering the chart in expanded mode, use the Modal component
  if (isExpanded) {
    // Only render Modal on client-side to prevent hydration errors
    if (!isClient) {
      return <div className="w-full h-full flex items-center justify-center">Loading expanded view...</div>;
    }
    
    // Render expanded view inside Modal
    return (
      <Modal 
        isOpen={isExpanded} 
        onClose={onCloseExpanded || (() => {})}
        title={chartConfig.title || "Chart View"}
        subtitle={chartConfig.subtitle}
      >
        <div className="w-full h-[80vh] relative overflow-visible">
          {/* Filters row */}
          <div className="mb-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {/* Time filter */}
              {chartConfig.additionalOptions?.filters?.timeFilter && (
                <div className="flex items-center">
                  <TimeFilterSelector
                    value={modalFilterValues?.timeFilter || chartConfig.additionalOptions.filters.timeFilter.activeValue || 'M'}
                    onChange={(value) => handleModalFilterChange('timeFilter', value)}
                    options={chartConfig.additionalOptions.filters.timeFilter.options?.map((opt: string) => ({
                      value: opt,
                      label: opt
                    }))}
                  />
                </div>
              )}
              
              {/* Currency filter */}
              {chartConfig.additionalOptions?.filters?.currencyFilter && (
                <CurrencyFilter
                  currency={modalFilterValues?.currencyFilter || chartConfig.additionalOptions.filters.currencyFilter.activeValue || 'USD'}
                  onChange={(value) => handleModalFilterChange('currencyFilter', value)}
                  options={chartConfig.additionalOptions.filters.currencyFilter.options}
                  
                />
              )}
              
              {/* Display mode filter */}
              {chartConfig.additionalOptions?.filters?.displayModeFilter && (
                <div className="flex items-center">
                  <DisplayModeFilter
                    mode={(modalFilterValues?.displayMode || chartConfig.additionalOptions.filters.displayModeFilter.activeValue || 'absolute') as DisplayMode}
                    onChange={(value) => handleModalFilterChange('displayMode', value)}
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Horizontal line below filters */}
          <div className="w-full h-px bg-gray-900 mb-4"></div>
          
          {/* Chart with legends */}
          <div className="flex h-full">
            {/* Chart area - 90% width */}
            <div className="w-full lg:w-[90%] h-[90%] lg:pr-3 lg:border-r lg:border-gray-900">
              <div className="flex flex-col h-full">
                {/* Main chart - 85% height */}
                <div className="h-[85%] w-full relative" ref={modalChartRef}>
                  <ParentSize debounceTime={10}>
                    {({ width: parentWidth, height: parentHeight }) => 
                      parentWidth > 0 && parentHeight > 0 
                        ? renderChartContent(parentWidth, parentHeight, true)
                        : null
                    }
                  </ParentSize>
                </div>
                
                {/* Display tooltip at the container level for modal views */}
                {tooltip.visible && tooltip.items && (
                  <div className="absolute z-50" style={{ 
                    pointerEvents: 'none',
                    top: tooltip.top,
                    left: tooltip.left
                  }}>
                    <ChartTooltip
                      title={String(tooltip.key)}
                      items={tooltip.items}
                      left={0}
                      top={0}
                      isModal={true}
                      timeFilter={modalFilterValues?.timeFilter || filterValues?.timeFilter}
                      currencyFilter={modalFilterValues?.currencyFilter || filterValues?.currencyFilter}
                      showTotal={chartConfig.additionalOptions?.showTooltipTotal}
                    />
                  </div>
                )}
                
                {/* Brush component - 15% height */}
                {brushData.length > 0 ? (
                  renderBrushArea(true)
                ) : (null)}
              </div>
            </div>
            
            {/* Legend area - 10% width */}
            <div className="w-[10%] h-full pl-3 flex flex-col justify-start items-start hidden lg:flex">
              {/* Show legend items */}
              <div className="space-y-2 w-full overflow-y-auto max-h-[600px]
                [&::-webkit-scrollbar]:w-1.5 
                [&::-webkit-scrollbar-track]:bg-transparent 
                [&::-webkit-scrollbar-thumb]:bg-gray-700/40
                [&::-webkit-scrollbar-thumb]:rounded-full
                [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
                scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700/40">
                {legendItems.map(item => (
                  <LegendItem 
                    key={item.id} 
                    label={item.label}
                    color={item.color}
                    shape={shouldRenderAsLine(item.id) ? 'circle' : 'square'}
                    onClick={() => handleLegendClick(item.id)}
                    onDoubleClick={() => handleLegendDoubleClick(item.id)}
                    inactive={hiddenSeriesState.includes(item.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // Render normal view with brush
  return (
    <div className="w-full h-full relative">
      <div className="h-[85%] w-full">
        <ParentSize debounceTime={10}>
          {({ width: parentWidth, height: parentHeight }) => 
            parentWidth > 0 && parentHeight > 0 
              ? renderChartContent(parentWidth, parentHeight)
              : null
          }
        </ParentSize>
      </div>
      
      {brushData.length > 0 ? (
        renderBrushArea(false)
      ) : (null)}
    </div>
  );
};

export default React.memo(DualAxisChart); 