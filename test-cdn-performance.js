#!/usr/bin/env node

const https = require('https');
const { performance } = require('perf_hooks');

// Test URLs - replace with your actual domain after CDN setup
const TEST_URLS = {
  'Chart Data (Large)': '/temp/chart-data/dashboard.json.gz',
  'Chart Data (Medium)': '/temp/chart-data/volume.json.gz', 
  'API Endpoint': '/api/temp-data-compressed/dashboard',
  'Static Asset': '/_next/static/css/app/layout.css'
};

class CDNTester {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  async testUrl(path, name) {
    return new Promise((resolve) => {
      const start = performance.now();
      const url = `${this.baseUrl}${path}`;
      
      const req = https.request(url, { method: 'HEAD' }, (res) => {
        const end = performance.now();
        const responseTime = Math.round(end - start);
        
        resolve({
          name,
          url: path,
          status: res.statusCode,
          responseTime: `${responseTime}ms`,
          cacheStatus: res.headers['cf-cache-status'] || 'NO-CDN',
          cacheControl: res.headers['cache-control'] || 'none',
          contentEncoding: res.headers['content-encoding'] || 'none',
          server: res.headers['server'] || 'unknown',
          cfRay: res.headers['cf-ray'] ? 'Yes' : 'No',
          size: res.headers['content-length'] ? `${Math.round(res.headers['content-length'] / 1024)}KB` : 'unknown'
        });
      });
      
      req.on('error', () => {
        resolve({
          name,
          url: path,
          status: 'ERROR',
          responseTime: 'timeout',
          cacheStatus: 'ERROR',
          cacheControl: 'ERROR',
          contentEncoding: 'ERROR',
          server: 'ERROR',
          cfRay: 'No',
          size: 'unknown'
        });
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
      });
      
      req.end();
    });
  }

  async runTests() {
    console.log('\n🚀 CDN Performance Test Starting...\n');
    console.log(`Testing: ${this.baseUrl}\n`);
    
    const results = [];
    
    for (const [name, path] of Object.entries(TEST_URLS)) {
      console.log(`⏱️  Testing ${name}...`);
      const result = await this.testUrl(path, name);
      results.push(result);
      
      // Brief delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.displayResults(results);
    this.analyzeCDN(results);
  }

  displayResults(results) {
    console.log('\n📊 Test Results:\n');
    console.log('┌─────────────────────┬──────────┬─────────────┬────────────┬─────────────┬──────────┐');
    console.log('│ Resource            │ Time     │ Cache Status│ CDN Active │ Compression │ Size     │');
    console.log('├─────────────────────┼──────────┼─────────────┼────────────┼─────────────┼──────────┤');
    
    results.forEach(result => {
      const name = result.name.padEnd(19);
      const time = result.responseTime.padEnd(8);
      const cache = result.cacheStatus.padEnd(11);
      const cdn = result.cfRay.padEnd(10);
      const compression = result.contentEncoding.padEnd(11);
      const size = result.size.padEnd(8);
      
      console.log(`│ ${name} │ ${time} │ ${cache} │ ${cdn} │ ${compression} │ ${size} │`);
    });
    
    console.log('└─────────────────────┴──────────┴─────────────┴────────────┴─────────────┴──────────┘');
  }

  analyzeCDN(results) {
    console.log('\n🔍 CDN Analysis:\n');
    
    const cdnActive = results.some(r => r.cfRay === 'Yes');
    const allCached = results.filter(r => r.cacheStatus === 'HIT').length;
    const avgResponseTime = results
      .filter(r => r.responseTime !== 'timeout' && r.responseTime !== 'ERROR')
      .reduce((sum, r) => sum + parseInt(r.responseTime), 0) / results.length;

    console.log(`📡 CDN Status: ${cdnActive ? '✅ ACTIVE (Cloudflare detected)' : '❌ NOT DETECTED'}`);
    console.log(`🎯 Cache Hit Rate: ${allCached}/${results.length} (${Math.round(allCached/results.length*100)}%)`);
    console.log(`⚡ Average Response Time: ${Math.round(avgResponseTime)}ms`);
    
    if (!cdnActive) {
      console.log('\n⚠️  CDN not detected. Make sure:');
      console.log('   1. Domain is proxied through Cloudflare (orange cloud)');
      console.log('   2. DNS is properly configured');
      console.log('   3. SSL/TLS is set to "Flexible" or "Full"');
    }
    
    if (allCached === 0) {
      console.log('\n⚠️  No cache hits detected. This could mean:');
      console.log('   1. First-time access (cache is cold)');
      console.log('   2. Cache rules not properly configured');
      console.log('   3. TTL values too low');
    }
    
    if (avgResponseTime > 1000) {
      console.log('\n⚠️  Response times are high. Consider:');
      console.log('   1. Optimizing cache TTL values');
      console.log('   2. Enabling more compression');
      console.log('   3. Using smaller data chunks');
    }
    
    console.log('\n💡 Performance Tips:');
    console.log('   • Run this test multiple times - first run fills cache');
    console.log('   • Test from different geographic locations');
    console.log('   • Monitor Cloudflare analytics for detailed insights');
    console.log('\n🎉 CDN Performance Test Complete!\n');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node test-cdn-performance.js <url>');
    console.log('Example: node test-cdn-performance.js https://your-site.pages.dev');
    console.log('Example: node test-cdn-performance.js https://yourdomain.com');
    process.exit(1);
  }
  
  const baseUrl = args[0];
  const tester = new CDNTester(baseUrl);
  
  try {
    await tester.runTests();
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = CDNTester; 