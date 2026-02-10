const fs = require('fs');
const path = require('path');

// Configuration
const APP_DIR = path.join(process.cwd(), 'app');
const EXCLUDED_DIRS = ['admin', 'explorer', 'dashboards', 'api', 'components', 'contexts', 'data', 'docs', 'hooks', 'utils', 'share'];

// Pages that need SEO metadata applied
const PAGES_TO_UPDATE = [
  // Overview pages
  { dir: '(overview)', file: 'page.tsx', route: '/overview' },
  { dir: '(overview)/dashboard', file: 'page.tsx', route: '/overview/dashboard' },
  { dir: '(overview)/market-dynamics', file: 'page.tsx', route: '/overview/market-dynamics' },
  { dir: '(overview)/network-usage', file: 'page.tsx', route: '/overview/network-usage' },
  { dir: '(overview)/protocol-rev', file: 'page.tsx', route: '/overview/protocol-rev' },
  
  // DEX pages
  { dir: 'dex', file: 'page.tsx', route: '/dex' },
  { dir: 'dex/summary', file: 'page.tsx', route: '/dex/summary' },
  { dir: 'dex/aggregators', file: 'page.tsx', route: '/dex/aggregators' },
  { dir: 'dex/traders', file: 'page.tsx', route: '/dex/traders' },
  { dir: 'dex/tvl', file: 'page.tsx', route: '/dex/tvl' },
  { dir: 'dex/volume', file: 'page.tsx', route: '/dex/volume' },
  
  // Protocol Revenue pages
  { dir: 'protocol-revenue', file: 'page.tsx', route: '/protocol-revenue' },
  { dir: 'protocol-revenue/summary', file: 'page.tsx', route: '/protocol-revenue/summary' },
  { dir: 'protocol-revenue/total', file: 'page.tsx', route: '/protocol-revenue/total' },
  { dir: 'protocol-revenue/depin', file: 'page.tsx', route: '/protocol-revenue/depin' },
  { dir: 'protocol-revenue/dex-ecosystem', file: 'page.tsx', route: '/protocol-revenue/dex-ecosystem' },
  { dir: 'protocol-revenue/nft-ecosystem', file: 'page.tsx', route: '/protocol-revenue/nft-ecosystem' },
  
  // Stablecoins pages
  { dir: 'stablecoins', file: 'page.tsx', route: '/stablecoins' },
  { dir: 'stablecoins/cexs', file: 'page.tsx', route: '/stablecoins/cexs' },
  { dir: 'stablecoins/liquidity-velocity', file: 'page.tsx', route: '/stablecoins/liquidity-velocity' },
  { dir: 'stablecoins/mint-burn', file: 'page.tsx', route: '/stablecoins/mint-burn' },
  { dir: 'stablecoins/stablecoin-usage', file: 'page.tsx', route: '/stablecoins/stablecoin-usage' },
  { dir: 'stablecoins/transaction-activity', file: 'page.tsx', route: '/stablecoins/transaction-activity' },
  { dir: 'stablecoins/tvl', file: 'page.tsx', route: '/stablecoins/tvl' },
  
  // Revenue pages
  { dir: 'rev', file: 'page.tsx', route: '/rev' },
  { dir: 'rev/cost-capacity', file: 'page.tsx', route: '/rev/cost-capacity' },
  { dir: 'rev/issuance-burn', file: 'page.tsx', route: '/rev/issuance-burn' },
  { dir: 'rev/total-economic-value', file: 'page.tsx', route: '/rev/total-economic-value' },
  
  // MEV pages
  { dir: 'mev', file: 'page.tsx', route: '/mev' },
  { dir: 'mev/summary', file: 'page.tsx', route: '/mev/summary' },
  { dir: 'mev/dex-token-hotspots', file: 'page.tsx', route: '/mev/dex-token-hotspots' },
  { dir: 'mev/extracted-value-pnl', file: 'page.tsx', route: '/mev/extracted-value-pnl' },
  
  // Compute Units pages
  { dir: 'compute-units', file: 'page.tsx', route: '/compute-units' },
  { dir: 'compute-units/compute-units', file: 'page.tsx', route: '/compute-units/compute-units' },
  { dir: 'compute-units/cu-overspending', file: 'page.tsx', route: '/compute-units/cu-overspending' },
  { dir: 'compute-units/transaction-bytes', file: 'page.tsx', route: '/compute-units/transaction-bytes' },
  
  // Wrapped BTC pages
  { dir: 'wrapped-btc', file: 'page.tsx', route: '/wrapped-btc' },
  { dir: 'wrapped-btc/btc-tvl', file: 'page.tsx', route: '/wrapped-btc/btc-tvl' },
  { dir: 'wrapped-btc/dex-activity', file: 'page.tsx', route: '/wrapped-btc/dex-activity' },
  { dir: 'wrapped-btc/holders-supply', file: 'page.tsx', route: '/wrapped-btc/holders-supply' },
  { dir: 'wrapped-btc/transfers', file: 'page.tsx', route: '/wrapped-btc/transfers' },
  
  // Launchpads pages
  { dir: 'launchpads', file: 'page.tsx', route: '/launchpads' },
  { dir: 'launchpads/bonding-curve-trade-stats', file: 'page.tsx', route: '/launchpads/bonding-curve-trade-stats' },
  { dir: 'launchpads/fee-revenue', file: 'page.tsx', route: '/launchpads/fee-revenue' },
  { dir: 'launchpads/post-migration-trade-stats', file: 'page.tsx', route: '/launchpads/post-migration-trade-stats' },
  { dir: 'launchpads/token-launches', file: 'page.tsx', route: '/launchpads/token-launches' },
  
  // xStocks pages
  { dir: 'xstocks', file: 'page.tsx', route: '/xstocks' },
  { dir: 'xstocks/fee-revenue', file: 'page.tsx', route: '/xstocks/fee-revenue' },
  { dir: 'xstocks/traction', file: 'page.tsx', route: '/xstocks/traction' },
  { dir: 'xstocks/tvl', file: 'page.tsx', route: '/xstocks/tvl' },
  
  // SF Dashboards pages
  { dir: 'sf-dashboards', file: 'page.tsx', route: '/sf-dashboards' },
  { dir: 'sf-dashboards/overview', file: 'page.tsx', route: '/sf-dashboards/overview' },
  { dir: 'sf-dashboards/ai-tokens', file: 'page.tsx', route: '/sf-dashboards/ai-tokens' },
  { dir: 'sf-dashboards/bitcoin-on-solana', file: 'page.tsx', route: '/sf-dashboards/bitcoin-on-solana' },
  { dir: 'sf-dashboards/consumer', file: 'page.tsx', route: '/sf-dashboards/consumer' },
  { dir: 'sf-dashboards/defi', file: 'page.tsx', route: '/sf-dashboards/defi' },
  { dir: 'sf-dashboards/depin', file: 'page.tsx', route: '/sf-dashboards/depin' },
  { dir: 'sf-dashboards/payments', file: 'page.tsx', route: '/sf-dashboards/payments' },
  { dir: 'sf-dashboards/rwa', file: 'page.tsx', route: '/sf-dashboards/rwa' },
  { dir: 'sf-dashboards/stablecoins', file: 'page.tsx', route: '/sf-dashboards/stablecoins' },
  { dir: 'sf-dashboards/treasury', file: 'page.tsx', route: '/sf-dashboards/treasury' },
  { dir: 'sf-dashboards/vc-funding', file: 'page.tsx', route: '/sf-dashboards/vc-funding' },
  
  // Projects pages
  { dir: 'projects/helium', file: 'page.tsx', route: '/projects/helium' },
  { dir: 'projects/metaplex', file: 'page.tsx', route: '/projects/metaplex' },
  { dir: 'projects/orca', file: 'page.tsx', route: '/projects/orca' },
  { dir: 'projects/raydium', file: 'page.tsx', route: '/projects/raydium' },
  { dir: 'projects/sol-strategies', file: 'page.tsx', route: '/projects/sol-strategies' },
  
  // Other pages
  { dir: 'blogs', file: 'page.tsx', route: '/blogs' },
  { dir: 'home', file: 'page.tsx', route: '/home' },
  { dir: 'test', file: 'page.tsx', route: '/test' },
  { dir: 'test-analytics', file: 'page.tsx', route: '/test-analytics' },
  { dir: 'markdown-guide', file: 'page.tsx', route: '/markdown-guide' },
  
  // Root page
  { dir: '', file: 'page.tsx', route: '/' }
];

