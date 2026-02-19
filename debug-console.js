const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    consoleMessages.push({ type, text });
    console.log(`[${type.toUpperCase()}] ${text}`);
  });
  
  // Collect page errors
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
    consoleMessages.push({ type: 'error', text: error.message });
  });
  
  console.log('Navigating to http://localhost:8137/dex/prop_amm...');
  await page.goto('http://localhost:8137/dex/prop_amm', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });
  
  console.log('\n=== Waiting for page to fully load ===\n');
  await page.waitForTimeout(3000);
  
  // Check if table exists
  const tableExists = await page.evaluate(() => {
    const tables = document.querySelectorAll('table');
    return {
      count: tables.length,
      hasData: Array.from(tables).some(table => {
        const rows = table.querySelectorAll('tbody tr');
        return rows.length > 0;
      })
    };
  });
  
  console.log('\n=== Table Check ===');
  console.log(`Tables found: ${tableExists.count}`);
  console.log(`Table has data: ${tableExists.hasData}`);
  
  // Filter for specific console messages
  console.log('\n=== Filtered Console Messages ===');
  const filtered = consoleMessages.filter(msg => 
    msg.text.includes('🚀 TableRenderer') ||
    msg.text.includes('🔍 TableRenderer') ||
    msg.text.includes('🎯 CLIENT') ||
    msg.text.includes('✅ Loaded table') ||
    msg.text.includes('❌')
  );
  
  if (filtered.length > 0) {
    filtered.forEach(msg => {
      console.log(`[${msg.type}] ${msg.text}`);
    });
  } else {
    console.log('No matching console messages found.');
  }
  
  // Take screenshot
  await page.screenshot({ path: '/root/state_of_solana/debug-screenshot.png', fullPage: true });
  console.log('\n✅ Screenshot saved to debug-screenshot.png');
  
  await browser.close();
})();
