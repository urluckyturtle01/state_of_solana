import { ApiCatalogEntry, COLUMN_TYPES } from '../types/api-catalog';
import { EnhancedApiCatalogEntry } from './api-search';

// Chart specification interface
export interface ChartSpec {
  title: string;
  primary_api: string;
  secondary_api?: string;
  transform?: string;
  chart_type: 'line' | 'bar' | 'area' | 'scatter' | 'stacked_bar' | 'pie';
  x_axis?: {
    column: string;
    type: string;
    label?: string;
  };
  y_axis?: {
    column: string;
    type: string;
    label?: string;
  };
  series?: Array<{
    column: string;
    type: string;
    label?: string;
    color?: string;
  }>;
  metadata?: {
    description?: string;
    domain: string;
    keywords: string[];
    suggested_columns: string[];
    confidence_score: number;
  };
}

// Chart spec creation parameters
export interface CreateChartSpecParams {
  title: string;
  primary_api: string;
  secondary_api?: string;
  transform?: string;
  chart_type: ChartSpec['chart_type'];
  user_intent?: string;
  apis_context?: ApiCatalogEntry[] | EnhancedApiCatalogEntry[];
}

// Utility function to convert enhanced APIs to basic APIs
function convertToBasicApis(apis: ApiCatalogEntry[] | EnhancedApiCatalogEntry[]): ApiCatalogEntry[] {
  return apis.map(api => {
    if ('data_quality' in api) {
      // Convert EnhancedApiCatalogEntry to ApiCatalogEntry
      const basicApi: ApiCatalogEntry = {
        id: api.id,
        domain: api.domain,
        title: api.title,
        url: api.url,
        method: api.method,
        params: api.params,
        response_schema: api.response_schema,
        keywords: api.keywords,
        chart_types: api.chart_types,
        sample_response: typeof api.sample_response === 'string' 
          ? api.sample_response 
          : JSON.stringify(api.sample_response.data.slice(0, 2))
      };
      return basicApi;
    }
    return api as ApiCatalogEntry;
  });
}

// Utility functions for intelligent chart specification
class ChartSpecBuilder {
  private apis: Map<string, ApiCatalogEntry> = new Map();

  constructor(apis: ApiCatalogEntry[]) {
    apis.forEach(api => this.apis.set(api.id, api));
  }

  // Get column type classification
  private getColumnType(column: string): string {
    const lowerCol = column.toLowerCase();
    
    for (const [type, patterns] of Object.entries(COLUMN_TYPES)) {
      if (patterns.some(pattern => lowerCol.includes(pattern))) {
        return type.toLowerCase();
      }
    }
    
    // Default classifications
    if (lowerCol.includes('date') || lowerCol.includes('time') || lowerCol.includes('month')) return 'time';
    if (lowerCol.includes('volume') || lowerCol.includes('amount') || lowerCol.includes('usd')) return 'volume';
    if (lowerCol.includes('price') || lowerCol.includes('rate')) return 'price';
    if (lowerCol.includes('count') || lowerCol.includes('number') || lowerCol.includes('trades')) return 'count';
    if (lowerCol.includes('pct') || lowerCol.includes('percent')) return 'percentage';
    if (lowerCol.includes('supply') || lowerCol.includes('total')) return 'supply';
    if (lowerCol.includes('tvl') || lowerCol.includes('locked')) return 'tvl';
    
    return 'metric';
  }

  // Find time column in API
  private findTimeColumn(api: ApiCatalogEntry): string | null {
    const timeColumns = Object.keys(api.response_schema).filter(col => 
      this.getColumnType(col) === 'time'
    );
    return timeColumns[0] || null;
  }

  // Find metric columns in API
  private findMetricColumns(api: ApiCatalogEntry): string[] {
    return Object.keys(api.response_schema).filter(col => {
      const type = this.getColumnType(col);
      return ['volume', 'price', 'count', 'percentage', 'supply', 'tvl', 'metric'].includes(type);
    });
  }

  // Suggest chart type based on data patterns
  private suggestChartType(api: ApiCatalogEntry, userIntent?: string): ChartSpec['chart_type'] {
    const hasTime = this.findTimeColumn(api) !== null;
    const metrics = this.findMetricColumns(api);
    const hasMultipleMetrics = metrics.length > 1;
    
    // User intent analysis
    if (userIntent) {
      const intent = userIntent.toLowerCase();
      if (intent.includes('compare') || intent.includes('vs')) return 'bar';
      if (intent.includes('trend') || intent.includes('over time')) return 'line';
      if (intent.includes('volume') || intent.includes('fill')) return 'area';
      if (intent.includes('correlation') || intent.includes('relationship')) return 'scatter';
      if (intent.includes('composition') || intent.includes('breakdown')) return 'stacked_bar';
    }
    
    // Data pattern analysis
    if (hasTime && hasMultipleMetrics) return 'line';
    if (hasTime && metrics.some(col => this.getColumnType(col) === 'volume')) return 'area';
    if (hasTime) return 'line';
    if (hasMultipleMetrics) return 'bar';
    if (metrics.some(col => this.getColumnType(col) === 'volume')) return 'area';
    
    return 'bar';
  }