// Function to check if file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

// Function to read file content
function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return null;
  }
}

// Function to write file content
function writeFileContent(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error.message);
    return false;
  }
}

// Function to calculate relative path for import
function getRelativeImportPath(pageDir) {
  if (!pageDir || pageDir === '') {
    return './seo-metadata';
  }
  
  const depth = pageDir.split('/').length;
  const relativePath = '../'.repeat(depth) + 'seo-metadata';
  return relativePath;
}

// Function to inject SEO metadata into page
function injectSEOMetadata(content, route, pageDir) {
  const relativePath = getRelativeImportPath(pageDir);
  
  // Check if metadata import already exists
  if (content.includes('generateNextMetadata') || content.includes('seo-metadata')) {
    console.log(`   ⚠️  SEO metadata already exists, skipping...`);
    return content;
  }

  // Generate SEO import and metadata export
  const seoImport = `import { generateNextMetadata, generateStructuredData } from '${relativePath}';`;
  const metadataExport = `export const metadata = generateNextMetadata('${route}');`;
  
  // Check if it's a server component or client component
  const isClientComponent = content.includes('"use client"');
  
  if (isClientComponent) {
    // For client components, we need to create a wrapper
    const structuredDataScript = `
// SEO Structured Data
const structuredData = generateStructuredData('${route}');`;
    
    // Add import after "use client"
    const lines = content.split('\n');
    const useClientIndex = lines.findIndex(line => line.includes('"use client"'));
    
    if (useClientIndex !== -1) {
      lines.splice(useClientIndex + 1, 0, '', seoImport);
    } else {
      lines.unshift('', seoImport);
    }
    
    // Add structured data before component
    const exportIndex = lines.findIndex(line => line.includes('export default'));
    if (exportIndex !== -1) {
      lines.splice(exportIndex, 0, structuredDataScript, '');
    }
    
    // Add metadata export at the end
    lines.push('', metadataExport);
    
    return lines.join('\n');
  } else {
    // For server components, add import and metadata export
    const lines = content.split('\n');
    
    // Add import at the top (after existing imports)
    const lastImportIndex = lines.findLastIndex(line => line.trim().startsWith('import'));
    if (lastImportIndex !== -1) {
      lines.splice(lastImportIndex + 1, 0, seoImport);
    } else {
      lines.unshift(seoImport);
    }
    
    // Add metadata export before default export
    const exportIndex = lines.findIndex(line => line.includes('export default'));
    if (exportIndex !== -1) {
      lines.splice(exportIndex, 0, metadataExport, '');
    } else {
      lines.push('', metadataExport);
    }
    
    return lines.join('\n');
  }
}

