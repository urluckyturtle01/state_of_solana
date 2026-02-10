import { searchApiCatalog, SearchApiCatalogParams } from './api-search';
import { createChartSpec, CreateChartSpecParams, ChartSpec } from './chart-spec';

// OpenAI function definitions for the RAG system
export const openAiFunctions = [
  {
    name: "search_api_catalog",
    description: "Search the API catalog to find relevant data endpoints based on a natural language query. This function uses semantic search to find the most relevant APIs for the user's request.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Natural language description of the data you're looking for (e.g., 'DEX trading volume over time', 'stablecoin supply metrics', 'compute unit pricing')"
        },
        top_k: {
          type: "integer",
          description: "Number of most relevant APIs to return (default: 5, max: 10)",
          default: 5,
          minimum: 1,
          maximum: 10
        },
        domain_filter: {
          type: "string",
          description: "Optional domain filter to limit search scope",
          enum: ["overview", "dex", "rev", "mev", "stablecoins", "protocol-revenue", "sf-dashboards", "launchpads", "xstocks", "compute-units", "wrapped-btc", "raydium", "metaplex", "helium", "orca", "test"]
        }
      },
      required: ["query"]
    }
  },
  {
    name: "create_chart_spec",
    description: "Create a JSON chart specification from API search results and user intent. This function generates a complete chart configuration including chart type, axes, series, and metadata.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Title for the chart (e.g., 'DEX Trading Volume Over Time')"
        },
        primary_api: {
          type: "string",
          description: "ID of the primary API to use for the chart data (from search results)"
        },
        secondary_api: {
          type: "string",
          description: "Optional ID of secondary API for comparison charts"
        },
        transform: {
          type: "string",
          description: "Optional data transformation description when combining multiple APIs (e.g., 'JOIN ON date column')"
        },
        chart_type: {
          type: "string",
          description: "Type of chart to create based on data patterns and user intent",
          enum: ["line", "bar", "area", "scatter", "stacked_bar", "pie"]
        },
        user_intent: {
          type: "string",
          description: "Original user query to help with intelligent chart configuration"
        }
      },
      required: ["title", "primary_api", "chart_type"]
    }
  }
];

// Function handlers for OpenAI function calls
export const functionHandlers = {
  search_api_catalog: async (params: SearchApiCatalogParams) => {
    try {
      const result = await searchApiCatalog(params);
      
      // Return simplified response for GPT-4 consumption
      return {
        success: true,
        query: result.query,
        total_results: result.total_results,
        execution_time_ms: result.execution_time_ms,
        apis: result.apis.map(api => ({
          id: api.id,
          title: api.title,
          domain: api.domain,
          description: api.description,
          url: api.url,
          method: api.method,
          columns: Object.keys(api.response_schema),
          column_types: api.response_schema,
          keywords: api.keywords.slice(0, 5), // Limit keywords for token efficiency
          chart_types: api.chart_types,
          aggregation_types: api.aggregation_types
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        query: params.query
      };
    }
  },

  create_chart_spec: async (params: CreateChartSpecParams & { apis_context?: any[] }) => {
    try {
      // Convert simplified API context back to full format if needed
      const apisContext = params.apis_context || [];
      
      const result = createChartSpec({
        ...params,
        apis_context: apisContext
      });
      
      return {
        success: true,
        chart_spec: result,
        validation: {
          valid: true,
          confidence_score: result.metadata?.confidence_score || 0.5
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        title: params.title,
        primary_api: params.primary_api
      };
    }
  }
};

// Helper function to process OpenAI function calls
export async function processOpenAIFunctionCall(
  functionName: string,
  functionArgs: any
): Promise<any> {
  console.log(`🔧 Processing OpenAI function call: ${functionName}`);
  console.log(`📋 Arguments:`, functionArgs);
  
  switch (functionName) {
    case 'search_api_catalog':
      return await functionHandlers.search_api_catalog(functionArgs);
    
    case 'create_chart_spec':
      return await functionHandlers.create_chart_spec(functionArgs);
    
    default:
      return {
        success: false,
        error: `Unknown function: ${functionName}`,
        available_functions: Object.keys(functionHandlers)
      };
  }
}

// Enhanced system prompt for OpenAI
export const systemPrompt = `You are a Solana analytics assistant that helps users create charts and visualizations from blockchain data.

You have access to 185+ APIs covering various Solana ecosystem data including:
- DEX trading (volume, TVL, traders, aggregators)
- Stablecoins (supply, transfers, liquidity, mint/burn)
- MEV (extraction, arbitrage, sandwich attacks)
- Protocol revenue (fees, earnings across protocols)
- Compute units (pricing, allocation, consumption)
- Wrapped BTC (holders, transfers, TVL)
- Specific protocols (Raydium, Orca, Metaplex, Helium)

## Your Workflow:

1. **Search APIs**: Use search_api_catalog to find relevant data endpoints
   - Be specific in your search queries
   - Use domain filters when appropriate
   - Consider multiple searches for complex requests

2. **Create Chart Specs**: Use create_chart_spec to generate chart configurations
   - Choose appropriate chart types based on data patterns
   - Consider user intent (trends, comparisons, distributions)
   - Include secondary APIs for comparison charts

## Chart Type Guidelines:

- **Line charts**: Time series data, trends, price movements
- **Area charts**: Volume data over time, filled regions
- **Bar charts**: Categorical comparisons, discrete values
- **Scatter plots**: Correlation analysis, relationship data
- **Stacked bars**: Composition analysis, multiple categories

## Best Practices:

1. Always search for APIs first before creating chart specs
2. Use descriptive, user-friendly chart titles
3. Consider the user's analytical intent
4. Provide context about data sources and methodology
5. Suggest additional analyses when relevant

## Example Flow:

User: "Show me DEX trading volume trends"
1. search_api_catalog({"query": "DEX trading volume over time"})
2. create_chart_spec({
   "title": "DEX Trading Volume Trends",
   "primary_api": "found_api_id",
   "chart_type": "area",
   "user_intent": "Show me DEX trading volume trends"
})

Start each interaction by understanding the user's needs and searching for relevant APIs.`;

// Types for OpenAI integration
export interface OpenAIFunctionCall {
  name: string;
  arguments: string;
}

export interface OpenAIFunctionResponse {
  success: boolean;
  error?: string;
  [key: string]: any;
} 