import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Bar } from '@visx/shape';
import { LinePath } from '@visx/shape';
import { ChartConfig, YAxisConfig } from '../../types';
import { blue, getColorByIndex } from '@/app/utils/chartColors';
import ChartTooltip from '@/app/components/shared/ChartTooltip';
import ButtonSecondary from "@/app/components/shared/buttons/ButtonSecondary";
import PrettyLoader from "@/app/components/shared/PrettyLoader";
import BrushTimeScale from "@/app/components/shared/BrushTimeScale";
import Modal from '@/app/components/shared/Modal';
import LegendItem from "@/app/components/shared/LegendItem";
import TimeFilterSelector from '@/app/components/shared/filters/TimeFilter';
import CurrencyFilter from '@/app/components/shared/filters/CurrencyFilter';
import DisplayModeFilter, { DisplayMode } from '@/app/components/shared/filters/DisplayModeFilter';
import { curveCatmullRom } from '@visx/curve';

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

export interface MultiSeriesLineBarChartProps {
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
function getYAxisUnit(field: string | YAxisConfig): string | undefined {
  return typeof field === 'string' ? undefined : field.unit;
}

// Helper function to determine if a field should be rendered as a line
function shouldRenderAsLine(field: string | YAxisConfig): boolean {
  if (typeof field === 'string') {
    return false; // Default to bar for string fields
  }
  return field.type === 'line';
}

// Format value with appropriate units
function formatWithUnit(value: number, unit?: string, defaultUnit?: string): string {
  // Get the unit symbol (use defaultUnit as fallback)
  const unitSymbol = unit || defaultUnit || '';
  const isUnitPrefix = unitSymbol === '$'; // Only $ goes at the beginning, all other units go at the end
  
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
    // For values less than 1000, determine appropriate decimal places based on order of magnitude
    if (absValue >= 1) {
      // Values 1-999: show 2 decimal places for consistency in tooltips
    formattedValue = `${sign}${absValue.toFixed(2)}`;
    } else if (absValue >= 0.1) {
      // Values 0.1-0.999: show 3 decimal places
      formattedValue = `${sign}${absValue.toFixed(3)}`;
    } else if (absValue >= 0.01) {
      // Values 0.01-0.099: show 4 decimal places
      formattedValue = `${sign}${absValue.toFixed(4)}`;
    } else if (absValue >= 0.001) {
      // Values 0.001-0.009: show 5 decimal places
      formattedValue = `${sign}${absValue.toFixed(5)}`;
    } else if (absValue >= 0.0001) {
      // Values 0.0001-0.0009: show 6 decimal places
      formattedValue = `${sign}${absValue.toFixed(6)}`;
    } else if (absValue > 0) {
      // Very small values: use scientific notation or show up to 7 decimal places
      if (absValue < 0.000001) {
        formattedValue = `${sign}${absValue.toExponential(3)}`;
      } else {
        formattedValue = `${sign}${absValue.toFixed(7)}`;
      }
    } else {
      formattedValue = '0';
    }
  }
  
  // Return with correct unit placement (or no unit if not specified)
  if (!unitSymbol) return formattedValue;
  return isUnitPrefix ? `${unitSymbol}${formattedValue}` : `${formattedValue}\u00A0${unitSymbol}`;
}

// Helper function to format X-axis tick labels
const formatXAxisLabel = (value: string, timeFilter?: string): string => {
  // Check if the value is a date format (YYYY-MM-DD or similar)
  const isDateFormat = /^\d{4}-\d{2}-\d{2}/.test(value) || 
                      /^\d{2}\/\d{2}\/\d{4}/.test(value) ||
                      /^\d{1,2}-[A-Za-z]{3}-\d{4}/.test(value);
  
  if (isDateFormat) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      // Format based on timeFilter
      if (timeFilter === 'D' || timeFilter === 'W') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (timeFilter === 'M') {
        return date.toLocaleDateString('en-US', { month: 'short' });
      } else if (timeFilter === 'Q') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `Q${quarter}`;
      } else if (timeFilter === 'Y') {
        return date.getFullYear().toString();
      }
      
      // Default date format if timeFilter is not specified
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
};

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

