// Available pages for charts
export const AVAILABLE_PAGES = [
  { id: 'total', name: 'Total Revenue', path: '/protocol-revenue/total' },
  { id: 'summary', name: 'Revenue Summary', path: '/protocol-revenue/summary' },
  { id: 'protocol-revenue-summary', name: 'Revenue Summary', path: '/protocol-revenue/summary' },
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
  // SF Dashboards pages
  | 'sf-overview' | 'sf-depin'
  // DEX menu pages
  | 'volume' | 'tvl' | 'traders' | 'aggregators' | 'dex-summary'
  // REV menu pages
  | 'overview' | 'cost-capacity' | 'issuance-burn' | 'total-economic-value' | 'breakdown'
  // MEV menu pages
  | 'dex-token-hotspots' | 'extracted-value-pnl' | 'mev-summary'
  // Stablecoins menu pages
  | 'stablecoin-usage' | 'transaction-activity' | 'liquidity-velocity' | 'mint-burn' | 'platform-exchange'
  // Protocol Revenue menu pages - already included in AVAILABLE_PAGES
  | 'protocol-revenue-summary';

// Chart visualization types
export const CHART_TYPES = [
  { id: 'bar', name: 'Bar Chart' },
  { id: 'stacked-bar', name: 'Stacked Bar Chart' },
  { id: 'line', name: 'Line Chart' },
  { id: 'dual-axis', name: 'Dual Axis Chart' },
  { id: 'pie', name: 'Pie Chart' },
  { id: 'area', name: 'Area Chart' },
  { id: 'stacked-area', name: 'Stacked Area Chart' },
] as const;

export type ChartType = 'bar' | 'stacked-bar' | 'line' | 'area' | 'stacked-area' | 'dual-axis' | 'pie';

// Y-axis field configuration for mixed charts
export interface YAxisConfig {
  field: string;
  type: 'bar' | 'line';
  color?: string;
  unit?: string; // Optional unit for display purposes (e.g., "$", "%", "SOL")
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

// Filter option configuration
export interface FilterOption {
  label?: string;
  paramName: string;
  activeValue?: string;
  options: string[];
  // For currency filters that switch between different columns
  type?: 'parameter' | 'field_switcher';
  columnMappings?: Record<string, string>; // Maps currency option to column name
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
  width?: number; // 2 for half width (1/2), 3 for full width (2/2) (defaults to 2)
  dataMapping: {
    xAxis: string | string[];
    yAxis: string | YAxisConfig | (string | YAxisConfig)[];
    groupBy?: string;
    yAxisUnit?: string; // Unit for display in single Y-axis mode
  };
  additionalOptions?: {
    filters?: {
      timeFilter?: FilterOption;
      currencyFilter?: FilterOption;
      displayModeFilter?: FilterOption;
      [key: string]: FilterOption | undefined;
    };
    colors?: string[];
    enableTimeAggregation?: boolean;
    showTooltipTotal?: boolean;
  };
  // For dual-axis charts, specify configuration
  dualAxisConfig?: DualAxisConfig;
  createdAt?: string;
  updatedAt?: string;
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
  width?: number; // 2 for half width (1/2), 3 for full width (2/2) (defaults to 2)
  dataMapping: {
    xAxis: string | string[];
    yAxis: string | string[] | YAxisConfig[];
    yAxisUnit?: string; // For single Y-axis mode
    groupBy?: string;
  };
  additionalOptions?: Record<string, any>;
  // For dual-axis charts, specify configuration
  dualAxisConfig?: DualAxisConfig;
}

// New types for Counter configuration
export type CounterVariant = "indigo" | "blue" | "purple" | "emerald" | "amber" | "rose";

export interface CounterConfig {
  id: string;
  title: string;
  apiEndpoint: string;
  apiKey?: string;
  valueField: string;
  rowIndex: number;
  prefix?: string;
  suffix?: string;
  variant: CounterVariant;
  icon: string;
  page: AvailablePage;
  width?: number; // 1, 2, or 3 columns (defaults to 1)
  trendConfig?: {
    valueField: string;
    label?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

// Table display types
export type TableVariant = "simple" | "striped" | "bordered" | "compact";
export type TableOrientation = "vertical" | "horizontal";

// Computed column configuration
export interface ComputedColumnConfig {
  id: string;          // Unique identifier for the computed column
  header: string;      // Display name for the computed column
  operation: 'sum' | 'average' | 'difference'; // Type of computation
  sourceColumns: string[]; // Array of field names to compute from
  format?: {
    type: "text" | "number" | "currency" | "percentage" | "date";
    decimals?: number; // For number/currency/percentage
    prefix?: string;   // For currency ($, €, etc.) or any prefix
    suffix?: string;   // For percentage (%) or any suffix
    dateFormat?: string; // For dates
  };
}

// Column configuration for tables
export interface TableColumnConfig {
  field: string;       // The data field in the API response
  header: string;      // Display name for the column header
  width?: string;      // Optional width (e.g., "100px", "10%")
  format?: {
    type: "text" | "number" | "currency" | "percentage" | "date";
    decimals?: number; // For number/currency/percentage
    prefix?: string;   // For currency ($, €, etc.) or any prefix
    suffix?: string;   // For percentage (%) or any suffix
    dateFormat?: string; // For dates
  };
  sortable?: boolean;  // Whether the column is sortable
  filterable?: boolean; // Whether the column can be filtered
  hidden?: boolean;    // Whether the column is hidden by default
}

// Table configuration type
export interface TableConfig {
  id: string;
  title: string;
  description?: string;
  page: AvailablePage;
  apiEndpoint: string;
  apiKey?: string;
  columns: TableColumnConfig[];
  computedColumns?: ComputedColumnConfig[]; // Optional computed columns
  defaultSortColumn?: string;
  defaultSortDirection?: "asc" | "desc";
  rowsPerPage?: number;
  enablePagination?: boolean;
  enableSearch?: boolean;
  enableRowSelection?: boolean;
  variant: TableVariant;
  orientation?: TableOrientation; // Table layout orientation (defaults to vertical)
  width?: number; // 1, 2, or 3 columns (defaults to 3 for full width)
  refreshInterval?: number; // Auto-refresh interval in seconds
  additionalOptions?: {
    filters?: {
      timeFilter?: FilterOption;
      currencyFilter?: FilterOption;
      [key: string]: FilterOption | undefined;
    };
    section?: string;
  };
  createdAt?: string;
  updatedAt?: string;
} 