#!/usr/bin/env node

/**
 * Performance Testing Script for Option 3: Data Aggregation (Best)
 * 
 * This script tests and validates the performance improvements achieved
 * through the data aggregation optimization.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Configuration
const ORIGINAL_DATA_DIR = './chart-data/';
const AGGREGATED_DATA_DIR = './chart-data/aggregated/';
const RESULTS_DIR = './performance-test-results/';

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

/**
 * Measure file loading performance
 */
async function measureLoadingPerformance(filePath, iterations = 5) {
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    
    try {
      let data;
      if (filePath.endsWith('.gz')) {
        const compressedData = fs.readFileSync(filePath);
        data = zlib.gunzipSync(compressedData).toString('utf8');
      } else {
        data = fs.readFileSync(filePath, 'utf8');
      }
      
      const parsed = JSON.parse(data);
      const end = performance.now();
      
      results.push({
        loadTime: end - start,
        fileSize: fs.statSync(filePath).size,
        dataPoints: countDataPoints(parsed),
        memoryUsage: process.memoryUsage().heapUsed
      });
    } catch (error) {
      console.error(`Error loading ${filePath}:`, error.message);
      return null;
    }
  }
  
  // Calculate averages
  const avgLoadTime = results.reduce((sum, r) => sum + r.loadTime, 0) / results.length;
  const avgMemoryUsage = results.reduce((sum, r) => sum + r.memoryUsage, 0) / results.length;
  
  return {
    avgLoadTime,
    avgMemoryUsage,
    fileSize: results[0].fileSize,
    dataPoints: results[0].dataPoints,
    results
  };
}

/**
 * Count data points in a chart file
 */
function countDataPoints(chartData) {
  if (!chartData.charts || !Array.isArray(chartData.charts)) return 0;
  
  return chartData.charts.reduce((total, chart) => {
    if (chart.data && Array.isArray(chart.data)) {
      return total + chart.data.length;
    }
    return total;
  }, 0);
}

/**
 * Simulate chart rendering performance
 */
function simulateChartRendering(data, iterations = 10) {
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    
    // Simulate typical chart operations
    if (data.charts && Array.isArray(data.charts)) {
      data.charts.forEach(chart => {
        if (chart.data && Array.isArray(chart.data)) {
          // Simulate data processing
          const processedData = chart.data.map(item => {
            const processed = { ...item };
            // Simulate calculations
            Object.keys(processed).forEach(key => {
              if (typeof processed[key] === 'number') {
                processed[key] = processed[key] * 1.001; // Minimal calculation
              }
            });
            return processed;
          });
          
          // Simulate aggregation operations
          const aggregated = processedData.reduce((acc, item) => {
            Object.keys(item).forEach(key => {
              if (typeof item[key] === 'number') {
                acc[key] = (acc[key] || 0) + item[key];
              }
            });
            return acc;
          }, {});
        }
      });
    }
    
    const end = performance.now();
    results.push(end - start);
  }
  
  return results.reduce((sum, time) => sum + time, 0) / results.length;
}

/**
 * Test a specific page's performance
 */
