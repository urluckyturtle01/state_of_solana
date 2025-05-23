// Define menu options and menu page types
export interface MenuItem {
  id: string;
  name: string;
  icon: string;
}

export interface MenuPage {
  id: string;
  name: string;
  path: string;
}

// Define available icons
export const AVAILABLE_ICONS = [
  { id: 'home', name: 'Home' },
  { id: 'chart-bar', name: 'Chart Bar' },
  { id: 'currency-dollar', name: 'Currency Dollar' },
  { id: 'coin', name: 'Coin' },
  { id: 'chart-pie', name: 'Chart Pie' },
  { id: 'document', name: 'Document' },
  { id: 'cog', name: 'Settings' }
];

// Define menu options
export const MENU_OPTIONS: MenuItem[] = [
{ id: 'overview', name: 'Overview', icon: 'home' },
  { id: 'dex', name: 'DEX', icon: 'chart-bar' },
  { id: 'rev', name: 'REV', icon: 'currency-dollar' },
  { id: 'mev', name: 'MEV', icon: 'currency-dollar' },
  { id: 'stablecoins', name: 'Stablecoins', icon: 'coin' },
  { id: 'protocol-revenue', name: 'Protocol Revenue', icon: 'chart-pie' },
  {
    id: "hello",
    name: "hello",
    icon: "home"
  }
];

// Define page configurations for each menu
export const MENU_PAGES: Record<string, MenuPage[]> = {
overview: [
    { id: 'dashboard', name: 'User Activity', path: '/dashboard' },
    { id: 'network-usage', name: 'Network Usage', path: '/network-usage' },
    { id: 'protocol-rev', name: 'Protocol Revenue', path: '/protocol-rev' },
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
    { id: 'overview', name: 'Summary', path: '/rev' },
    { id: 'cost-capacity', name: 'Cost & Capacity', path: '/rev/cost-capacity' },
    { id: 'issuance-burn', name: 'Issuance & Burn', path: '/rev/issuance-burn' },
    { id: 'total-economic-value', name: 'Total Economic Value', path: '/rev/total-economic-value' },
    { id: 'breakdown', name: 'Breakdown', path: '/rev/breakdown' }
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
    { id: 'platform-exchange', name: 'Platform & Exchange', path: '/stablecoins/platform-exchange' },
    { id: 'tvl', name: 'TVL', path: '/stablecoins/tvl' }
  ],
  "protocol-revenue": [{ id: 'protocol-revenue-summary', name: 'Summary', path: '/protocol-revenue/summary' },
    { id: 'total', name: 'Total', path: '/protocol-revenue/total' },
    { id: 'dex-ecosystem', name: 'DEX Ecosystem', path: '/protocol-revenue/dex-ecosystem' },
    { id: 'nft-ecosystem', name: 'NFT Ecosystem', path: '/protocol-revenue/nft-ecosystem' }],
  "hello": [
    {
      id: "hbhb",
      name: "hbhb",
      path: "/hello/hbhb"
    }
  ]
};

// Helper function to get pages for a specific menu
export function getPagesForMenu(menuId: string): MenuPage[] {
  return MENU_PAGES[menuId] || [];
}

// Helper function to find which menu a page belongs to
export function findMenuForPage(pageId: string): string | null {
  for (const [menuId, pages] of Object.entries(MENU_PAGES)) {
    if (pages.some(page => page.id === pageId)) {
      return menuId;
    }
  }
  return null;
}