import { ChartConfig } from '@/app/admin/types';

/**
 * Sanitize chart configuration for public consumption
 * Removes sensitive fields like API endpoints, keys, and internal configuration
 */
export interface PublicChartConfig {
  id: string;
  title: string;
  subtitle?: string;
  page: string;
  section?: string;
  chartType: string;
  dataMapping: any;
  additionalOptions?: any;
  position?: number;
  width?: number;
  colorScheme?: string;
  isStacked?: boolean;
  enableCategoricalBrush?: boolean;
  useDistinctColors?: boolean;
  dualAxisConfig?: any;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Remove sensitive fields from chart configuration
 */
export function sanitizeChartConfig(chart: ChartConfig): PublicChartConfig {
  const {
    // Remove sensitive fields
    apiEndpoint,
    apiKey,
    onFilterChange, // Remove callback function
    
    // Keep safe fields
    id,
    title,
    subtitle,
    page,
    section,
    chartType,
    dataMapping,
    additionalOptions,
    position,
    width,
    colorScheme,
    isStacked,
    enableCategoricalBrush,
    useDistinctColors,
    dualAxisConfig,
    createdAt,
    updatedAt,
    
    // Ignore any other fields (safety net)
    ...rest
  } = chart;

  // Return only safe, public fields
  return {
    id,
    title,
    subtitle,
    page,
    section,
    chartType,
    dataMapping,
    additionalOptions,
    position,
    width,
    colorScheme,
    isStacked,
    enableCategoricalBrush,
    useDistinctColors,
    dualAxisConfig,
    createdAt,
    updatedAt,
  };
}

/**
 * Sanitize an array of chart configurations
 */
export function sanitizeChartConfigs(charts: ChartConfig[]): PublicChartConfig[] {
  return charts.map(sanitizeChartConfig);
}

/**
 * Check if the request is from an admin context
 * Share charts should NOT get unsanitized data for security
 */
export function isAdminRequest(request: Request): boolean {
  // Check for admin authentication header
  const adminAuth = request.headers.get('x-admin-auth');
  if (adminAuth && adminAuth !== 'share-chart-request') {
    // Verify admin token/session here
    // For now, just check if it exists and is not a share chart request
    return true;
  }
  
  // Check if request is coming from admin pages only
  const referer = request.headers.get('referer');
  if (referer && referer.includes('/admin/')) {
    return true;
  }
  
  // Default to non-admin (public) - share charts get sanitized data
  return false;
}