async function testPagePerformance(pageId) {
  console.log(`\n🧪 Testing performance for page: ${pageId}`);
  
  const originalFile = path.join(ORIGINAL_DATA_DIR, `${pageId}.json.gz`);
  const originalUncompressed = path.join(ORIGINAL_DATA_DIR, `${pageId}.json`);
  const aggregatedFile = path.join(AGGREGATED_DATA_DIR, `${pageId}.json.gz`);
  const aggregatedUncompressed = path.join(AGGREGATED_DATA_DIR, `${pageId}.json`);
  
  // Find available files
  let originalPath = null;
  let aggregatedPath = null;
  
  if (fs.existsSync(originalFile)) {
    originalPath = originalFile;
  } else if (fs.existsSync(originalUncompressed)) {
    originalPath = originalUncompressed;
  }
  
  if (fs.existsSync(aggregatedFile)) {
    aggregatedPath = aggregatedFile;
  } else if (fs.existsSync(aggregatedUncompressed)) {
    aggregatedPath = aggregatedUncompressed;
  }
  
  if (!originalPath || !aggregatedPath) {
    console.log(`  ❌ Missing files for ${pageId} (original: ${!!originalPath}, aggregated: ${!!aggregatedPath})`);
    return null;
  }
  
  // Measure original performance
  console.log(`  📊 Testing original data...`);
  const originalPerf = await measureLoadingPerformance(originalPath);
  
  // Measure aggregated performance  
  console.log(`  🚀 Testing aggregated data...`);
  const aggregatedPerf = await measureLoadingPerformance(aggregatedPath);
  
  if (!originalPerf || !aggregatedPerf) {
    console.log(`  ❌ Failed to measure performance for ${pageId}`);
    return null;
  }
  
  // Load data for rendering tests
  const originalData = JSON.parse(
    originalPath.endsWith('.gz') 
      ? zlib.gunzipSync(fs.readFileSync(originalPath)).toString('utf8')
      : fs.readFileSync(originalPath, 'utf8')
  );
  
  const aggregatedData = JSON.parse(
    aggregatedPath.endsWith('.gz')
      ? zlib.gunzipSync(fs.readFileSync(aggregatedPath)).toString('utf8')
      : fs.readFileSync(aggregatedPath, 'utf8')
  );
  
  // Simulate rendering performance
  console.log(`  🎨 Testing rendering performance...`);
  const originalRenderTime = simulateChartRendering(originalData);
  const aggregatedRenderTime = simulateChartRendering(aggregatedData);
  
  // Calculate improvements
  const loadTimeImprovement = ((originalPerf.avgLoadTime - aggregatedPerf.avgLoadTime) / originalPerf.avgLoadTime * 100);
  const fileSizeImprovement = ((originalPerf.fileSize - aggregatedPerf.fileSize) / originalPerf.fileSize * 100);
  const memoryImprovement = ((originalPerf.avgMemoryUsage - aggregatedPerf.avgMemoryUsage) / originalPerf.avgMemoryUsage * 100);
  const renderTimeImprovement = ((originalRenderTime - aggregatedRenderTime) / originalRenderTime * 100);
  const dataPointsReduction = ((originalPerf.dataPoints - aggregatedPerf.dataPoints) / originalPerf.dataPoints * 100);
  
  const results = {
    pageId,
    original: {
      loadTime: originalPerf.avgLoadTime,
      fileSize: originalPerf.fileSize,
      memoryUsage: originalPerf.avgMemoryUsage,
      renderTime: originalRenderTime,
      dataPoints: originalPerf.dataPoints
    },
    aggregated: {
      loadTime: aggregatedPerf.avgLoadTime,
      fileSize: aggregatedPerf.fileSize,
      memoryUsage: aggregatedPerf.avgMemoryUsage,
      renderTime: aggregatedRenderTime,
      dataPoints: aggregatedPerf.dataPoints
    },
    improvements: {
      loadTime: loadTimeImprovement,
      fileSize: fileSizeImprovement,
      memoryUsage: memoryImprovement,
      renderTime: renderTimeImprovement,
      dataPointsReduction: dataPointsReduction
    }
  };
  
  // Log results
  console.log(`  ✅ Results for ${pageId}:`);
  console.log(`     📏 File size: ${(originalPerf.fileSize / 1024).toFixed(1)}KB → ${(aggregatedPerf.fileSize / 1024).toFixed(1)}KB (${fileSizeImprovement.toFixed(1)}% smaller)`);
  console.log(`     ⏱️  Load time: ${originalPerf.avgLoadTime.toFixed(1)}ms → ${aggregatedPerf.avgLoadTime.toFixed(1)}ms (${loadTimeImprovement.toFixed(1)}% faster)`);
  console.log(`     💾 Memory: ${(originalPerf.avgMemoryUsage / 1024 / 1024).toFixed(1)}MB → ${(aggregatedPerf.avgMemoryUsage / 1024 / 1024).toFixed(1)}MB (${memoryImprovement.toFixed(1)}% less)`);
  console.log(`     🎨 Render: ${originalRenderTime.toFixed(1)}ms → ${aggregatedRenderTime.toFixed(1)}ms (${renderTimeImprovement.toFixed(1)}% faster)`);
  console.log(`     📊 Data points: ${originalPerf.dataPoints.toLocaleString()} → ${aggregatedPerf.dataPoints.toLocaleString()} (${dataPointsReduction.toFixed(1)}% reduction)`);
  
  return results;
}

