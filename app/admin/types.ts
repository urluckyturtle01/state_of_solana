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
  { id: 'stacked-area', name: 'Stacked Area Chart' }
] as const;

export type ChartType = typeof CHART_TYPES[number]['id'];

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
    yAxis: string | string[];
    groupBy?: string;
  };
  additionalOptions?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
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
    yAxis: string | string[];
    groupBy?: string;
  };
  additionalOptions?: Record<string, any>;
} 