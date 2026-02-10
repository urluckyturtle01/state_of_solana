import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { openAiFunctions, systemPrompt, processOpenAIFunctionCall } from '@/lib/openai-functions';
import { initializeApiSearch } from '@/lib/api-search';
import { createChartSpecFromSearchResults } from '@/lib/chart-spec';
import { getMetadataCache } from '@/lib/metadata-cache';
import { getAnalyticsTracker } from '@/lib/analytics-tracker';

interface NLPChartRequest {
  query: string;
  availableApis?: any[];
  selectedColumns?: any[];
}

interface ChartConfiguration {
  name: string;
  description: string;
  type: 'bar' | 'line' | 'area';
  chartType: 'simple' | 'stacked' | 'dual';
  xColumn: string;
  yColumns: string[];
  groupBy: string;
  suggestedApis: string[];
  suggestedColumns: string[];
  reasoning: string;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Enhanced RAG-based NLP processing
async function processNLPQuery(query: string): Promise<any> {
  try {
    // Ensure API search system is initialized
    await initializeApiSearch();
    
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not found, falling back to direct pattern matching');
      return await fallbackPatternMatching(query);
    }

    console.log('🤖 Processing NLP query with RAG system...');
    console.log('📝 Query:', query);
    
    // Use OpenAI with function calls (RAG approach)
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Help me create a chart for: "${query}"`
        }
      ],
      functions: openAiFunctions,
      function_call: 'auto',
      max_tokens: 1000,
      temperature: 0.3,
    });

    console.log('✅ OpenAI response received');
    
    const message = response.choices[0]?.message;
    if (!message) {
      throw new Error('No response from OpenAI');
    }

    // Handle function calls
    if (message.function_call) {
      console.log('🔧 Processing function call:', message.function_call.name);
      
      const functionName = message.function_call.name;
      const functionArgs = JSON.parse(message.function_call.arguments);
      
      // Execute the function
      const functionResult = await processOpenAIFunctionCall(functionName, functionArgs);
      
      // Continue conversation with function result
      const followUpResponse = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Help me create a chart for: "${query}"`
          },
          message,
          {
            role: 'function',
            name: functionName,
            content: JSON.stringify(functionResult)
          }
        ],
        functions: openAiFunctions,
        function_call: 'auto',
        max_tokens: 1000,
        temperature: 0.3,
      });

      const followUpMessage = followUpResponse.choices[0]?.message;
      
      // Handle second function call if needed
      if (followUpMessage?.function_call) {
        console.log('🔧 Processing second function call:', followUpMessage.function_call.name);
        
        const secondFunctionName = followUpMessage.function_call.name;
        const secondFunctionArgs = JSON.parse(followUpMessage.function_call.arguments);
        
        // Add APIs context for chart spec creation
        if (secondFunctionName === 'create_chart_spec' && functionResult.success) {
          secondFunctionArgs.apis_context = functionResult.apis;
        }
        
        const secondFunctionResult = await processOpenAIFunctionCall(secondFunctionName, secondFunctionArgs);
        
        return {
          success: true,
          searchResult: functionResult,
          chartSpec: secondFunctionResult,
          query: query
        };
      }
      
      return {
        success: true,
        searchResult: functionResult,
        query: query
      };
    }

    // If no function calls, return the direct response
    return {
      success: true,
      directResponse: message.content,
      query: query
    };

  } catch (error) {
    console.error('❌ RAG NLP processing failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if it's a quota issue
    if (errorMessage.includes('quota') || errorMessage.includes('insufficient_quota')) {
      console.warn('⚠️  OpenAI quota exceeded. Using direct pattern matching instead.');
    }
    
    return await fallbackPatternMatching(query);
  }
}

// Fallback pattern matching for when OpenAI is unavailable
async function fallbackPatternMatching(query: string): Promise<any> {
  console.log('🔄 Using fallback pattern matching...');
  
  try {
    // Use our search system directly
    const { searchApiCatalog } = await import('@/lib/api-search');
    const { createChartSpecFromSearchResults } = await import('@/lib/chart-spec');
    
    // Search for relevant APIs
    const searchResult = await searchApiCatalog({ query, top_k: 3 });
    
    if (searchResult.apis.length === 0) {
      return {
        success: false,
        error: 'No relevant APIs found for query',
        query: query
      };
    }
    
    // Create chart spec from search results
    const chartSpec = createChartSpecFromSearchResults(
      searchResult.apis,
      query
    );
    
    return {
      success: true,
      searchResult: {
        success: true,
        apis: searchResult.apis,
        query: query,
        total_results: searchResult.total_results
      },
      chartSpec: {
        success: true,
        chart_spec: chartSpec
      },
      query: query,
      fallbackUsed: true
    };
    
  } catch (error) {
    console.error('❌ Fallback pattern matching failed:', error);
    return {
      success: false,
      error: 'Both OpenAI and fallback pattern matching failed',
      query: query
    };
  }
}

