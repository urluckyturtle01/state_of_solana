import { Metadata } from 'next';

// Base URL for the site
const BASE_URL = 'https://research.topledger.xyz';

// Interface for page metadata
export interface PageMetadata {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage?: string;
  canonicalPath: string;
  breadcrumbs?: Array<{
    name: string;
    url: string;
  }>;
}

// Comprehensive SEO metadata for all pages
export const pageMetadata: Record<string, PageMetadata> = {
  // Home and Root Pages
  '/': {
    title: 'State of Solana - Real-time Blockchain Analytics & Research',
    description: 'Comprehensive Solana blockchain analytics, metrics, and research. Track DeFi protocols, network usage, revenue, and ecosystem growth in real-time.',
    keywords: 'Solana, blockchain analytics, DeFi metrics, cryptocurrency research, Solana ecosystem, blockchain data, crypto analytics',
    ogTitle: 'State of Solana - Blockchain Analytics Hub',
    ogDescription: 'Real-time Solana blockchain analytics and comprehensive ecosystem research',
    ogImage: '/og-images/home-dashboard.png',
    canonicalPath: '/',
    breadcrumbs: [
      { name: 'Home', url: '/' }
    ]
  },

  '/home': {
    title: 'Home - State of Solana Analytics Platform',
    description: 'Explore the complete State of Solana analytics platform with real-time metrics, DeFi insights, and comprehensive blockchain research.',
    keywords: 'Solana analytics platform, blockchain metrics, DeFi dashboard, crypto research',
    ogTitle: 'State of Solana Analytics Platform',
    ogDescription: 'Complete Solana blockchain analytics and research platform',
    ogImage: '/og-images/home-dashboard.png',
    canonicalPath: '/home'
  },

  // Overview Section
  '/overview': {
    title: 'Solana Overview - Network Metrics & Analytics | State of Solana',
    description: 'Complete overview of Solana blockchain metrics including network usage, market dynamics, protocol revenue, and ecosystem performance indicators.',
    keywords: 'Solana overview, network metrics, blockchain statistics, Solana performance, ecosystem analytics',
    ogTitle: 'Solana Network Overview & Metrics',
    ogDescription: 'Comprehensive Solana blockchain overview with key metrics and performance indicators',
    ogImage: '/og-images/overview/overview-dashboard.png',
    canonicalPath: '/overview',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Overview', url: '/overview' }
    ]
  },

  '/overview/dashboard': {
    title: 'Solana Dashboard - Key Metrics & KPIs | State of Solana',
    description: 'Interactive dashboard showcasing Solana\'s key performance indicators, network health metrics, and real-time blockchain statistics.',
    keywords: 'Solana dashboard, KPIs, network health, blockchain metrics, performance indicators',
    ogTitle: 'Solana Key Metrics Dashboard',
    ogDescription: 'Real-time dashboard with Solana\'s most important metrics and KPIs',
    ogImage: '/og-images/overview/dashboard.png',
    canonicalPath: '/overview/dashboard',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Overview', url: '/overview' },
      { name: 'Dashboard', url: '/overview/dashboard' }
    ]
  },

  '/overview/market-dynamics': {
    title: 'Solana Market Dynamics - Price & Trading Analysis | State of Solana',
    description: 'Analyze Solana market dynamics including price movements, trading volume, market cap trends, and ecosystem valuation metrics.',
    keywords: 'Solana market analysis, SOL price, trading volume, market dynamics, valuation metrics',
    ogTitle: 'Solana Market Dynamics Analysis',
    ogDescription: 'Comprehensive analysis of Solana market trends and trading dynamics',
    ogImage: '/og-images/overview/market-dynamics.png',
    canonicalPath: '/overview/market-dynamics',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Overview', url: '/overview' },
      { name: 'Market Dynamics', url: '/overview/market-dynamics' }
    ]
  },

  '/overview/network-usage': {
    title: 'Solana Network Usage - TPS, Transactions & Activity | State of Solana',
    description: 'Track Solana network usage metrics including transactions per second (TPS), daily transactions, network activity, and throughput analysis.',
    keywords: 'Solana TPS, network usage, transaction volume, blockchain activity, network throughput',
    ogTitle: 'Solana Network Usage & TPS Metrics',
    ogDescription: 'Real-time Solana network usage statistics and transaction analytics',
    ogImage: '/og-images/overview/network-usage.png',
    canonicalPath: '/overview/network-usage',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Overview', url: '/overview' },
      { name: 'Network Usage', url: '/overview/network-usage' }
    ]
  },

  '/overview/protocol-rev': {
    title: 'Solana Protocol Revenue Overview - Fees & Economics | State of Solana',
    description: 'Overview of Solana protocol revenue including transaction fees, priority fees, and network economic performance metrics.',
    keywords: 'Solana protocol revenue, transaction fees, network economics, fee analysis',
    ogTitle: 'Solana Protocol Revenue Overview',
    ogDescription: 'Analysis of Solana protocol revenue and network fee economics',
    ogImage: '/og-images/overview/protocol-revenue.png',
    canonicalPath: '/overview/protocol-rev',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Overview', url: '/overview' },
      { name: 'Protocol Revenue', url: '/overview/protocol-rev' }
    ]
  },

  // DEX Section
  '/dex': {
    title: 'Solana DEX Analytics - Trading Volume & Liquidity | State of Solana',
    description: 'Comprehensive Solana DEX analytics including trading volume, liquidity metrics, aggregator performance, and decentralized exchange insights.',
    keywords: 'Solana DEX, decentralized exchange, trading volume, liquidity analysis, DeFi trading',
    ogTitle: 'Solana DEX Analytics & Trading Metrics',
    ogDescription: 'Complete analysis of Solana decentralized exchange ecosystem',
    ogImage: '/og-images/dex/dex-overview.png',
    canonicalPath: '/dex',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'DEX', url: '/dex' }
    ]
  },

  '/dex/summary': {
    title: 'Solana DEX Summary - Trading Overview & Key Metrics | State of Solana',
    description: 'Summary of Solana DEX ecosystem including top trading pairs, volume leaders, and key performance metrics across all decentralized exchanges.',
    keywords: 'Solana DEX summary, trading overview, volume metrics, DEX performance',
    ogTitle: 'Solana DEX Ecosystem Summary',
    ogDescription: 'Key metrics and overview of Solana decentralized exchange activity',
    ogImage: '/og-images/dex/summary.png',
    canonicalPath: '/dex/summary',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'DEX', url: '/dex' },
      { name: 'Summary', url: '/dex/summary' }
    ]
  },

  '/dex/aggregators': {
    title: 'Solana DEX Aggregators - Jupiter & Trading Optimization | State of Solana',
    description: 'Analysis of Solana DEX aggregators including Jupiter performance, routing efficiency, and trading optimization metrics.',
    keywords: 'Solana DEX aggregators, Jupiter DEX, trading optimization, route efficiency',
    ogTitle: 'Solana DEX Aggregators Analysis',
    ogDescription: 'Performance metrics and analysis of Solana DEX aggregation services',
    ogImage: '/og-images/dex/aggregators.png',
    canonicalPath: '/dex/aggregators',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'DEX', url: '/dex' },
      { name: 'Aggregators', url: '/dex/aggregators' }
    ]
  },

  '/dex/traders': {
    title: 'Solana DEX Traders - User Activity & Trading Patterns | State of Solana',
    description: 'Analyze Solana DEX trader behavior including active users, trading patterns, wallet analysis, and user engagement metrics.',
    keywords: 'Solana DEX traders, trading patterns, user activity, wallet analysis',
    ogTitle: 'Solana DEX Trader Analytics',
    ogDescription: 'Insights into Solana DEX trader behavior and trading patterns',
    ogImage: '/og-images/dex/traders.png',
    canonicalPath: '/dex/traders',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'DEX', url: '/dex' },
      { name: 'Traders', url: '/dex/traders' }
    ]
  },

  '/dex/tvl': {
    title: 'Solana DEX TVL - Total Value Locked Analysis | State of Solana',
    description: 'Track Total Value Locked (TVL) across Solana DEXs including liquidity pools, protocol TVL rankings, and capital efficiency metrics.',
    keywords: 'Solana DEX TVL, total value locked, liquidity pools, DeFi TVL',
    ogTitle: 'Solana DEX TVL Analysis',
    ogDescription: 'Total Value Locked metrics across Solana decentralized exchanges',
    ogImage: '/og-images/dex/tvl.png',
    canonicalPath: '/dex/tvl',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'DEX', url: '/dex' },
      { name: 'TVL', url: '/dex/tvl' }
    ]
  },

  '/dex/volume': {
    title: 'Solana DEX Volume - Trading Volume Analytics | State of Solana',
    description: 'Comprehensive Solana DEX trading volume analysis including daily/weekly trends, volume by protocol, and market share metrics.',
    keywords: 'Solana DEX volume, trading volume, volume analytics, market share',
    ogTitle: 'Solana DEX Trading Volume Analytics',
    ogDescription: 'Detailed analysis of trading volume across Solana decentralized exchanges',
    ogImage: '/og-images/dex/volume.png',
    canonicalPath: '/dex/volume',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'DEX', url: '/dex' },
      { name: 'Volume', url: '/dex/volume' }
    ]
  },

  // Protocol Revenue Section
  '/protocol-revenue': {
    title: 'Solana Protocol Revenue - Network Economics & Fees | State of Solana',
    description: 'Comprehensive analysis of Solana protocol revenue including transaction fees, priority fees, and ecosystem economic performance.',
    keywords: 'Solana protocol revenue, network fees, transaction economics, protocol economics',
    ogTitle: 'Solana Protocol Revenue Analytics',
    ogDescription: 'Complete analysis of Solana network revenue and fee economics',
    ogImage: '/og-images/protocol-revenue/overview.png',
    canonicalPath: '/protocol-revenue',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Protocol Revenue', url: '/protocol-revenue' }
    ]
  },

  '/protocol-revenue/summary': {
    title: 'Protocol Revenue Summary - Solana Network Economics | State of Solana',
    description: 'Summary of Solana protocol revenue streams including total fees, revenue breakdown, and network economic health indicators.',
    keywords: 'Solana revenue summary, network economics, fee breakdown, protocol economics',
    ogTitle: 'Solana Protocol Revenue Summary',
    ogDescription: 'Overview of Solana network revenue streams and economic metrics',
    ogImage: '/og-images/protocol-revenue/summary.png',
    canonicalPath: '/protocol-revenue/summary',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Protocol Revenue', url: '/protocol-revenue' },
      { name: 'Summary', url: '/protocol-revenue/summary' }
    ]
  },

  '/protocol-revenue/total': {
    title: 'Total Protocol Revenue - Solana Network Earnings | State of Solana',
    description: 'Track total Solana protocol revenue including cumulative earnings, fee trends, and network monetization metrics.',
    keywords: 'Solana total revenue, network earnings, cumulative fees, protocol monetization',
    ogTitle: 'Solana Total Protocol Revenue',
    ogDescription: 'Complete tracking of Solana network total revenue and earnings',
    ogImage: '/og-images/protocol-revenue/total.png',
    canonicalPath: '/protocol-revenue/total',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Protocol Revenue', url: '/protocol-revenue' },
      { name: 'Total', url: '/protocol-revenue/total' }
    ]
  },

  '/protocol-revenue/depin': {
    title: 'DePIN Protocol Revenue - Solana Hardware Networks | State of Solana',
    description: 'Revenue analysis of Decentralized Physical Infrastructure (DePIN) protocols on Solana including Helium and other hardware networks.',
    keywords: 'Solana DePIN revenue, decentralized infrastructure, Helium revenue, hardware networks',
    ogTitle: 'Solana DePIN Protocol Revenue',
    ogDescription: 'Revenue metrics from Solana decentralized physical infrastructure protocols',
    ogImage: '/og-images/protocol-revenue/depin.png',
    canonicalPath: '/protocol-revenue/depin',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Protocol Revenue', url: '/protocol-revenue' },
      { name: 'DePIN', url: '/protocol-revenue/depin' }
    ]
  },

  '/protocol-revenue/dex-ecosystem': {
    title: 'DEX Ecosystem Revenue - Solana Trading Fees | State of Solana',
    description: 'Revenue analysis of Solana DEX ecosystem including trading fees, protocol revenues, and decentralized exchange monetization.',
    keywords: 'Solana DEX revenue, trading fees, exchange revenue, DeFi monetization',
    ogTitle: 'Solana DEX Ecosystem Revenue',
    ogDescription: 'Revenue metrics and analysis from Solana decentralized exchanges',
    ogImage: '/og-images/protocol-revenue/dex.png',
    canonicalPath: '/protocol-revenue/dex-ecosystem',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Protocol Revenue', url: '/protocol-revenue' },
      { name: 'DEX Ecosystem', url: '/protocol-revenue/dex-ecosystem' }
    ]
  },

  '/protocol-revenue/nft-ecosystem': {
    title: 'NFT Ecosystem Revenue - Solana Digital Assets | State of Solana',
    description: 'Revenue analysis of Solana NFT ecosystem including marketplace fees, royalties, and digital asset monetization metrics.',
    keywords: 'Solana NFT revenue, marketplace fees, NFT royalties, digital asset economics',
    ogTitle: 'Solana NFT Ecosystem Revenue',
    ogDescription: 'Revenue metrics from Solana NFT marketplaces and digital assets',
    ogImage: '/og-images/protocol-revenue/nft.png',
    canonicalPath: '/protocol-revenue/nft-ecosystem',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Protocol Revenue', url: '/protocol-revenue' },
      { name: 'NFT Ecosystem', url: '/protocol-revenue/nft-ecosystem' }
    ]
  },

  // Stablecoins Section
  '/stablecoins': {
    title: 'Solana Stablecoins - USDC, USDT & Digital Dollar Analytics | State of Solana',
    description: 'Comprehensive Solana stablecoin analytics including USDC, USDT supply, transaction activity, and digital dollar ecosystem metrics.',
    keywords: 'Solana stablecoins, USDC Solana, USDT, digital dollars, stablecoin analytics',
    ogTitle: 'Solana Stablecoin Analytics',
    ogDescription: 'Complete analysis of stablecoin activity and metrics on Solana',
    ogImage: '/og-images/stablecoins/overview.png',
    canonicalPath: '/stablecoins',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Stablecoins', url: '/stablecoins' }
    ]
  },

  '/stablecoins/cexs': {
    title: 'Stablecoin CEX Activity - Exchange Flows on Solana | State of Solana',
    description: 'Track stablecoin flows between centralized exchanges and Solana including USDC/USDT deposits, withdrawals, and CEX activity.',
    keywords: 'Solana stablecoin CEX, exchange flows, USDC deposits, stablecoin transfers',
    ogTitle: 'Solana Stablecoin CEX Activity',
    ogDescription: 'Stablecoin flows and activity between exchanges and Solana network',
    ogImage: '/og-images/stablecoins/cex.png',
    canonicalPath: '/stablecoins/cexs',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Stablecoins', url: '/stablecoins' },
      { name: 'CEX Activity', url: '/stablecoins/cexs' }
    ]
  },

  '/stablecoins/liquidity-velocity': {
    title: 'Stablecoin Liquidity & Velocity - Solana Digital Dollar Flow | State of Solana',
    description: 'Analyze stablecoin liquidity and velocity metrics on Solana including circulation speed, liquidity pools, and capital efficiency.',
    keywords: 'stablecoin velocity, liquidity metrics, USDC velocity, capital efficiency',
    ogTitle: 'Solana Stablecoin Liquidity & Velocity',
    ogDescription: 'Analysis of stablecoin circulation and liquidity metrics on Solana',
    ogImage: '/og-images/stablecoins/velocity.png',
    canonicalPath: '/stablecoins/liquidity-velocity',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Stablecoins', url: '/stablecoins' },
      { name: 'Liquidity & Velocity', url: '/stablecoins/liquidity-velocity' }
    ]
  },

  '/stablecoins/mint-burn': {
    title: 'Stablecoin Mint & Burn - Supply Changes on Solana | State of Solana',
    description: 'Track stablecoin minting and burning activity on Solana including USDC supply changes, issuance patterns, and redemption metrics.',
    keywords: 'stablecoin minting, USDC burn, supply changes, issuance patterns',
    ogTitle: 'Solana Stablecoin Mint & Burn Activity',
    ogDescription: 'Tracking stablecoin supply changes and issuance activity on Solana',
    ogImage: '/og-images/stablecoins/mint-burn.png',
    canonicalPath: '/stablecoins/mint-burn',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Stablecoins', url: '/stablecoins' },
      { name: 'Mint & Burn', url: '/stablecoins/mint-burn' }
    ]
  },

  '/stablecoins/stablecoin-usage': {
    title: 'Stablecoin Usage Patterns - Solana Digital Dollar Adoption | State of Solana',
    description: 'Analyze stablecoin usage patterns on Solana including adoption metrics, user behavior, and digital dollar utilization trends.',
    keywords: 'stablecoin usage, digital dollar adoption, USDC usage, payment patterns',
    ogTitle: 'Solana Stablecoin Usage Analytics',
    ogDescription: 'Analysis of stablecoin adoption and usage patterns on Solana',
    ogImage: '/og-images/stablecoins/usage.png',
    canonicalPath: '/stablecoins/stablecoin-usage',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Stablecoins', url: '/stablecoins' },
      { name: 'Usage', url: '/stablecoins/stablecoin-usage' }
    ]
  },

  '/stablecoins/transaction-activity': {
    title: 'Stablecoin Transaction Activity - Solana Payment Analytics | State of Solana',
    description: 'Track stablecoin transaction activity on Solana including payment volume, transaction counts, and digital dollar transfer metrics.',
    keywords: 'stablecoin transactions, payment volume, USDC transfers, digital payments',
    ogTitle: 'Solana Stablecoin Transaction Analytics',
    ogDescription: 'Comprehensive tracking of stablecoin transaction activity on Solana',
    ogImage: '/og-images/stablecoins/transactions.png',
    canonicalPath: '/stablecoins/transaction-activity',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Stablecoins', url: '/stablecoins' },
      { name: 'Transactions', url: '/stablecoins/transaction-activity' }
    ]
  },

  '/stablecoins/tvl': {
    title: 'Stablecoin TVL - Total Value Locked in Solana DeFi | State of Solana',
    description: 'Track Total Value Locked (TVL) of stablecoins in Solana DeFi protocols including lending, DEX liquidity, and yield farming.',
    keywords: 'stablecoin TVL, DeFi liquidity, USDC TVL, yield farming',
    ogTitle: 'Solana Stablecoin TVL Analytics',
    ogDescription: 'Total Value Locked metrics for stablecoins in Solana DeFi',
    ogImage: '/og-images/stablecoins/tvl.png',
    canonicalPath: '/stablecoins/tvl',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Stablecoins', url: '/stablecoins' },
      { name: 'TVL', url: '/stablecoins/tvl' }
    ]
  },

  // Revenue Section
  '/rev': {
    title: 'Solana Revenue Analytics - Network Economics & Token Economics | State of Solana',
    description: 'Comprehensive Solana revenue analytics including network economics, token issuance, burn mechanisms, and economic value analysis.',
    keywords: 'Solana revenue, network economics, token economics, SOL tokenomics',
    ogTitle: 'Solana Revenue & Economics Analytics',
    ogDescription: 'Complete analysis of Solana network revenue and token economics',
    ogImage: '/og-images/rev/overview.png',
    canonicalPath: '/rev',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Revenue', url: '/rev' }
    ]
  },

  '/rev/cost-capacity': {
    title: 'Solana Cost & Capacity - Network Efficiency Metrics | State of Solana',
    description: 'Analyze Solana network cost and capacity metrics including transaction costs, throughput capacity, and efficiency analysis.',
    keywords: 'Solana transaction costs, network capacity, throughput efficiency, cost analysis',
    ogTitle: 'Solana Cost & Capacity Analytics',
    ogDescription: 'Network efficiency and cost analysis for Solana blockchain',
    ogImage: '/og-images/rev/cost-capacity.png',
    canonicalPath: '/rev/cost-capacity',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Revenue', url: '/rev' },
      { name: 'Cost & Capacity', url: '/rev/cost-capacity' }
    ]
  },

  '/rev/issuance-burn': {
    title: 'SOL Issuance & Burn - Token Supply Economics | State of Solana',
    description: 'Track SOL token issuance and burn mechanisms including staking rewards, fee burning, and supply dynamics on Solana.',
    keywords: 'SOL issuance, token burn, supply economics, staking rewards, deflationary mechanisms',
    ogTitle: 'SOL Token Issuance & Burn Analytics',
    ogDescription: 'Analysis of SOL token supply dynamics and burn mechanisms',
    ogImage: '/og-images/rev/issuance-burn.png',
    canonicalPath: '/rev/issuance-burn',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Revenue', url: '/rev' },
      { name: 'Issuance & Burn', url: '/rev/issuance-burn' }
    ]
  },

  '/rev/total-economic-value': {
    title: 'Total Economic Value - Solana Network Value Creation | State of Solana',
    description: 'Analyze total economic value generated by Solana network including ecosystem value, economic activity, and value creation metrics.',
    keywords: 'Solana economic value, network value creation, ecosystem economics, total value',
    ogTitle: 'Solana Total Economic Value Analytics',
    ogDescription: 'Comprehensive analysis of economic value created by Solana network',
    ogImage: '/og-images/rev/total-value.png',
    canonicalPath: '/rev/total-economic-value',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Revenue', url: '/rev' },
      { name: 'Total Economic Value', url: '/rev/total-economic-value' }
    ]
  },

  // MEV Section
  '/mev': {
    title: 'Solana MEV Analytics - Maximal Extractable Value | State of Solana',
    description: 'Comprehensive Solana MEV analytics including maximal extractable value, arbitrage opportunities, and MEV extraction metrics.',
    keywords: 'Solana MEV, maximal extractable value, arbitrage, MEV extraction, value extraction',
    ogTitle: 'Solana MEV Analytics',
    ogDescription: 'Analysis of Maximal Extractable Value (MEV) on Solana blockchain',
    ogImage: '/og-images/mev/overview.png',
    canonicalPath: '/mev',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'MEV', url: '/mev' }
    ]
  },

  '/mev/summary': {
    title: 'MEV Summary - Solana Value Extraction Overview | State of Solana',
    description: 'Summary of MEV activity on Solana including extraction volumes, top extractors, and maximal extractable value trends.',
    keywords: 'MEV summary, value extraction, Solana MEV overview, extraction trends',
    ogTitle: 'Solana MEV Summary & Overview',
    ogDescription: 'Overview of maximal extractable value activity on Solana',
    ogImage: '/og-images/mev/summary.png',
    canonicalPath: '/mev/summary',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'MEV', url: '/mev' },
      { name: 'Summary', url: '/mev/summary' }
    ]
  },

  '/mev/dex-token-hotspots': {
    title: 'MEV DEX Token Hotspots - High-Value Trading Pairs | State of Solana',
    description: 'Identify MEV hotspots in Solana DEX trading including high-value token pairs, arbitrage opportunities, and extraction targets.',
    keywords: 'MEV hotspots, DEX arbitrage, token pair MEV, trading MEV, arbitrage opportunities',
    ogTitle: 'Solana MEV DEX Hotspots',
    ogDescription: 'High-value MEV opportunities and hotspots in Solana DEX trading',
    ogImage: '/og-images/mev/hotspots.png',
    canonicalPath: '/mev/dex-token-hotspots',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'MEV', url: '/mev' },
      { name: 'DEX Hotspots', url: '/mev/dex-token-hotspots' }
    ]
  },

  '/mev/extracted-value-pnl': {
    title: 'MEV Extracted Value & PnL - Profit Analysis | State of Solana',
    description: 'Analyze MEV extracted value and profit/loss metrics on Solana including extraction profitability and value capture analysis.',
    keywords: 'MEV profits, extracted value, MEV PnL, value capture, extraction profitability',
    ogTitle: 'Solana MEV Extracted Value & PnL',
    ogDescription: 'Analysis of MEV extraction profits and value capture on Solana',
    ogImage: '/og-images/mev/pnl.png',
    canonicalPath: '/mev/extracted-value-pnl',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'MEV', url: '/mev' },
      { name: 'Value & PnL', url: '/mev/extracted-value-pnl' }
    ]
  },

  // Compute Units Section
  '/compute-units': {
    title: 'Solana Compute Units - CU Usage & Optimization | State of Solana',
    description: 'Analyze Solana compute unit usage including CU consumption patterns, optimization metrics, and transaction efficiency analysis.',
    keywords: 'Solana compute units, CU usage, transaction efficiency, compute optimization',
    ogTitle: 'Solana Compute Units Analytics',
    ogDescription: 'Comprehensive analysis of compute unit usage and optimization on Solana',
    ogImage: '/og-images/compute-units/overview.png',
    canonicalPath: '/compute-units',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Compute Units', url: '/compute-units' }
    ]
  },

  '/compute-units/compute-units': {
    title: 'Compute Units Usage - Solana CU Consumption Analysis | State of Solana',
    description: 'Detailed analysis of compute unit consumption on Solana including usage patterns, CU efficiency, and resource utilization metrics.',
    keywords: 'compute units usage, CU consumption, resource utilization, transaction efficiency',
    ogTitle: 'Solana Compute Units Usage Analysis',
    ogDescription: 'Detailed tracking of compute unit consumption and efficiency on Solana',
    ogImage: '/og-images/compute-units/usage.png',
    canonicalPath: '/compute-units/compute-units',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Compute Units', url: '/compute-units' },
      { name: 'CU Usage', url: '/compute-units/compute-units' }
    ]
  },

  '/compute-units/cu-overspending': {
    title: 'CU Overspending - Solana Compute Unit Inefficiency | State of Solana',
    description: 'Track compute unit overspending on Solana including inefficient transactions, CU waste analysis, and optimization opportunities.',
    keywords: 'CU overspending, compute inefficiency, transaction optimization, CU waste',
    ogTitle: 'Solana CU Overspending Analysis',
    ogDescription: 'Analysis of compute unit inefficiency and overspending on Solana',
    ogImage: '/og-images/compute-units/overspending.png',
    canonicalPath: '/compute-units/cu-overspending',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Compute Units', url: '/compute-units' },
      { name: 'Overspending', url: '/compute-units/cu-overspending' }
    ]
  },

  '/compute-units/transaction-bytes': {
    title: 'Transaction Bytes - Solana Data Usage Analytics | State of Solana',
    description: 'Analyze transaction byte usage on Solana including data consumption patterns, transaction size optimization, and network efficiency.',
    keywords: 'transaction bytes, data usage, transaction size, network efficiency',
    ogTitle: 'Solana Transaction Bytes Analytics',
    ogDescription: 'Analysis of transaction data usage and byte consumption on Solana',
    ogImage: '/og-images/compute-units/bytes.png',
    canonicalPath: '/compute-units/transaction-bytes',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Compute Units', url: '/compute-units' },
      { name: 'Transaction Bytes', url: '/compute-units/transaction-bytes' }
    ]
  },

  // Wrapped BTC Section
  '/wrapped-btc': {
    title: 'Wrapped Bitcoin on Solana - wBTC Analytics | State of Solana',
    description: 'Comprehensive wrapped Bitcoin analytics on Solana including wBTC supply, trading activity, and Bitcoin bridge analysis.',
    keywords: 'wrapped Bitcoin Solana, wBTC analytics, Bitcoin bridge, BTC on Solana',
    ogTitle: 'Wrapped Bitcoin on Solana Analytics',
    ogDescription: 'Complete analysis of wrapped Bitcoin activity and metrics on Solana',
    ogImage: '/og-images/wrapped-btc/overview.png',
    canonicalPath: '/wrapped-btc',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Wrapped BTC', url: '/wrapped-btc' }
    ]
  },

  '/wrapped-btc/btc-tvl': {
    title: 'Bitcoin TVL on Solana - Wrapped BTC Value Locked | State of Solana',
    description: 'Track Bitcoin Total Value Locked (TVL) on Solana including wrapped BTC in DeFi protocols and liquidity pools.',
    keywords: 'Bitcoin TVL Solana, wBTC TVL, Bitcoin DeFi, BTC liquidity',
    ogTitle: 'Bitcoin TVL on Solana Analytics',
    ogDescription: 'Total Value Locked metrics for Bitcoin assets on Solana',
    ogImage: '/og-images/wrapped-btc/tvl.png',
    canonicalPath: '/wrapped-btc/btc-tvl',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Wrapped BTC', url: '/wrapped-btc' },
      { name: 'BTC TVL', url: '/wrapped-btc/btc-tvl' }
    ]
  },

  '/wrapped-btc/dex-activity': {
    title: 'Bitcoin DEX Activity on Solana - wBTC Trading | State of Solana',
    description: 'Analyze Bitcoin DEX activity on Solana including wBTC trading volume, liquidity, and decentralized exchange metrics.',
    keywords: 'Bitcoin DEX Solana, wBTC trading, Bitcoin liquidity, BTC DEX volume',
    ogTitle: 'Bitcoin DEX Activity on Solana',
    ogDescription: 'Wrapped Bitcoin trading and DEX activity analysis on Solana',
    ogImage: '/og-images/wrapped-btc/dex.png',
    canonicalPath: '/wrapped-btc/dex-activity',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Wrapped BTC', url: '/wrapped-btc' },
      { name: 'DEX Activity', url: '/wrapped-btc/dex-activity' }
    ]
  },

  '/wrapped-btc/holders-supply': {
    title: 'Bitcoin Holders & Supply on Solana - wBTC Distribution | State of Solana',
    description: 'Track Bitcoin holders and supply metrics on Solana including wBTC distribution, holder analysis, and supply tracking.',
    keywords: 'Bitcoin holders Solana, wBTC supply, BTC distribution, holder analysis',
    ogTitle: 'Bitcoin Holders & Supply on Solana',
    ogDescription: 'Analysis of Bitcoin holder distribution and supply on Solana',
    ogImage: '/og-images/wrapped-btc/holders.png',
    canonicalPath: '/wrapped-btc/holders-supply',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Wrapped BTC', url: '/wrapped-btc' },
      { name: 'Holders & Supply', url: '/wrapped-btc/holders-supply' }
    ]
  },

  '/wrapped-btc/transfers': {
    title: 'Bitcoin Transfers on Solana - wBTC Transaction Analysis | State of Solana',
    description: 'Analyze Bitcoin transfer activity on Solana including wBTC transactions, transfer patterns, and bridge activity.',
    keywords: 'Bitcoin transfers Solana, wBTC transactions, BTC bridge activity, transfer analysis',
    ogTitle: 'Bitcoin Transfers on Solana Analytics',
    ogDescription: 'Comprehensive analysis of Bitcoin transfer activity on Solana',
    ogImage: '/og-images/wrapped-btc/transfers.png',
    canonicalPath: '/wrapped-btc/transfers',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Wrapped BTC', url: '/wrapped-btc' },
      { name: 'Transfers', url: '/wrapped-btc/transfers' }
    ]
  },

  // Launchpads Section
  '/launchpads': {
    title: 'Solana Launchpads - Token Launch Analytics | State of Solana',
    description: 'Comprehensive Solana launchpad analytics including token launches, pump.fun metrics, and meme coin launch tracking.',
    keywords: 'Solana launchpads, token launches, pump.fun, meme coins, token analytics',
    ogTitle: 'Solana Launchpad Analytics',
    ogDescription: 'Complete analysis of token launches and launchpad activity on Solana',
    ogImage: '/og-images/launchpads/overview.png',
    canonicalPath: '/launchpads',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Launchpads', url: '/launchpads' }
    ]
  },

  '/launchpads/bonding-curve-trade-stats': {
    title: 'Bonding Curve Trading - Solana Launchpad Metrics | State of Solana',
    description: 'Analyze bonding curve trading statistics on Solana launchpads including trade volume, price discovery, and curve dynamics.',
    keywords: 'bonding curve trading, launchpad trades, price discovery, curve dynamics',
    ogTitle: 'Solana Bonding Curve Trading Analytics',
    ogDescription: 'Analysis of bonding curve trading and price discovery on Solana',
    ogImage: '/og-images/launchpads/bonding-curve.png',
    canonicalPath: '/launchpads/bonding-curve-trade-stats',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Launchpads', url: '/launchpads' },
      { name: 'Bonding Curve', url: '/launchpads/bonding-curve-trade-stats' }
    ]
  },

  '/launchpads/fee-revenue': {
    title: 'Launchpad Fee Revenue - Solana Platform Economics | State of Solana',
    description: 'Track launchpad fee revenue on Solana including platform fees, revenue sharing, and launchpad monetization metrics.',
    keywords: 'launchpad fees, platform revenue, launch economics, fee analysis',
    ogTitle: 'Solana Launchpad Fee Revenue',
    ogDescription: 'Revenue analysis from Solana launchpad platforms and fee structures',
    ogImage: '/og-images/launchpads/revenue.png',
    canonicalPath: '/launchpads/fee-revenue',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Launchpads', url: '/launchpads' },
      { name: 'Fee Revenue', url: '/launchpads/fee-revenue' }
    ]
  },

  '/launchpads/post-migration-trade-stats': {
    title: 'Post-Migration Trading - Solana Token Performance | State of Solana',
    description: 'Analyze post-migration trading statistics for Solana tokens including DEX performance after launchpad graduation.',
    keywords: 'post-migration trading, token performance, DEX graduation, launch success',
    ogTitle: 'Solana Post-Migration Trading Analytics',
    ogDescription: 'Token performance analysis after launchpad migration to DEX trading',
    ogImage: '/og-images/launchpads/post-migration.png',
    canonicalPath: '/launchpads/post-migration-trade-stats',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Launchpads', url: '/launchpads' },
      { name: 'Post-Migration', url: '/launchpads/post-migration-trade-stats' }
    ]
  },

  '/launchpads/token-launches': {
    title: 'Token Launches - Solana New Token Analytics | State of Solana',
    description: 'Track new token launches on Solana including launch frequency, success rates, and token creation metrics.',
    keywords: 'token launches Solana, new tokens, launch analytics, token creation',
    ogTitle: 'Solana Token Launch Analytics',
    ogDescription: 'Comprehensive tracking of new token launches on Solana',
    ogImage: '/og-images/launchpads/launches.png',
    canonicalPath: '/launchpads/token-launches',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Launchpads', url: '/launchpads' },
      { name: 'Token Launches', url: '/launchpads/token-launches' }
    ]
  },

  // xStocks Section
  '/xstocks': {
    title: 'xStocks on Solana - Tokenized Stocks Analytics | State of Solana',
    description: 'Comprehensive xStocks analytics on Solana including tokenized stock trading, synthetic assets, and stock token metrics.',
    keywords: 'xStocks Solana, tokenized stocks, synthetic assets, stock tokens',
    ogTitle: 'xStocks on Solana Analytics',
    ogDescription: 'Analysis of tokenized stocks and synthetic assets on Solana',
    ogImage: '/og-images/xstocks/overview.png',
    canonicalPath: '/xstocks',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'xStocks', url: '/xstocks' }
    ]
  },

  '/xstocks/fee-revenue': {
    title: 'xStocks Fee Revenue - Tokenized Stock Economics | State of Solana',
    description: 'Track xStocks fee revenue on Solana including trading fees, tokenized stock economics, and platform monetization.',
    keywords: 'xStocks fees, tokenized stock revenue, synthetic asset fees, trading economics',
    ogTitle: 'xStocks Fee Revenue Analytics',
    ogDescription: 'Revenue analysis from tokenized stock trading on Solana',
    ogImage: '/og-images/xstocks/revenue.png',
    canonicalPath: '/xstocks/fee-revenue',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'xStocks', url: '/xstocks' },
      { name: 'Fee Revenue', url: '/xstocks/fee-revenue' }
    ]
  },

  '/xstocks/traction': {
    title: 'xStocks Traction - Adoption & Usage Metrics | State of Solana',
    description: 'Analyze xStocks traction on Solana including user adoption, trading activity, and tokenized stock popularity metrics.',
    keywords: 'xStocks adoption, tokenized stock usage, synthetic asset traction, user metrics',
    ogTitle: 'xStocks Traction & Adoption Analytics',
    ogDescription: 'User adoption and traction metrics for tokenized stocks on Solana',
    ogImage: '/og-images/xstocks/traction.png',
    canonicalPath: '/xstocks/traction',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'xStocks', url: '/xstocks' },
      { name: 'Traction', url: '/xstocks/traction' }
    ]
  },

  '/xstocks/tvl': {
    title: 'xStocks TVL - Tokenized Stock Value Locked | State of Solana',
    description: 'Track Total Value Locked (TVL) in xStocks on Solana including tokenized stock liquidity and synthetic asset value.',
    keywords: 'xStocks TVL, tokenized stock TVL, synthetic asset value, stock token liquidity',
    ogTitle: 'xStocks TVL Analytics',
    ogDescription: 'Total Value Locked metrics for tokenized stocks on Solana',
    ogImage: '/og-images/xstocks/tvl.png',
    canonicalPath: '/xstocks/tvl',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'xStocks', url: '/xstocks' },
      { name: 'TVL', url: '/xstocks/tvl' }
    ]
  },

  // SF Dashboards Section
  '/sf-dashboards': {
    title: 'Solana Foundation Dashboards - Ecosystem Analytics | State of Solana',
    description: 'Official Solana Foundation dashboard analytics including ecosystem metrics, sector analysis, and foundation-backed insights.',
    keywords: 'Solana Foundation, ecosystem analytics, foundation dashboards, sector analysis',
    ogTitle: 'Solana Foundation Dashboard Analytics',
    ogDescription: 'Official ecosystem analytics from Solana Foundation dashboards',
    ogImage: '/og-images/sf-dashboards/overview.png',
    canonicalPath: '/sf-dashboards',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'SF Dashboards', url: '/sf-dashboards' }
    ]
  },

  '/sf-dashboards/overview': {
    title: 'SF Dashboard Overview - Solana Ecosystem Summary | State of Solana',
    description: 'Overview of Solana Foundation dashboard metrics including ecosystem health, growth indicators, and foundation insights.',
    keywords: 'Solana Foundation overview, ecosystem summary, foundation metrics, ecosystem health',
    ogTitle: 'Solana Foundation Dashboard Overview',
    ogDescription: 'Comprehensive overview of Solana ecosystem from Foundation dashboards',
    ogImage: '/og-images/sf-dashboards/overview.png',
    canonicalPath: '/sf-dashboards/overview',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'SF Dashboards', url: '/sf-dashboards' },
      { name: 'Overview', url: '/sf-dashboards/overview' }
    ]
  },

  '/sf-dashboards/ai-tokens': {
    title: 'AI Tokens on Solana - Artificial Intelligence Assets | State of Solana',
    description: 'Track AI tokens and artificial intelligence projects on Solana including AI sector analytics and token performance.',
    keywords: 'AI tokens Solana, artificial intelligence, AI projects, AI sector analytics',
    ogTitle: 'AI Tokens on Solana Analytics',
    ogDescription: 'Comprehensive analysis of AI tokens and projects on Solana',
    ogImage: '/og-images/sf-dashboards/ai-tokens.png',
    canonicalPath: '/sf-dashboards/ai-tokens',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'SF Dashboards', url: '/sf-dashboards' },
      { name: 'AI Tokens', url: '/sf-dashboards/ai-tokens' }
    ]
  },

  '/sf-dashboards/bitcoin-on-solana': {
    title: 'Bitcoin on Solana Ecosystem - BTC Integration Analytics | State of Solana',
    description: 'Analyze Bitcoin ecosystem on Solana including BTC bridges, wrapped Bitcoin, and Bitcoin-related project metrics.',
    keywords: 'Bitcoin on Solana, BTC ecosystem, Bitcoin bridges, BTC integration',
    ogTitle: 'Bitcoin on Solana Ecosystem Analytics',
    ogDescription: 'Complete analysis of Bitcoin integration and ecosystem on Solana',
    ogImage: '/og-images/sf-dashboards/bitcoin.png',
    canonicalPath: '/sf-dashboards/bitcoin-on-solana',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'SF Dashboards', url: '/sf-dashboards' },
      { name: 'Bitcoin on Solana', url: '/sf-dashboards/bitcoin-on-solana' }
    ]
  },

  '/sf-dashboards/consumer': {
    title: 'Consumer Apps on Solana - User-Facing Applications | State of Solana',
    description: 'Track consumer applications on Solana including user-facing apps, adoption metrics, and consumer sector analytics.',
    keywords: 'Solana consumer apps, user applications, consumer adoption, app analytics',
    ogTitle: 'Consumer Apps on Solana Analytics',
    ogDescription: 'Analysis of consumer-facing applications and adoption on Solana',
    ogImage: '/og-images/sf-dashboards/consumer.png',
    canonicalPath: '/sf-dashboards/consumer',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'SF Dashboards', url: '/sf-dashboards' },
      { name: 'Consumer', url: '/sf-dashboards/consumer' }
    ]
  },

  '/sf-dashboards/defi': {
    title: 'DeFi on Solana - Decentralized Finance Analytics | State of Solana',
    description: 'Comprehensive DeFi analytics on Solana including protocol metrics, TVL analysis, and decentralized finance ecosystem insights.',
    keywords: 'Solana DeFi, decentralized finance, DeFi protocols, TVL analytics, yield farming',
    ogTitle: 'DeFi on Solana Analytics',
    ogDescription: 'Complete analysis of decentralized finance ecosystem on Solana',
    ogImage: '/og-images/sf-dashboards/defi.png',
    canonicalPath: '/sf-dashboards/defi',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'SF Dashboards', url: '/sf-dashboards' },
      { name: 'DeFi', url: '/sf-dashboards/defi' }
    ]
  },

  '/sf-dashboards/depin': {
    title: 'DePIN on Solana - Decentralized Physical Infrastructure | State of Solana',
    description: 'Track DePIN projects on Solana including decentralized infrastructure, hardware networks, and physical asset tokenization.',
    keywords: 'Solana DePIN, decentralized infrastructure, hardware networks, physical assets, Helium',
    ogTitle: 'DePIN on Solana Analytics',
    ogDescription: 'Analysis of decentralized physical infrastructure projects on Solana',
    ogImage: '/og-images/sf-dashboards/depin.png',
    canonicalPath: '/sf-dashboards/depin',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'SF Dashboards', url: '/sf-dashboards' },
      { name: 'DePIN', url: '/sf-dashboards/depin' }
    ]
  },

  '/sf-dashboards/payments': {
    title: 'Payments on Solana - Digital Payment Analytics | State of Solana',
    description: 'Analyze payment solutions on Solana including payment processors, transaction volume, and digital payment adoption metrics.',
    keywords: 'Solana payments, digital payments, payment solutions, transaction volume, payment processors',
    ogTitle: 'Payments on Solana Analytics',
    ogDescription: 'Comprehensive analysis of payment solutions and adoption on Solana',
    ogImage: '/og-images/sf-dashboards/payments.png',
    canonicalPath: '/sf-dashboards/payments',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'SF Dashboards', url: '/sf-dashboards' },
      { name: 'Payments', url: '/sf-dashboards/payments' }
    ]
  },

  '/sf-dashboards/rwa': {
    title: 'RWA on Solana - Real World Assets Analytics | State of Solana',
    description: 'Track Real World Assets (RWA) on Solana including tokenized assets, asset tokenization, and RWA sector metrics.',
    keywords: 'Solana RWA, real world assets, asset tokenization, tokenized assets, RWA sector',
    ogTitle: 'Real World Assets on Solana Analytics',
    ogDescription: 'Analysis of real world asset tokenization and RWA sector on Solana',
    ogImage: '/og-images/sf-dashboards/rwa.png',
    canonicalPath: '/sf-dashboards/rwa',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'SF Dashboards', url: '/sf-dashboards' },
      { name: 'RWA', url: '/sf-dashboards/rwa' }
    ]
  },

  '/sf-dashboards/stablecoins': {
    title: 'SF Stablecoins Dashboard - Digital Dollar Analytics | State of Solana',
    description: 'Solana Foundation stablecoin dashboard including USDC metrics, digital dollar adoption, and stablecoin ecosystem analysis.',
    keywords: 'SF stablecoins, foundation stablecoin metrics, USDC analytics, digital dollar ecosystem',
    ogTitle: 'SF Stablecoins Dashboard Analytics',
    ogDescription: 'Foundation insights into stablecoin adoption and metrics on Solana',
    ogImage: '/og-images/sf-dashboards/stablecoins.png',
    canonicalPath: '/sf-dashboards/stablecoins',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'SF Dashboards', url: '/sf-dashboards' },
      { name: 'Stablecoins', url: '/sf-dashboards/stablecoins' }
    ]
  },

  '/sf-dashboards/treasury': {
    title: 'Solana Treasury Analytics - Foundation Treasury Metrics | State of Solana',
    description: 'Analyze Solana Foundation treasury metrics including asset allocation, treasury management, and foundation financial health.',
    keywords: 'Solana treasury, foundation assets, treasury management, foundation finances',
    ogTitle: 'Solana Foundation Treasury Analytics',
    ogDescription: 'Treasury metrics and financial analysis of Solana Foundation',
    ogImage: '/og-images/sf-dashboards/treasury.png',
    canonicalPath: '/sf-dashboards/treasury',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'SF Dashboards', url: '/sf-dashboards' },
      { name: 'Treasury', url: '/sf-dashboards/treasury' }
    ]
  },

  '/sf-dashboards/vc-funding': {
    title: 'VC Funding on Solana - Investment Analytics | State of Solana',
    description: 'Track venture capital funding in Solana ecosystem including investment rounds, funding metrics, and VC activity analysis.',
    keywords: 'Solana VC funding, venture capital, investment rounds, startup funding, ecosystem investments',
    ogTitle: 'Solana VC Funding Analytics',
    ogDescription: 'Analysis of venture capital investment activity in Solana ecosystem',
    ogImage: '/og-images/sf-dashboards/vc-funding.png',
    canonicalPath: '/sf-dashboards/vc-funding',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'SF Dashboards', url: '/sf-dashboards' },
      { name: 'VC Funding', url: '/sf-dashboards/vc-funding' }
    ]
  },

  // Projects Section
  '/projects/helium': {
    title: 'Helium on Solana - Decentralized Wireless Network Analytics | State of Solana',
    description: 'Comprehensive Helium analytics on Solana including network growth, HNT/IOT metrics, and decentralized wireless infrastructure.',
    keywords: 'Helium Solana, HNT token, IOT network, decentralized wireless, DePIN infrastructure',
    ogTitle: 'Helium on Solana Analytics',
    ogDescription: 'Complete analysis of Helium decentralized wireless network on Solana',
    ogImage: '/og-images/projects/helium.png',
    canonicalPath: '/projects/helium',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Projects', url: '/projects' },
      { name: 'Helium', url: '/projects/helium' }
    ]
  },

  '/projects/metaplex': {
    title: 'Metaplex Analytics - Solana NFT Infrastructure | State of Solana',
    description: 'Analyze Metaplex protocol metrics including NFT creation, marketplace activity, and digital asset infrastructure on Solana.',
    keywords: 'Metaplex Solana, NFT infrastructure, digital assets, NFT protocol, marketplace metrics',
    ogTitle: 'Metaplex Protocol Analytics',
    ogDescription: 'Analysis of Metaplex NFT infrastructure and digital asset metrics',
    ogImage: '/og-images/projects/metaplex.png',
    canonicalPath: '/projects/metaplex',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Projects', url: '/projects' },
      { name: 'Metaplex', url: '/projects/metaplex' }
    ]
  },

  '/projects/orca': {
    title: 'Orca DEX Analytics - Solana Automated Market Maker | State of Solana',
    description: 'Comprehensive Orca DEX analytics including trading volume, liquidity pools, AMM performance, and yield farming metrics.',
    keywords: 'Orca DEX, Solana AMM, liquidity pools, yield farming, ORCA token',
    ogTitle: 'Orca DEX Analytics',
    ogDescription: 'Complete analysis of Orca automated market maker on Solana',
    ogImage: '/og-images/projects/orca.png',
    canonicalPath: '/projects/orca',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Projects', url: '/projects' },
      { name: 'Orca', url: '/projects/orca' }
    ]
  },

  '/projects/raydium': {
    title: 'Raydium Analytics - Solana AMM & Yield Farming | State of Solana',
    description: 'Analyze Raydium protocol metrics including AMM trading, yield farming, liquidity provision, and RAY token performance.',
    keywords: 'Raydium Solana, RAY token, yield farming, AMM protocol, liquidity mining',
    ogTitle: 'Raydium Protocol Analytics',
    ogDescription: 'Comprehensive analysis of Raydium AMM and yield farming on Solana',
    ogImage: '/og-images/projects/raydium.png',
    canonicalPath: '/projects/raydium',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Projects', url: '/projects' },
      { name: 'Raydium', url: '/projects/raydium' }
    ]
  },

  '/projects/sol-strategies': {
    title: 'SOL Strategies Analytics - Solana Investment Strategies | State of Solana',
    description: 'Track SOL investment strategies including staking yields, liquid staking, and Solana investment performance metrics.',
    keywords: 'SOL strategies, Solana staking, liquid staking, investment strategies, yield optimization',
    ogTitle: 'SOL Investment Strategies Analytics',
    ogDescription: 'Analysis of Solana investment strategies and yield optimization',
    ogImage: '/og-images/projects/sol-strategies.png',
    canonicalPath: '/projects/sol-strategies',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Projects', url: '/projects' },
      { name: 'SOL Strategies', url: '/projects/sol-strategies' }
    ]
  },

  // Blogs Section
  '/blogs': {
    title: 'Solana Research Blog - Blockchain Insights & Analysis | State of Solana',
    description: 'In-depth Solana research articles, blockchain insights, and comprehensive analysis of ecosystem developments and trends.',
    keywords: 'Solana blog, blockchain research, crypto insights, DeFi analysis, ecosystem research',
    ogTitle: 'Solana Research Blog & Insights',
    ogDescription: 'Expert insights and research articles on Solana blockchain ecosystem',
    ogImage: '/og-images/blog/blog-overview.png',
    canonicalPath: '/blogs',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Blog', url: '/blogs' }
    ]
  },

  // Test & Markdown Pages
  '/test': {
    title: 'Test Page - State of Solana',
    description: 'Test page for State of Solana analytics platform development and feature testing.',
    keywords: 'test page, development, analytics testing',
    ogTitle: 'State of Solana Test Page',
    ogDescription: 'Development and testing page for platform features',
    ogImage: '/og-images/test.png',
    canonicalPath: '/test'
  },

  '/test-analytics': {
    title: 'Analytics Testing - State of Solana',
    description: 'Analytics testing page for State of Solana platform development and metric validation.',
    keywords: 'analytics testing, metrics validation, development testing',
    ogTitle: 'State of Solana Analytics Testing',
    ogDescription: 'Testing and validation page for analytics features',
    ogImage: '/og-images/test-analytics.png',
    canonicalPath: '/test-analytics'
  },

  '/markdown-guide': {
    title: 'Markdown Guide - State of Solana Documentation',
    description: 'Comprehensive markdown guide for State of Solana platform including formatting, syntax, and documentation standards.',
    keywords: 'markdown guide, documentation, formatting guide, syntax reference',
    ogTitle: 'State of Solana Markdown Guide',
    ogDescription: 'Complete markdown formatting and documentation guide',
    ogImage: '/og-images/markdown-guide.png',
    canonicalPath: '/markdown-guide'
  },

  '/blogs/[slug]': {
    title: 'Solana Research Blog - Blockchain Insights | State of Solana',
    description: 'In-depth research and analysis of Solana blockchain ecosystem, trends, and developments.',
    keywords: 'Solana research, blockchain insights, crypto analysis, DeFi research',
    ogTitle: 'Solana Research Blog',
    ogDescription: 'Expert insights and research on Solana blockchain ecosystem',
    ogImage: '/og-images/blogs.png',
    canonicalPath: '/blogs/[slug]',
    breadcrumbs: [
      {
        name: 'Home',
        url: '/'
      },
      {
        name: 'Blogs',
        url: '/blogs'
      }
    ]
  },

  '/projects/helium/competitive-landscape': {
    title: 'Helium Competitive Landscape - Project Analytics | State of Solana',
    description: 'Analyze Helium competitive landscape and market positioning in the Solana ecosystem with comprehensive analytics.',
    keywords: 'Solana projects, Helium, competitive analysis, market landscape, DePIN analytics',
    ogTitle: 'Helium Competitive Landscape Analysis',
    ogDescription: 'Comprehensive analysis of Helium competitive positioning in Solana ecosystem',
    ogImage: '/og-images/projects/helium.png',
    canonicalPath: '/projects/helium/competitive-landscape',
    breadcrumbs: [
      {
        name: 'Home',
        url: '/'
      },
      {
        name: 'Projects',
        url: '/projects'
      },
      {
        name: 'Helium',
        url: '/projects/helium'
      },
      {
        name: 'Competitive Landscape',
        url: '/projects/helium/competitive-landscape'
      }
    ]
  },

  '/projects/helium/financials': {
    title: 'Helium Financials - Revenue & Growth Metrics | State of Solana',
    description: 'Track Helium financial metrics including revenue, growth, and key performance indicators on Solana.',
    keywords: 'Helium financials, revenue metrics, growth analytics, DePIN economics',
    ogTitle: 'Helium Financial Analytics',
    ogDescription: 'Complete analysis of Helium financial performance and metrics',
    ogImage: '/og-images/projects/helium.png',
    canonicalPath: '/projects/helium/financials',
    breadcrumbs: [
      {
        name: 'Home',
        url: '/'
      },
      {
        name: 'Projects',
        url: '/projects'
      },
      {
        name: 'Helium',
        url: '/projects/helium'
      },
      {
        name: 'Financials',
        url: '/projects/helium/financials'
      }
    ]
  },

  '/projects/helium/governance': {
    title: 'Helium Governance - DAO & Protocol Analytics | State of Solana',
    description: 'Analyze Helium governance metrics including DAO activity, voting patterns, and protocol decisions.',
    keywords: 'Helium governance, DAO analytics, voting metrics, protocol decisions',
    ogTitle: 'Helium Governance Analytics',
    ogDescription: 'Analysis of Helium DAO governance and protocol decisions',
    ogImage: '/og-images/projects/helium.png',
    canonicalPath: '/projects/helium/governance',
    breadcrumbs: [
      {
        name: 'Home',
        url: '/'
      },
      {
        name: 'Projects',
        url: '/projects'
      },
      {
        name: 'Helium',
        url: '/projects/helium'
      },
      {
        name: 'Governance',
        url: '/projects/helium/governance'
      }
    ]
  },

  '/projects/helium/protocol-token': {
    title: 'Helium Token (HNT) - Price & Supply Analytics | State of Solana',
    description: 'Track Helium token (HNT) metrics including price, supply dynamics, and token economics on Solana.',
    keywords: 'Helium token, HNT price, token supply, token economics',
    ogTitle: 'Helium Token Analytics',
    ogDescription: 'Analysis of Helium token (HNT) metrics and economics',
    ogImage: '/og-images/projects/helium.png',
    canonicalPath: '/projects/helium/protocol-token',
    breadcrumbs: [
      {
        name: 'Home',
        url: '/'
      },
      {
        name: 'Projects',
        url: '/projects'
      },
      {
        name: 'Helium',
        url: '/projects/helium'
      },
      {
        name: 'Protocol Token',
        url: '/projects/helium/protocol-token'
      }
    ]
  },

  '/projects/helium/traction': {
    title: 'Helium Traction - Network Growth & Adoption | State of Solana',
    description: 'Track Helium network growth metrics including adoption, network coverage, and ecosystem expansion.',
    keywords: 'Helium traction, network growth, adoption metrics, ecosystem expansion',
    ogTitle: 'Helium Network Growth Analytics',
    ogDescription: 'Analysis of Helium network adoption and growth metrics',
    ogImage: '/og-images/projects/helium.png',
    canonicalPath: '/projects/helium/traction',
    breadcrumbs: [
      {
        name: 'Home',
        url: '/'
      },
      {
        name: 'Projects',
        url: '/projects'
      },
      {
        name: 'Helium',
        url: '/projects/helium'
      },
      {
        name: 'Traction',
        url: '/projects/helium/traction'
      }
    ]
  },

  '/projects/metaplex/competitive-landscape':   {
      "title": "Metaplex - Projects Analytics | State of Solana",
      "description": "Analyze metaplex metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "keywords": "Solana projects, metaplex, blockchain analytics, projects metrics",
      "ogTitle": "Metaplex - Projects Analytics",
      "ogDescription": "Analyze metaplex metrics for projects on Solana blockchain with comprehensive analytics and insig...",
      "ogImage": "/og-images/projects.png",
      "canonicalPath": "/projects/metaplex/competitive-landscape",
      "breadcrumbs": [
          {
              "name": "Home",
              "url": "/"
          },
          {
              "name": "Projects",
              "url": "/projects"
          },
          {
              "name": "Metaplex",
              "url": "/projects/metaplex"
          },
          {
              "name": "Competitive Landscape",
              "url": "/projects/metaplex/competitive-landscape"
          }
      ]
  },

  '/projects/metaplex/financials':   {
      "title": "Metaplex - Projects Analytics | State of Solana",
      "description": "Analyze metaplex metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "keywords": "Solana projects, metaplex, blockchain analytics, projects metrics",
      "ogTitle": "Metaplex - Projects Analytics",
      "ogDescription": "Analyze metaplex metrics for projects on Solana blockchain with comprehensive analytics and insig...",
      "ogImage": "/og-images/projects.png",
      "canonicalPath": "/projects/metaplex/financials",
      "breadcrumbs": [
          {
              "name": "Home",
              "url": "/"
          },
          {
              "name": "Projects",
              "url": "/projects"
          },
          {
              "name": "Metaplex",
              "url": "/projects/metaplex"
          },
          {
              "name": "Financials",
              "url": "/projects/metaplex/financials"
          }
      ]
  },

  '/projects/metaplex/protocol-token':   {
      "title": "Metaplex - Projects Analytics | State of Solana",
      "description": "Analyze metaplex metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "keywords": "Solana projects, metaplex, blockchain analytics, projects metrics",
      "ogTitle": "Metaplex - Projects Analytics",
      "ogDescription": "Analyze metaplex metrics for projects on Solana blockchain with comprehensive analytics and insig...",
      "ogImage": "/og-images/projects.png",
      "canonicalPath": "/projects/metaplex/protocol-token",
      "breadcrumbs": [
          {
              "name": "Home",
              "url": "/"
          },
          {
              "name": "Projects",
              "url": "/projects"
          },
          {
              "name": "Metaplex",
              "url": "/projects/metaplex"
          },
          {
              "name": "Protocol Token",
              "url": "/projects/metaplex/protocol-token"
          }
      ]
  },

  '/projects/metaplex/traction':   {
      "title": "Metaplex - Projects Analytics | State of Solana",
      "description": "Analyze metaplex metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "keywords": "Solana projects, metaplex, blockchain analytics, projects metrics",
      "ogTitle": "Metaplex - Projects Analytics",
      "ogDescription": "Analyze metaplex metrics for projects on Solana blockchain with comprehensive analytics and insig...",
      "ogImage": "/og-images/projects.png",
      "canonicalPath": "/projects/metaplex/traction",
      "breadcrumbs": [
          {
              "name": "Home",
              "url": "/"
          },
          {
              "name": "Projects",
              "url": "/projects"
          },
          {
              "name": "Metaplex",
              "url": "/projects/metaplex"
          },
          {
              "name": "Traction",
              "url": "/projects/metaplex/traction"
          }
      ]
  },

  '/projects/orca/competitive-landscape':   {
      "title": "Orca - Projects Analytics | State of Solana",
      "description": "Analyze orca metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "keywords": "Solana projects, orca, blockchain analytics, projects metrics",
      "ogTitle": "Orca - Projects Analytics",
      "ogDescription": "Analyze orca metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "ogImage": "/og-images/projects.png",
      "canonicalPath": "/projects/orca/competitive-landscape",
      "breadcrumbs": [
          {
              "name": "Home",
              "url": "/"
          },
          {
              "name": "Projects",
              "url": "/projects"
          },
          {
              "name": "Orca",
              "url": "/projects/orca"
          },
          {
              "name": "Competitive Landscape",
              "url": "/projects/orca/competitive-landscape"
          }
      ]
  },

  '/projects/orca/financials':   {
      "title": "Orca - Projects Analytics | State of Solana",
      "description": "Analyze orca metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "keywords": "Solana projects, orca, blockchain analytics, projects metrics",
      "ogTitle": "Orca - Projects Analytics",
      "ogDescription": "Analyze orca metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "ogImage": "/og-images/projects.png",
      "canonicalPath": "/projects/orca/financials",
      "breadcrumbs": [
          {
              "name": "Home",
              "url": "/"
          },
          {
              "name": "Projects",
              "url": "/projects"
          },
          {
              "name": "Orca",
              "url": "/projects/orca"
          },
          {
              "name": "Financials",
              "url": "/projects/orca/financials"
          }
      ]
  },

  '/projects/orca/protocol-token':   {
      "title": "Orca - Projects Analytics | State of Solana",
      "description": "Analyze orca metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "keywords": "Solana projects, orca, blockchain analytics, projects metrics",
      "ogTitle": "Orca - Projects Analytics",
      "ogDescription": "Analyze orca metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "ogImage": "/og-images/projects.png",
      "canonicalPath": "/projects/orca/protocol-token",
      "breadcrumbs": [
          {
              "name": "Home",
              "url": "/"
          },
          {
              "name": "Projects",
              "url": "/projects"
          },
          {
              "name": "Orca",
              "url": "/projects/orca"
          },
          {
              "name": "Protocol Token",
              "url": "/projects/orca/protocol-token"
          }
      ]
  },

  '/projects/orca/traction':   {
      "title": "Orca - Projects Analytics | State of Solana",
      "description": "Analyze orca metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "keywords": "Solana projects, orca, blockchain analytics, projects metrics",
      "ogTitle": "Orca - Projects Analytics",
      "ogDescription": "Analyze orca metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "ogImage": "/og-images/projects.png",
      "canonicalPath": "/projects/orca/traction",
      "breadcrumbs": [
          {
              "name": "Home",
              "url": "/"
          },
          {
              "name": "Projects",
              "url": "/projects"
          },
          {
              "name": "Orca",
              "url": "/projects/orca"
          },
          {
              "name": "Traction",
              "url": "/projects/orca/traction"
          }
      ]
  },

  '/projects/raydium/competetive-landscape':   {
      "title": "Raydium - Projects Analytics | State of Solana",
      "description": "Analyze raydium metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "keywords": "Solana projects, raydium, blockchain analytics, projects metrics",
      "ogTitle": "Raydium - Projects Analytics",
      "ogDescription": "Analyze raydium metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "ogImage": "/og-images/projects.png",
      "canonicalPath": "/projects/raydium/competetive-landscape",
      "breadcrumbs": [
          {
              "name": "Home",
              "url": "/"
          },
          {
              "name": "Projects",
              "url": "/projects"
          },
          {
              "name": "Raydium",
              "url": "/projects/raydium"
          },
          {
              "name": "Competetive Landscape",
              "url": "/projects/raydium/competetive-landscape"
          }
      ]
  },

  '/projects/raydium/financials':   {
      "title": "Raydium - Projects Analytics | State of Solana",
      "description": "Analyze raydium metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "keywords": "Solana projects, raydium, blockchain analytics, projects metrics",
      "ogTitle": "Raydium - Projects Analytics",
      "ogDescription": "Analyze raydium metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "ogImage": "/og-images/projects.png",
      "canonicalPath": "/projects/raydium/financials",
      "breadcrumbs": [
          {
              "name": "Home",
              "url": "/"
          },
          {
              "name": "Projects",
              "url": "/projects"
          },
          {
              "name": "Raydium",
              "url": "/projects/raydium"
          },
          {
              "name": "Financials",
              "url": "/projects/raydium/financials"
          }
      ]
  },

  '/projects/raydium/protocol-token':   {
      "title": "Raydium - Projects Analytics | State of Solana",
      "description": "Analyze raydium metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "keywords": "Solana projects, raydium, blockchain analytics, projects metrics",
      "ogTitle": "Raydium - Projects Analytics",
      "ogDescription": "Analyze raydium metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "ogImage": "/og-images/projects.png",
      "canonicalPath": "/projects/raydium/protocol-token",
      "breadcrumbs": [
          {
              "name": "Home",
              "url": "/"
          },
          {
              "name": "Projects",
              "url": "/projects"
          },
          {
              "name": "Raydium",
              "url": "/projects/raydium"
          },
          {
              "name": "Protocol Token",
              "url": "/projects/raydium/protocol-token"
          }
      ]
  },

  '/projects/raydium/traction':   {
      "title": "Raydium - Projects Analytics | State of Solana",
      "description": "Analyze raydium metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "keywords": "Solana projects, raydium, blockchain analytics, projects metrics",
      "ogTitle": "Raydium - Projects Analytics",
      "ogDescription": "Analyze raydium metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "ogImage": "/og-images/projects.png",
      "canonicalPath": "/projects/raydium/traction",
      "breadcrumbs": [
          {
              "name": "Home",
              "url": "/"
          },
          {
              "name": "Projects",
              "url": "/projects"
          },
          {
              "name": "Raydium",
              "url": "/projects/raydium"
          },
          {
              "name": "Traction",
              "url": "/projects/raydium/traction"
          }
      ]
  },

  '/projects/sol-strategies/financials':   {
      "title": "Sol Strategies - Projects Analytics | State of Solana",
      "description": "Analyze sol strategies metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "keywords": "Solana projects, sol-strategies, blockchain analytics, projects metrics",
      "ogTitle": "Sol Strategies - Projects Analytics",
      "ogDescription": "Analyze sol strategies metrics for projects on Solana blockchain with comprehensive analytics and...",
      "ogImage": "/og-images/projects.png",
      "canonicalPath": "/projects/sol-strategies/financials",
      "breadcrumbs": [
          {
              "name": "Home",
              "url": "/"
          },
          {
              "name": "Projects",
              "url": "/projects"
          },
          {
              "name": "Sol Strategies",
              "url": "/projects/sol-strategies"
          },
          {
              "name": "Financials",
              "url": "/projects/sol-strategies/financials"
          }
      ]
  },

  '/projects/sol-strategies/overview':   {
      "title": "Sol Strategies - Projects Analytics | State of Solana",
      "description": "Analyze sol strategies metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "keywords": "Solana projects, sol-strategies, blockchain analytics, projects metrics",
      "ogTitle": "Sol Strategies - Projects Analytics",
      "ogDescription": "Analyze sol strategies metrics for projects on Solana blockchain with comprehensive analytics and...",
      "ogImage": "/og-images/projects.png",
      "canonicalPath": "/projects/sol-strategies/overview",
      "breadcrumbs": [
          {
              "name": "Home",
              "url": "/"
          },
          {
              "name": "Projects",
              "url": "/projects"
          },
          {
              "name": "Sol Strategies",
              "url": "/projects/sol-strategies"
          },
          {
              "name": "Overview",
              "url": "/projects/sol-strategies/overview"
          }
      ]
  },

  '/projects/sol-strategies/revenue':   {
      "title": "Sol Strategies - Projects Analytics | State of Solana",
      "description": "Analyze sol strategies metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "keywords": "Solana projects, sol-strategies, blockchain analytics, projects metrics",
      "ogTitle": "Sol Strategies - Projects Analytics",
      "ogDescription": "Analyze sol strategies metrics for projects on Solana blockchain with comprehensive analytics and...",
      "ogImage": "/og-images/projects.png",
      "canonicalPath": "/projects/sol-strategies/revenue",
      "breadcrumbs": [
          {
              "name": "Home",
              "url": "/"
          },
          {
              "name": "Projects",
              "url": "/projects"
          },
          {
              "name": "Sol Strategies",
              "url": "/projects/sol-strategies"
          },
          {
              "name": "Revenue",
              "url": "/projects/sol-strategies/revenue"
          }
      ]
  },

  '/public/[id]':   {
      "title": "[id] - Public Analytics | State of Solana",
      "description": "Analyze [id] metrics for public on Solana blockchain with comprehensive analytics and insights.",
      "keywords": "Solana public, [id], blockchain analytics, public metrics",
      "ogTitle": "[id] - Public Analytics",
      "ogDescription": "Analyze [id] metrics for public on Solana blockchain with comprehensive analytics and insights.",
      "ogImage": "/og-images/public.png",
      "canonicalPath": "/public/[id]",
      "breadcrumbs": [
          {
              "name": "Home",
              "url": "/"
          },
          {
              "name": "Public",
              "url": "/public"
          },
          {
              "name": "[id]",
              "url": "/public/[id]"
          }
      ]
  },

  '/projects/sol-strategies/staking':   {
      "title": "Sol Strategies - Projects Analytics | State of Solana",
      "description": "Analyze sol strategies metrics for projects on Solana blockchain with comprehensive analytics and insights.",
      "keywords": "Solana projects, sol-strategies, blockchain analytics, projects metrics",
      "ogTitle": "Sol Strategies - Projects Analytics",
      "ogDescription": "Analyze sol strategies metrics for projects on Solana blockchain with comprehensive analytics and...",
      "ogImage": "/og-images/projects.png",
      "canonicalPath": "/projects/sol-strategies/staking",
      "breadcrumbs": [
          {
              "name": "Home",
              "url": "/"
          },
          {
              "name": "Projects",
              "url": "/projects"
          },
          {
              "name": "Sol Strategies",
              "url": "/projects/sol-strategies"
          },
          {
              "name": "Staking",
              "url": "/projects/sol-strategies/staking"
          }
      ]
  },
};

