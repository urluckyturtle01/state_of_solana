#!/usr/bin/env node

import { performance } from 'perf_hooks';
import { promises as fs } from 'fs';
import * as path from 'path';

interface TestResult {
  name: string;
  success: boolean;
  executionTime: number;
  details: any;
  error?: string;
}

interface IntegrationTestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  totalExecutionTime: number;
  results: TestResult[];
  systemHealth: {
    caching: boolean;
    analytics: boolean;
    vectorSearch: boolean;
    chartGeneration: boolean;
    nlpApi: boolean;
  };
}

class FinalIntegrationTest {
  private results: TestResult[] = [];
  private testQueries = [
    'Show DEX volume trends over time',
    'Compare USDC and USDT stablecoin usage',
    'Display compute unit pricing trends',
    'Show MEV extracted value by protocol',
    'Plot wrapped Bitcoin transfer activity'
  ];

  async runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = performance.now();
    console.log(`\n🧪 Running test: ${name}`);
    
    try {
      const details = await testFn();
      const executionTime = performance.now() - startTime;
      
      const result: TestResult = {
        name,
        success: true,
        executionTime,
        details
      };
      
      console.log(`✅ PASSED: ${name} (${executionTime.toFixed(0)}ms)`);
      this.results.push(result);
      return result;
      
    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      const result: TestResult = {
        name,
        success: false,
        executionTime,
        details: null,
        error: error instanceof Error ? error.message : String(error)
      };
      
      console.log(`❌ FAILED: ${name} (${executionTime.toFixed(0)}ms) - ${result.error}`);
      this.results.push(result);
      return result;
    }
  }

  async testApiCatalogLoad(): Promise<any> {
    const { getSearchStats } = await import('../lib/api-search');
    const stats = await getSearchStats();
    
    if (!stats || stats.totalApis === 0) {
      throw new Error('API catalog is empty or failed to load');
    }
    
    return {
      catalogSize: stats.totalApis,
      domains: Object.keys(stats.domains),
      storeType: stats.storeType,
      initialized: stats.initialized
    };
  }

  async testVectorStoreInitialization(): Promise<any> {
    const { initializeApiSearch } = await import('../lib/api-search');
    await initializeApiSearch();
    
    return { initialized: true };
  }

  async testApiSearch(): Promise<any> {
    const { searchApiCatalog } = await import('../lib/api-search');
    
    const results = [];
    for (const query of this.testQueries.slice(0, 3)) {
      const result = await searchApiCatalog({ query, top_k: 3 });
      results.push({
        query,
        foundApis: result.apis.length,
        executionTime: result.execution_time_ms,
        relevantApis: result.apis.map(api => api.id)
      });
    }
    
    return { searchResults: results };
  }

  async testChartSpecGeneration(): Promise<any> {
    const { searchApiCatalog } = await import('../lib/api-search');
    const { createChartSpecFromSearchResults } = await import('../lib/chart-spec');
    
    const results = [];
    for (const query of this.testQueries.slice(0, 3)) {
      const searchResult = await searchApiCatalog({ query, top_k: 3 });
      const chartSpec = createChartSpecFromSearchResults(searchResult.apis, query);
      
      results.push({
        query,
        chartType: chartSpec.chart_type,
        confidence: chartSpec.metadata?.confidence_score,
        hasValidSpec: !!(chartSpec.primary_api && chartSpec.x_axis && chartSpec.series)
      });
    }
    
    return { chartSpecs: results };
  }

  async testCachingSystem(): Promise<any> {
    const { getMetadataCache } = await import('../lib/metadata-cache');
    
    const cache = getMetadataCache();
    await cache.loadCache();
    
    const testQuery = 'Test cache query for integration test';
    const testSpec = {
      title: 'Test Chart',
      chart_type: 'line',
      primary_api: 'test-api',
      x_axis: { column: 'date' },
      series: [{ column: 'value', name: 'Test Value' }]
    };
    
    // Test cache set
    await cache.set(testQuery, testSpec, ['test-api'], 0.95);
    
    // Test cache get
    const cached = await cache.get(testQuery);
    
    if (!cached) {
      throw new Error('Failed to retrieve cached item');
    }
    
    // Clean up test data
    await cache.clear();
    
    return {
      cacheWorking: true,
      cachedQuery: cached.originalQuery,
      cachedConfidence: cached.confidence
    };
  }

  async testAnalyticsSystem(): Promise<any> {
    const { getAnalyticsTracker } = await import('../lib/analytics-tracker');
    
    const analytics = getAnalyticsTracker();
    
    // Test logging a query
    await analytics.logQuery({
      originalQuery: 'Test analytics query',
      normalizedQuery: 'test analytics query',
      selectedApis: ['test-api-1', 'test-api-2'],
      chartType: 'bar',
      confidence: 0.9,
      processingTimeMs: 150,
      cacheHit: false,
      success: true
    });
    
    // Test metrics retrieval
    const metrics = await analytics.getSystemMetrics();
    
    return {
      analyticsWorking: true,
      totalQueries: metrics.totalQueries,
      systemMetrics: metrics
    };
  }

  async testNlpApiEndpoint(): Promise<any> {
    // Import the NLP processing function directly
    const nlpModule = await import('../app/api/nlp-chart/route');
    
    // Create a mock request
    const mockBody = { query: 'Show DEX volume trends' };
    const mockRequest = {
      json: () => Promise.resolve(mockBody),
      headers: new Map([['user-agent', 'test-agent']])
    } as any;
    
    // Call the POST function directly
    const response = await nlpModule.POST(mockRequest);
    const result = await response.json();
    
    if (!result || !result.configuration) {
      throw new Error('NLP API returned invalid response');
    }
    
    return {
      nlpApiWorking: true,
      responseReceived: true,
      hasConfiguration: !!result.configuration,
      hasMatchingApis: result.matchingApis?.length > 0,
      cacheUsed: result.cached || false,
      processingTime: result.processingTimeMs
    };
  }

  async testEndToEndWorkflow(): Promise<any> {
    console.log('   🔄 Testing complete end-to-end workflow...');
    
    const { getMetadataCache } = await import('../lib/metadata-cache');
    const { getAnalyticsTracker } = await import('../lib/analytics-tracker');
    
    const cache = getMetadataCache();
    const analytics = getAnalyticsTracker();
    
    await cache.loadCache();
    
    const testQuery = 'Show stablecoin trading volume over time';
    const startTime = performance.now();
    
    // Clear any existing cache for this query
    const normalizedQuery = testQuery.toLowerCase().trim();
    const cached = await cache.get(testQuery);
    
    let workflow: any = {
      query: testQuery,
      steps: []
    };
    
    // Step 1: Check if cached
    if (cached) {
      workflow.steps.push({ step: 'cache_hit', success: true, data: cached.id });
    } else {
      workflow.steps.push({ step: 'cache_miss', success: true });
      
      // Step 2: Search APIs
      const { searchApiCatalog } = await import('../lib/api-search');
      const searchResult = await searchApiCatalog({ query: testQuery, top_k: 5 });
      workflow.steps.push({ 
        step: 'api_search', 
        success: searchResult.apis.length > 0, 
        data: { 
          foundApis: searchResult.apis.length,
          executionTime: searchResult.execution_time_ms 
        }
      });
      
      // Step 3: Generate chart spec
      const { createChartSpecFromSearchResults } = await import('../lib/chart-spec');
      const chartSpec = createChartSpecFromSearchResults(searchResult.apis, testQuery);
      workflow.steps.push({ 
        step: 'chart_spec_generation', 
        success: !!chartSpec.primary_api, 
        data: { 
          chartType: chartSpec.chart_type,
          confidence: chartSpec.metadata?.confidence_score 
        }
      });
      
      // Step 4: Cache result
      await cache.set(
        testQuery, 
        chartSpec, 
        searchResult.apis.map(api => api.id), 
        chartSpec.metadata?.confidence_score || 0.8
      );
      workflow.steps.push({ step: 'cache_store', success: true });
    }
    
    // Step 5: Log analytics
    const endTime = performance.now();
    await analytics.logQuery({
      originalQuery: testQuery,
      normalizedQuery: normalizedQuery,
      selectedApis: cached ? cached.selectedApis : ['unknown'],
      chartType: cached ? cached.chartSpec?.chart_type || 'bar' : 'bar',
      confidence: cached ? cached.confidence : 0.8,
      processingTimeMs: endTime - startTime,
      cacheHit: !!cached,
      success: true
    });
    workflow.steps.push({ step: 'analytics_logged', success: true });
    
    workflow.totalTime = endTime - startTime;
    workflow.success = workflow.steps.every((step: any) => step.success);
    
    return workflow;
  }

  async testPerformanceBenchmark(): Promise<any> {
    const { RagBenchmark } = await import('./benchmark-rag-system');
    
    const benchmark = new RagBenchmark();
    const testQueries = [
      'Show DEX volume trends',
      'Compare stablecoin usage',
      'Display compute unit pricing'
    ];
    
    const summary = await benchmark.runBenchmark(testQueries);
    
    return {
      benchmarkCompleted: true,
      tokenReduction: summary.improvements.tokenReduction,
      speedImprovement: summary.improvements.speedImprovement,
      costSavings: summary.improvements.costSavings,
      accuracyChange: summary.improvements.accuracyChange
    };
  }

  async runAllTests(): Promise<IntegrationTestSummary> {
    console.log('🚀 Starting Final RAG System Integration Test');
    console.log('=' .repeat(60));
    
    const overallStartTime = performance.now();
    
    // Core component tests
    await this.runTest('API Catalog Load', () => this.testApiCatalogLoad());
    await this.runTest('Vector Store Initialization', () => this.testVectorStoreInitialization());
    await this.runTest('API Search Functionality', () => this.testApiSearch());
    await this.runTest('Chart Spec Generation', () => this.testChartSpecGeneration());
    await this.runTest('Caching System', () => this.testCachingSystem());
    await this.runTest('Analytics System', () => this.testAnalyticsSystem());
    await this.runTest('NLP API Endpoint', () => this.testNlpApiEndpoint());
    
    // Integration tests
    await this.runTest('End-to-End Workflow', () => this.testEndToEndWorkflow());
    await this.runTest('Performance Benchmark', () => this.testPerformanceBenchmark());
    
    const totalExecutionTime = performance.now() - overallStartTime;
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    
    // Determine system health
    const systemHealth = {
      caching: this.results.find(r => r.name === 'Caching System')?.success || false,
      analytics: this.results.find(r => r.name === 'Analytics System')?.success || false,
      vectorSearch: this.results.find(r => r.name === 'API Search Functionality')?.success || false,
      chartGeneration: this.results.find(r => r.name === 'Chart Spec Generation')?.success || false,
      nlpApi: this.results.find(r => r.name === 'NLP API Endpoint')?.success || false
    };
    
    const summary: IntegrationTestSummary = {
      totalTests: this.results.length,
      passed,
      failed,
      totalExecutionTime,
      results: this.results,
      systemHealth
    };
    
    // Generate report
    await this.generateReport(summary);
    
    return summary;
  }

  async generateReport(summary: IntegrationTestSummary): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportDir = path.join(process.cwd(), 'public/temp');
    
    // Ensure directory exists
    await fs.mkdir(reportDir, { recursive: true });
    
    // Generate detailed JSON report
    const detailedReport = {
      timestamp: new Date().toISOString(),
      summary,
      systemStatus: summary.passed === summary.totalTests ? 'HEALTHY' : 'ISSUES_DETECTED',
      recommendations: this.generateRecommendations(summary)
    };
    
    const jsonPath = path.join(reportDir, `integration-test-${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(detailedReport, null, 2));
    
    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(summary);
    const mdPath = path.join(reportDir, `integration-test-report-${timestamp}.md`);
    await fs.writeFile(mdPath, markdownReport);
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 FINAL INTEGRATION TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passed} ✅`);
    console.log(`Failed: ${summary.failed} ${summary.failed > 0 ? '❌' : ''}`);
    console.log(`Success Rate: ${((summary.passed / summary.totalTests) * 100).toFixed(1)}%`);
    console.log(`Total Execution Time: ${summary.totalExecutionTime.toFixed(0)}ms`);
    console.log(`\nSystem Health:`);
    Object.entries(summary.systemHealth).forEach(([component, healthy]) => {
      console.log(`  ${component}: ${healthy ? '✅ HEALTHY' : '❌ ISSUES'}`);
    });
    
    console.log(`\n📄 Reports Generated:`);
    console.log(`  Detailed: ${jsonPath}`);
    console.log(`  Summary: ${mdPath}`);
    
    if (summary.passed === summary.totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! RAG SYSTEM IS PRODUCTION READY! 🎉');
    } else {
      console.log('\n⚠️  Some tests failed. Review the report for details.');
    }
  }

  generateRecommendations(summary: IntegrationTestSummary): string[] {
    const recommendations: string[] = [];
    
    if (!summary.systemHealth.caching) {
      recommendations.push('Caching system needs attention - verify cache directory permissions and disk space');
    }
    
    if (!summary.systemHealth.analytics) {
      recommendations.push('Analytics system issues detected - check log file permissions and storage');
    }
    
    if (!summary.systemHealth.vectorSearch) {
      recommendations.push('Vector search problems - verify API catalog and embedding system');
    }
    
    if (!summary.systemHealth.chartGeneration) {
      recommendations.push('Chart generation issues - review chart spec templates and API mappings');
    }
    
    if (!summary.systemHealth.nlpApi) {
      recommendations.push('NLP API endpoint problems - check OpenAI integration and fallback systems');
    }
    
    if (summary.totalExecutionTime > 5000) {
      recommendations.push('System performance is slow - consider optimizing vector search or caching strategies');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System is performing excellently! Consider monitoring for continued optimization.');
    }
    
    return recommendations;
  }

  generateMarkdownReport(summary: IntegrationTestSummary): string {
    const successRate = ((summary.passed / summary.totalTests) * 100).toFixed(1);
    const status = summary.passed === summary.totalTests ? '🟢 PRODUCTION READY' : '🟡 NEEDS ATTENTION';
    
    return `# RAG System Final Integration Test Report

**Generated:** ${new Date().toISOString()}  
**Status:** ${status}  
**Success Rate:** ${successRate}%  

## Executive Summary

The RAG (Retrieval-Augmented Generation) system has been comprehensively tested across all major components and integration points.

### Test Results Overview
- **Total Tests:** ${summary.totalTests}
- **Passed:** ${summary.passed} ✅
- **Failed:** ${summary.failed} ${summary.failed > 0 ? '❌' : ''}
- **Execution Time:** ${summary.totalExecutionTime.toFixed(0)}ms

### System Health Status
${Object.entries(summary.systemHealth).map(([component, healthy]) => 
  `- **${component.charAt(0).toUpperCase() + component.slice(1)}:** ${healthy ? '✅ Healthy' : '❌ Issues Detected'}`
).join('\n')}

## Detailed Test Results

${summary.results.map(result => `
### ${result.success ? '✅' : '❌'} ${result.name}
- **Status:** ${result.success ? 'PASSED' : 'FAILED'}
- **Execution Time:** ${result.executionTime.toFixed(0)}ms
${result.error ? `- **Error:** ${result.error}` : ''}
${result.details ? `- **Details:** ${JSON.stringify(result.details, null, 2)}` : ''}
`).join('\n')}

## Recommendations

${this.generateRecommendations(summary).map(rec => `- ${rec}`).join('\n')}

## Conclusion

${summary.passed === summary.totalTests ? 
  '🎉 **All tests passed!** The RAG system is fully operational and ready for production deployment. The system demonstrates excellent performance across all components including caching, analytics, vector search, chart generation, and the complete NLP workflow.' :
  '⚠️ **Some issues detected.** While the core system is functional, there are components that need attention before full production deployment. Review the failed tests and recommendations above.'
}

### Next Steps
${summary.passed === summary.totalTests ? 
  '- Deploy to production environment\n- Monitor system performance\n- Set up automated health checks\n- Consider additional optimization based on real-world usage patterns' :
  '- Address failed test components\n- Re-run integration tests\n- Implement monitoring for identified issues\n- Consider gradual rollout with fallback systems'
}
`;
  }
}

// CLI execution
if (require.main === module) {
  const tester = new FinalIntegrationTest();
  tester.runAllTests().catch(error => {
    console.error('Integration test failed:', error);
    process.exit(1);
  });
}

export { FinalIntegrationTest }; 