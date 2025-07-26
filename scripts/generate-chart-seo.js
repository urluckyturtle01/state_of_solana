const fs = require('fs');
const path = require('path');

// Helper function to generate SEO-friendly description from title
function generateDescription(title, subtitle = '') {
  // If subtitle exists, use it as the base
  if (subtitle && subtitle.trim()) {
    let desc = subtitle.trim();
    // Ensure it mentions Solana and includes action words
    if (!desc.toLowerCase().includes('solana')) {
      desc = `Explore ${title.toLowerCase()} on Solana. ${desc}`;
    }
    // Add call to action if not present
    if (!desc.toLowerCase().includes('track') && !desc.toLowerCase().includes('explore') && !desc.toLowerCase().includes('analyze')) {
      desc = `Analyze ${desc}`;
    }
    return desc.length > 160 ? desc.substring(0, 157) + '...' : desc;
  }

  // Generate description from title
  const titleLower = title.toLowerCase();
  let description = '';

  // Chart type keywords
  const chartPatterns = {
    'tvl': 'total value locked trends and insights',
    'volume': 'trading volume analytics and trends',
    'revenue': 'revenue analytics and financial metrics', 
    'fees': 'fee analysis and revenue tracking',
    'users': 'user adoption and growth metrics',
    'transactions': 'transaction volume and network activity',
    'validators': 'validator performance and network security',
    'staking': 'staking rewards and delegation analytics',
    'dex': 'decentralized exchange trading metrics',
    'defi': 'DeFi protocol analytics and insights',
    'nft': 'NFT marketplace and trading data',
    'token': 'token economics and price analysis',
    'liquidity': 'liquidity pool analytics and APY data',
    'yield': 'yield farming opportunities and returns',
    'governance': 'governance participation and voting data',
    'treasury': 'treasury management and fund allocation',
    'economic': 'economic indicators and network health'
  };

  // Find matching pattern
  let matchedDescription = 'real-time analytics and insights';
  for (const [keyword, desc] of Object.entries(chartPatterns)) {
    if (titleLower.includes(keyword)) {
      matchedDescription = desc;
      break;
    }
  }

  // Build description
  description = `Track ${title.toLowerCase()} with ${matchedDescription} on Solana. Updated charts and data visualization.`;

  // Ensure proper length for SEO
  return description.length > 160 ? description.substring(0, 157) + '...' : description;
}

// Helper function to generate OpenGraph title (shorter version)
function generateOGTitle(title) {
  // Remove "Solana" if present to save space, add it back at the end
  let ogTitle = title.replace(/^Solana\s+/i, '').replace(/\s+Solana$/i, '');
  
  // Truncate if too long
  if (ogTitle.length > 40) {
    ogTitle = ogTitle.substring(0, 37) + '...';
  }
  
  // Add branding
  return `${ogTitle} - State of Solana`;
}

// Helper function to generate OpenGraph description (shorter version)
function generateOGDescription(description) {
  // Create shorter version for OG
  const ogDesc = description.split('.')[0]; // Take first sentence
  return ogDesc.length > 120 ? ogDesc.substring(0, 117) + '...' : ogDesc;
}

// Helper function to generate page title with SEO optimization
function generatePageTitle(title) {
  // Ensure title includes Solana if not present
  let pageTitle = title;
  if (!title.toLowerCase().includes('solana')) {
    pageTitle = `${title} | Solana`;
  }
  
  // Add branding
  pageTitle += ' - State of Solana';
  
  // Ensure length is under 60 characters for SEO
  if (pageTitle.length > 60) {
    // Try to shorten by removing redundant words
    pageTitle = pageTitle
      .replace(' | Solana', '')
      .replace(' - State of Solana', '');
    
    if (pageTitle.length > 35) {
      pageTitle = pageTitle.substring(0, 32) + '...';
    }
    pageTitle += ' - State of Solana';
  }
  
  return pageTitle;
}

// Main function to generate SEO metadata
async function generateSEOMetadata() {
  const configsDir = path.join(process.cwd(), 'public', 'temp', 'chart-configs');
  const outputFile = path.join(process.cwd(), 'app', 'share', 'chart', 'seo-meta.ts');
  
  console.log('🔍 Reading chart configurations...');
  
  if (!fs.existsSync(configsDir)) {
    console.error('❌ Chart configs directory not found:', configsDir);
    return;
  }

  const chartMeta = {};
  let totalCharts = 0;

  // Read all JSON files in the configs directory
  const files = fs.readdirSync(configsDir).filter(file => file.endsWith('.json'));
  
  console.log(`📊 Found ${files.length} config files`);

  for (const file of files) {
    try {
      const filePath = path.join(configsDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const config = JSON.parse(fileContent);
      
      if (config.charts && Array.isArray(config.charts)) {
        for (const chart of config.charts) {
          if (chart.id && chart.title) {
            const description = generateDescription(chart.title, chart.subtitle);
            const pageTitle = generatePageTitle(chart.title);
            const ogTitle = generateOGTitle(chart.title);
            const ogDescription = generateOGDescription(description);
            
            chartMeta[chart.id] = {
              title: pageTitle,
              description: description,
              ogTitle: ogTitle,
              ogDescription: ogDescription,
              ogImage: `/og-images/charts/default-chart.png`, // Default OG image
              keywords: [
                'Solana',
                'analytics',
                'charts',
                'blockchain',
                'DeFi',
                chart.title.toLowerCase().split(' ').filter(word => word.length > 3)
              ].flat().join(', ')
            };
            
            totalCharts++;
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }

  // Generate TypeScript file content
  const tsContent = `/**
 * Auto-generated SEO metadata for chart pages
 * Generated on: ${new Date().toISOString()}
 * Total charts: ${totalCharts}
 */

export interface ChartMetadata {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage?: string;
  keywords?: string;
}

export const chartMeta: Record<string, ChartMetadata> = ${JSON.stringify(chartMeta, null, 2)};

// Helper function to get metadata for a chart ID
export function getChartMetadata(chartId: string): ChartMetadata | null {
  return chartMeta[chartId] || null;
}

// Default metadata for charts not found
export const defaultChartMetadata: ChartMetadata = {
  title: "Solana Analytics Chart - State of Solana",
  description: "Explore real-time Solana blockchain analytics with interactive charts and data visualization. Track DeFi, DEX, and network metrics.",
  ogTitle: "Solana Analytics - State of Solana", 
  ogDescription: "Real-time Solana blockchain analytics and insights.",
  ogImage: "/og-images/charts/default-chart.png",
  keywords: "Solana, blockchain, analytics, charts, DeFi, DEX, crypto"
};
`;

  // Write the TypeScript file
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, tsContent, 'utf8');
  
  console.log(`✅ Generated SEO metadata for ${totalCharts} charts`);
  console.log(`📝 Saved to: ${outputFile}`);
  
  return { totalCharts, chartMeta };
}

// Run the generator
if (require.main === module) {
  generateSEOMetadata()
    .then(result => {
      console.log('🎉 SEO metadata generation completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed to generate SEO metadata:', error);
      process.exit(1);
    });
}

module.exports = { generateSEOMetadata }; 