// Helper function to extract base field name for consistent coloring
function getBaseFieldName(fieldName: string): string {
  // Remove common currency/chain suffixes to group similar fields together
  const suffixesToRemove = ['_usd', '_sol', '_btc', '_eth', '_usdc', '_usdt'];
  
  let baseName = fieldName.toLowerCase();
  
  // Remove suffix if found
  for (const suffix of suffixesToRemove) {
    if (baseName.endsWith(suffix)) {
      baseName = baseName.substring(0, baseName.length - suffix.length);
      break;
    }
  }
  
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
  
  console.log('=== SMART COLOR MAPPING DEBUG ===');
  console.log('All original fields:', allOriginalFields);
  console.log('Visible fields:', visibleFields);
  console.log('Preferred color map:', preferredColorMap);
  
  // First, let's debug getBaseFieldName for each field
  console.log('=== BASE FIELD NAME EXTRACTION ===');
  visibleFields.forEach(field => {
    const baseFieldName = getBaseFieldName(field);
    console.log(`${field} -> base: "${baseFieldName}"`);
  });
  allOriginalFields.forEach(field => {
    const baseFieldName = getBaseFieldName(field);
    console.log(`${field} (original) -> base: "${baseFieldName}"`);
  });
  
  // Check if we have currency suffixes in any of the fields
  const hasCurrencySuffixes = allOriginalFields.some(field => {
    const baseFieldName = getBaseFieldName(field);
    return field.toLowerCase() !== baseFieldName;
  });
  
  console.log('Has currency suffixes in dataset:', hasCurrencySuffixes);
  
  // Strategy 1: If we have currency suffixes, use base field mapping for consistency
  if (hasCurrencySuffixes) {
    // First pass: Analyze ALL original fields to establish consistent base field color indices
    // Maintain order based on first appearance in original fields
    const seenBaseFields = new Set<string>();
    const orderedBaseFields: string[] = [];
    
    allOriginalFields.forEach(field => {
      const baseFieldName = getBaseFieldName(field);
      if (!seenBaseFields.has(baseFieldName)) {
        seenBaseFields.add(baseFieldName);
        orderedBaseFields.push(baseFieldName);
      }
    });
    
    console.log('Ordered base fields (by first appearance):', orderedBaseFields);
    
    orderedBaseFields.forEach((baseField, index) => {
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
    // This handles cases like currency filters where different field sets are shown but we want consistency
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
  
  console.log('\n=== FINAL COLOR MAPPING RESULT ===');
  console.log('Result colors:', resultColors);
  console.log('===================================');
  
  return resultColors;
}

const MultiSeriesLineBarChart: React.FC<MultiSeriesLineBarChartProps> = ({ 
  chartConfig, 
  data, 
  width = 500, 
  height = 300,
  isExpanded = false,
  onCloseExpanded,
  colorMap: externalColorMap,
  filterValues,
  yAxisUnit,
  hiddenSeries,
  onFilterChange,
  onModalFilterUpdate,
  maxXAxisTicks
}) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const modalChartRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [legendItems, setLegendItems] = useState<Array<{id: string, label: string, color: string, value?: number}>>([]);
  
  // Brush state
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  
  // Filtered data based on brush
  const [filteredData, setFilteredData] = useState<any[]>([]);

  // Modal-specific filtered data and brush state
  const [modalFilteredData, setModalFilteredData] = useState<any[]>([]);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  
  // Add state for filter values in modal - initialize with current filterValues
  const [modalFilterValues, setModalFilterValues] = useState<Record<string, string>>(() => {
    console.log('Initializing modalFilterValues with:', filterValues);
    return filterValues || {};
  });
  
  // Add state to track client-side rendering
  const [isClient, setIsClient] = useState(false);

  // Track hidden series (by field id)
  const [hiddenSeriesState, setHiddenSeriesState] = useState<string[]>(hiddenSeries || []);

  // Update hidden series when prop changes
  useEffect(() => {
    setHiddenSeriesState(hiddenSeries || []);
  }, [hiddenSeries]);

  // Update tooltip state definition
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    left: number;
    top: number;
    key: string;
    title?: string;
    items: { label: string, value: string | number, color: string, shape?: 'circle' | 'square' }[];
  }>({
    visible: false,
    left: 0,
    top: 0,
    key: '',
    items: []
  });

  // Extract mapping fields with safety checks
  if (!chartConfig.dataMapping) {
    console.error('Chart configuration is missing dataMapping:', chartConfig);
    return <div className="p-4 text-red-500">Error: Chart configuration is incomplete</div>;
  }
  
  const xField = chartConfig.dataMapping.xAxis;
  const yField = chartConfig.dataMapping.yAxis;
  
  // For type safety, ensure we use string values for indexing
  const xKey = typeof xField === 'string' ? xField : xField[0];
  
  // Extract data for the chart
  const { chartData, fields, fieldColors, fieldTypes, fieldUnits } = useMemo(() => {
    // Use appropriate filtered data depending on context
    const currentData = isExpanded
      ? (isModalBrushActive && modalFilteredData.length > 0 ? modalFilteredData : data)
      : (isBrushActive && filteredData.length > 0 ? filteredData : data);
    
    if (!currentData || currentData.length === 0) {
      return { chartData: [], fields: [], fieldColors: {}, fieldTypes: {}, fieldUnits: {} };
    }

    // Use external color map if available
    const preferredColorMap = externalColorMap || {};
    console.log('External color map received:', externalColorMap);
    
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
        // Sort dates chronologically (oldest to newest)
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
      console.log('Modal currency selection:', {
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
        console.log('No currency selected, defaulting to first available:', selectedCurrency);
      }
    }
    
    console.log('Currency filter context:', { selectedCurrency, isExpanded, currencyFilterType: currencyFilter?.type });
    
    if (currencyFilter?.type === 'field_switcher' && currencyFilter.columnMappings && selectedCurrency) {
      console.log('Applying currency field filtering:', {
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
        
        console.log('Filtered yField result:', {
          originalCount: yField.length,
          filteredCount: filteredYField.length,
          filteredFields: filteredYField.map(f => typeof f === 'string' ? f : f.field)
        });
      }
    }
    
    // Check if groupBy is used
    const groupByField = chartConfig.dataMapping.groupBy;
    
          if (groupByField && groupByField !== '') {
        // Process data with groupBy
        const groupedByX: Record<string, any> = {};
        const uniqueGroups = new Set<string>();
        
        // Collect all unique x-values and group values
        processedData.forEach(item => {
          const xValue = item[xKey];
          const groupValue = item[groupByField]?.toString() || 'Unknown';
          
          // Store unique groups
          uniqueGroups.add(groupValue);
          
          // Initialize x-value group if needed
          if (!groupedByX[xValue]) {
            groupedByX[xValue] = {};
          }
          
          // For single y-field with groupBy, store the value for each group
          if (typeof filteredYField === 'string') {
            groupedByX[xValue][groupValue] = Number(item[filteredYField]) || 0;
          } else if (Array.isArray(filteredYField) && filteredYField.length === 1) {
            // For array with single y-field
            const singleField = typeof filteredYField[0] === 'string' ? filteredYField[0] : filteredYField[0].field;
            groupedByX[xValue][groupValue] = Number(item[singleField]) || 0;
          } else {
            // For multiple y-fields with groupBy, store all field values
            Array.isArray(filteredYField) && filteredYField.forEach(field => {
              const fieldName = typeof field === 'string' ? field : field.field;
              if (!groupedByX[xValue][fieldName]) {
                groupedByX[xValue][fieldName] = {};
              }
              groupedByX[xValue][fieldName][groupValue] = Number(item[fieldName]) || 0;
            });
          }
        });
        
        // Transform to array format
        const uniqueGroupsArray = Array.from(uniqueGroups);
        
        if (typeof filteredYField === 'string' || (Array.isArray(filteredYField) && filteredYField.length === 1)) {
          // For single y-field with groupBy, each group becomes a field
          const resultFields = uniqueGroupsArray;
          const resultData = Object.entries(groupedByX).map(([xVal, groups]) => {
            const entry: any = { [xKey]: xVal };
            uniqueGroupsArray.forEach(group => {
              entry[group] = (groups as any)[group] || 0;
            });
            return entry;
          });
          
          // Get the original field configuration to preserve unit and type
          let originalFieldConfig: YAxisConfig | string;
          let originalFieldType: 'bar' | 'line';
          let originalFieldUnit: string | undefined;
          
          if (typeof filteredYField === 'string') {
            // If filteredYField is a string, use the chart's default type (bar)
            originalFieldConfig = filteredYField;
            originalFieldType = 'bar';
            originalFieldUnit = undefined;
          } else if (Array.isArray(filteredYField) && filteredYField.length === 1) {
            // For a single field in an array, use its specified type and unit
            originalFieldConfig = filteredYField[0];
            originalFieldType = typeof originalFieldConfig === 'string' ? 'bar' : originalFieldConfig.type;
            originalFieldUnit = typeof originalFieldConfig === 'string' ? undefined : originalFieldConfig.unit;
            
            // Use the determined type for all groups
          } else {
            // Fallback to bar if structure is unexpected
            originalFieldConfig = filteredYField[0] || '';
            originalFieldType = 'bar';
            originalFieldUnit = undefined;
          }
          
          // Apply the same type to all group-based series
          const resultFieldTypes: Record<string, 'bar' | 'line'> = {};  
          uniqueGroupsArray.forEach(group => {
            resultFieldTypes[group] = originalFieldType;
          });
          
          // Create unit mapping for all group-based fields
          const resultFieldUnits: Record<string, string | undefined> = {};
          uniqueGroupsArray.forEach(group => {
            resultFieldUnits[group] = originalFieldUnit;
          });
          
          // Get all original field names for consistent color mapping
          const allOriginalFields = Array.isArray(yField) ? yField.map(f => typeof f === 'string' ? f : f.field) : [typeof yField === 'string' ? yField : yField.field];
          
          // Assign colors to each field using smart color mapping
          const resultColors = createSmartColorMapping(resultFields, allOriginalFields, preferredColorMap);
          
          return { 
            chartData: resultData,
            fields: resultFields,
            fieldColors: resultColors,
            fieldTypes: resultFieldTypes,
            fieldUnits: resultFieldUnits
          };
              } else {
          // For multiple y-fields with groupBy, combine field and group
          const combinedFields: string[] = [];
          const resultFieldTypes: Record<string, 'bar' | 'line'> = {};
          const resultFieldUnits: Record<string, string | undefined> = {};
          
          Array.isArray(filteredYField) && filteredYField.forEach(field => {
            const fieldName = typeof field === 'string' ? field : field.field;
            const fieldType = typeof field === 'string' ? 'bar' : field.type;
            const fieldUnit = typeof field === 'string' ? undefined : field.unit;
            
            uniqueGroupsArray.forEach(group => {
              const combinedField = `${fieldName}_${group}`;
              combinedFields.push(combinedField);
              resultFieldTypes[combinedField] = fieldType;
              resultFieldUnits[combinedField] = fieldUnit;
            });
          });
          
          const resultData = Object.entries(groupedByX).map(([xVal, fieldGroups]) => {
            const entry: any = { [xKey]: xVal };
            
            Array.isArray(filteredYField) && filteredYField.forEach(field => {
              const fieldName = typeof field === 'string' ? field : field.field;
              
              uniqueGroupsArray.forEach(group => {
                const combinedField = `${fieldName}_${group}`;
                entry[combinedField] = ((fieldGroups as any)[fieldName]?.[group]) || 0;
              });
            });
            
            return entry;
          });
          
          // Get all original field names for consistent color mapping
          const allOriginalFields = Array.isArray(yField) ? yField.map(f => typeof f === 'string' ? f : f.field) : [typeof yField === 'string' ? yField : yField.field];
          
          // Assign colors to each field using smart color mapping
          const resultColors = createSmartColorMapping(combinedFields, allOriginalFields, preferredColorMap);
          
          return { 
            chartData: resultData,
            fields: combinedFields,
            fieldColors: resultColors,
            fieldTypes: resultFieldTypes,
            fieldUnits: resultFieldUnits
          };
        }
          } else {
        // Standard processing without groupBy
        let resultFields: string[] = [];
        const resultFieldTypes: Record<string, 'bar' | 'line'> = {};
        const resultFieldUnits: Record<string, string | undefined> = {};
        
        if (Array.isArray(filteredYField)) {
          resultFields = filteredYField.map(field => getYAxisField(field));
          
          // Create mapping of field types and units
          filteredYField.forEach(field => {
            const fieldName = getYAxisField(field);
            resultFieldTypes[fieldName] = typeof field === 'string' ? 'bar' : (field as YAxisConfig).type;
            resultFieldUnits[fieldName] = typeof field === 'string' ? undefined : (field as YAxisConfig).unit;
          });
        } else {
          resultFields = [getYAxisField(filteredYField)];
          resultFieldTypes[getYAxisField(filteredYField)] = typeof filteredYField === 'string' ? 'bar' : (filteredYField as YAxisConfig).type;
          resultFieldUnits[getYAxisField(filteredYField)] = typeof filteredYField === 'string' ? undefined : (filteredYField as YAxisConfig).unit;
        }
        
        // Get all original field names for consistent color mapping
        const allOriginalFields = Array.isArray(yField) ? yField.map(f => typeof f === 'string' ? f : f.field) : [typeof yField === 'string' ? yField : yField.field];
        
        // Prepare color mapping for fields using smart color mapping
        const resultColors = createSmartColorMapping(resultFields, allOriginalFields, preferredColorMap);
        
        return { 
          chartData: processedData,
          fields: resultFields,
          fieldColors: resultColors,
          fieldTypes: resultFieldTypes,
          fieldUnits: resultFieldUnits
        };
      }
  }, [data, filteredData, isBrushActive, xKey, yField, externalColorMap, isExpanded, isModalBrushActive, modalFilteredData, chartConfig.dataMapping.groupBy, filterValues?.currencyFilter, modalFilterValues, chartConfig.additionalOptions?.filters?.currencyFilter]);

  // Helper function to force reset the brush visual state
  const forceBrushVisualReset = useCallback((inModal = false) => {
    setTimeout(() => {
      // Find the specific chart container to scope our DOM operations
      const chartContainer = inModal ? modalChartRef.current : chartRef.current;
      if (!chartContainer) return;
      
      // For modal, look within the modal container
      let container: Element = chartContainer;
      if (inModal) {
        const modalContainer = chartContainer.closest('.modal-backdrop');
        if (modalContainer) {
          container = modalContainer;
          console.log('Modal container found for brush reset:', modalContainer);
        }
      }
      
      // Query only within this specific container
      const brushElements = container.querySelectorAll('.visx-brush-selection');
      console.log(`Found ${brushElements.length} brush elements in ${inModal ? 'modal' : 'main'} view`);
      
      if (brushElements.length > 0) {
        console.log(`Forcing ${inModal ? 'modal ' : ''}brush visual reset`);
        
        // Reset the brush width to full width
        brushElements.forEach(el => {
          if (el instanceof SVGRectElement) {
            const parentSVG = el.closest('svg');
            if (parentSVG) {
              // Find the actual width of the brush container
              const brushGroup = parentSVG.querySelector('.visx-brush');
              if (brushGroup) {
                const brushWidth = brushGroup.getBoundingClientRect().width;
                // Reset to full width with slight padding on both sides
                el.setAttribute('width', String(brushWidth - 4));
                el.setAttribute('x', '2');
                console.log(`Reset brush to width: ${brushWidth - 4}, x: 2`);
              }
            }
          }
        });
      }
    }, 100);
  }, [chartRef, modalChartRef]);
  
  // Create stable filter reference to prevent infinite loops
  const stableFilterValues = useMemo(() => {
    return filterValues ? {
      timeFilter: filterValues.timeFilter,
      currencyFilter: filterValues.currencyFilter,
      displayMode: filterValues.displayMode
    } : null;
  }, [filterValues?.timeFilter, filterValues?.currencyFilter, filterValues?.displayMode]);
  
  // Update modal filters when component receives new filter values
  useEffect(() => {
    if (stableFilterValues) {
      setModalFilterValues(stableFilterValues);
      
      // When filter values change in modal, reset modal brush
      if (isModalBrushActive && isExpanded) {
        console.log('Filter changed in modal, resetting brush to show full dataset');
        setModalBrushDomain(null);
        setIsModalBrushActive(true); // Keep active but reset domain
        setModalFilteredData(data); // Reset to full dataset
        
        // Force modal brush visual reset
        forceBrushVisualReset(true);
      }
    }
  }, [stableFilterValues, isModalBrushActive, isExpanded, data, forceBrushVisualReset]);
  
  // Sync modal brush domain with main brush domain when modal opens
  useEffect(() => {
    if (isExpanded) {
      console.log('Modal opened, syncing brush domains and filter values');
      // When modal opens, sync the brush domains
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
      
      // Ensure modal filter values are properly synced when modal opens
      if (filterValues) {
        console.log('Syncing filter values to modal on open:', filterValues);
        setModalFilterValues(filterValues);
      }
      
      // Also sync filtered data
      if (isBrushActive && filteredData.length > 0) {
        console.log('Syncing filtered data to modal:', filteredData.length, 'items');
        setModalFilteredData(filteredData);
      }
    }
  }, [isExpanded, brushDomain, isBrushActive, filteredData, filterValues]);
  
  // Update the direct filter change handler to remove the brush visual reset
  useEffect(() => {
    console.log('filterValues changed directly from parent:', stableFilterValues);
    
    // Skip first render
    if (!stableFilterValues) return;
    
    // Reset modal brush state if it's active and modal is expanded
    if (isModalBrushActive && isExpanded) {
      console.log('Directly resetting brush due to external filter change');
      setModalBrushDomain(null);
      setIsModalBrushActive(true); // Keep active but reset domain
      setModalFilteredData(data); // Reset to full dataset
      
      // Force modal brush visual reset
      forceBrushVisualReset(true);
    }
    
    // Also reset normal brush state if it's active
    if (isBrushActive) {
      setBrushDomain(null);
      setIsBrushActive(true); // Keep active but reset domain
      setFilteredData(data); // Reset to full dataset
      
      // Force brush visual reset
      forceBrushVisualReset(false);
    }
    
    // Update the modal filter values to match
    setModalFilterValues(stableFilterValues);
  }, [stableFilterValues, isModalBrushActive, isBrushActive, isExpanded, data, forceBrushVisualReset]);
  
  // Debounce timer ref for filter changes
  const filterDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Update the modal filter change handler
  const handleModalFilterChange = useCallback((key: string, value: string) => {
    console.log(`Modal filter changed: ${key} = ${value}`);
    
    const updatedFilters = {
      ...modalFilterValues,
      [key]: value
    };
    
    console.log('Setting updated modal filters:', updatedFilters);
    setModalFilterValues(updatedFilters);
    
    // For time aggregation charts, use onModalFilterUpdate for internal state management
    // and only call onFilterChange for non-time filters that need API calls
    const isTimeAggregationEnabled = chartConfig.additionalOptions?.enableTimeAggregation;
    const isCurrencyFieldSwitcher = chartConfig.additionalOptions?.filters?.currencyFilter?.type === 'field_switcher';
    
    if (onModalFilterUpdate) {
      onModalFilterUpdate(updatedFilters);
    }
    
    // For field-switcher currency filters, don't trigger API calls as they're handled client-side
    if (key === 'currencyFilter' && isCurrencyFieldSwitcher) {
      console.log('Currency field-switcher changed in modal - handled client-side only');
      return; // Don't call onFilterChange for field-switcher currency filters
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
  }, [modalFilterValues, onFilterChange, onModalFilterUpdate, chartConfig.additionalOptions?.enableTimeAggregation, chartConfig.additionalOptions?.filters?.currencyFilter?.type]);

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
    
    // Calculate available chart space
    const margin = { top: 10, right: 15, bottom: 30, left: 40 };
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
    
    // Calculate bar width based on the actual rendered data
    const barWidth = innerWidth / chartData.length;
    
    // Calculate the index of the bar under the mouse pointer
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
      // For all fields, show their values
      const tooltipItems = fields
        .filter(field => {
          // Only include non-hidden fields with non-zero values
          const value = Number(dataPoint[field]);
          return !hiddenSeriesState.includes(field) && !isNaN(value) && value !== 0;
        })
        .map(field => {
          // Get the unit for this field from the fieldUnits structure
          const fieldUnit = fieldUnits ? fieldUnits[field] : undefined;

          return {
            label: formatFieldName(field),
            value: formatWithUnit(Number(dataPoint[field]) || 0, fieldUnit, filterValues?.currencyFilter),
            color: fieldColors[field] || blue,
            // Use different shape for bar vs line
            shape: fieldTypes[field] === 'line' ? 'circle' as 'circle' : 'square' as 'square'
          };
        });
      
      // If no values found, show placeholder for first visible field
      if (tooltipItems.length === 0 && fields.length > 0) {
        // Find the first visible field
        const firstVisibleField = fields.find(field => !hiddenSeriesState.includes(field));
        
        if (firstVisibleField) {
          // Get the unit for the first visible field from fieldUnits
          const firstFieldUnit = fieldUnits ? fieldUnits[firstVisibleField] : undefined;
        
          tooltipItems.push({
            label: formatFieldName(firstVisibleField),
            value: formatWithUnit(0, firstFieldUnit, filterValues?.currencyFilter),
            color: fieldColors[firstVisibleField] || blue,
            shape: fieldTypes[firstVisibleField] === 'line' ? 'circle' as 'circle' : 'square' as 'square'
          });
        }
      }
      
      // Update the tooltip
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
  }, [chartData, fields, xKey, fieldColors, fieldTypes, formatWithUnit, tooltip, yField, hiddenSeriesState]);

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
    const margin = { top: 10, right: 15, bottom: 30, left: 40 };
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

  // Format value for tooltip
  const formatValue = useCallback((value: number) => {
    return formatWithUnit(value);
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
    } else {
      // For values less than 1000, use clean formatting without trailing zeros
      const formatted = absValue.toString();
      
      // For very small numbers that might need scientific notation
      if (absValue < 0.000001) {
        return `${sign}${absValue.toExponential(2)}`;
      }
      
      // Use parseFloat to remove trailing zeros, then convert back to string
      const cleanValue = parseFloat(absValue.toPrecision(6));
      return `${sign}${cleanValue}`;
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

  // Check if time aggregation is enabled
  const isTimeAggregationEnabled = chartConfig.additionalOptions?.enableTimeAggregation;

  // Process original brush data (for brush boundary - never changes with filters when time aggregation is enabled)
  const originalBrushData = useMemo(() => {
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
    
    // Create synthetic dates for brush if needed
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    
    // Check if this chart has groupBy configuration
    const hasGroupBy = !!chartConfig.dataMapping.groupBy && chartConfig.dataMapping.groupBy !== '';
    
    // For charts with groupBy
    if (hasGroupBy) {
      // Group by x-axis values to prevent duplicates
      const groupedData: Record<string, any> = {};
      
      processedData.forEach(item => {
        const xValue = String(item[xKey]);
        
        if (!groupedData[xValue]) {
          groupedData[xValue] = { 
            [xKey]: item[xKey],
            totalValue: 0 
          };
        }
        
        // If we have multiple Y fields, sum them for the total
        if (Array.isArray(yField) && yField.length > 0) {
          yField.forEach(field => {
            const fieldName = typeof field === 'string' ? field : field.field;
            const value = Number(item[fieldName]) || 0;
            groupedData[xValue].totalValue += value;
          });
        } else {
          // For single Y field
          const singleField = typeof yField === 'string' ? yField : 
                              (Array.isArray(yField) && yField.length > 0 ? 
                                (typeof yField[0] === 'string' ? yField[0] : yField[0].field) : 
                                '');
          
          if (singleField) {
            const value = Number(item[singleField]) || 0;
            groupedData[xValue].totalValue += value;
          }
        }
        
        // Keep the original data for reference
        if (!groupedData[xValue].originalData) {
          groupedData[xValue].originalData = [];
        }
        groupedData[xValue].originalData.push(item);
      });
      
      // Convert back to array
      const uniqueData = Object.values(groupedData);
      
      // Create brush data points
      return uniqueData.map((item, i) => {
        let date;
        const xValue = item[xKey];
        
        // Try to parse date from x value or use synthetic date
        if (typeof xValue === 'string' && 
           (xValue.match(/^\d{4}-\d{2}-\d{2}/) || 
            /^\d{2}\/\d{2}\/\d{4}/.test(xValue) ||
            /^[A-Za-z]{3}\s\d{4}$/.test(xValue) || 
            /^\d{4}$/.test(xValue) ||
            /^\d{4}-\d{2}$/.test(xValue) ||
            /^\d{4}-Q[1-4]$/.test(xValue))) {
          date = parseAggregatedDate(xValue);
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
          value: item.totalValue || 0,
          idx: i,
          originalIndex: i,
          originalData: item
        };
      });
    }
    
    // For standard processing without groupBy
    // Get the first field for brush data
    const firstField = fields.length > 0 ? fields[0] : '';
    
    // Group by x-axis values to prevent duplicates
    const groupedData: Record<string, any> = {};
    
    processedData.forEach(item => {
      const xValue = String(item[xKey]);
      
      if (groupedData[xValue]) {
        // Keep the highest value from the first field
        if ((Number(item[firstField]) || 0) > (Number(groupedData[xValue][firstField]) || 0)) {
          groupedData[xValue] = item;
        }
      } else {
        groupedData[xValue] = item;
      }
    });
    
    // Convert back to array
    const uniqueData = Object.values(groupedData);
    
    // Create a series of evenly spaced date points for consistency
    return uniqueData.map((item, i) => {
      let date;
      
      // Try to parse date from x value or use synthetic date
      if (typeof item[xKey] === 'string' && 
         (item[xKey].match(/^\d{4}-\d{2}-\d{2}/) || 
          /^\d{2}\/\d{2}\/\d{4}/.test(item[xKey]) ||
          /^[A-Za-z]{3}\s\d{4}$/.test(item[xKey]) || 
          /^\d{4}$/.test(item[xKey]) ||
          /^\d{4}-\d{2}$/.test(item[xKey]) ||
          /^\d{4}-Q[1-4]$/.test(item[xKey]))) {
        date = parseAggregatedDate(item[xKey]);
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
        value: Number(item[firstField]) || 0,
        idx: i,
        originalIndex: i,
        originalData: item
      };
    });
  }, [data, xKey, fields, chartConfig.dataMapping.groupBy, yField]);

  // Process current brush data (for brush line - updates with filters when time aggregation is enabled)
  const brushData = useMemo(() => {
    // When time aggregation is enabled, use current filtered data for the brush line, but keep original boundary
    if (isTimeAggregationEnabled) {
      const currentData = isExpanded
        ? (isModalBrushActive && modalFilteredData.length > 0 ? modalFilteredData : data)
        : (isBrushActive && filteredData.length > 0 ? filteredData : data);
      
      if (!currentData || currentData.length === 0) return originalBrushData;
      
      // Filter and ensure x values are valid
      let processedData = currentData.filter(d => d[xKey] !== undefined && d[xKey] !== null);
      
      // Sort by date if applicable
      if (processedData.length > 0) {
        const isDateField = typeof processedData[0][xKey] === 'string' && 
          (processedData[0][xKey].match(/^\d{4}-\d{2}-\d{2}/) || 
           /^\d{2}\/\d{2}\/\d{4}/.test(processedData[0][xKey]) ||
           /^[A-Za-z]{3}\s\d{4}$/.test(processedData[0][xKey]) || 
           /^\d{4}$/.test(processedData[0][xKey]) ||
           /^\d{4}-\d{2}$/.test(processedData[0][xKey]) || 
           /^\d{4}-Q[1-4]$/.test(processedData[0][xKey]));
        
        if (isDateField) {
          processedData.sort((a, b) => {
            const dateA = parseAggregatedDate(a[xKey]);
            const dateB = parseAggregatedDate(b[xKey]);
            return dateA.getTime() - dateB.getTime();
          });
        }
      }
      
      // Use the same structure as originalBrushData but with filtered values
      const firstField = fields.length > 0 ? fields[0] : '';
      const hasGroupBy = !!chartConfig.dataMapping.groupBy && chartConfig.dataMapping.groupBy !== '';
      
      if (hasGroupBy) {
        const groupedData: Record<string, any> = {};
        
        processedData.forEach(item => {
          const xValue = String(item[xKey]);
          
          if (!groupedData[xValue]) {
            groupedData[xValue] = { 
              [xKey]: item[xKey],
              totalValue: 0 
            };
          }
          
          if (Array.isArray(yField) && yField.length > 0) {
            yField.forEach(field => {
              const fieldName = typeof field === 'string' ? field : field.field;
              const value = Number(item[fieldName]) || 0;
              groupedData[xValue].totalValue += value;
            });
          } else {
            const singleField = typeof yField === 'string' ? yField : 
                                (Array.isArray(yField) && yField.length > 0 ? 
                                  (typeof yField[0] === 'string' ? yField[0] : yField[0].field) : 
                                  '');
            
            if (singleField) {
              const value = Number(item[singleField]) || 0;
              groupedData[xValue].totalValue += value;
            }
          }
          
          if (!groupedData[xValue].originalData) {
            groupedData[xValue].originalData = [];
          }
          groupedData[xValue].originalData.push(item);
        });
        
        const uniqueData = Object.values(groupedData);
        
        // Map to original brush data structure to maintain same date positions
        return originalBrushData.map(originalItem => {
          const xValue = String(originalItem.originalData[xKey]);
          const matchingData = groupedData[xValue];
          
          return {
            ...originalItem,
            value: matchingData ? matchingData.totalValue : 0
          };
        });
      } else {
        const groupedData: Record<string, any> = {};
        
        processedData.forEach(item => {
          const xValue = String(item[xKey]);
          
          if (groupedData[xValue]) {
            if ((Number(item[firstField]) || 0) > (Number(groupedData[xValue][firstField]) || 0)) {
              groupedData[xValue] = item;
            }
          } else {
            groupedData[xValue] = item;
          }
        });
        
        // Map to original brush data structure to maintain same date positions
        return originalBrushData.map(originalItem => {
          const xValue = String(originalItem.originalData[xKey]);
          const matchingData = groupedData[xValue];
          
          return {
            ...originalItem,
            value: matchingData ? (Number(matchingData[firstField]) || 0) : 0
          };
        });
      }
    }
    
    // When time aggregation is not enabled, use the original logic
    return originalBrushData;
  }, [originalBrushData, isTimeAggregationEnabled, data, filteredData, modalFilteredData, isBrushActive, isModalBrushActive, isExpanded, xKey, fields, yField, chartConfig.dataMapping.groupBy]);

  // Handle brush change
  const handleBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isBrushActive) {
        setBrushDomain(null);
        setIsBrushActive(false);
        setFilteredData([]); // Reset filtered data
      }
      return;
    }
    
    const { x0, x1 } = domain;
    console.log('Brush change:', new Date(x0), 'to', new Date(x1));
    
    // Update brush domain
    setBrushDomain([new Date(x0), new Date(x1)]);
    
    // Use originalBrushData for brush boundary calculations to ensure consistency
    const brushDataForFiltering = isTimeAggregationEnabled ? originalBrushData : brushData;
    
    // We need to handle filtering differently for groupBy charts since data structure is different
    const hasGroupBy = !!chartConfig.dataMapping.groupBy && chartConfig.dataMapping.groupBy !== '';
    
    if (hasGroupBy) {
      // For groupBy, we need to filter the original data by x value
      // We'll create a set of x values that fall within the brush range
      const selectedBrushXValues = new Set<string | null>();
      
      brushDataForFiltering
        .filter(item => item.date >= new Date(x0) && item.date <= new Date(x1))
        .forEach(item => {
          // Get the x value from the original data
          if (item.originalData) {
            const xValue = item.originalData[xKey];
            if (xValue !== undefined && xValue !== null) {
              selectedBrushXValues.add(String(xValue));
            }
          }
        });
      
      console.log('Selected x values in brush range:', selectedBrushXValues.size);
      
      // Now filter the original data to only include items with x values in our set
      const filteredItems = data.filter(item => {
        const itemXValue = String(item[xKey]);
        return selectedBrushXValues.has(itemXValue);
      });
      
      console.log('Filtered data for groupBy chart:', filteredItems.length);
      setFilteredData(filteredItems);
    } else {
      // Standard filtering for non-groupBy charts
      const selectedBrushItems = brushDataForFiltering
        .filter(item => item.date >= new Date(x0) && item.date <= new Date(x1))
        .map(item => item.originalData)
        .filter(item => item !== null);
        
      console.log('Filtered data after brush:', selectedBrushItems.length);
      setFilteredData(selectedBrushItems);
    }
    
    if (!isBrushActive) {
      setIsBrushActive(true);
    }
  }, [isBrushActive, brushData, originalBrushData, isTimeAggregationEnabled, chartConfig.dataMapping.groupBy, data, xKey]);
  
  // Handle modal brush change
  const handleModalBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isModalBrushActive) {
        setModalBrushDomain(null);
        setIsModalBrushActive(false);
        setModalFilteredData([]); // Reset modal filtered data
      }
      return;
    }
    
    const { x0, x1 } = domain;
    console.log('Modal brush change:', new Date(x0), 'to', new Date(x1));
    
    // Update modal brush domain
    setModalBrushDomain([new Date(x0), new Date(x1)]);
    
    // Use originalBrushData for brush boundary calculations to ensure consistency
    const brushDataForFiltering = isTimeAggregationEnabled ? originalBrushData : brushData;
    
    // We need to handle filtering differently for groupBy charts since data structure is different
    const hasGroupBy = !!chartConfig.dataMapping.groupBy && chartConfig.dataMapping.groupBy !== '';
    
    if (hasGroupBy) {
      // For groupBy, we need to filter the original data by x value
      // We'll create a set of x values that fall within the brush range
      const selectedBrushXValues = new Set<string | null>();
      
      brushDataForFiltering
        .filter(item => item.date >= new Date(x0) && item.date <= new Date(x1))
        .forEach(item => {
          // Get the x value from the original data
          if (item.originalData) {
            const xValue = item.originalData[xKey];
            if (xValue !== undefined && xValue !== null) {
              selectedBrushXValues.add(String(xValue));
            }
          }
        });
      
      console.log('Selected x values in modal brush range:', selectedBrushXValues.size);
      
      // Now filter the original data to only include items with x values in our set
      const filteredItems = data.filter(item => {
        const itemXValue = String(item[xKey]);
        return selectedBrushXValues.has(itemXValue);
      });
      
      console.log('Filtered modal data for groupBy chart:', filteredItems.length);
      setModalFilteredData(filteredItems);
    } else {
      // Standard filtering for non-groupBy charts
      const selectedBrushItems = brushDataForFiltering
        .filter(item => item.date >= new Date(x0) && item.date <= new Date(x1))
        .map(item => item.originalData)
        .filter(item => item !== null);
      
      console.log('Filtered data after modal brush:', selectedBrushItems.length);
      setModalFilteredData(selectedBrushItems);
    }
    
    if (!isModalBrushActive) {
      setIsModalBrushActive(true);
    }
  }, [isModalBrushActive, brushData, originalBrushData, isTimeAggregationEnabled, chartConfig.dataMapping.groupBy, data, xKey]);

  // Update legend items when chart data changes
  useEffect(() => {
    if (chartData.length > 0 && fields.length > 0) {
      // Calculate total value for each field across all data points
      const fieldTotals: Record<string, number> = {};
      
      fields.forEach(field => {
        fieldTotals[field] = chartData.reduce((sum, d) => sum + (Number(d[field]) || 0), 0);
      });
      
      // Create and sort legend items by total value (descending)
      const newLegendItems = fields
        .map(field => ({
          id: field,
          label: formatFieldName(field),
          color: fieldColors[field] || blue,
          value: fieldTotals[field]
        }))
        .sort((a, b) => b.value - a.value);
      
      setLegendItems(newLegendItems);
    }
  }, [chartData, fields, fieldColors]);

  // Set isClient to true when component mounts in browser
  useEffect(() => {
    setIsClient(true);
  }, []);

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

  // Render content function
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
    const margin = { top: 10, right: 15, bottom: 30, left: 40 };
    const innerWidth = chartWidth - margin.left - margin.right;
    const innerHeight = chartHeight - margin.top - margin.bottom;
    
    if (innerWidth <= 0 || innerHeight <= 0) return null;
    
    // Create scales
    const xScale = scaleBand<string>({
      domain: chartData.map(d => d[xKey]),
      range: [0, innerWidth],
      padding: 0.2,
    });
    
    // Calculate max and min values for y-axis from actual data
    const allValues = chartData.flatMap(d => 
        fields.map(field => Number(d[field]) || 0)
    ).filter(val => !isNaN(val));
    
    const actualYMax = allValues.length > 0 ? Math.max(...allValues) : 1;
    const actualYMin = allValues.length > 0 ? Math.min(...allValues) : 0;
    
    // Determine appropriate padding and clean domain based on data magnitude
    let yMax, yMin;
    
    // Always start from 0 if all values are positive
    if (actualYMin >= 0) {
      yMin = 0;
    } else {
      yMin = actualYMin < 0 ? actualYMin * 1.1 : actualYMin;
    }
    
    // Calculate appropriate tick interval and yMax based on data magnitude
    let tickInterval;
    if (actualYMax <= 0.001) {
      // For very small values like 0.0005, use 0.0001 intervals: 0, 0.0001, 0.0002, etc.
      tickInterval = 0.0001;
      yMax = Math.ceil(actualYMax / tickInterval) * tickInterval;
    } else if (actualYMax <= 0.01) {
      // For values like 0.005, use 0.001 intervals: 0, 0.001, 0.002, etc.
      tickInterval = 0.001;
      yMax = Math.ceil(actualYMax / tickInterval) * tickInterval;
    } else if (actualYMax <= 0.1) {
      // For values like 0.05, use 0.01 intervals: 0, 0.01, 0.02, etc.
      tickInterval = 0.01;
      yMax = Math.ceil(actualYMax / tickInterval) * tickInterval;
    } else if (actualYMax <= 1) {
      // For values like 0.5, use 0.1 intervals: 0, 0.1, 0.2, etc.
      tickInterval = 0.1;
      yMax = Math.ceil(actualYMax / tickInterval) * tickInterval;
    } else if (actualYMax <= 10) {
      // For values like 5, use 1 intervals: 0, 1, 2, etc.
      tickInterval = 1;
      yMax = Math.ceil(actualYMax / tickInterval) * tickInterval;
    } else {
      // For larger values, use standard padding
      yMax = actualYMax * 1.1;
      tickInterval = null; // Let D3 decide
    }
    
    const yScale = scaleLinear<number>({
      domain: [yMin, yMax],
      range: [innerHeight, 0],
      nice: tickInterval ? false : true, // Don't use nice if we set custom interval
      clamp: true,
    });
    
    // Create line data for series that should be rendered as lines
    const lineDataByField: Record<string, Array<{x: number, y: number}>> = {};
    
    // Initialize data structure for each field that should be a line
    fields.forEach(field => {
      if (fieldTypes[field] === 'line') {
        lineDataByField[field] = [];
      }
    });
    
    // Build line points
    chartData.forEach(d => {
      fields.forEach(field => {
        if (fieldTypes[field] === 'line') {
          const x = xScale(d[xKey]) || 0;
          const centerX = x + (xScale.bandwidth() / 2); // Center of the bar
          const y = yScale(Number(d[field]) || 0);
          
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
        {/* Tooltip - only show for non-modal version, modal has its own tooltip container */}
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
              scale={yScale}
              width={innerWidth}
              stroke="#1f2937"
              strokeOpacity={0.5}
              strokeDasharray="2,3"
            />
            
            {/* Zero line with special styling when we have negative values */}
            {yMin < 0 && (
              <line
                x1={0}
                y1={yScale(0)}
                x2={innerWidth}
                y2={yScale(0)}
                stroke="#374151"
                strokeWidth={1}
                strokeOpacity={0.8}
              />
            )}
            
            {/* Y-axis */}
            <AxisLeft
              scale={yScale}
              stroke="#374151"
              strokeWidth={0.5}
              tickStroke="transparent"
              tickLength={0}
              hideZero={false}
              tickValues={tickInterval ? (() => {
                const ticks = [];
                for (let i = yMin; i <= yMax; i += tickInterval) {
                  ticks.push(Math.round(i / tickInterval) * tickInterval); // Round to avoid floating point errors
                }
                return ticks;
              })() : undefined}
              numTicks={tickInterval ? undefined : 5}
              tickFormat={(value) => formatTickValue(Number(value))}
              tickLabelProps={() => ({
                fill: '#6b7280',
                fontSize: 11,
                fontWeight: 300,
                letterSpacing: '0.05em',
                textAnchor: 'end',
                dy: '0.33em',
                dx: '-0.5em'
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
                  return formatXAxisLabel(value, filterValues?.timeFilter);
                }
                
                // For non-date values, format using our helper function
                return formatXAxisLabel(String(value), filterValues?.timeFilter);
              }}
              tickLabelProps={() => ({
                fill: '#6b7280',
                fontSize: 11,
                fontWeight: 300,
                textAnchor: 'middle',
                dy: '0.5em',
                dx: '1em'
               
              })}
              // Ensure first tick doesn't start before origin
              left={0}
            />
            
            {/* Render bars */}
            {chartData.map((d, i) => (
              <React.Fragment key={`bars-${i}`}>
                {fields.map((field, fieldIndex) => {
                  // Skip if this field is hidden
                  if (hiddenSeriesState.includes(field)) return null;
                  
                  // Skip if this field should be rendered as a line
                  if (fieldTypes[field] === 'line') return null;
                  
                  // Determine how many fields should be rendered as bars
                  const barFields = fields.filter(f => fieldTypes[f] !== 'line' && !hiddenSeriesState.includes(f));
                  const barWidth = xScale.bandwidth() / barFields.length;
                  
                  // Find this field's position in the barFields array
                  const barFieldIndex = barFields.indexOf(field);
                  
                  // Calculate bar dimensions
                  const value = Number(d[field]) || 0;
                  
                  // For positive values, the bar starts at the value position and extends down to zero
                  // For negative values, the bar starts at zero and extends down to the value position
                  const barHeight = Math.abs(yScale(0) - yScale(value));
                  const barX = (xScale(d[xKey]) || 0) + (barFieldIndex * barWidth);
                  
                  // For positive values, the bar's y position is at the value's y coordinate
                  // For negative values, the bar's y position is at the zero line
                  const barY = value >= 0 ? yScale(value) : yScale(0);
                  
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
              // Skip if this field is hidden
              if (hiddenSeriesState.includes(field)) return null;
              
              // Only render fields configured as lines
              if (fieldTypes[field] !== 'line') return null;
              
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
    tooltip, fieldColors, fieldTypes, formatTickValue, modalChartRef
  ]);

  // Render the brush with proper shape reflecting data values
  const renderBrushArea = useCallback((modalView = false) => {
    if (!brushData || brushData.length === 0) return null;
    
    // Check if this chart has groupBy configuration
    const hasGroupBy = !!chartConfig.dataMapping.groupBy && chartConfig.dataMapping.groupBy !== '';
    
    // Add a small negative padding to keep the line just inside the brush bounds
    const padding = -0.5;
    
    // When time aggregation is enabled, use originalBrushData for the brush extent
    // but keep the current brushData values for the line visualization
    const brushDisplayData = isTimeAggregationEnabled ? originalBrushData.map((originalItem, idx) => {
      // Find matching item in current brushData to get updated values
      const currentItem = brushData.find(item => 
        item.date.getTime() === originalItem.date.getTime()
      );
      
      return {
        ...originalItem,
        value: currentItem ? currentItem.value : 0 // Use current filtered value if available, otherwise 0
      };
    }) : brushData;
    
    // Calculate max value for brush scaling - ensure it's always positive for the line
    const maxBrushValue = Math.max(...brushDisplayData.map(d => Math.abs(d.value || 0)), 1);
    
    return (
      <div className="h-[15%] w-full mt-2">
        <BrushTimeScale
          data={brushDisplayData}
          activeBrushDomain={modalView ? modalBrushDomain : brushDomain}
          onBrushChange={modalView ? handleModalBrushChange : handleBrushChange}
          onClearBrush={() => {
            if (modalView) {
              setModalBrushDomain(null);
              setIsModalBrushActive(false);
              setModalFilteredData([]); // Reset to full dataset
            } else {
              setBrushDomain(null);
              setIsBrushActive(false);
              setFilteredData([]); // Reset to full dataset
            }
          }}
          getDate={(d) => d.date}
          getValue={(d) => {
            // For brush line, we always want a positive value to show activity
            // For data with negative values, use absolute values for the brush line
            const val = Math.abs(d.value || 0);
            
            // Make sure values are visible even if they're small
            return Math.max(val, maxBrushValue * 0.05);
          }}
          lineColor={"#3b82f6"} // Brighter blue for simple charts
          margin={{ top: 0, right: 15 + padding, bottom: modalView ? 10 : 20, left: 40 + padding }}
          isModal={modalView}
          curveType={hasGroupBy ? "monotoneX" : "catmullRom"}
          strokeWidth={hasGroupBy ? 1 : 0.5}
          filterValues={modalView ? modalFilterValues : (stableFilterValues || {})}
          key={`brush-${modalView ? 'modal' : 'main'}-${isTimeAggregationEnabled ? 'time-agg' : 'normal'}-${(modalView ? modalFilterValues : filterValues)?.timeFilter || 'none'}-${(modalView ? modalFilterValues : filterValues)?.currencyFilter || 'none'}`} // Add key to force re-render when filters change
        />
      </div>
    );
  }, [
    brushData, originalBrushData, isTimeAggregationEnabled, modalBrushDomain, brushDomain, handleModalBrushChange, handleBrushChange,
    setModalBrushDomain, setIsModalBrushActive, setModalFilteredData, setBrushDomain,
    setIsBrushActive, setFilteredData, chartConfig.dataMapping.groupBy, stableFilterValues, modalFilterValues
  ]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (filterDebounceTimer.current) {
        clearTimeout(filterDebounceTimer.current);
      }
    };
  }, []);

  // Render the chart with brush
  return (
    <>
      {/* Expanded view in modal */}
      {isExpanded && isClient ? (
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
              <div className="w-[90%] h-[90%] pr-3 border-r border-gray-900">
                <div className="flex flex-col h-full">
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
                      timeFilter={modalFilterValues?.timeFilter}
                      currencyFilter={modalFilterValues?.currencyFilter || filterValues?.currencyFilter}
                      showTotal={chartConfig.additionalOptions?.showTooltipTotal}
                    />
                    </div>
                  )}
                  
                  {/* Main chart - 85% height */}
                  <div className="h-[85%] w-full relative">
                    <ParentSize debounceTime={10}>
                      {({ width: parentWidth, height: parentHeight }) => 
                        parentWidth > 0 && parentHeight > 0 
                          ? renderChartContent(parentWidth, parentHeight, true)
                          : null
                      }
                    </ParentSize>
                  </div>
                  
                  {/* Brush component - 15% height */}
                  {brushData.length > 0 ? renderBrushArea(true) : (null)}
                </div>
              </div>
              
              {/* Legend area - 10% width */}
              <div className="w-[10%] h-full pl-3 flex flex-col justify-start items-start">
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
                      shape={fieldTypes[item.id] === 'line' ? 'circle' : 'square'}
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
      ) : (
        // Normal view with brush
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
          
          {brushData.length > 0 ? renderBrushArea(false) : (null)}
        </div>
      )}
    </>
  );
};

export default React.memo(MultiSeriesLineBarChart); 