const fs = require('fs');
const path = require('path');

// Extract all page IDs from the menu configuration
const MENU_PAGES = {
  overview: [
    { id: 'dashboard', name: 'User Activity', path: '/dashboard' },
    { id: 'network-usage', name: 'Network Usage', path: '/network-usage' },
    { id: 'market-dynamics', name: 'Market Dynamics', path: '/market-dynamics' }
  ],
  dex: [
    { id: 'dex-summary', name: 'Summary', path: '/dex/summary' },
    { id: 'volume', name: 'Volume', path: '/dex/volume' },
    { id: 'tvl', name: 'TVL', path: '/dex/tvl' },
    { id: 'traders', name: 'Traders', path: '/dex/traders' },
    { id: 'aggregators', name: 'DEX Aggregators', path: '/dex/aggregators' }
  ],
  rev: [
    { id: 'rev-cost-capacity', name: 'Cost & Capacity', path: '/rev/cost-capacity' },
    { id: 'rev-issuance-burn', name: 'Issuance & Burn', path: '/rev/issuance-burn' },
    { id: 'rev-total-economic-value', name: 'Total Economic Value', path: '/rev/total-economic-value' }
  ],
  mev: [
    { id: 'mev-summary', name: 'Summary', path: '/mev/summary' },
    { id: 'dex-token-hotspots', name: 'DEX & Token Hotspots', path: '/mev/dex-token-hotspots' },
    { id: 'extracted-value-pnl', name: 'Extracted Value & PNL', path: '/mev/extracted-value-pnl' }
  ],
  stablecoins: [
    { id: 'stablecoin-usage', name: 'Stablecoin Usage', path: '/stablecoins/stablecoin-usage' },
    { id: 'transaction-activity', name: 'Transaction Activity', path: '/stablecoins/transaction-activity' },
    { id: 'liquidity-velocity', name: 'Liquidity Velocity', path: '/stablecoins/liquidity-velocity' },
    { id: 'mint-burn', name: 'Mint & Burn', path: '/stablecoins/mint-burn' },
    { id: 'cexs', name: 'CEXs', path: '/stablecoins/cexs' },
    { id: 'stablecoins-tvl', name: 'TVL', path: '/stablecoins/tvl' }
  ],
  "protocol-revenue": [
    { id: 'protocol-revenue-summary', name: 'Summary', path: '/protocol-revenue/summary' },
    { id: 'total', name: 'Total', path: '/protocol-revenue/total' },
    { id: 'dex-ecosystem', name: 'DEX Ecosystem', path: '/protocol-revenue/dex-ecosystem' },
    { id: 'nft-ecosystem', name: 'NFT Ecosystem', path: '/protocol-revenue/nft-ecosystem' },
    { id: 'depin', name: 'Depin', path: '/protocol-revenue/depin' }
  ],
  "compute-units": [
    { id: "transaction-bytes", name: "Transaction Bytes", path: "/compute-units/transaction-bytes" },
    { id: "compute-units", name: "Compute Units", path: "/compute-units/compute-units" },
    { id: "cu-overspending", name: "CU Overspending", path: "/compute-units/cu-overspending" }
  ],
  "wrapped-btc": [
    { id: "holders-supply", name: "Holders & Supply", path: "/wrapped-btc/holders-supply" },
    { id: "btc-tvl", name: "TVL", path: "/wrapped-btc/btc-tvl" },
    { id: "transfers", name: "Transfers", path: "/wrapped-btc/transfers" },
    { id: "dex-activity", name: "DEX Activity", path: "/wrapped-btc/dex-activity" }
  ],
  "launchpads": [
    { id: "launchpads-financials", name: "Financials", path: "/launchpads/financials" },
    { id: "launchpads-traction", name: "Traction", path: "/launchpads/traction" }
  ],
  "sf-dashboards": [
    { id: "sf-overview", name: "Overview", path: "/sf-dashboards/overview" },
    { id: "sf-stablecoins", name: "Stablecoins", path: "/sf-dashboards/stablecoins" },
    { id: "sf-defi", name: "DeFi", path: "/sf-dashboards/defi" },
    { id: "sf-ai-tokens", name: "AI Tokens", path: "/sf-dashboards/ai-tokens" },
    { id: "sf-bitcoin-on-solana", name: "Bitcoin on Solana", path: "/sf-dashboards/bitcoin-on-solana" },
    { id: "sf-consumer", name: "Consumer", path: "/sf-dashboards/consumer" },
    { id: "sf-depin", name: "Depin", path: "/sf-dashboards/depin" },
    { id: "sf-payments", name: "Payments", path: "/sf-dashboards/payments" },
    { id: "sf-rwa", name: "RWA", path: "/sf-dashboards/rwa" },
    { id: "sf-treasury", name: "Treasury", path: "/sf-dashboards/treasury" },
    { id: "sf-vc-funding", name: "VC Funding", path: "/sf-dashboards/vc-funding" }
  ],
  "test": [
    { id: "test", name: "Test", path: "/test" }
  ],
  "raydium": [
    { id: "raydium-financials", name: "Financials", path: "/projects/raydium/financials" },
    { id: "raydium-traction", name: "Traction", path: "/projects/raydium/traction" },
    { id: "raydium-protocol-token", name: "Protocol Token", path: "/projects/raydium/protocol-token" },
    { id: "raydium-competetive-landscape", name: "Competetive Landscape", path: "/projects/raydium/competetive-landscape" }
  ],
  "metaplex": [
    { id: "metaplex-financials", name: "Financials", path: "/projects/metaplex/financials" },
    { id: "metaplex-traction", name: "Traction", path: "/projects/metaplex/traction" },
    { id: "metaplex-protocol-token", name: "Protocol Token", path: "/projects/metaplex/protocol-token" },
    { id: "metaplex-competetive-landscape", name: "Competetive Landscape", path: "/projects/metaplex/competetive-landscape" }
  ],
  "helium": [
    { id: "helium-financials", name: "Financials", path: "/projects/helium/financials" },
    { id: "helium-traction", name: "Traction", path: "/projects/helium/traction" },
    { id: "helium-protocol-token", name: "Protocol Token", path: "/projects/helium/protocol-token" },
    { id: "helium-competitive-landscape", name: "Competitive Landscape", path: "/projects/helium/competitive-landscape" }
  ],
  "orca": [
    { id: "orca-financials", name: "Financials", path: "/projects/orca/financials" },
    { id: "orca-traction", name: "Traction", path: "/projects/orca/traction" },
    { id: "orca-protocol-token", name: "Protocol Token", path: "/projects/orca/protocol-token" },
    { id: "orca-competetive-landscape", name: "Competetive Landscape", path: "/projects/orca/competetive-landscape" }
  ]
};

