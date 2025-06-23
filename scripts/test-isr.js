#!/usr/bin/env node

/**
 * Test script to verify ISR (Incremental Static Regeneration) is working
 */

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const testEndpoints = [
  {
    path: '/api/chart-data/sample',
    expectedRevalidate: 300,
    description: 'Sample chart data'
  },
  {
    path: '/api/chart-data/time-series',
    expectedRevalidate: 300,
    description: 'Time series data'
  },
  {
    path: '/api/charts',
    expectedRevalidate: 30,
    description: 'Charts configuration'
  },
  {
    path: '/api/counters',
    expectedRevalidate: 30,
    description: 'Counters configuration'
  },
  {
    path: '/api/tables',
    expectedRevalidate: 30,
    description: 'Tables configuration'
  }
];

async function testISR() {
  console.log('🧪 Testing ISR Configuration');
  console.log('=====================================');
  console.log(`Base URL: ${baseUrl}`);
  console.log('');

  for (const endpoint of testEndpoints) {
    try {
      console.log(`📡 Testing: ${endpoint.path}`);
      console.log(`   Expected revalidate: ${endpoint.expectedRevalidate}s`);
      
      const startTime = Date.now();
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        headers: {
          'User-Agent': 'ISR-Test-Script'
        }
      });
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Response time: ${responseTime}ms`);
      
      // Check cache headers
      const cacheControl = response.headers.get('cache-control');
      const etag = response.headers.get('etag');
      const age = response.headers.get('age');
      
      if (cacheControl) {
        console.log(`   Cache-Control: ${cacheControl}`);
      }
      if (etag) {
        console.log(`   ETag: ${etag}`);
      }
      if (age) {
        console.log(`   Age: ${age}s`);
      }
      
      // Test if response is valid JSON
      try {
        const data = await response.json();
        const dataSize = JSON.stringify(data).length;
        console.log(`   Data size: ${dataSize} bytes`);
        console.log(`   ✅ Valid JSON response`);
      } catch (jsonError) {
        console.log(`   ❌ Invalid JSON response: ${jsonError.message}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }
}

async function testCacheRevalidation() {
  console.log('🔄 Testing Cache Revalidation');
  console.log('=====================================');
  
  const testPath = '/api/chart-data/sample';
  console.log(`Testing multiple requests to: ${testPath}`);
  
  const requests = [];
  for (let i = 0; i < 3; i++) {
    const startTime = Date.now();
    const response = await fetch(`${baseUrl}${testPath}`);
    const endTime = Date.now();
    
    requests.push({
      request: i + 1,
      responseTime: endTime - startTime,
      age: response.headers.get('age'),
      cacheControl: response.headers.get('cache-control'),
      etag: response.headers.get('etag')
    });
    
    // Wait 100ms between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('Request comparison:');
  requests.forEach(req => {
    console.log(`  Request ${req.request}: ${req.responseTime}ms (age: ${req.age || 'N/A'})`);
  });
  
  // Check if subsequent requests are faster (indicating caching)
  if (requests.length >= 2) {
    const avgFirst = requests[0].responseTime;
    const avgRest = requests.slice(1).reduce((sum, req) => sum + req.responseTime, 0) / (requests.length - 1);
    
    console.log(`\nAnalysis:`);
    console.log(`  First request: ${avgFirst}ms`);
    console.log(`  Avg subsequent: ${avgRest.toFixed(1)}ms`);
    
    if (avgRest < avgFirst * 0.8) {
      console.log(`  ✅ Subsequent requests are faster - caching likely working`);
    } else {
      console.log(`  ⚠️  No significant speed improvement - check ISR configuration`);
    }
  }
}

// Main execution
async function main() {
  console.log('ISR Configuration Test');
  console.log('======================\n');
  
  await testISR();
  console.log('\n');
  await testCacheRevalidation();
  
  console.log('\n📋 Summary:');
  console.log('- Check cache-control headers for proper max-age values');
  console.log('- Look for ETag headers indicating cacheable responses');
  console.log('- Monitor response times for cache hits vs misses');
  console.log('- Verify data integrity in all responses');
  console.log('\n🔗 To run this test:');
  console.log('1. Start your Next.js server: npm run dev');
  console.log('2. Run this script: node scripts/test-isr.js');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testISR, testCacheRevalidation }; 