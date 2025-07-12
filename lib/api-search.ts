import * as fs from 'fs';
import * as path from 'path';
import { ApiCatalog, ApiCatalogEntry } from '../types/api-catalog';
import { ApiVectorStore } from './vector-store';
import { MockVectorStore, createMockVectorStore } from './mock-vector-store';
import { SearchResult } from './vector-store';

// Enhanced API Catalog Entry with world-class intelligence
interface EnhancedApiCatalogEntry extends Omit<ApiCatalogEntry, 'sample_response'> {
  // Enhanced sample data for better context
  sample_response: {
    data: Record<string, any>[];
    row_count: number;
    data_freshness: string;
    last_updated: string;
  };
  
  // Data quality indicators
  data_quality: {
    completeness: number;
    accuracy: number;
    freshness: number;
    reliability: number;
    volatility: 'low' | 'medium' | 'high';
  };
  
  // Usage context
  usage_context: {
    primary_use_cases: string[];
    typical_queries: string[];
    business_insights: string[];
    decision_support: string[];
    complexity_level: 'beginner' | 'intermediate' | 'advanced';
  };
  
  // Performance metadata
  performance: {
    avg_response_time_ms: number;
    typical_data_volume: string;
    cache_duration: string;
    rate_limits?: string;
  };
  
  // Visualization intelligence
  visualization: {
    recommended_charts: Array<{
      type: string;
      confidence: number;
      use_case: string;
      color_scheme?: string;
    }>;
    axis_suggestions: {
      x_axis: { column: string; label: string; format?: string }[];
      y_axis: { column: string; label: string; format?: string }[];
    };
    trending_patterns: string[];
    anomaly_detection: boolean;
  };
  
  // Relationships
  relationships: {
    similar_apis: string[];
    complementary_apis: string[];
    prerequisite_apis: string[];
    derived_metrics: string[];
  };
  
  // Enhanced search context
  search_context: {
    semantic_tags: string[];
    domain_expertise: string[];
    temporal_scope: string;
    geographical_scope?: string;
    market_relevance: number;
  };
}

// Enhanced catalog interface
interface EnhancedApiCatalog {
  entries: EnhancedApiCatalogEntry[];
  version: string;
  last_updated: string;
  enhancements: {
    sample_responses: boolean;
    data_quality_metrics: boolean;
    usage_context: boolean;
    performance_metadata: boolean;
    visualization_intelligence: boolean;
    relationship_mapping: boolean;
    search_context: boolean;
  };
}

// Global vector store instance (singleton)
let vectorStore: ApiVectorStore | MockVectorStore | null = null;
let isInitialized = false;

// Search API catalog function parameters
export interface SearchApiCatalogParams {
  query: string;
  top_k?: number;
  domain_filter?: string;
  complexity_filter?: 'beginner' | 'intermediate' | 'advanced';
  quality_threshold?: number;
}

// Enhanced search result with intelligence
export interface EnhancedSearchResult {
  apis: EnhancedApiCatalogEntry[];
  search_results: SearchResult[];
  query: string;
  total_results: number;
  execution_time_ms: number;
  intelligence_summary: {
    avg_data_quality: number;
    complexity_distribution: Record<string, number>;
    recommended_visualizations: string[];
    business_insights: string[];
    performance_summary: {
      avg_response_time: number;
      data_volume_distribution: Record<string, number>;
    };
  };
}