// Extract all unique page IDs
const getAllPageIds = () => {
  const pageIds = [];
  for (const category in MENU_PAGES) {
    MENU_PAGES[category].forEach(page => {
      pageIds.push(page.id);
    });
  }
  return [...new Set(pageIds)]; // Remove duplicates
};

// Fetch all charts from the API
async function fetchAllCharts() {
  try {
    console.log('Fetching all charts from API...');
    
    // Use environment variable or fallback to local development URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:3000';
    const apiUrl = `${baseUrl}/api/charts`;
    
    console.log(`Using API URL: ${apiUrl}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Retrieved ${data.charts?.length || 0} charts from API`);
    return data.charts || [];
  } catch (error) {
    console.error('Error fetching charts:', error);
    return [];
  }
}

// Group charts by page and save to separate JSON files
async function createPageConfigs() {
  try {
    const allCharts = await fetchAllCharts();
    const allPageIds = getAllPageIds();
    
    console.log(`Processing ${allCharts.length} charts for ${allPageIds.length} pages...`);
    
    // Create chart-configs directory if it doesn't exist
    const configDir = path.join(__dirname, 'chart-configs');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Group charts by page
    const chartsByPage = {};
    
    // Initialize all pages with empty arrays
    allPageIds.forEach(pageId => {
      chartsByPage[pageId] = [];
    });
    
    // Group charts by their page property
    allCharts.forEach(chart => {
      if (chart.page && chartsByPage.hasOwnProperty(chart.page)) {
        chartsByPage[chart.page].push(chart);
      } else if (chart.page) {
        // Page not in our menu, but exists in charts
        console.warn(`Chart ${chart.id} belongs to page '${chart.page}' which is not in MENU_PAGES`);
        if (!chartsByPage[chart.page]) {
          chartsByPage[chart.page] = [];
        }
        chartsByPage[chart.page].push(chart);
      }
    });
    
    // Create individual JSON files for each page
    for (const [pageId, charts] of Object.entries(chartsByPage)) {
      const filename = path.join(configDir, `${pageId}.json`);
      const pageConfig = {
        pageId,
        pageName: getPageName(pageId),
        chartCount: charts.length,
        lastUpdated: new Date().toISOString(),
        charts: charts
      };
      
      fs.writeFileSync(filename, JSON.stringify(pageConfig, null, 2));
      console.log(`Created ${filename} with ${charts.length} charts`);
      
      // Log Topledger APIs used in this page
      const topledgerApis = charts
        .map(chart => chart.apiEndpoint)
        .filter(endpoint => endpoint && endpoint.includes('topledger'))
        .map(endpoint => {
          // Extract the main part of the API endpoint
          try {
            const url = new URL(endpoint);
            return url.pathname;
          } catch {
            return endpoint;
          }
        });
      
      const uniqueTopledgerApis = [...new Set(topledgerApis)];
      if (uniqueTopledgerApis.length > 0) {
        console.log(`  Topledger APIs used: ${uniqueTopledgerApis.join(', ')}`);
      }
    }
    
    // Create a summary file
    const summaryFile = path.join(configDir, '_summary.json');
    const summary = {
      totalCharts: allCharts.length,
      totalPages: Object.keys(chartsByPage).length,
      lastUpdated: new Date().toISOString(),
      pagesSummary: Object.entries(chartsByPage).map(([pageId, charts]) => ({
        pageId,
        pageName: getPageName(pageId),
        chartCount: charts.length,
        topledgerApiCount: charts.filter(chart => 
          chart.apiEndpoint && chart.apiEndpoint.includes('topledger')
        ).length
      })).sort((a, b) => b.chartCount - a.chartCount)
    };
    
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    console.log(`Created summary file: ${summaryFile}`);
    
    // Extract all unique Topledger APIs
    const allTopledgerApis = allCharts
      .map(chart => chart.apiEndpoint)
      .filter(endpoint => endpoint && endpoint.includes('topledger'))
      .map(endpoint => {
        try {
          const url = new URL(endpoint);
          return url.pathname;
        } catch {
          return endpoint;
        }
      });
    
    const uniqueAllTopledgerApis = [...new Set(allTopledgerApis)];
    
    const apiSummaryFile = path.join(configDir, '_topledger_apis.json');
    const apiSummary = {
      totalUniqueApis: uniqueAllTopledgerApis.length,
      lastUpdated: new Date().toISOString(),
      apis: uniqueAllTopledgerApis.sort()
    };
    
    fs.writeFileSync(apiSummaryFile, JSON.stringify(apiSummary, null, 2));
    console.log(`Created Topledger API summary: ${apiSummaryFile}`);
    console.log(`Total unique Topledger APIs: ${uniqueAllTopledgerApis.length}`);
    
  } catch (error) {
    console.error('Error creating page configs:', error);
  }
}

// Helper function to get page name from pageId
function getPageName(pageId) {
  for (const category in MENU_PAGES) {
    const page = MENU_PAGES[category].find(p => p.id === pageId);
    if (page) {
      return page.name;
    }
  }
  return pageId; // fallback to pageId if name not found
}

// Run the script
createPageConfigs().then(() => {
  console.log('✅ Chart config files created successfully!');
}).catch(error => {
  console.error('❌ Failed to create chart config files:', error);
}); 