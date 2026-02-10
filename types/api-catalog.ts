// API Catalog Schema for RAG-based Natural Language Processing
// This schema is designed to be compact (50-80 tokens each) and search-friendly

export interface ApiCatalogEntry {
  id: string;                           // Unique identifier
  domain: string;                       // High-level category (dex, stablecoins, mev, etc.)
  title: string;                        // Human-readable title
  url: string;                          // API endpoint URL
  method: string;                       // HTTP method (GET, POST, etc.)
  
  // Request parameters
  params?: {
    [key: string]: string;              // Parameter name -> description/type
  };
  
  // Response schema - simplified column descriptions
  response_schema: {
    [column: string]: string;           // Column name -> type/description
  };
  
  // Sample data for context (optional, for complex APIs)
  sample_call?: string;
  sample_response?: string;
  
  // Search keywords for embedding
  keywords: string[];                   // Key terms for semantic search
  
  // Additional metadata
  description?: string;                 // Brief description
  aggregation_types?: string[];         // Time aggregations available (daily, weekly, monthly)
  chart_types?: string[];               // Suggested chart types (line, bar, area)
}

// Collection of catalog entries
export interface ApiCatalog {
  entries: ApiCatalogEntry[];
  version: string;
  last_updated: string;
}

// Domain categories for organization
export const API_DOMAINS = {
  OVERVIEW: 'overview',
  DEX: 'dex', 
  REVENUE: 'rev',
  MEV: 'mev',
  STABLECOINS: 'stablecoins',
  PROTOCOL_REVENUE: 'protocol-revenue',
  SF_DASHBOARDS: 'sf-dashboards',
  LAUNCHPADS: 'launchpads',
  XSTOCKS: 'xstocks',
  COMPUTE_UNITS: 'compute-units',
  WRAPPED_BTC: 'wrapped-btc',
  RAYDIUM: 'raydium',
  METAPLEX: 'metaplex',
  HELIUM: 'helium',
  ORCA: 'orca',
  TEST: 'test'
} as const;

// Column type classifications for intelligent matching
export const COLUMN_TYPES = {
  TIME: ['date', 'block_date', 'month', 'week', 'quarter', 'year', 'partition_0'],
  VOLUME: ['volume', 'transfer_volume', 'trading_volume', 'swap_volume'],
  PRICE: ['price', 'avg_price', 'median_price', 'token_price'],
  COUNT: ['count', 'trades', 'transactions', 'holders', 'traders', 'users'],
  PERCENTAGE: ['pct', 'percentage', 'ratio', 'rate'],
  SUPPLY: ['supply', 'circulating_supply', 'total_supply', 'minted', 'burned'],
  TVL: ['tvl', 'total_value_locked', 'liquidity'],
  REVENUE: ['revenue', 'fees', 'earnings', 'profit'],
  METRICS: ['avg_', 'median_', 'max_', 'min_', 'sum_', 'total_']
} as const;

// Chart type recommendations based on data patterns
export const CHART_RECOMMENDATIONS = {
  TIME_SERIES: ['line', 'area'],
  COMPARISONS: ['bar', 'column'],
  DISTRIBUTIONS: ['scatter', 'histogram'],
  COMPOSITION: ['stacked_bar', 'pie'],
  CORRELATION: ['scatter', 'line']
} as const; 