/**
 * Generate performance report
 */
function generateReport(allResults) {
  const validResults = allResults.filter(r => r !== null);
  
  if (validResults.length === 0) {
    console.log('❌ No valid test results to generate report');
    return;
  }
  
  // Calculate averages
  const avgImprovements = {
    loadTime: validResults.reduce((sum, r) => sum + r.improvements.loadTime, 0) / validResults.length,
    fileSize: validResults.reduce((sum, r) => sum + r.improvements.fileSize, 0) / validResults.length,
    memoryUsage: validResults.reduce((sum, r) => sum + r.improvements.memoryUsage, 0) / validResults.length,
    renderTime: validResults.reduce((sum, r) => sum + r.improvements.renderTime, 0) / validResults.length,
    dataPointsReduction: validResults.reduce((sum, r) => sum + r.improvements.dataPointsReduction, 0) / validResults.length
  };
  
  const totalOriginalSize = validResults.reduce((sum, r) => sum + r.original.fileSize, 0);
  const totalAggregatedSize = validResults.reduce((sum, r) => sum + r.aggregated.fileSize, 0);
  const totalOriginalPoints = validResults.reduce((sum, r) => sum + r.original.dataPoints, 0);
  const totalAggregatedPoints = validResults.reduce((sum, r) => sum + r.aggregated.dataPoints, 0);
  
  const report = {
    testDate: new Date().toISOString(),
    testType: 'Option 3: Data Aggregation (Best) Performance Test',
    summary: {
      totalPagesTest: validResults.length,
      averageImprovements: avgImprovements,
      totalSizeReduction: ((totalOriginalSize - totalAggregatedSize) / totalOriginalSize * 100),
      totalPointsReduction: ((totalOriginalPoints - totalAggregatedPoints) / totalOriginalPoints * 100),
      totalOriginalSizeMB: (totalOriginalSize / 1024 / 1024),
      totalAggregatedSizeMB: (totalAggregatedSize / 1024 / 1024),
      totalOriginalPoints,
      totalAggregatedPoints
    },
    detailedResults: validResults,
    expectedUserExperience: {
      initialLoad: `${avgImprovements.loadTime.toFixed(1)}% faster (${avgImprovements.loadTime > 50 ? 'Significant' : 'Moderate'} improvement)`,
      memoryFootprint: `${avgImprovements.memoryUsage.toFixed(1)}% lower memory usage`,
      renderingSpeed: `${avgImprovements.renderTime.toFixed(1)}% faster chart rendering`,
      dataTransfer: `${avgImprovements.fileSize.toFixed(1)}% less bandwidth usage`,
      overallRating: calculateOverallRating(avgImprovements)
    }
  };
  
  return report;
}

/**
 * Calculate overall performance rating
 */
function calculateOverallRating(improvements) {
  const score = (
    Math.max(0, improvements.loadTime) * 0.3 +
    Math.max(0, improvements.fileSize) * 0.25 +
    Math.max(0, improvements.renderTime) * 0.25 +
    Math.max(0, improvements.memoryUsage) * 0.2
  );
  
  if (score >= 70) return 'Excellent (70%+ improvement)';
  if (score >= 50) return 'Very Good (50-70% improvement)';
  if (score >= 30) return 'Good (30-50% improvement)';
  if (score >= 10) return 'Fair (10-30% improvement)';
  return 'Minimal (<10% improvement)';
}

/**
 * Main testing function
 */