  // Build chart specification
  build(params: CreateChartSpecParams): ChartSpec {
    const { title, primary_api, secondary_api, transform, chart_type, user_intent, apis_context } = params;
    
    // Get primary API details
    const primaryApi = this.apis.get(primary_api);
    if (!primaryApi) {
      throw new Error(`Primary API ${primary_api} not found`);
    }

    // Get secondary API details if specified
    const secondaryApi = secondary_api ? this.apis.get(secondary_api) : undefined;
    
    // Auto-determine chart type if not specified
    const finalChartType = chart_type || this.suggestChartType(primaryApi, user_intent);
    
    // Find time column
    const timeColumn = this.findTimeColumn(primaryApi);
    
    // Find metric columns
    const metricColumns = this.findMetricColumns(primaryApi);
    
    // Build axis specifications
    const xAxis = timeColumn ? {
      column: timeColumn,
      type: 'time',
      label: this.formatColumnLabel(timeColumn)
    } : undefined;
    
    const yAxis = metricColumns.length > 0 ? {
      column: metricColumns[0],
      type: this.getColumnType(metricColumns[0]),
      label: this.formatColumnLabel(metricColumns[0])
    } : undefined;
    
    // Build series specifications
    const series = metricColumns.map((col, index) => ({
      column: col,
      type: this.getColumnType(col),
      label: this.formatColumnLabel(col),
      color: this.getSeriesColor(index)
    }));
    
    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(primaryApi, finalChartType, timeColumn, metricColumns);
    
    // Build suggested columns
    const suggestedColumns = [
      ...(timeColumn ? [timeColumn] : []),
      ...metricColumns.slice(0, 5) // Limit to top 5 metrics
    ];
    
    const chartSpec: ChartSpec = {
      title,
      primary_api,
      secondary_api,
      transform,
      chart_type: finalChartType,
      x_axis: xAxis,
      y_axis: yAxis,
      series: series.length > 0 ? series : undefined,
      metadata: {
        description: `${finalChartType} chart showing ${primaryApi.title}`,
        domain: primaryApi.domain,
        keywords: primaryApi.keywords,
        suggested_columns: suggestedColumns,
        confidence_score: confidenceScore
      }
    };
    
    return chartSpec;
  }

  // Format column label for display
  private formatColumnLabel(column: string): string {
    return column
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  // Get series color
  private getSeriesColor(index: number): string {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];
    return colors[index % colors.length];
  }

  // Calculate confidence score for chart spec
  private calculateConfidenceScore(
    api: ApiCatalogEntry,
    chartType: ChartSpec['chart_type'],
    timeColumn: string | null,
    metricColumns: string[]
  ): number {
    let score = 0.5; // Base score
    
    // Time column bonus
    if (timeColumn) score += 0.2;
    
    // Metric columns bonus
    score += Math.min(metricColumns.length * 0.1, 0.3);
    
    // Chart type appropriateness
    if (chartType === 'line' && timeColumn) score += 0.1;
    if (chartType === 'area' && timeColumn && metricColumns.some(col => this.getColumnType(col) === 'volume')) score += 0.1;
    if (chartType === 'bar' && metricColumns.length > 0) score += 0.1;
    
    // Domain relevance
    if (['dex', 'stablecoins', 'mev', 'rev'].includes(api.domain)) score += 0.1;
    
    return Math.min(score, 1.0);
  }
}

// Create chart spec function (exposed to GPT-4)
export function createChartSpec(params: CreateChartSpecParams): ChartSpec {
  const { apis_context = [] } = params;
  
  // Create builder with available APIs
  const builder = new ChartSpecBuilder(convertToBasicApis(apis_context));
  
  // Build and return chart specification
  return builder.build(params);
}

// Utility function to create chart specs from search results
export function createChartSpecFromSearchResults(
  apis: ApiCatalogEntry[] | EnhancedApiCatalogEntry[],
  query: string,
  preferredChartType?: ChartSpec['chart_type']
): ChartSpec {
  if (apis.length === 0) {
    throw new Error('No APIs provided for chart specification');
  }
  
  const primaryApi = apis[0];
  const secondaryApi = apis.length > 1 ? apis[1] : undefined;
  
  // Generate title from user query and API
  const title = query.charAt(0).toUpperCase() + query.slice(1);
  
  // Determine if we need a transform (for multiple APIs)
  const transform = secondaryApi ? 
    `JOIN ${primaryApi.title} AND ${secondaryApi.title} ON date/time column` : 
    undefined;
  
  return createChartSpec({
    title,
    primary_api: primaryApi.id,
    secondary_api: secondaryApi?.id,
    transform,
    chart_type: preferredChartType || primaryApi.chart_types?.[0] as ChartSpec['chart_type'] || 'line',
    user_intent: query,
    apis_context: apis
  });
}

// Validate chart specification
export function validateChartSpec(spec: ChartSpec): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!spec.title) errors.push('Title is required');
  if (!spec.primary_api) errors.push('Primary API is required');
  if (!spec.chart_type) errors.push('Chart type is required');
  
  // Chart type validation
  const validChartTypes = ['line', 'bar', 'area', 'scatter', 'stacked_bar', 'pie'];
  if (!validChartTypes.includes(spec.chart_type)) {
    errors.push(`Invalid chart type: ${spec.chart_type}`);
  }
  
  // Confidence score warnings
  if (spec.metadata?.confidence_score && spec.metadata.confidence_score < 0.5) {
    warnings.push('Low confidence score - chart spec may need refinement');
  }
  
  // Axis validation
  if (!spec.x_axis && !spec.y_axis) {
    warnings.push('No axis specifications provided');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
} 