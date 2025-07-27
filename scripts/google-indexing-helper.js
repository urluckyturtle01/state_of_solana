const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'https://research.topledger.xyz';

// Important URLs to prioritize for indexing
const PRIORITY_URLS = [
  '/',
  '/overview',
  '/dex/summary',
  '/protocol-revenue/summary',
  '/stablecoins', 
  '/rev',
  '/mev/summary',
  '/sf-dashboards/overview',
  '/blogs'
];

// Function to generate Google Search Console verification file
function generateGoogleVerification() {
  console.log('🔍 Google Search Console Setup Helper');
  console.log('=====================================\n');
  
  console.log('📋 Step 1: Add your site to Google Search Console');
  console.log(`   1. Go to: https://search.google.com/search-console`);
  console.log(`   2. Click "Add Property"`);
  console.log(`   3. Enter: ${BASE_URL}`);
  console.log(`   4. Choose verification method (HTML file or meta tag)\n`);
  
  console.log('🏷️  Step 2: Verification Options');
  console.log('   Option A - HTML File:');
  console.log('   • Download verification file from Search Console');
  console.log('   • Place it in: /public/google[verification-code].html');
  console.log('   • Access at: https://research.topledger.xyz/google[code].html\n');
  
  console.log('   Option B - Meta Tag (recommended):');
  console.log('   • Copy the meta tag from Search Console');
  console.log('   • Add it to your main layout.tsx or _document.js');
  console.log('   • Example: <meta name="google-site-verification" content="..." />\n');
}

// Function to submit sitemap instructions
function provideSitemapInstructions() {
  console.log('🗺️  Step 3: Submit Sitemap');
  console.log('   1. After verification, go to "Sitemaps" in Search Console');
  console.log(`   2. Add new sitemap: ${BASE_URL}/sitemap.xml`);
  console.log('   3. Submit and wait for processing\n');
  
  console.log('📊 Sitemap Statistics:');
  const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    const content = fs.readFileSync(sitemapPath, 'utf8');
    const urlCount = (content.match(/<loc>/g) || []).length;
    console.log(`   • Total URLs: ${urlCount}`);
    console.log(`   • Chart pages: ~329`);
    console.log(`   • Dashboard pages: ~67`);
    console.log(`   • Static pages: ~3\n`);
  }
}

// Function to generate URL inspection checklist
function generateInspectionChecklist() {
  console.log('🔍 Step 4: URL Inspection & Indexing');
  console.log('   Priority URLs to inspect first:\n');
  
  PRIORITY_URLS.forEach((url, index) => {
    console.log(`   ${index + 1}. ${BASE_URL}${url}`);
  });
  
  console.log('\n   📝 For each URL:');
  console.log('   • Use "URL Inspection" tool in Search Console');
  console.log('   • Check if indexed, if not click "Request Indexing"');
  console.log('   • Verify meta tags and structured data are present');
  console.log('   • Check for any crawling errors\n');
}

// Function to generate sample chart URLs for testing
function generateChartSamples() {
  console.log('📊 Step 5: Test Chart Page Indexing');
  
  try {
    const { getAllChartIds } = require('./generate-sitemap.js');
    const chartIds = getAllChartIds ? getAllChartIds() : [];
    
    if (chartIds.length > 0) {
      console.log('   Sample chart URLs to test:\n');
      chartIds.slice(0, 5).forEach((id, index) => {
        console.log(`   ${index + 1}. ${BASE_URL}/share/chart/${id}`);
      });
    }
  } catch (error) {
    console.log('   Could not load chart IDs. Run generate-sitemap.js first.');
  }
  
  console.log('\n   🔗 Chart Page SEO Features:');
  console.log('   • Dynamic meta titles and descriptions');
  console.log('   • OpenGraph tags for social sharing');
  console.log('   • JSON-LD structured data');
  console.log('   • Canonical URLs');
  console.log('   • Twitter Card metadata\n');
}

