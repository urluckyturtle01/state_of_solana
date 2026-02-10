#!/usr/bin/env tsx

import { NextRequest } from 'next/server';
import { POST as nlpApiHandler } from '../app/api/nlp-chart/route';

// Test the complete RAG system end-to-end
async function testCompleteRAGSystem() {
  console.log('🧪 Testing Complete RAG System End-to-End...');
  
  const testQueries = [
    {
      query: 'Show me DEX trading volume trends over time',
      expectedChart: 'area',
      expectedDomain: 'dex'
    },
    {
      query: 'Compare stablecoin supply across different tokens',
      expectedChart: 'bar',
      expectedDomain: 'stablecoins'
    },
    {
      query: 'Analyze compute unit pricing trends',
      expectedChart: 'line',
      expectedDomain: 'compute-units'
    },
    {
      query: 'MEV extraction metrics and arbitrage opportunities',
      expectedChart: 'line',
      expectedDomain: 'mev'
    },
    {
      query: 'Wrapped Bitcoin holder distribution and transfer volumes',
      expectedChart: 'line',
      expectedDomain: 'wrapped-btc'
    }
  ];

  const results = [];

  for (const test of testQueries) {
    console.log(`\n🔍 Testing Query: "${test.query}"`);
    
    try {
      // Create a mock request
      const mockRequest = {
        json: async () => ({
          query: test.query
        })
      } as NextRequest;

      // Call the NLP API handler
      const response = await nlpApiHandler(mockRequest);
      const responseData = await response.json();

      console.log(`  📊 Response Status: ${response.status}`);
      
      if (response.status === 200) {
        console.log(`  ✅ Success!`);
        console.log(`  📈 Chart Configuration:`);
        console.log(`    Name: ${responseData.configuration?.name}`);
        console.log(`    Type: ${responseData.configuration?.type}`);
        console.log(`    X-Column: ${responseData.configuration?.xColumn}`);
        console.log(`    Y-Columns: ${responseData.configuration?.yColumns?.join(', ')}`);
        console.log(`    Reasoning: ${responseData.configuration?.reasoning}`);
        
        console.log(`  🎯 Matching APIs: ${responseData.matchingApis?.length || 0}`);
        responseData.matchingApis?.slice(0, 2).forEach((api: any, index: number) => {
          console.log(`    ${index + 1}. ${api.chartTitle || api.name} (${api.page})`);
        });

        // Check metadata if available
        if (responseData.ragMetadata) {
          console.log(`  🔧 RAG Metadata:`);
          console.log(`    Search Time: ${responseData.ragMetadata.searchExecutionTime}ms`);
          console.log(`    Total Results: ${responseData.ragMetadata.totalResults}`);
          console.log(`    Confidence: ${responseData.ragMetadata.confidence}`);
          console.log(`    Fallback Used: ${responseData.ragMetadata.fallbackUsed}`);
        }
        
        results.push({
          query: test.query,
          status: 'success',
          chartType: responseData.configuration?.type,
          apiCount: responseData.matchingApis?.length || 0,
          reasoning: responseData.configuration?.reasoning,
          metadata: responseData.ragMetadata
        });
      } else {
        console.log(`  ❌ Failed with status ${response.status}`);
        console.log(`  Error: ${responseData.error}`);
        
        results.push({
          query: test.query,
          status: 'failed',
          error: responseData.error
        });
      }
      
    } catch (error) {
      console.log(`  ❌ Exception occurred: ${error}`);
      
      results.push({
        query: test.query,
        status: 'exception',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Summary
  console.log('\n📊 RAG System Test Summary:');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status !== 'success');
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n🎯 Successful Tests:');
    successful.forEach((result, index) => {
      console.log(`  ${index + 1}. "${result.query}"`);
      console.log(`     Chart: ${result.chartType}, APIs: ${result.apiCount}`);
      if (result.metadata?.fallbackUsed) {
        console.log(`     ⚠️  Used fallback pattern matching`);
      }
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    failed.forEach((result, index) => {
      console.log(`  ${index + 1}. "${result.query}"`);
      console.log(`     Status: ${result.status}`);
      console.log(`     Error: ${result.error}`);
    });
  }

  // Performance analysis
  const avgSearchTime = successful
    .filter(r => r.metadata?.searchExecutionTime)
    .reduce((sum, r) => sum + (r.metadata?.searchExecutionTime || 0), 0) / 
    successful.filter(r => r.metadata?.searchExecutionTime).length;
    
  if (avgSearchTime) {
    console.log(`\n⚡ Performance:`);
    console.log(`   Average Search Time: ${avgSearchTime.toFixed(2)}ms`);
  }

  // Chart type distribution
  const chartTypes = successful.reduce((acc, r) => {
    acc[r.chartType || 'unknown'] = (acc[r.chartType || 'unknown'] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  if (Object.keys(chartTypes).length > 0) {
    console.log(`\n📈 Chart Type Distribution:`);
    Object.entries(chartTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
  }

  const overallSuccessRate = (successful.length / results.length) * 100;
  console.log(`\n🎯 Overall Success Rate: ${overallSuccessRate.toFixed(1)}%`);
  
  if (overallSuccessRate >= 80) {
    console.log('🎉 RAG system is performing excellently!');
  } else if (overallSuccessRate >= 60) {
    console.log('👍 RAG system is performing well with room for improvement.');
  } else {
    console.log('⚠️  RAG system needs attention and optimization.');
  }

  return {
    totalTests: results.length,
    successful: successful.length,
    failed: failed.length,
    successRate: overallSuccessRate,
    results
  };
}

// Test individual components
async function testIndividualComponents() {
  console.log('\n🔧 Testing Individual RAG Components...');
  
  try {
    console.log('\n1. Testing API Search System:');
    const { searchApiCatalog, getSearchStats } = await import('../lib/api-search');
    
    const stats = await getSearchStats();
    console.log(`   APIs Available: ${stats.totalApis}`);
    console.log(`   Store Type: ${stats.storeType}`);
    console.log(`   Initialized: ${stats.initialized}`);
    
    const searchTest = await searchApiCatalog({ query: 'DEX volume', top_k: 3 });
    console.log(`   Search Test: Found ${searchTest.total_results} results in ${searchTest.execution_time_ms}ms`);
    
    console.log('\n2. Testing Chart Spec Generation:');
    const { createChartSpecFromSearchResults } = await import('../lib/chart-spec');
    
    if (searchTest.apis.length > 0) {
      const chartSpec = createChartSpecFromSearchResults(searchTest.apis, 'DEX volume over time');
      console.log(`   Chart Spec: ${chartSpec.title}`);
      console.log(`   Chart Type: ${chartSpec.chart_type}`);
      console.log(`   Confidence: ${chartSpec.metadata?.confidence_score}`);
    }
    
    console.log('\n3. Testing OpenAI Function Definitions:');
    const { openAiFunctions } = await import('../lib/openai-functions');
    console.log(`   Available Functions: ${openAiFunctions.length}`);
    openAiFunctions.forEach(func => {
      console.log(`   - ${func.name}: ${func.description.slice(0, 50)}...`);
    });
    
    console.log('\n✅ All individual components tested successfully!');
    
  } catch (error) {
    console.error('\n❌ Component testing failed:', error);
  }
}

async function main() {
  console.log('🚀 Starting Comprehensive RAG System Test...');
  console.log('='.repeat(60));
  
  // Test individual components first
  await testIndividualComponents();
  
  // Test complete system
  const systemResults = await testCompleteRAGSystem();
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 RAG System Testing Complete!');
  
  if (systemResults.successRate >= 80) {
    console.log('🎉 The RAG system is ready for production use!');
    process.exit(0);
  } else {
    console.log('⚠️  The RAG system needs optimization before production use.');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
} 