// Initialize the enhanced API search system
export async function initializeApiSearch(): Promise<void> {
  if (isInitialized) {
    return;
  }

  console.log('🚀 Initializing Enhanced API search system...');
  
  try {
    // Try to load enhanced catalog first
    const enhancedCatalogPath = path.join(process.cwd(), 'data', 'api-catalog-enhanced.json');
    let catalog: EnhancedApiCatalog | ApiCatalog;
    let useEnhanced = false;
    
    if (fs.existsSync(enhancedCatalogPath)) {
      catalog = JSON.parse(fs.readFileSync(enhancedCatalogPath, 'utf-8'));
      useEnhanced = true;
      console.log(`✨ Loaded enhanced catalog with ${catalog.entries.length} entries`);
    } else {
      // Fallback to regular catalog
      const catalogPath = path.join(process.cwd(), 'data', 'api-catalog.json');
      if (!fs.existsSync(catalogPath)) {
        throw new Error('No API catalog found. Please run build-api-catalog.ts first.');
      }
      catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
      console.log(`📊 Loaded regular catalog with ${catalog.entries.length} entries`);
    }

    // Convert catalog entries to basic ApiCatalogEntry format for vector store
    const basicEntries = convertToBasicApiEntries(catalog.entries);

    // Try to use real vector store first, fallback to mock
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (openaiApiKey) {
      try {
        // Try to load pre-built vector store
        const vectorStorePath = path.join(process.cwd(), 'data', 'vector-store.json');
        if (fs.existsSync(vectorStorePath)) {
          vectorStore = await ApiVectorStore.loadFromFile(vectorStorePath, openaiApiKey);
          console.log('✅ Loaded pre-built vector store');
        } else {
          // Create new vector store (this will make API calls)
          console.log('🔄 Creating new vector store (this may take a moment)...');
          vectorStore = new ApiVectorStore({
            openaiApiKey,
            embeddingModel: 'text-embedding-3-small',
            maxResults: 20
          });
          await vectorStore.initialize(basicEntries);
          
          // Save for future use
          await vectorStore.saveToFile(vectorStorePath);
          console.log('✅ Created and saved vector store');
        }
      } catch (error) {
        console.warn('⚠️  Failed to initialize OpenAI vector store, falling back to mock:', error);
        vectorStore = await createMockVectorStore(basicEntries);
      }
    } else {
      console.log('🔄 Using mock vector store (no OpenAI API key)');
      vectorStore = await createMockVectorStore(basicEntries);
    }

    isInitialized = true;
    console.log(`🎯 Enhanced API search system initialized with ${useEnhanced ? 'world-class intelligence' : 'standard features'}`);
    
  } catch (error) {
    console.error('❌ Failed to initialize API search system:', error);
    throw error;
  }
}

// Convert catalog entries to basic ApiCatalogEntry format
function convertToBasicApiEntries(entries: ApiCatalogEntry[] | EnhancedApiCatalogEntry[]): ApiCatalogEntry[] {
  return entries.map(entry => {
    if ('data_quality' in entry) {
      // Convert EnhancedApiCatalogEntry to ApiCatalogEntry
      const basicEntry: ApiCatalogEntry = {
        id: entry.id,
        domain: entry.domain,
        title: entry.title,
        url: entry.url,
        method: entry.method,
        params: entry.params,
        response_schema: entry.response_schema,
        keywords: entry.keywords,
        chart_types: entry.chart_types,
        sample_response: typeof entry.sample_response === 'string' 
          ? entry.sample_response 
          : JSON.stringify(entry.sample_response.data.slice(0, 2))
      };
      return basicEntry;
    }
    return entry;
  });
}

