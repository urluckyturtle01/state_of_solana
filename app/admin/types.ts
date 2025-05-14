// Available pages for charts
export const AVAILABLE_PAGES = [
  { id: 'total', name: 'Total Revenue', path: '/protocol-revenue/total' },
  { id: 'summary', name: 'Revenue Summary', path: '/protocol-revenue/summary' },
  { id: 'dex-ecosystem', name: 'DEX Ecosystem', path: '/protocol-revenue/dex-ecosystem' },
  { id: 'nft-ecosystem', name: 'NFT Ecosystem', path: '/protocol-revenue/nft-ecosystem' },
  { id: 'depin', name: 'DePIN', path: '/protocol-revenue/depin' }
] as const;

export type AvailablePage = typeof AVAILABLE_PAGES[number]['id'];

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
  colorScheme?: string;
  dataMapping: {
    xAxis: string | string[];
    yAxis: string | string[];
    groupBy?: string;
  };
  additionalOptions?: Record<string, any>;
} 