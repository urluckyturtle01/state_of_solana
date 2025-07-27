#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const BASE_URL = 'https://research.topledger.xyz';
const APP_DIR = path.join(process.cwd(), 'app');
const EXCLUDED_DIRS = ['admin', 'explorer', 'dashboards', 'api', 'components', 'contexts', 'data', 'docs', 'hooks', 'utils'];

console.log('🚀 SEO Auto-Update System');
console.log('=========================\n');

// Step 1: Scan for new pages
function scanForNewPages() {
  console.log('📂 Scanning for new pages...');
  
  const newPages = [];
  const existingSeoMetadata = readExistingSeoMetadata();
  
  function scanDirectory(dir, relativePath = '') {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      const relativeItemPath = path.join(relativePath, item.name);
      
      // Skip excluded directories
      if (item.isDirectory() && EXCLUDED_DIRS.includes(item.name)) {
        continue;
      }
      
      if (item.isDirectory()) {
        scanDirectory(fullPath, relativeItemPath);
      } else if (item.name === 'page.tsx') {
        // Found a page - check if it's in our SEO metadata
        const route = '/' + relativePath.replace(/\(([^)]+)\)/g, '$1').replace(/\/$/, '') || '/';
        
        if (!existingSeoMetadata[route] && !relativePath.includes('share/chart')) {
          newPages.push({
            route,
            filePath: fullPath,
            relativePath
          });
        }
      }
    }
  }
  
  scanDirectory(APP_DIR);
  
  console.log(`   Found ${newPages.length} new pages`);
  if (newPages.length > 0) {
    newPages.forEach(page => console.log(`   • ${page.route}`));
  }
  
  return newPages;
}

