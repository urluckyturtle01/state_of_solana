#!/usr/bin/env tsx

import { testEnhancedApiSearch, getSearchStats, searchApiCatalog } from '../lib/api-search';

async function main() {
  console.log('🧪 Testing API Search System...');
  
  try {
    // Get system stats
    const stats = await getSearchStats();
    console.log('\n📊 System Statistics:');
    console.log(`  Total APIs: ${stats.totalApis}`);
    console.log(`  Store Type: ${stats.storeType}`);
    console.log(`  Initialized: ${stats.initialized}`);
    console.log(`  Domains: ${Object.keys(stats.domains).length}`);
    
    // Test individual search
    console.log('\n🔍 Testing Individual Search:');
    const testQuery = 'DEX trading volume daily';
    const result = await searchApiCatalog({ query: testQuery, top_k: 5 });
    
    console.log(`Query: "${testQuery}"`);
    console.log(`Results: ${result.total_results}`);
    console.log(`Execution Time: ${result.execution_time_ms}ms`);
    
    result.search_results.forEach((searchResult, index) => {
      console.log(`\n  ${index + 1}. ${searchResult.metadata.title}`);
      console.log(`     Domain: ${searchResult.metadata.domain}`);
      console.log(`     Score: ${searchResult.score.toFixed(3)}`);
      console.log(`     URL: ${searchResult.metadata.url}`);
      console.log(`     Columns: ${Object.keys(searchResult.metadata.response_schema).join(', ')}`);
    });
    
    // Run comprehensive test
    await testEnhancedApiSearch();
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
} 