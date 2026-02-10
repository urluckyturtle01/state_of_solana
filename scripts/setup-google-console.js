const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'https://research.topledger.xyz';
const DOMAIN = 'research.topledger.xyz';

console.log('🔍 Google Search Console Setup Guide');
console.log('=====================================\n');

console.log('📋 STEP 1: Access Google Search Console');
console.log('   1. Open: https://search.google.com/search-console');
console.log('   2. Sign in with your Google account');
console.log('   3. Click "Start now" if this is your first time\n');

console.log('🏠 STEP 2: Add Your Property');
console.log('   1. Click "+ Add property" (top left)');
console.log('   2. Choose "URL prefix" (recommended for your case)');
console.log(`   3. Enter: ${BASE_URL}`);
console.log('   4. Click "Continue"\n');

console.log('✅ STEP 3: Verify Ownership (Choose ONE method)\n');

console.log('   🏷️  METHOD A: HTML Meta Tag (RECOMMENDED)');
console.log('   ============================================');
console.log('   1. Google will show you a meta tag like:');
console.log('      <meta name="google-site-verification" content="XXXXXXXXX" />');
console.log('   2. Copy the content value (XXXXXXXXX part)');
console.log('   3. Add this to your main layout file\n');

console.log('   📄 Add to: app/layout.tsx');
console.log('   Add this in the <head> section:');
console.log('   ```tsx');
console.log('   <meta name="google-site-verification" content="YOUR_CODE_HERE" />');
console.log('   ```\n');

console.log('   🌐 METHOD B: HTML File Upload (Alternative)');
console.log('   ==========================================');
console.log('   1. Download the HTML file from Google');
console.log('   2. Place it in your public/ folder');
console.log('   3. Make sure it\'s accessible at the given URL\n');

console.log('🚀 STEP 4: Complete Verification');
console.log('   1. After adding meta tag or uploading file');
console.log('   2. Click "Verify" in Google Search Console');
console.log('   3. Wait for confirmation (usually instant)\n');

console.log('🗺️  STEP 5: Submit Your Sitemap');
console.log('   1. In Search Console, go to "Sitemaps" (left sidebar)');
console.log('   2. Click "Add a new sitemap"');
console.log('   3. Enter: sitemap.xml');
console.log('   4. Click "Submit"');
console.log(`   Full URL: ${BASE_URL}/sitemap.xml\n`);

console.log('🔍 STEP 6: Use URL Inspection Tool');
console.log('   1. Use the search bar at top of Search Console');
console.log('   2. Enter a URL to inspect (start with these priority URLs):');

const priorityUrls = [
  '/',
  '/overview',
  '/dex/summary',
  '/protocol-revenue/summary',
  '/stablecoins'
];

priorityUrls.forEach((url, index) => {
  console.log(`      ${index + 1}. ${BASE_URL}${url}`);
});

console.log('   3. Click "Request Indexing" for each URL');
console.log('   4. Wait for Google to crawl and index\n');

console.log('📊 STEP 7: Test Chart Pages');
console.log('   Start with these sample chart URLs:');

// Get sample chart URLs
try {
  const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
    const chartUrls = sitemapContent.match(/https:\/\/research\.topledger\.xyz\/share\/chart\/[^<]+/g) || [];
    
    chartUrls.slice(0, 5).forEach((url, index) => {
      console.log(`   ${index + 1}. ${url}`);
    });
  }
} catch (error) {
  console.log('   (Run the sitemap generator first to see sample URLs)');
}

console.log('\n📈 STEP 8: Monitor Progress');
console.log('   Daily checks:');
console.log('   • Go to "Coverage" report');
console.log('   • Check "Valid" pages count');
console.log('   • Look for any errors or warnings');
console.log('   • Submit 5-10 new chart URLs via URL inspection\n');

console.log('⚡ STEP 9: Speed Up Indexing');
console.log('   • Share chart URLs on social media');
console.log('   • Add internal links between your pages');
console.log('   • Get external sites to link to your charts');
console.log('   • Post in Solana/DeFi communities\n');

console.log('🎯 Expected Timeline:');
console.log('   • 1-2 hours: Priority pages indexed');
console.log('   • 24-48 hours: 20-50 chart pages indexed');
console.log('   • 1 week: 100+ chart pages indexed');
console.log('   • 2-4 weeks: All 329 charts indexed\n');

console.log('🆘 Troubleshooting:');
console.log('   Problem: "Verification failed"');
console.log('   • Double-check meta tag is in <head> section');
console.log('   • Deploy your changes and wait 5 minutes');
console.log('   • Try verification again\n');

console.log('   Problem: "Sitemap can\'t be read"');
console.log(`   • Test manually: ${BASE_URL}/sitemap.xml`);
console.log('   • Check if file exists in public folder');
console.log('   • Verify XML format is correct\n');

console.log('🔗 Quick Links:');
console.log('   • Google Search Console: https://search.google.com/search-console');
console.log(`   • Your sitemap: ${BASE_URL}/sitemap.xml`);
console.log(`   • Your robots.txt: ${BASE_URL}/robots.txt`);
console.log('   • URL Inspection: Use search bar in console\n');

console.log('📞 Next Steps After Setup:');
console.log('   1. ✅ Verify domain ownership');
console.log('   2. 📤 Submit sitemap.xml');
console.log('   3. 🔍 Request indexing for 5-10 priority URLs');
console.log('   4. 📊 Check back in 24 hours for indexing progress');
console.log('   5. 🔄 Repeat URL submissions for chart pages daily');

console.log('\n💡 Pro Tip: Save these URLs for easy access:');
console.log(`   Search Console: https://search.google.com/search-console/overview?resource_id=${encodeURIComponent(BASE_URL)}`);
console.log(`   Sitemap Status: https://search.google.com/search-console/sitemaps?resource_id=${encodeURIComponent(BASE_URL)}`);
console.log(`   URL Inspection: https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(BASE_URL)}`);

console.log('\n🎉 Ready to get your 329 chart pages on Google!'); 