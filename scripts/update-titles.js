// scripts/update-titles.js
// Run this script with: node scripts/update-titles.js
// Make sure the app is running locally on port 3000

async function updateTitles() {
  const formatTitle = (title) => {
    const customMap = {
      'dapp': 'dApp',
      'dex': 'DEX',
      'depin': 'DePIN',
      'nft': 'NFT',
      'tvl': 'TVL',
      'dao': 'DAO',
      'rpc': 'RPC',
      'usdc': 'USDC',
      'usdt': 'USDT',
      'eth': 'ETH',
      'sol': 'SOL',
      'lp': 'LP',
      'api': 'API',
      'defi': 'DeFi',
      'vc': 'VC', 
      'tev': 'TEV',
      'usd': 'USD',
      'tps': 'TPS',
      'apy': 'APY',
      'apr': 'APR',
      'ray' : 'RAY'
    };
    title = title.trim().replace(/\s+/g, ' ');
    const words = title.split(' ');
    const formatted = words.map(word => {
      const lower = word.toLowerCase();
      if (lower in customMap) return customMap[lower];
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
    return formatted.join(' ');
  };

  const endpoints = ['charts', 'counters', 'tables'];

  for (const endpoint of endpoints) {
    console.log(`Updating ${endpoint}...`);
    
    // Fetch all items
    const response = await fetch(`http://127.0.0.1:3000/api/${endpoint}`);
    if (!response.ok) {
      console.error(`Failed to fetch ${endpoint}: ${response.status}`);
      continue;
    }
    const data = await response.json();
    console.log(`Response for ${endpoint}:`, JSON.stringify(data, null, 2));
    let items;
    if (endpoint === 'charts') {
      items = data.charts || data;
    } else if (endpoint === 'counters') {
      items = data.counters || data;
    } else if (endpoint === 'tables') {
      items = data.tables || data;
    }
    if (!items || !Array.isArray(items)) {
      console.error(`Invalid response structure for ${endpoint}`);
      continue;
    }
    console.log(`Found ${items.length} items for ${endpoint}`);
    
    for (const item of items) {
      const originalTitle = item.title;
      const formattedTitle = formatTitle(originalTitle);
      if (formattedTitle !== originalTitle) {
        console.log(`Updating ${endpoint} ${item.id}: "${originalTitle}" -> "${formattedTitle}"`);
        
        try {
          // Update the item using POST
          const updateResponse = await fetch(`http://127.0.0.1:3000/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item, title: formattedTitle }),
          });
          if (!updateResponse.ok) {
            console.error(`Failed to update ${endpoint} ${item.id}: ${updateResponse.status}`);
            const errorText = await updateResponse.text();
            console.error(errorText);
          } else {
            console.log(`Successfully updated ${endpoint} ${item.id}`);
          }
        } catch (error) {
          console.error(`Error updating ${endpoint} ${item.id}:`, error);
        }
      }
    }
  }
  console.log('Update complete!');
}

updateTitles().catch(console.error); 