// Enhanced search API catalog function
export async function searchApiCatalog(params: SearchApiCatalogParams): Promise<EnhancedSearchResult> {
  const startTime = Date.now();
  
  // Ensure vector store is initialized
  if (!isInitialized || !vectorStore) {
    await initializeApiSearch();
  }

  if (!vectorStore) {
    throw new Error('Vector store not initialized');
  }

  const { query, top_k = 5, domain_filter, complexity_filter, quality_threshold = 0.7 } = params;
  
  // Perform search
  const searchResults = await vectorStore.search(query, top_k * 2, domain_filter); // Get more results for filtering
  
  // Extract API entries from search results
  const basicApis = searchResults.map(result => result.metadata);
  
  // Try to load enhanced catalog to get enhanced data
  let enhancedApis: EnhancedApiCatalogEntry[] = [];
  try {
    const enhancedCatalogPath = path.join(process.cwd(), 'data', 'api-catalog-enhanced.json');
    if (fs.existsSync(enhancedCatalogPath)) {
      const enhancedCatalog: EnhancedApiCatalog = JSON.parse(fs.readFileSync(enhancedCatalogPath, 'utf-8'));
      const enhancedMap = new Map(enhancedCatalog.entries.map(entry => [entry.id, entry]));
      
      enhancedApis = basicApis.map(api => {
        const enhanced = enhancedMap.get(api.id);
        return enhanced || convertBasicToEnhanced(api);
      });
    } else {
      // Convert basic APIs to enhanced format with default values
      enhancedApis = basicApis.map(convertBasicToEnhanced);
    }
  } catch (error) {
    console.warn('Could not load enhanced catalog, using basic conversion:', error);
    enhancedApis = basicApis.map(convertBasicToEnhanced);
  }
  
  // Apply enhanced filtering if using enhanced catalog
  if (enhancedApis.length > 0 && 'data_quality' in enhancedApis[0]) {
    // Filter by data quality
    const qualityFiltered = enhancedApis.filter(api => 
      api.data_quality.completeness >= quality_threshold
    );
    
    // Filter by complexity if specified
    const complexityFiltered = complexity_filter 
      ? qualityFiltered.filter(api => api.usage_context.complexity_level === complexity_filter)
      : qualityFiltered;
    
    // Take top results after filtering
    enhancedApis = complexityFiltered.slice(0, top_k);
  } else {
    // Regular filtering for non-enhanced catalog
    enhancedApis = enhancedApis.slice(0, top_k);
  }
  
  const executionTime = Date.now() - startTime;
  
  // Generate intelligence summary
  const intelligenceSummary = generateIntelligenceSummary(enhancedApis);
  
  return {
    apis: enhancedApis,
    search_results: searchResults.slice(0, top_k),
    query,
    total_results: searchResults.length,
    execution_time_ms: executionTime,
    intelligence_summary: intelligenceSummary
  };
}

// Convert basic API to enhanced format with default values
function convertBasicToEnhanced(api: ApiCatalogEntry): EnhancedApiCatalogEntry {
  return {
    ...api,
    sample_response: {
      data: typeof api.sample_response === 'string' 
        ? JSON.parse(api.sample_response || '[]') 
        : [],
      row_count: 3,
      data_freshness: 'recent',
      last_updated: new Date().toISOString()
    },
    data_quality: {
      completeness: 0.85,
      accuracy: 0.9,
      freshness: 0.8,
      reliability: 0.85,
      volatility: 'medium'
    },
    usage_context: {
      primary_use_cases: ['Analytics', 'Reporting'],
      typical_queries: [api.title],
      business_insights: ['General analytics insights'],
      decision_support: ['Data-driven decisions'],
      complexity_level: 'intermediate'
    },
    performance: {
      avg_response_time_ms: 300,
      typical_data_volume: 'medium',
      cache_duration: '5 minutes'
    },
    visualization: {
      recommended_charts: [
        { type: 'line', confidence: 0.8, use_case: 'Time series' },
        { type: 'bar', confidence: 0.7, use_case: 'Comparisons' }
      ],
      axis_suggestions: {
        x_axis: [{ column: 'date', label: 'Date' }],
        y_axis: [{ column: 'value', label: 'Value' }]
      },
      trending_patterns: ['upward', 'seasonal'],
      anomaly_detection: false
    },
    relationships: {
      similar_apis: [],
      complementary_apis: [],
      prerequisite_apis: [],
      derived_metrics: []
    },
    search_context: {
      semantic_tags: api.keywords,
      domain_expertise: [api.domain],
      temporal_scope: 'historical',
      market_relevance: 0.7
    }
  };
}