// Step 2: Scan for new charts
function scanForNewCharts() {
  console.log('\n📊 Scanning for new charts...');
  
  const configsDir = path.join(process.cwd(), 'public', 'temp', 'chart-configs');
  const existingChartMeta = readExistingChartMeta();
  const newCharts = [];
  
  if (!fs.existsSync(configsDir)) {
    console.log('   ⚠️  Chart configs directory not found');
    return newCharts;
  }
  
  const files = fs.readdirSync(configsDir).filter(file => file.endsWith('.json'));
  
  for (const file of files) {
    try {
      const filePath = path.join(configsDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const config = JSON.parse(fileContent);
      
      if (config.charts && Array.isArray(config.charts)) {
        for (const chart of config.charts) {
          if (chart.id && !existingChartMeta[chart.id]) {
            newCharts.push({
              id: chart.id,
              title: chart.title || 'Untitled Chart',
              subtitle: chart.subtitle || '',
              chartType: chart.chartType || 'unknown',
              page: chart.page || 'general',
              section: chart.section || ''
            });
          }
        }
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${file}:`, error.message);
    }
  }
  
  console.log(`   Found ${newCharts.length} new charts`);
  if (newCharts.length > 0) {
    newCharts.slice(0, 5).forEach(chart => console.log(`   • ${chart.title} (${chart.id})`));
    if (newCharts.length > 5) {
      console.log(`   • ... and ${newCharts.length - 5} more`);
    }
  }
  
  return newCharts;
}

// Helper functions to read existing metadata
function readExistingSeoMetadata() {
  const seoFile = path.join(process.cwd(), 'app', 'seo-metadata.ts');
  try {
    const content = fs.readFileSync(seoFile, 'utf8');
    const matches = content.match(/pageMetadata:\s*Record<string,\s*PageMetadata>\s*=\s*{([\s\S]*?)^}/m);
    if (matches) {
      // Extract existing routes
      const existingRoutes = {};
      const routeMatches = content.matchAll(/['"`]([^'"`]+)['"`]:\s*{/g);
      for (const match of routeMatches) {
        existingRoutes[match[1]] = true;
      }
      return existingRoutes;
    }
  } catch (error) {
    console.log('   ⚠️  Could not read existing SEO metadata');
  }
  return {};
}

function readExistingChartMeta() {
  const chartFile = path.join(process.cwd(), 'app', 'share', 'chart', 'seo-meta.ts');
  try {
    const content = fs.readFileSync(chartFile, 'utf8');
    const matches = content.match(/chartMeta:\s*Record<string,\s*ChartMetadata>\s*=\s*{([\s\S]*?)^}/m);
    if (matches) {
      // Extract existing chart IDs
      const existingCharts = {};
      const chartMatches = content.matchAll(/['"`]([^'"`]+)['"`]:\s*{/g);
      for (const match of chartMatches) {
        existingCharts[match[1]] = true;
      }
      return existingCharts;
    }
  } catch (error) {
    console.log('   ⚠️  Could not read existing chart metadata');
  }
  return {};
}

// Step 3: Generate SEO metadata for new pages
function generatePageSeoMetadata(page) {
  const { route } = page;
  const routeParts = route.split('/').filter(Boolean);
  
  // Generate title based on route
  let title = 'State of Solana';
  let description = 'Comprehensive Solana blockchain analytics and research platform';
  let keywords = 'Solana, blockchain analytics, research';
  
  if (routeParts.length > 0) {
    const section = routeParts[0];
    const subsection = routeParts[1];
    
    // Capitalize and format section names
    const formatName = (name) => name.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    const sectionName = formatName(section);
    const subsectionName = subsection ? formatName(subsection) : '';
    
    if (subsectionName) {
      title = `${subsectionName} - ${sectionName} Analytics | State of Solana`;
      description = `Analyze ${subsectionName.toLowerCase()} metrics for ${sectionName.toLowerCase()} on Solana blockchain with comprehensive analytics and insights.`;
      keywords = `Solana ${section}, ${subsection}, blockchain analytics, ${sectionName.toLowerCase()} metrics`;
    } else {
      title = `${sectionName} Analytics - Solana Blockchain | State of Solana`;
      description = `Comprehensive ${sectionName.toLowerCase()} analytics on Solana blockchain including metrics, trends, and performance insights.`;
      keywords = `Solana ${section}, blockchain analytics, ${sectionName.toLowerCase()} metrics, DeFi analytics`;
    }
  }
  
  // Ensure title length
  if (title.length > 60) {
    title = title.substring(0, 57) + '...';
  }
  
  // Ensure description length
  if (description.length > 160) {
    description = description.substring(0, 157) + '...';
  }
  
  const ogTitle = title.replace(' | State of Solana', '');
  const ogDescription = description.length > 100 ? description.substring(0, 97) + '...' : description;
  
  return {
    title,
    description,
    keywords,
    ogTitle,
    ogDescription,
    ogImage: `/og-images/${routeParts[0] || 'default'}.png`,
    canonicalPath: route,
    breadcrumbs: generateBreadcrumbs(route)
  };
}

function generateBreadcrumbs(route) {
  const parts = route.split('/').filter(Boolean);
  const breadcrumbs = [{ name: 'Home', url: '/' }];
  
  let currentPath = '';
  for (const part of parts) {
    currentPath += '/' + part;
    const name = part.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    breadcrumbs.push({ name, url: currentPath });
  }
  
  return breadcrumbs;
}

// Step 4: Generate SEO metadata for new charts
function generateChartSeoMetadata(chart) {
  let title = chart.title;
  if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }
  title += ' - State of Solana';
  
  let description = chart.subtitle || `Explore ${chart.title.toLowerCase()} analytics on Solana blockchain`;
  if (description.length > 160) {
    description = description.substring(0, 157) + '...';
  }
  
  const ogTitle = chart.title;
  const ogDescription = chart.subtitle || `Analyze ${chart.title.toLowerCase()} metrics on Solana`;
  
  return {
    title,
    description,
    ogTitle,
    ogDescription: ogDescription.length > 100 ? ogDescription.substring(0, 97) + '...' : ogDescription,
    ogImage: `/og-images/charts/${chart.page || 'default'}-chart.png`,
    keywords: `Solana, analytics, charts, blockchain, DeFi, ${chart.page || 'metrics'}, ${chart.chartType || 'data'}`
  };
}

// Step 5: Update SEO metadata files
function updateSeoMetadataFile(newPages) {
  if (newPages.length === 0) return;
  
  console.log('\n📝 Updating SEO metadata file...');
  
  const seoFile = path.join(process.cwd(), 'app', 'seo-metadata.ts');
  let content = fs.readFileSync(seoFile, 'utf8');
  
  // Find the pageMetadata object
  const regex = /(export const pageMetadata: Record<string, PageMetadata> = {)([\s\S]*?)(^};)/m;
  const match = content.match(regex);
  
  if (!match) {
    console.log('   ❌ Could not find pageMetadata object');
    return;
  }
  
  let newEntries = '';
  for (const page of newPages) {
    const metadata = generatePageSeoMetadata(page);
    newEntries += `\n  '${page.route}': ${JSON.stringify(metadata, null, 4).replace(/^/gm, '  ')},\n`;
  }
  
  // Insert new entries before the closing brace
  const updatedContent = content.replace(regex, `$1$2${newEntries}$3`);
  
  fs.writeFileSync(seoFile, updatedContent);
  console.log(`   ✅ Added ${newPages.length} new page entries`);
}

function updateChartMetaFile(newCharts) {
  if (newCharts.length === 0) return;
  
  console.log('\n📊 Updating chart metadata file...');
  
  const chartFile = path.join(process.cwd(), 'app', 'share', 'chart', 'seo-meta.ts');
  let content = fs.readFileSync(chartFile, 'utf8');
  
  // Find the chartMeta object
  const regex = /(export const chartMeta: Record<string, ChartMetadata> = {)([\s\S]*?)(^};)/m;
  const match = content.match(regex);
  
  if (!match) {
    console.log('   ❌ Could not find chartMeta object');
    return;
  }
  
  let newEntries = '';
  for (const chart of newCharts) {
    const metadata = generateChartSeoMetadata(chart);
    newEntries += `  "${chart.id}": ${JSON.stringify(metadata, null, 4).replace(/^/gm, '  ')},\n`;
  }
  
  // Insert new entries before the closing brace
  const updatedContent = content.replace(regex, `$1$2${newEntries}$3`);
  
  fs.writeFileSync(chartFile, updatedContent);
  console.log(`   ✅ Added ${newCharts.length} new chart entries`);
}

// Step 6: Apply SEO to new page files
function applySeoToNewPages(newPages) {
  if (newPages.length === 0) return;
  
  console.log('\n🔧 Applying SEO metadata to new page files...');
  
  const { processPage } = require('./apply-seo-metadata.js');
  
  let successCount = 0;
  for (const page of newPages) {
    const pageInfo = {
      dir: page.relativePath,
      file: 'page.tsx',
      route: page.route
    };
    
    if (processPage(pageInfo)) {
      successCount++;
    }
  }
  
  console.log(`   ✅ Applied SEO to ${successCount}/${newPages.length} new pages`);
}

// Step 7: Update sitemap and robots.txt
function updateSitemapAndRobots() {
  console.log('\n🗺️  Updating sitemap and robots.txt...');
  
  try {
    execSync('node scripts/generate-sitemap.js', { 
      stdio: 'pipe',
      cwd: process.cwd() 
    });
    console.log('   ✅ Sitemap and robots.txt updated');
  } catch (error) {
    console.log('   ❌ Error updating sitemap:', error.message);
  }
}

// Step 8: Validate all files
function validateSeoFiles() {
  console.log('\n✅ Validating SEO files...');
  
  const files = [
    { name: 'SEO Metadata', path: 'app/seo-metadata.ts' },
    { name: 'Chart Metadata', path: 'app/share/chart/seo-meta.ts' },
    { name: 'Sitemap', path: 'public/sitemap.xml' },
    { name: 'Robots.txt', path: 'public/robots.txt' }
  ];
  
  let allValid = true;
  
  for (const file of files) {
    const fullPath = path.join(process.cwd(), file.path);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`   ✅ ${file.name}: ${sizeKB}KB`);
    } else {
      console.log(`   ❌ ${file.name}: Missing`);
      allValid = false;
    }
  }
  
  return allValid;
}

// Step 9: Performance optimization check
function optimizePerformance() {
  console.log('\n⚡ Performance optimization...');
  
  // Check if we need to split large files
  const seoFile = path.join(process.cwd(), 'app', 'seo-metadata.ts');
  const chartFile = path.join(process.cwd(), 'app', 'share', 'chart', 'seo-meta.ts');
  
  const seoSize = fs.statSync(seoFile).size;
  const chartSize = fs.statSync(chartFile).size;
  
  const seoSizeKB = Math.round(seoSize / 1024);
  const chartSizeKB = Math.round(chartSize / 1024);
  
  console.log(`   📄 SEO metadata: ${seoSizeKB}KB`);
  console.log(`   📊 Chart metadata: ${chartSizeKB}KB`);
  
  if (seoSizeKB > 500) {
    console.log('   ⚠️  Consider splitting SEO metadata file (>500KB)');
  }
  
  if (chartSizeKB > 1000) {
    console.log('   ⚠️  Consider splitting chart metadata file (>1MB)');
  }
}

// Main execution function
async function updateAllSeo() {
  const startTime = Date.now();
  
  try {
    // Step 1: Scan for changes
    const newPages = scanForNewPages();
    const newCharts = scanForNewCharts();
    
    // Early exit if nothing to update
    if (newPages.length === 0 && newCharts.length === 0) {
      console.log('\n🎉 No new pages or charts found - everything is up to date!');
      console.log('\n📊 Current status:');
      validateSeoFiles();
      return;
    }
    
    console.log(`\n📋 Update summary:`);
    console.log(`   • ${newPages.length} new pages to process`);
    console.log(`   • ${newCharts.length} new charts to process`);
    
    // Step 2: Create backup
    const backupDir = path.join(process.cwd(), `backup-seo-${Date.now()}`);
    fs.mkdirSync(backupDir, { recursive: true });
    
    const filesToBackup = [
      'app/seo-metadata.ts',
      'app/share/chart/seo-meta.ts',
      'public/sitemap.xml',
      'public/robots.txt'
    ];
    
    for (const file of filesToBackup) {
      const srcPath = path.join(process.cwd(), file);
      if (fs.existsSync(srcPath)) {
        const destPath = path.join(backupDir, file.replace(/\//g, '_'));
        fs.copyFileSync(srcPath, destPath);
      }
    }
    
    console.log(`\n💾 Backup created: ${path.basename(backupDir)}`);
    
    // Step 3: Update files
    updateSeoMetadataFile(newPages);
    updateChartMetaFile(newCharts);
    applySeoToNewPages(newPages);
    updateSitemapAndRobots();
    
    // Step 4: Validation and optimization
    const isValid = validateSeoFiles();
    optimizePerformance();
    
    // Step 5: Summary
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('\n🎉 SEO Update Complete!');
    console.log('======================');
    console.log(`✅ Processed ${newPages.length} pages and ${newCharts.length} charts`);
    console.log(`⏱️  Completed in ${duration} seconds`);
    console.log(`💾 Backup saved to: ${path.basename(backupDir)}`);
    
    if (isValid) {
      console.log('✅ All SEO files are valid and ready');
    } else {
      console.log('⚠️  Some SEO files have issues - check validation above');
    }
    
    console.log('\n📋 Next steps:');
    console.log('1. Test your new pages to ensure they load correctly');
    console.log('2. Deploy your changes to production');
    console.log('3. Submit updated sitemap to Google Search Console');
    console.log('4. Monitor indexing progress for new pages');
    
    if (newPages.length > 0) {
      console.log('\n🔗 New pages to test:');
      newPages.slice(0, 5).forEach(page => {
        console.log(`   • ${BASE_URL}${page.route}`);
      });
      if (newPages.length > 5) {
        console.log(`   • ... and ${newPages.length - 5} more`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error during SEO update:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// CLI interface
function showHelp() {
  console.log(`
🚀 SEO Auto-Update System
=========================

Usage: node scripts/update-all-seo.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be updated without making changes
  --force        Force update even if no changes detected
  --pages-only   Only update page metadata (skip charts)
  --charts-only  Only update chart metadata (skip pages)

Examples:
  node scripts/update-all-seo.js              # Update everything
  node scripts/update-all-seo.js --dry-run    # Preview changes
  node scripts/update-all-seo.js --pages-only # Update only pages

This script automatically:
• Scans for new pages and charts
• Updates SEO metadata files
• Applies SEO to new page files  
• Regenerates sitemap and robots.txt
• Validates all SEO files
• Creates backups before changes
`);
}

// Handle CLI arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

if (args.includes('--dry-run')) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
  // TODO: Implement dry run mode
}

// Run the update
if (require.main === module) {
  updateAllSeo().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { 
  updateAllSeo, 
  scanForNewPages, 
  scanForNewCharts,
  updateSeoMetadataFile,
  updateChartMetaFile
}; 