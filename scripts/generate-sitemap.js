const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'https://research.topledger.xyz';
const SITEMAP_PATH = path.join(process.cwd(), 'public', 'sitemap.xml');

// Static pages that should be included in sitemap
const STATIC_PAGES = [
  {
    url: '/',
    changefreq: 'daily',
    priority: '1.0'
  },
  {
    url: '/blogs',
    changefreq: 'daily', 
    priority: '0.8'
  },
  {
    url: '/admin',
    changefreq: 'monthly',
    priority: '0.3'
  }
];

// Dynamic page patterns
const DYNAMIC_PAGES = [
  // Overview pages
  '/overview',
  '/overview/dashboard',
  '/overview/market-dynamics',
  '/overview/network-usage',
  '/overview/protocol-rev',
  
  // DEX pages
  '/dex',
  '/dex/summary',
  '/dex/aggregators',
  '/dex/traders', 
  '/dex/tvl',
  '/dex/volume',
  
  // Protocol Revenue pages
  '/protocol-revenue',
  '/protocol-revenue/summary',
  '/protocol-revenue/total',
  '/protocol-revenue/depin',
  '/protocol-revenue/dex-ecosystem',
  '/protocol-revenue/nft-ecosystem',
  
  // Stablecoins pages
  '/stablecoins',
  '/stablecoins/cexs',
  '/stablecoins/liquidity-velocity',
  '/stablecoins/mint-burn',
  '/stablecoins/stablecoin-usage',
  '/stablecoins/transaction-activity',
  '/stablecoins/tvl',
  
  // Revenue pages
  '/rev',
  '/rev/cost-capacity', 
  '/rev/issuance-burn',
  '/rev/total-economic-value',
  
  // MEV pages
  '/mev',
  '/mev/summary',
  '/mev/dex-token-hotspots',
  '/mev/extracted-value-pnl',
  
  // Compute Units pages
  '/compute-units',
  '/compute-units/compute-units',
  '/compute-units/cu-overspending',
  '/compute-units/transaction-bytes',
  
  // Wrapped BTC pages
  '/wrapped-btc',
  '/wrapped-btc/btc-tvl',
  '/wrapped-btc/dex-activity',
  '/wrapped-btc/holders-supply',
  '/wrapped-btc/transfers',
  
  // Launchpads pages
  '/launchpads',
  '/launchpads/bonding-curve-trade-stats',
  '/launchpads/fee-revenue',
  '/launchpads/post-migration-trade-stats',
  '/launchpads/token-launches',
  
  // xStocks pages
  '/xstocks',
  '/xstocks/fee-revenue',
  '/xstocks/traction',
  '/xstocks/tvl',
  
  // SF Dashboards pages
  '/sf-dashboards',
  '/sf-dashboards/overview',
  '/sf-dashboards/ai-tokens',
  '/sf-dashboards/bitcoin-on-solana', 
  '/sf-dashboards/consumer',
  '/sf-dashboards/defi',
  '/sf-dashboards/depin',
  '/sf-dashboards/payments',
  '/sf-dashboards/rwa',
  '/sf-dashboards/stablecoins',
  '/sf-dashboards/treasury',
  '/sf-dashboards/vc-funding',
  
  // Project pages
  '/projects/helium',
  '/projects/metaplex',
  '/projects/orca', 
  '/projects/raydium',
  '/projects/sol-strategies'
];