// Generate intelligence summary from enhanced APIs
function generateIntelligenceSummary(apis: EnhancedApiCatalogEntry[]): EnhancedSearchResult['intelligence_summary'] {
  if (apis.length === 0 || !('data_quality' in apis[0])) {
    return {
      avg_data_quality: 0.85,
      complexity_distribution: { 'intermediate': 1 },
      recommended_visualizations: ['line', 'bar'],
      business_insights: ['General analytics'],
      performance_summary: {
        avg_response_time: 300,
        data_volume_distribution: { 'medium': 1 }
      }
    };
  }

  const validApis = apis.filter(api => 'data_quality' in api);
  
  // Calculate average data quality
  const avgDataQuality = validApis.reduce((sum, api) => 
    sum + (api.data_quality.completeness + api.data_quality.accuracy + api.data_quality.freshness + api.data_quality.reliability) / 4, 0
  ) / validApis.length;
  
  // Complexity distribution
  const complexityDistribution = validApis.reduce((acc, api) => {
    acc[api.usage_context.complexity_level] = (acc[api.usage_context.complexity_level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Recommended visualizations
  const allChartTypes = validApis.flatMap(api => 
    api.visualization.recommended_charts.map(chart => chart.type)
  );
  const uniqueChartTypes = Array.from(new Set(allChartTypes));
  
  // Business insights
  const allInsights = validApis.flatMap(api => api.usage_context.business_insights);
  const uniqueInsights = Array.from(new Set(allInsights));
  
  // Performance summary
  const avgResponseTime = validApis.reduce((sum, api) => 
    sum + api.performance.avg_response_time_ms, 0
  ) / validApis.length;
  
  const dataVolumeDistribution = validApis.reduce((acc, api) => {
    acc[api.performance.typical_data_volume] = (acc[api.performance.typical_data_volume] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    avg_data_quality: avgDataQuality,
    complexity_distribution: complexityDistribution,
    recommended_visualizations: uniqueChartTypes,
    business_insights: uniqueInsights.slice(0, 5), // Top 5 insights
    performance_summary: {
      avg_response_time: avgResponseTime,
      data_volume_distribution: dataVolumeDistribution
    }
  };
}

// Get API by ID (enhanced)
export async function getApiById(id: string): Promise<EnhancedApiCatalogEntry | null> {
  if (!isInitialized || !vectorStore) {
    await initializeApiSearch();
  }

  if (!vectorStore) {
    throw new Error('Vector store not initialized');
  }

  const basicApi = vectorStore.getApiById(id);
  if (!basicApi) {
    return null;
  }

  // Convert to enhanced format
  try {
    const enhancedCatalogPath = path.join(process.cwd(), 'data', 'api-catalog-enhanced.json');
    if (fs.existsSync(enhancedCatalogPath)) {
      const enhancedCatalog: EnhancedApiCatalog = JSON.parse(fs.readFileSync(enhancedCatalogPath, 'utf-8'));
      const enhancedMap = new Map(enhancedCatalog.entries.map(entry => [entry.id, entry]));
      
      const enhanced = enhancedMap.get(id);
      return enhanced || convertBasicToEnhanced(basicApi);
    } else {
      return convertBasicToEnhanced(basicApi);
    }
  } catch (error) {
    console.warn('Could not load enhanced catalog for API by ID:', error);
    return convertBasicToEnhanced(basicApi);
  }
}

// Get APIs by domain (enhanced)
export async function getApisByDomain(domain: string): Promise<EnhancedApiCatalogEntry[]> {
  if (!isInitialized || !vectorStore) {
    await initializeApiSearch();
  }

  if (!vectorStore) {
    throw new Error('Vector store not initialized');
  }

  const basicApis = vectorStore.getApisByDomain(domain);
  
  // Convert to enhanced format
  try {
    const enhancedCatalogPath = path.join(process.cwd(), 'data', 'api-catalog-enhanced.json');
    if (fs.existsSync(enhancedCatalogPath)) {
      const enhancedCatalog: EnhancedApiCatalog = JSON.parse(fs.readFileSync(enhancedCatalogPath, 'utf-8'));
      const enhancedMap = new Map(enhancedCatalog.entries.map(entry => [entry.id, entry]));
      
      return basicApis.map(api => {
        const enhanced = enhancedMap.get(api.id);
        return enhanced || convertBasicToEnhanced(api);
      });
    } else {
      return basicApis.map(convertBasicToEnhanced);
    }
  } catch (error) {
    console.warn('Could not load enhanced catalog for domain APIs:', error);
    return basicApis.map(convertBasicToEnhanced);
  }
}

// Get enhanced search statistics
export async function getSearchStats(): Promise<{
  totalApis: number;
  domains: Record<string, number>;
  initialized: boolean;
  storeType: 'vector' | 'mock';
  enhancement_stats?: {
    enhanced_entries: number;
    avg_data_quality: number;
    complexity_distribution: Record<string, number>;
    visualization_types: string[];
  };
}> {
  if (!isInitialized || !vectorStore) {
    await initializeApiSearch();
  }

  if (!vectorStore) {
    throw new Error('Vector store not initialized');
  }

  const stats = vectorStore.getStats();
  
  // Try to get enhanced stats if available
  let enhancementStats;
  try {
    const enhancedCatalogPath = path.join(process.cwd(), 'data', 'api-catalog-enhanced.json');
    if (fs.existsSync(enhancedCatalogPath)) {
      const enhancedCatalog: EnhancedApiCatalog = JSON.parse(fs.readFileSync(enhancedCatalogPath, 'utf-8'));
      
      const avgDataQuality = enhancedCatalog.entries.reduce((sum, entry) => 
        sum + (entry.data_quality.completeness + entry.data_quality.accuracy + entry.data_quality.freshness + entry.data_quality.reliability) / 4, 0
      ) / enhancedCatalog.entries.length;
      
      const complexityDistribution = enhancedCatalog.entries.reduce((acc, entry) => {
        acc[entry.usage_context.complexity_level] = (acc[entry.usage_context.complexity_level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const visualizationTypes = Array.from(new Set(enhancedCatalog.entries.flatMap(entry => 
        entry.visualization.recommended_charts.map(chart => chart.type)
      )));
      
      enhancementStats = {
        enhanced_entries: enhancedCatalog.entries.length,
        avg_data_quality: avgDataQuality,
        complexity_distribution: complexityDistribution,
        visualization_types: visualizationTypes
      };
    }
  } catch (error) {
    console.warn('Could not load enhancement stats:', error);
  }
  
  return {
    ...stats,
    storeType: vectorStore instanceof ApiVectorStore ? 'vector' : 'mock',
    enhancement_stats: enhancementStats
  };
}

// Test enhanced search functionality
export async function testEnhancedApiSearch(): Promise<void> {
  console.log('🔍 Testing Enhanced API search functionality...');
  
  const testQueries = [
    { query: 'DEX trading volume over time', complexity: 'intermediate' as const },
    { query: 'stablecoin supply and liquidity', complexity: 'beginner' as const },
    { query: 'MEV extraction and arbitrage', complexity: 'advanced' as const },
    { query: 'compute units and transaction fees', complexity: 'intermediate' as const },
    { query: 'wrapped bitcoin holders and transfers', complexity: 'intermediate' as const }
  ];

  for (const testCase of testQueries) {
    console.log(`\n🔍 Testing query: "${testCase.query}"`);
    
    try {
      const result = await searchApiCatalog({ 
        query: testCase.query, 
        top_k: 3,
        complexity_filter: testCase.complexity,
        quality_threshold: 0.8
      });
      
      console.log(`  Found ${result.total_results} results in ${result.execution_time_ms}ms:`);
      console.log(`  Average data quality: ${(result.intelligence_summary.avg_data_quality * 100).toFixed(1)}%`);
      console.log(`  Recommended visualizations: ${result.intelligence_summary.recommended_visualizations.join(', ')}`);
      console.log(`  Business insights: ${result.intelligence_summary.business_insights.slice(0, 2).join(', ')}`);
      
      result.apis.forEach((api, index) => {
        console.log(`    ${index + 1}. ${api.title}`);
        console.log(`       Domain: ${api.domain}`);
        if ('data_quality' in api) {
          console.log(`       Quality: ${(api.data_quality.completeness * 100).toFixed(1)}%`);
          console.log(`       Complexity: ${api.usage_context.complexity_level}`);
          console.log(`       Best chart: ${api.visualization.recommended_charts[0]?.type || 'N/A'}`);
        }
      });
    } catch (error) {
      console.error(`  ❌ Error: ${error}`);
    }
  }

  console.log('\n✅ Enhanced API search testing complete');
}

// Export enhanced types
export type { EnhancedApiCatalogEntry }; 