// Function to provide ongoing monitoring tips
function provideMonitoringTips() {
  console.log('📈 Step 6: Monitor & Optimize');
  console.log('   Daily Tasks:');
  console.log('   • Check Search Console for new indexing status');
  console.log('   • Monitor "Coverage" report for errors');
  console.log('   • Review "Performance" for search analytics\n');
  
  console.log('   Weekly Tasks:');
  console.log('   • Submit new chart URLs via "Request Indexing"');
  console.log('   • Check for crawl errors in robots.txt tester');
  console.log('   • Review mobile usability issues\n');
  
  console.log('   Monthly Tasks:');
  console.log('   • Analyze search performance and queries');
  console.log('   • Update sitemap with new content');
  console.log('   • Check for broken internal/external links\n');
}

// Function to create a verification meta tag template
function createVerificationTemplate() {
  const templatePath = path.join(process.cwd(), 'google-verification-template.txt');
  
  const template = `
Google Search Console Verification Template
==========================================

Option 1: Meta Tag Method (Recommended)
Add this to your main layout component in the <head> section:

<meta name="google-site-verification" content="YOUR_VERIFICATION_CODE_HERE" />

Example locations to add this:
- app/layout.tsx (if using app router)
- pages/_document.js (if using pages router)
- app/share/chart/[chartId]/page.tsx (for specific pages)

Option 2: HTML File Method
1. Download the verification file from Google Search Console
2. Place it in: public/google[verification-code].html
3. Verify it's accessible at: ${BASE_URL}/google[verification-code].html

Important URLs to Verify:
${PRIORITY_URLS.map(url => `${BASE_URL}${url}`).join('\n')}

Chart URL Pattern:
${BASE_URL}/share/chart/[chart-id]

Next Steps:
1. Verify ownership in Google Search Console
2. Submit sitemap: ${BASE_URL}/sitemap.xml
3. Use URL Inspection tool for priority pages
4. Monitor indexing status daily
`;

  fs.writeFileSync(templatePath, template);
  console.log(`💾 Created verification template: ${templatePath}\n`);
}

// Function to validate current SEO setup
function validateSEOSetup() {
  console.log('✅ Step 7: Validate Current Setup');
  
  const checks = [
    {
      name: 'Sitemap exists',
      file: 'public/sitemap.xml',
      required: true
    },
    {
      name: 'Robots.txt exists', 
      file: 'public/robots.txt',
      required: true
    },
    {
      name: 'SEO metadata file exists',
      file: 'app/share/chart/seo-meta.ts',
      required: true
    },
    {
      name: 'OG images directory exists',
      file: 'public/og-images/charts',
      required: false
    }
  ];
  
  console.log('   File Checklist:');
  checks.forEach(check => {
    const exists = fs.existsSync(path.join(process.cwd(), check.file));
    const status = exists ? '✅' : (check.required ? '❌' : '⚠️ ');
    console.log(`   ${status} ${check.name}: ${check.file}`);
  });
  
  console.log('\n   🔗 Quick Access URLs:');
  console.log(`   • Sitemap: ${BASE_URL}/sitemap.xml`);
  console.log(`   • Robots: ${BASE_URL}/robots.txt`);
  console.log(`   • Sample chart: ${BASE_URL}/share/chart/[chart-id]`);
}

// Main function to run all steps
function runGoogleIndexingHelper() {
  console.log('🚀 Google Indexing Helper for research.topledger.xyz\n');
  
  generateGoogleVerification();
  provideSitemapInstructions();
  generateInspectionChecklist();
  generateChartSamples();
  provideMonitoringTips();
  createVerificationTemplate();
  validateSEOSetup();
  
  console.log('\n🎯 Summary: Quick Action Items');
  console.log('1. ✅ Sitemap & robots.txt created');
  console.log('2. 🔍 Add site to Google Search Console');
  console.log('3. 📤 Submit sitemap.xml');
  console.log('4. 🔗 Request indexing for priority URLs');
  console.log('5. 📊 Monitor indexing progress daily');
  console.log('\n💡 For fastest indexing: Share chart URLs on social media and link to them from high-authority pages!');
}

// Run if called directly
if (require.main === module) {
  runGoogleIndexingHelper();
}

module.exports = {
  runGoogleIndexingHelper,
  generateGoogleVerification,
  provideSitemapInstructions,
  generateInspectionChecklist,
  validateSEOSetup
}; 