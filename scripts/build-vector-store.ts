#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { ApiCatalog } from '../types/api-catalog';
import { ApiVectorStore, VectorStoreConfig } from '../lib/vector-store';

async function main() {
  console.log('🚀 Building Vector Store for API Catalog...');
  
  // Check for OpenAI API key
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  // Read API catalog
  const catalogPath = path.join(process.cwd(), 'data', 'api-catalog.json');
  if (!fs.existsSync(catalogPath)) {
    console.error('❌ API catalog not found. Run build-api-catalog.ts first');
    process.exit(1);
  }

  const catalog: ApiCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  console.log(`📊 Found ${catalog.entries.length} APIs in catalog`);

  // Configure vector store
  const config: VectorStoreConfig = {
    openaiApiKey,
    embeddingModel: 'text-embedding-3-small', // Cost-effective embedding model
    maxResults: 20
  };

  // Create and initialize vector store
  const store = new ApiVectorStore(config);
  
  try {
    await store.initialize(catalog.entries);
    
    // Save vector store to file for persistence
    const vectorStorePath = path.join(process.cwd(), 'data', 'vector-store.json');
    await store.saveToFile(vectorStorePath);
    
    // Display statistics
    const stats = store.getStats();
    console.log('\n📈 Vector Store Statistics:');
    console.log(`  Total APIs: ${stats.totalApis}`);
    console.log(`  Domains: ${Object.keys(stats.domains).length}`);
    console.log(`  Initialized: ${stats.initialized}`);
    
    console.log('\n📈 Domain Distribution:');
    Object.entries(stats.domains).forEach(([domain, count]) => {
      console.log(`  ${domain}: ${count} APIs`);
    });

    // Test search functionality
    console.log('\n🔍 Testing Search Functionality...');
    const testQueries = [
      'DEX trading volume over time',
      'stablecoin supply and liquidity',
      'compute units and transaction fees',
      'MEV extraction and arbitrage',
      'wrapped bitcoin holders'
    ];

    for (const query of testQueries) {
      console.log(`\n🔍 Query: "${query}"`);
      const results = await store.search(query, 3);
      results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.metadata.title} (${result.metadata.domain}) - Score: ${result.score.toFixed(3)}`);
      });
    }

    console.log('\n✅ Vector store built and tested successfully!');
    console.log(`📂 Saved to: ${vectorStorePath}`);
    
  } catch (error) {
    console.error('❌ Error building vector store:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as buildVectorStore }; 