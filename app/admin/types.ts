// Available pages for charts
export const AVAILABLE_PAGES = [
  { id: 'total', name: 'Total Revenue', path: '/protocol-revenue/total' },
  { id: 'summary', name: 'Revenue Summary', path: '/protocol-revenue/summary' },
  { id: 'dex-ecosystem', name: 'DEX Ecosystem', path: '/protocol-revenue/dex-ecosystem' },
  { id: 'nft-ecosystem', name: 'NFT Ecosystem', path: '/protocol-revenue/nft-ecosystem' },
  { id: 'depin', name: 'DePIN', path: '/protocol-revenue/depin' }
] as const;

// Page IDs from all menus
export type AvailablePage = 
  // Original page IDs
  | typeof AVAILABLE_PAGES[number]['id']
  // Overview menu pages
  | 'dashboard' | 'network-usage' | 'protocol-rev' | 'market-dynamics'
  // DEX menu pages
  | 'volume' | 'tvl' | 'traders' | 'aggregators'
  // REV menu pages
  | 'overview' | 'cost-capacity' | 'issuance-burn' | 'total-economic-value' | 'breakdown'
  // Stablecoins menu pages
  | 'stablecoin-usage' | 'transaction-activity' | 'liquidity-velocity' | 'mint-burn' | 'platform-exchange'
  // Protocol Revenue menu pages - already included in AVAILABLE_PAGES

// Chart visualization types
export const CHART_TYPES = [
  { id: 'bar', name: 'Bar Chart' },
  { id: 'line', name: 'Line Chart' },
  { id: 'stacked-bar', name: 'Stacked Bar Chart' },
  { id: 'area', name: 'Area Chart' },
  { id: 'stacked-area', name: 'Stacked Area Chart' },
  { id: 'dual-axis', name: 'Dual Axis Chart' }
] as const;

export type ChartType = typeof CHART_TYPES[number]['id'];

// Y-axis field configuration for mixed charts
export interface YAxisConfig {
  field: string;
  type: 'bar' | 'line';
  color?: string;
  // Optional flag for dual-axis charts to indicate right y-axis
  rightAxis?: boolean;
}

// Dual axis chart configuration
export interface DualAxisConfig {
  leftAxisType: 'bar' | 'line';
  rightAxisType: 'bar' | 'line';
  // Mapping for fields on which axis
  leftAxisFields: string[];
  rightAxisFields: string[];
}

// Chart configuration type
export interface ChartConfig {
  id: string;
  title: string;
  subtitle?: string;
  page: AvailablePage;
  section?: string;
  chartType: ChartType;
  apiEndpoint: string;
  apiKey?: string;
  isStacked?: boolean;
  enableCategoricalBrush?: boolean;
  useDistinctColors?: boolean;
  colorScheme?: string;
  dataMapping: {
    xAxis: string | string[];
    yAxis: string | string[] | YAxisConfig[];
    groupBy?: string;
  };
  additionalOptions?: Record<string, any>;
  // For dual-axis charts, specify configuration
  dualAxisConfig?: DualAxisConfig;
  createdAt: string;
  updatedAt: string;
  // Callback for filter changes
  onFilterChange?: (filters: Record<string, string>) => void;
}

// Form data when creating or editing a chart
export interface ChartFormData {
  title: string;
  subtitle?: string;
  page: AvailablePage;
  section?: string;
  chartType: ChartType;
  apiEndpoint: string;
  apiKey?: string;
  isStacked?: boolean;
  enableCategoricalBrush?: boolean;
  useDistinctColors?: boolean;
  colorScheme?: string;
  dataMapping: {
    xAxis: string | string[];
    yAxis: string | string[] | YAxisConfig[];
    groupBy?: string;
  };
  additionalOptions?: Record<string, any>;
  // For dual-axis charts, specify configuration
  dualAxisConfig?: DualAxisConfig;
} 