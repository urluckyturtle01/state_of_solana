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
  { id: 'sf-dashboards', name: 'SF Dashboards', icon: 'chart-bar' },
  { id: 'launchpads', name: 'Launchpads', icon: 'chart-bar' },
  { id: 'xstocks', name: 'Xstocks', icon: 'chart-bar' },
  {
    id: "compute-units",
    name: "Compute Units",
    icon: "chart-bar"
  },
  {
    id: "wrapped-btc",
    name: "Wrapped BTC",
    icon: "currency-dollar"
  },
  {
    id: "raydium",
    name: "Raydium",
    icon: "chart-bar"
  },
  {
    id: "metaplex",
    name: "Metaplex",
    icon: "chart-bar"
  },
  {
    id: "helium",
    name: "Helium",
    icon: "chart-bar"
  },
  {
    id: "orca",
    name: "Orca",
    icon: "chart-bar"
  },
  {
    id: "sol-strategies",
    name: "Sol Strategies",
    icon: "chart-bar"
  },
  {
    id: "test",
    name: "Test",
    icon: "chart-bar"
  }
];

// Define page configurations for each menu
export const MENU_PAGES: Record<string, MenuPage[]> = {
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
  "protocol-revenue": [{ id: 'protocol-revenue-summary', name: 'Summary', path: '/protocol-revenue/summary' },
    { id: 'total', name: 'Total', path: '/protocol-revenue/total' },
    { id: 'dex-ecosystem', name: 'DEX Ecosystem', path: '/protocol-revenue/dex-ecosystem' },
    { id: 'nft-ecosystem', name: 'NFT Ecosystem', path: '/protocol-revenue/nft-ecosystem' },
    { id: 'depin', name: 'Depin', path: '/protocol-revenue/depin' }],
  "launchpads": [
    { id: 'launchpads-financials', name: 'Financials', path: '/launchpads/financials' },
    { id: 'launchpads-traction', name: 'Traction', path: '/launchpads/traction' },
    { id: 'launchpads-tokenized-equities', name: 'Tokenized Equities', path: '/launchpads/tokenized-equities' },
    { id: 'launchpads-fee-revenue', name: 'Fee Revenue', path: '/launchpads/fee-revenue' }
  ],
  "xstocks": [
    { id: 'xstocks-fee-revenue', name: 'Fee Revenue', path: '/xstocks/fee-revenue' },
    { id: 'xstocks-traction', name: 'Traction', path: '/xstocks/traction' },
    { id: 'xstocks-tvl', name: 'TVL', path: '/xstocks/tvl' }
  ],
  "compute-units": [
    {
      id: "transaction-bytes",
      name: "Transaction Bytes",
      path: "/compute-units/transaction-bytes"
    },
      {
        id: "compute-units",
        name: "Compute Units",
        path: "/compute-units/compute-units"
    },
    {
      id: "cu-overspending",
      name: "CU Overspending",
      path: "/compute-units/cu-overspending"
    }
  ],
  "wrapped-btc": [
    {
      id: "holders-supply",
      name: "Holders & Supply",
      path: "/wrapped-btc/holders-supply"
    },
    {
      id: "btc-tvl",
      name: "TVL",
      path: "/wrapped-btc/btc-tvl"
    },
    {
      id: "transfers",
      name: "Transfers",
      path: "/wrapped-btc/transfers"
    },
    {
      id: "dex-activity",
      name: "DEX Activity",
      path: "/wrapped-btc/dex-activity"
    }
  ],
  "sf-dashboards": [
    {
      id: "sf-overview",
      name: "Overview",
      path: "/sf-dashboards/overview"
    },
    {
      id: "sf-stablecoins",
      name: "Stablecoins",
      path: "/sf-dashboards/stablecoins"
    },
    {
      id: "sf-defi",
      name: "DeFi",
      path: "/sf-dashboards/defi"
    },
    {
      id: "sf-ai-tokens",
      name: "AI Tokens",
      path: "/sf-dashboards/ai-tokens"
    },
    {
      id: "sf-bitcoin-on-solana",
      name: "Bitcoin on Solana",
      path: "/sf-dashboards/bitcoin-on-solana"
    },
    {
      id: "sf-consumer",
      name: "Consumer",
      path: "/sf-dashboards/consumer"
    },
    {
      id: "sf-depin",
      name: "Depin",
      path: "/sf-dashboards/depin"
    },
    {
      id: "sf-payments",
      name: "Payments",
      path: "/sf-dashboards/payments"
    },
    {
      id: "sf-rwa",
      name: "RWA",
      path: "/sf-dashboards/rwa"
    },
    {
      id: "sf-treasury",
      name: "Treasury",
      path: "/sf-dashboards/treasury"
    },
    {
      id: "sf-vc-funding",
      name: "VC Funding",
      path: "/sf-dashboards/vc-funding"
    }
  ],
  "test": [
    {
      id: "test",
      name: "Test",
      path: "/test"
    }
  ],
"raydium": [
    
    {
      id: "raydium-financials",
      name: "Financials",
      path: "/projects/raydium/financials"
    },
    {
      id: "raydium-traction",
      name: "Traction",
      path: "/projects/raydium/traction"
    },
    {
      id: "raydium-protocol-token",
      name: "Protocol Token",
      path: "/projects/raydium/protocol-token"
    },
    {
      id: "raydium-competetive-landscape",
      name: "Competetive Landscape",
      path: "/projects/raydium/competetive-landscape"
    } 
  ],
  "metaplex": [
    {
      id: "metaplex-financials",
      name: "Financials",
      path: "/projects/metaplex/financials"
    },
    {
      id: "metaplex-traction",
      name: "Traction",
      path: "/projects/metaplex/traction"
    },
    {
      id: "metaplex-protocol-token",
      name: "Protocol Token",
      path: "/projects/metaplex/protocol-token"
    },
    {
      id: "metaplex-competetive-landscape",
      name: "Competetive Landscape",
      path: "/projects/metaplex/competetive-landscape"
    }
  ],
  "helium": [
    {
      id: "helium-financials",
      name: "Financials",
      path: "/projects/helium/financials"
    },
    {
      id: "helium-governance",
      name: "Governance",
      path: "/projects/helium/governance"
    },
    {
      id: "helium-traction",
      name: "Traction",
      path: "/projects/helium/traction"
    },
    {
      id: "helium-protocol-token",
      name: "Protocol Token",
      path: "/projects/helium/protocol-token"
    },
    
    {
      id: "helium-competitive-landscape",
      name: "Competitive Landscape",
      path: "/projects/helium/competitive-landscape"
    }
    ],
    "orca": [
      {
        id: "orca-financials",
        name: "Financials",
        path: "/projects/orca/financials"
      },
      {
        id: "orca-traction",
        name: "Traction",
        path: "/projects/orca/traction"
      },
      {
        id: "orca-protocol-token",
        name: "Protocol Token",
        path: "/projects/orca/protocol-token"
      },
      {
        id: "orca-competitive-landscape",
        name: "Competitive Landscape",
        path: "/projects/orca/competitive-landscape"
      }
    ],
    "sol-strategies": [
      {
        id: "sol-strategies-overview",
        name: "Staking",
        path: "/projects/sol-strategies/staking"
      },
      {
        id: "sol-strategies-financials",
        name: "Financials",
        path: "/projects/sol-strategies/financials"
      },
      {
        id: "sol-strategies-revenue",
        name: "Revenue",
        path: "/projects/sol-strategies/revenue"
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