// Function to process a single page
function processPage(pageInfo) {
  const { dir, file, route } = pageInfo;
  const filePath = path.join(APP_DIR, dir, file);
  
  console.log(`📄 Processing: ${route}`);
  console.log(`   File: ${filePath}`);
  
  // Check if file exists
  if (!fileExists(filePath)) {
    console.log(`   ❌ File not found: ${filePath}`);
    return false;
  }
  
  // Read current content
  const content = readFileContent(filePath);
  if (!content) {
    console.log(`   ❌ Could not read file content`);
    return false;
  }
  
  // Inject SEO metadata
  const updatedContent = injectSEOMetadata(content, route, dir);
  
  // Write updated content
  if (writeFileContent(filePath, updatedContent)) {
    console.log(`   ✅ SEO metadata added successfully`);
    return true;
  } else {
    console.log(`   ❌ Failed to write updated content`);
    return false;
  }
}

// Function to backup existing files
function createBackup() {
  const backupDir = path.join(process.cwd(), 'backup-before-seo');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  console.log('💾 Creating backup of existing files...');
  
  let backupCount = 0;
  
  for (const pageInfo of PAGES_TO_UPDATE) {
    const { dir, file } = pageInfo;
    const sourcePath = path.join(APP_DIR, dir, file);
    
    if (fileExists(sourcePath)) {
      const backupPath = path.join(backupDir, dir.replace(/\//g, '_') + '_' + file);
      try {
        fs.copyFileSync(sourcePath, backupPath);
        backupCount++;
      } catch (error) {
        console.error(`Failed to backup ${sourcePath}:`, error.message);
      }
    }
  }
  
  console.log(`📦 Backed up ${backupCount} files to ${backupDir}`);
  return backupDir;
}

// Function to update sitemap with new pages
function updateSitemap() {
  console.log('🗺️  Updating sitemap with SEO-optimized pages...');
  
  try {
    // Re-run sitemap generator to include all the new metadata
    const { spawn } = require('child_process');
    const child = spawn('node', ['scripts/generate-sitemap.js'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Sitemap updated successfully');
      } else {
        console.log('⚠️  Sitemap update had issues');
      }
    });
  } catch (error) {
    console.log('⚠️  Could not update sitemap automatically');
  }
}

// Main function
function applySEOMetadata() {
  console.log('🚀 Applying SEO Metadata to All Pages');
  console.log('=====================================\n');
  
  // Create backup
  const backupDir = createBackup();
  
  console.log('\n📝 Processing pages...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  // Process each page
  for (const pageInfo of PAGES_TO_UPDATE) {
    try {
      if (processPage(pageInfo)) {
        successCount++;
      } else {
        errorCount++;
      }
    } catch (error) {
      console.error(`   💥 Error processing ${pageInfo.route}:`, error.message);
      errorCount++;
    }
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log('📊 Summary:');
  console.log(`   ✅ Successfully processed: ${successCount} pages`);
  console.log(`   ❌ Failed: ${errorCount} pages`);
  console.log(`   📦 Backup location: ${backupDir}`);
  
  if (successCount > 0) {
    console.log('\n🎉 SEO metadata has been applied to your pages!');
    console.log('\n📋 Next steps:');
    console.log('1. Test a few pages to ensure they load correctly');
    console.log('2. Deploy your changes');
    console.log('3. Update Google Search Console with new sitemap');
    console.log('4. Monitor indexing progress');
    
    // Update sitemap
    updateSitemap();
  }
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some pages had errors. Check the output above and fix manually if needed.');
  }
}

// Run the script
if (require.main === module) {
  applySEOMetadata();
}

module.exports = { applySEOMetadata, processPage }; 