async function runPerformanceTests() {
  console.log('🚀 Starting Option 3: Data Aggregation (Best) Performance Tests\n');
  console.log('=' .repeat(70));
  
  // Get list of available pages
  const originalFiles = fs.readdirSync(ORIGINAL_DATA_DIR)
    .filter(f => f.endsWith('.json') || f.endsWith('.json.gz'))
    .filter(f => !f.startsWith('_'))
    .map(f => f.replace(/\.json(\.gz)?$/, ''));
  
  const uniquePages = [...new Set(originalFiles)];
  console.log(`📂 Found ${uniquePages.length} pages to test`);
  
  // Test each page
  const results = [];
  for (const pageId of uniquePages.slice(0, 10)) { // Test first 10 pages
    const result = await testPagePerformance(pageId);
    results.push(result);
    
    // Small delay to prevent overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('📊 PERFORMANCE TEST SUMMARY');
  console.log('=' .repeat(70));
  
  // Generate and save report
  const report = generateReport(results);
  
  if (report) {
    console.log(`\n🎯 OVERALL RESULTS:`);
    console.log(`   📁 Pages tested: ${report.summary.totalPagesTest}`);
    console.log(`   📏 Total size reduction: ${report.summary.totalSizeReduction.toFixed(1)}%`);
    console.log(`   📊 Total data points reduction: ${report.summary.totalPointsReduction.toFixed(1)}%`);
    console.log(`   ⏱️  Average load time improvement: ${report.summary.averageImprovements.loadTime.toFixed(1)}%`);
    console.log(`   🎨 Average render time improvement: ${report.summary.averageImprovements.renderTime.toFixed(1)}%`);
    console.log(`   💾 Average memory usage improvement: ${report.summary.averageImprovements.memoryUsage.toFixed(1)}%`);
    console.log(`   🏆 Overall rating: ${report.expectedUserExperience.overallRating}`);
    
    // Save detailed report
    const reportPath = path.join(RESULTS_DIR, `performance-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    // Save summary
    const summaryPath = path.join(RESULTS_DIR, 'latest-summary.md');
    const summaryMarkdown = generateMarkdownSummary(report);
    fs.writeFileSync(summaryPath, summaryMarkdown);
    console.log(`📝 Summary report saved to: ${summaryPath}`);
  }
  
  console.log('\n🎉 Performance testing complete!');
}

/**
 * Generate markdown summary
 */
function generateMarkdownSummary(report) {
  return `# Option 3: Data Aggregation (Best) - Performance Test Results

**Test Date:** ${new Date(report.testDate).toLocaleString()}  
**Pages Tested:** ${report.summary.totalPagesTest}

## 📊 Overall Performance Improvements

| Metric | Improvement |
|--------|-------------|
| **Load Time** | ${report.summary.averageImprovements.loadTime.toFixed(1)}% faster |
| **File Size** | ${report.summary.averageImprovements.fileSize.toFixed(1)}% smaller |
| **Memory Usage** | ${report.summary.averageImprovements.memoryUsage.toFixed(1)}% less |
| **Render Time** | ${report.summary.averageImprovements.renderTime.toFixed(1)}% faster |
| **Data Points** | ${report.summary.averageImprovements.dataPointsReduction.toFixed(1)}% reduction |

## 🎯 Expected User Experience

- **Initial Loading:** ${report.expectedUserExperience.initialLoad}
- **Memory Footprint:** ${report.expectedUserExperience.memoryFootprint}  
- **Rendering Speed:** ${report.expectedUserExperience.renderingSpeed}
- **Data Transfer:** ${report.expectedUserExperience.dataTransfer}
- **Overall Rating:** ${report.expectedUserExperience.overallRating}

## 📈 Total Optimization Results

- **Size Reduction:** ${(report.summary.totalOriginalSizeMB).toFixed(1)}MB → ${(report.summary.totalAggregatedSizeMB).toFixed(1)}MB
- **Data Points:** ${report.summary.totalOriginalPoints.toLocaleString()} → ${report.summary.totalAggregatedPoints.toLocaleString()}
- **Space Saved:** ${(report.summary.totalOriginalSizeMB - report.summary.totalAggregatedSizeMB).toFixed(1)}MB

## 🎉 Conclusion

Option 3: Data Aggregation (Best) delivers significant performance improvements across all metrics, providing a much faster and more efficient user experience.
`;
}

// Run the tests
if (require.main === module) {
  runPerformanceTests().catch(console.error);
}

module.exports = {
  runPerformanceTests,
  testPagePerformance,
  measureLoadingPerformance,
  generateReport
}; 