#!/usr/bin/env node

// Test script to verify chart data fetching works correctly
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing chart data fetching...\n');

try {
  // Check if temp directory structure exists
  const tempDir = path.join(__dirname, '../public/temp');
  const chartDataDir = path.join(tempDir, 'chart-data');
  const configDir = path.join(tempDir, 'chart-configs');
  
  console.log('📁 Checking directory structure...');
  
  if (!fs.existsSync(tempDir)) {
    throw new Error('Temp directory not found: ' + tempDir);
  }
  
  if (!fs.existsSync(configDir)) {
    throw new Error('Chart configs directory not found: ' + configDir);
  }
  
  if (!fs.existsSync(chartDataDir)) {
    console.log('  📂 Creating chart-data directory...');
    fs.mkdirSync(chartDataDir, { recursive: true });
  }
  
  console.log('  ✅ Directory structure OK\n');
  
  // Count config files
  const configFiles = fs.readdirSync(configDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  console.log(`📋 Found ${configFiles.length} page config files\n`);
  
  // Test a single page first (to avoid rate limiting)
  if (configFiles.length > 0) {
    const testConfigFile = configFiles[0];
    console.log(`🧪 Testing with: ${testConfigFile}`);
    
    // Read the config
    const configPath = path.join(configDir, testConfigFile);
    const pageConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    if (pageConfig.charts && pageConfig.charts.length > 0) {
      console.log(`  📊 Found ${pageConfig.charts.length} charts in ${testConfigFile}`);
      console.log(`  🎯 First chart: ${pageConfig.charts[0].title}\n`);
    }
  }
  
  // Run the actual fetch script
  console.log('🚀 Running fetch script...');
  const startTime = Date.now();
  
  try {
    execSync('node fetch-chart-data.js', {
      cwd: tempDir,
      stdio: 'inherit'
    });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Script completed successfully in ${duration}s`);
    
    // Check results
    if (fs.existsSync(path.join(chartDataDir, '_summary.json'))) {
      const summary = JSON.parse(fs.readFileSync(path.join(chartDataDir, '_summary.json'), 'utf-8'));
      console.log('\n📊 Summary:');
      console.log(`  Total pages: ${summary.totalPages}`);
      console.log(`  Total charts: ${summary.totalCharts}`);
      console.log(`  Success rate: ${summary.successRate}`);
      console.log(`  Last updated: ${summary.fetchedAt}`);
    }
    
  } catch (scriptError) {
    console.error('\n❌ Script execution failed:');
    console.error(scriptError.message);
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 Test completed successfully! GitHub Actions should work fine.'); 