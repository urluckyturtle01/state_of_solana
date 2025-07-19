const customMap: Record<string, string> = {
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
  'ray' : 'RAY',
  'xstocks': 'xStocks',
  'cex': 'CEX',
  'rev': 'REV',
  'mplx': 'MPLX'
};

export function formatTitle(title: string): string {
  title = title.trim().replace(/\s+/g, ' ');
  const words = title.split(' ');
  const formatted = words.map(word => {
    const lower = word.toLowerCase();
    if (lower in customMap) {
      return customMap[lower];
    } else {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
  });
  return formatted.join(' ');
} 