// Function to get all chart IDs from configurations
async function getAllChartIds() {
  const configsDir = path.join(process.cwd(), 'public', 'temp', 'chart-configs');
  const chartIds = [];
  
  if (!fs.existsSync(configsDir)) {
    console.warn('⚠️  Chart configs directory not found');
    return chartIds;
  }

  const files = fs.readdirSync(configsDir).filter(file => file.endsWith('.json'));
  
  for (const file of files) {
    try {
      const filePath = path.join(configsDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const config = JSON.parse(fileContent);
      
      if (config.charts && Array.isArray(config.charts)) {
        for (const chart of config.charts) {
          if (chart.id) {
            chartIds.push(chart.id);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }
  
  return chartIds;
}

// Function to generate XML sitemap
function generateSitemapXML(urls) {
  const currentDate = new Date().toISOString().split('T')[0];
  
  const urlEntries = urls.map(urlData => {
    const { url, lastmod = currentDate, changefreq = 'weekly', priority = '0.5' } = urlData;
    return `  <url>
    <loc>${BASE_URL}${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

// Main function to generate sitemap
async function generateSitemap() {
  console.log('🗺️  Generating comprehensive sitemap...');
  
  try {
    // Get all chart IDs
    const chartIds = await getAllChartIds();
    console.log(`📊 Found ${chartIds.length} charts`);
    
    // Build all URLs
    const allUrls = [];
    
    // Add static pages
    allUrls.push(...STATIC_PAGES);
    
    // Add dynamic dashboard pages
    DYNAMIC_PAGES.forEach(page => {
      allUrls.push({
        url: page,
        changefreq: 'daily',
        priority: '0.7'
      });
    });
    
    // Add all chart share pages
    chartIds.forEach(chartId => {
      allUrls.push({
        url: `/share/chart/${chartId}`,
        changefreq: 'weekly',
        priority: '0.6'
      });
    });
    
    // Generate XML content
    const sitemapXML = generateSitemapXML(allUrls);
    
    // Write sitemap to public directory
    fs.writeFileSync(SITEMAP_PATH, sitemapXML, 'utf8');
    
    console.log('✅ Sitemap generated successfully!');
    console.log(`📄 Total URLs: ${allUrls.length}`);
    console.log(`   📊 Chart pages: ${chartIds.length}`);
    console.log(`   🏠 Static pages: ${STATIC_PAGES.length}`);
    console.log(`   📱 Dashboard pages: ${DYNAMIC_PAGES.length}`);
    console.log(`💾 Saved to: ${SITEMAP_PATH}`);
    
    return {
      totalUrls: allUrls.length,
      chartPages: chartIds.length,
      sitemapPath: SITEMAP_PATH
    };
    
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    throw error;
  }
}

// Function to generate robots.txt
function generateRobotsTxt() {
  const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
  
  const robotsContent = `# Robots.txt for research.topledger.xyz
# Generated automatically

User-agent: *
Allow: /

# Sitemaps
Sitemap: ${BASE_URL}/sitemap.xml

# Allow search engines to index all chart pages
Allow: /share/chart/*

# Allow all dashboard pages
Allow: /overview/*
Allow: /dex/*
Allow: /protocol-revenue/*
Allow: /stablecoins/*
Allow: /rev/*
Allow: /mev/*
Allow: /compute-units/*
Allow: /wrapped-btc/*
Allow: /launchpads/*
Allow: /xstocks/*
Allow: /sf-dashboards/*
Allow: /projects/*

# Disallow admin pages from search engines
Disallow: /admin/
Disallow: /api/

# Allow blogs
Allow: /blogs/*

# Common crawl delays
Crawl-delay: 1

# Host
Host: ${BASE_URL}
`;

  fs.writeFileSync(robotsPath, robotsContent, 'utf8');
  console.log('🤖 Generated robots.txt');
  console.log(`💾 Saved to: ${robotsPath}`);
  
  return robotsPath;
}

// Function to verify URLs are accessible
async function verifyUrls(sampleSize = 10) {
  console.log(`🔍 Verifying ${sampleSize} sample URLs...`);
  
  const chartIds = await getAllChartIds();
  const sampleChartIds = chartIds.slice(0, sampleSize);
  
  const testUrls = [
    `${BASE_URL}/`,
    `${BASE_URL}/overview`,
    `${BASE_URL}/dex/summary`,
    ...sampleChartIds.map(id => `${BASE_URL}/share/chart/${id}`)
  ];
  
  console.log('📝 Sample URLs to verify:');
  testUrls.forEach(url => console.log(`   ${url}`));
  
  console.log('\n💡 To verify these URLs are accessible:');
  console.log('1. Check each URL returns 200 status');
  console.log('2. Verify meta tags are present');  
  console.log('3. Submit sitemap to Google Search Console');
  console.log('4. Use Google URL Inspection tool');
  
  return testUrls;
}

// Run the generator
if (require.main === module) {
  Promise.all([
    generateSitemap(),
    generateRobotsTxt()
  ])
    .then(async ([sitemapResult]) => {
      console.log('\n🎉 SEO files generated successfully!');
      console.log('\n📋 Next steps for Google indexing:');
      console.log('1. 📤 Submit sitemap to Google Search Console');
      console.log('2. 🔍 Use "URL Inspection" tool for key pages');
      console.log('3. 📊 Monitor indexing in Search Console');
      console.log('4. 🔗 Add internal links to important chart pages');
      console.log('5. 📱 Share chart URLs on social media');
      
      // Verify sample URLs
      await verifyUrls();
      
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed to generate SEO files:', error);
      process.exit(1);
    });
}

module.exports = { generateSitemap, generateRobotsTxt, getAllChartIds }; 