// Convert RAG results to legacy format for compatibility
function convertToLegacyFormat(ragResult: any): any {
  const { searchResult, chartSpec, query, fallbackUsed } = ragResult;
  
  if (!ragResult.success) {
    return {
      configuration: {
        name: `Chart: ${query}`,
        description: `Generated from: "${query}"`,
        type: 'bar',
        chartType: 'simple',
        xColumn: 'date',
        yColumns: ['value'],
        groupBy: '',
        reasoning: ragResult.error || 'Failed to process query'
      },
      matchingApis: [],
      originalQuery: query
    };
  }
  
  // Extract chart configuration from RAG results
  const apis = searchResult?.apis || [];
  const spec = chartSpec?.chart_spec;
  
  const configuration: ChartConfiguration = {
    name: spec?.title || `Chart: ${query}`,
    description: spec?.metadata?.description || `Generated from: "${query}"`,
    type: spec?.chart_type || 'bar',
    chartType: 'simple',
    xColumn: spec?.x_axis?.column || 'date',
    yColumns: spec?.series?.map((s: any) => s.column) || ['value'],
    groupBy: '',
    suggestedApis: [spec?.primary_api, spec?.secondary_api].filter(Boolean),
    suggestedColumns: spec?.metadata?.suggested_columns || [],
    reasoning: spec?.metadata?.description || 
               `${fallbackUsed ? 'Pattern matching' : 'AI analysis'} suggests this configuration based on your query "${query}".`
  };
  
  // Convert APIs to legacy format
  const matchingApis = apis.map((api: any) => {
    const availableColumns = api.columns || Object.keys(api.response_schema || {});
    
    // Find the best matching columns for this specific API
    const findBestColumn = (targetColumn: string, columnTypes: string[]) => {
      if (!targetColumn) return null;
      
      // Direct match
      if (availableColumns.includes(targetColumn)) {
        return targetColumn;
      }
      
      // Find by type matching
      const lowerTarget = targetColumn.toLowerCase();
      return availableColumns.find((col: string) => {
        const lowerCol = col.toLowerCase();
        
        // Check for type-based matching
        if (columnTypes.includes('date') || columnTypes.includes('time')) {
          return lowerCol.includes('date') || lowerCol.includes('time') || col === 'partition_0';
        }
        
        if (columnTypes.includes('volume')) {
          return lowerCol.includes('volume') || lowerCol.includes('vol');
        }
        
        if (columnTypes.includes('price')) {
          return lowerCol.includes('price') || lowerCol.includes('usd');
        }
        
        if (columnTypes.includes('value')) {
          return lowerCol.includes('value') || lowerCol.includes('amount');
        }
        
        // Fallback to partial string matching
        return lowerCol.includes(lowerTarget) || lowerTarget.includes(lowerCol);
      }) || null;
    };
    
    // Smart column mapping for this API
    let suggestedXColumn = null;
    let suggestedYColumns: string[] = [];
    
    if (spec?.x_axis?.column) {
      suggestedXColumn = findBestColumn(spec.x_axis.column, ['date', 'time']) ||
                        availableColumns.find((col: string) => 
                          col.toLowerCase().includes('date') || 
                          col.toLowerCase().includes('time') || 
                          col === 'partition_0'
                        );
    }
    
    if (spec?.series?.length > 0) {
      suggestedYColumns = spec.series.map((s: any) => {
        const columnType = s.column?.toLowerCase().includes('volume') ? 'volume' :
                          s.column?.toLowerCase().includes('price') ? 'price' :
                          s.column?.toLowerCase().includes('value') ? 'value' : 'metric';
        
        return findBestColumn(s.column, [columnType]) ||
               availableColumns.find((col: string) => {
                 const lowerCol = col.toLowerCase();
                 return lowerCol.includes('volume') || 
                        lowerCol.includes('price') || 
                        lowerCol.includes('value') ||
                        lowerCol.includes('revenue') ||
                        lowerCol.includes('fee') ||
                        lowerCol.includes('supply');
               });
      }).filter(Boolean);
    }
    
    // Fallback to smart defaults if no mappings found
    if (!suggestedXColumn) {
      suggestedXColumn = availableColumns.find((col: string) => 
        col.toLowerCase().includes('date') || 
        col.toLowerCase().includes('time') || 
        col === 'partition_0'
      );
    }
    
    if (suggestedYColumns.length === 0) {
      const metricColumns = availableColumns.filter((col: string) => {
        const lowerCol = col.toLowerCase();
        return lowerCol.includes('volume') ||
               lowerCol.includes('price') ||
               lowerCol.includes('revenue') ||
               lowerCol.includes('fee') ||
               lowerCol.includes('supply') ||
               lowerCol.includes('holders') ||
               lowerCol.includes('value');
      });
      suggestedYColumns = metricColumns.slice(0, 2);
    }
    
    return {
      id: api.id,
      name: api.title,
      chartTitle: api.title,
      endpoint: api.url,
      method: api.method,
      columns: availableColumns,
      page: api.domain,
      apiKey: '', // API key not included in search results
      additionalOptions: {},
      suggestedColumns: {
        xColumn: suggestedXColumn,
        yColumns: suggestedYColumns,
        groupBy: ''
      }
    };
  });
  
  return {
    configuration,
    matchingApis,
    originalQuery: query,
    ragMetadata: {
      searchExecutionTime: searchResult?.execution_time_ms,
      totalResults: searchResult?.total_results,
      confidence: spec?.metadata?.confidence_score,
      fallbackUsed: fallbackUsed || false
    }
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let cacheHit = false;
  let success = false;
  let errorMessage: string | undefined;
  let selectedApis: string[] = [];
  let chartType = 'bar';
  let confidence = 0;

  try {
    const { query, availableApis, selectedColumns }: NLPChartRequest = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    
    console.log('🔍 Processing NLP query:', query);
    
    // Initialize cache and analytics
    const cache = getMetadataCache();
    const analytics = getAnalyticsTracker();
    await cache.loadCache();
    
    // Check cache first
    const cachedResult = await cache.get(query);
    if (cachedResult) {
      console.log('💾 Cache hit! Returning cached result');
      cacheHit = true;
      success = true;
      selectedApis = cachedResult.selectedApis;
      confidence = cachedResult.confidence;
      
      // Log analytics
      const processingTime = Date.now() - startTime;
      await analytics.logQuery({
        originalQuery: query,
        normalizedQuery: query.toLowerCase().trim(),
        selectedApis,
        chartType: cachedResult.chartSpec?.chart_type || 'bar',
        confidence,
        processingTimeMs: processingTime,
        cacheHit: true,
        success: true
      });
      
      // For cached results, we need to reconstruct the API data
      // Get the APIs from the search system
      const { searchApiCatalog } = await import('../../../lib/api-search');
      const searchResult = await searchApiCatalog({ query, top_k: 5 });
      
      // Convert cached result to legacy format with proper API data
      const legacyResult = convertToLegacyFormat({
        success: true,
        searchResult: { apis: searchResult.apis },
        chartSpec: { chart_spec: cachedResult.chartSpec },
        query: query
      });
      
      return NextResponse.json({
        ...legacyResult,
        cached: true,
        cacheId: cachedResult.id
      });
    }
    
    // Process query using RAG system
    const ragResult = await processNLPQuery(query);
    
    // Extract data for analytics and caching
    if (ragResult.success) {
      success = true;
      selectedApis = ragResult.searchResult?.apis?.map((api: any) => api.id) || [];
      chartType = ragResult.chartSpec?.chart_spec?.chart_type || 'bar';
      confidence = ragResult.chartSpec?.chart_spec?.metadata?.confidence_score || 0.8;
      
      // Cache successful result
      if (ragResult.chartSpec?.chart_spec) {
        await cache.set(
          query,
          ragResult.chartSpec.chart_spec,
          selectedApis,
          confidence
        );
      }
    } else {
      success = false;
      errorMessage = ragResult.error || 'Unknown error occurred';
    }
    
    // Convert to legacy format for compatibility
    const legacyResult = convertToLegacyFormat(ragResult);
    
    // Log analytics
    const processingTime = Date.now() - startTime;
    await analytics.logQuery({
      originalQuery: query,
      normalizedQuery: query.toLowerCase().trim(),
      selectedApis,
      chartType,
      confidence,
      processingTimeMs: processingTime,
      cacheHit: false,
      success,
      errorMessage,
      userAgent: request.headers.get('user-agent') || undefined
    });
    
    console.log('✅ NLP query processed successfully');
    console.log('📊 Found APIs:', legacyResult.matchingApis.length);
    console.log('⏱️  Processing time:', processingTime, 'ms');
    
    return NextResponse.json({
      ...legacyResult,
      cached: false,
      processingTimeMs: processingTime
    });
    
  } catch (error) {
    console.error('❌ NLP Chart API Error:', error);
    
    // Log error analytics
    const processingTime = Date.now() - startTime;
    const analytics = getAnalyticsTracker();
    await analytics.logQuery({
      originalQuery: request.url.includes('query=') ? new URL(request.url).searchParams.get('query') || 'unknown' : 'unknown',
      normalizedQuery: 'error',
      selectedApis: [],
      chartType: 'unknown',
      confidence: 0,
      processingTimeMs: processingTime,
      cacheHit: false,
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      userAgent: request.headers.get('user-agent') || undefined
    });
    
    return NextResponse.json(
      { error: 'Failed to process natural language query' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'NLP Chart API is running with RAG system',
    version: '2.0.0',
    features: [
      'RAG-based API search',
      'OpenAI function calls',
      'Intelligent chart specification',
      'Fallback pattern matching'
    ],
    endpoints: {
      POST: 'Send natural language query to generate chart configuration'
    }
  });
} 