// Helper function to get metadata for a specific path
export function getPageMetadata(path: string): PageMetadata | null {
  return pageMetadata[path] || null;
}

// Helper function to generate Next.js Metadata object
export function generateNextMetadata(path: string): Metadata {
  const pageMeta = getPageMetadata(path);
  
  if (!pageMeta) {
    // Default metadata if no specific metadata found
    return {
      title: 'State of Solana - Blockchain Analytics & Research',
      description: 'Comprehensive Solana blockchain analytics and research platform',
      keywords: 'Solana, blockchain, analytics, research',
    };
  }

  return {
    title: pageMeta.title,
    description: pageMeta.description,
    keywords: pageMeta.keywords,
    authors: [{ name: 'TopLedger Research' }],
    creator: 'TopLedger Research',
    publisher: 'TopLedger Research',
    openGraph: {
      title: pageMeta.ogTitle,
      description: pageMeta.ogDescription,
      images: pageMeta.ogImage ? [
        {
          url: pageMeta.ogImage,
          width: 1200,
          height: 630,
          alt: pageMeta.ogTitle,
        }
      ] : undefined,
      type: 'website',
      siteName: 'State of Solana',
      url: `${BASE_URL}${pageMeta.canonicalPath}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: pageMeta.ogTitle,
      description: pageMeta.ogDescription,
      images: pageMeta.ogImage ? [pageMeta.ogImage] : undefined,
      creator: '@topledger',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: `${BASE_URL}${pageMeta.canonicalPath}`,
    },
    other: {
      'theme-color': '#000000',
      'msapplication-TileColor': '#000000',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'black-translucent',
    },
  };
}

// Helper function to generate structured data
export function generateStructuredData(path: string) {
  const pageMeta = getPageMetadata(path);
  
  if (!pageMeta) return null;

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": pageMeta.title,
    "description": pageMeta.description,
    "url": `${BASE_URL}${pageMeta.canonicalPath}`,
    "isPartOf": {
      "@type": "WebSite",
      "name": "State of Solana",
      "url": BASE_URL
    },
    "about": {
      "@type": "Dataset",
      "name": pageMeta.ogTitle,
      "description": pageMeta.ogDescription,
      "keywords": pageMeta.keywords,
      "provider": {
        "@type": "Organization",
        "name": "TopLedger Research",
        "url": BASE_URL
      }
    },
    "breadcrumb": pageMeta.breadcrumbs ? {
      "@type": "BreadcrumbList",
      "itemListElement": pageMeta.breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": crumb.name,
        "item": `${BASE_URL}${crumb.url}`
      }))
    } : undefined
  };
}

// Export default metadata for fallback
export const defaultPageMetadata: PageMetadata = {
  title: 'State of Solana - Blockchain Analytics & Research',
  description: 'Comprehensive Solana blockchain analytics, metrics, and research platform with real-time data and insights.',
  keywords: 'Solana, blockchain analytics, DeFi, cryptocurrency research, network metrics',
  ogTitle: 'State of Solana Analytics Platform',
  ogDescription: 'Real-time Solana blockchain analytics and research',
  ogImage: '/og-images/default.png',
  canonicalPath: '/'
}; 