#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { ApiCatalogEntry, ApiCatalog, API_DOMAINS, COLUMN_TYPES } from '../types/api-catalog';

// Original API structure from api-cache.json
interface OriginalApiConfig {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  columns: string[];
  chartTitle?: string;
  apiKey?: string;
  additionalOptions?: any;
  page?: string;
}

// Utility functions for intelligent keyword extraction
function extractKeywords(api: OriginalApiConfig): string[] {
  const keywords = new Set<string>();
  
  // Extract from chart title
  if (api.chartTitle) {
    const titleWords = api.chartTitle.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    titleWords.forEach(word => keywords.add(word));
  }
  
  // Extract from name
  if (api.name) {
    const nameWords = api.name.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    nameWords.forEach(word => keywords.add(word));
  }
  
  // Extract from columns
  api.columns.forEach(col => {
    const colWords = col.toLowerCase()
      .replace(/_/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    colWords.forEach(word => keywords.add(word));
  });
  
  // Add domain-specific keywords
  if (api.page) {
    keywords.add(api.page.replace(/-/g, ' '));
  }
  
  return Array.from(keywords);
}

function classifyColumn(column: string): string {
  const lowerCol = column.toLowerCase();
  
  // Check each column type
  for (const [type, patterns] of Object.entries(COLUMN_TYPES)) {
    if (patterns.some(pattern => lowerCol.includes(pattern))) {
      return type.toLowerCase();
    }
  }
  
  // Default classification
  if (lowerCol.includes('date') || lowerCol.includes('time')) return 'time';
  if (lowerCol.includes('volume') || lowerCol.includes('amount')) return 'volume';
  if (lowerCol.includes('price') || lowerCol.includes('rate')) return 'price';
  if (lowerCol.includes('count') || lowerCol.includes('number')) return 'count';
  if (lowerCol.includes('pct') || lowerCol.includes('percent')) return 'percentage';
  
  return 'metric';
}

function getDomainFromPage(page?: string): string {
  if (!page) return 'overview';
  
  // Map page to domain
  const domainMap: Record<string, string> = {
    'dashboard': 'overview',
    'network-usage': 'overview',
    'market-dynamics': 'overview',
    'dex-summary': 'dex',
    'volume': 'dex',
    'tvl': 'dex',
    'traders': 'dex',
    'aggregators': 'dex',
    'rev-cost-capacity': 'rev',
    'rev-issuance-burn': 'rev',
    'rev-total-economic-value': 'rev',
    'mev-summary': 'mev',
    'dex-token-hotspots': 'mev',
    'extracted-value-pnl': 'mev',
    'stablecoin-usage': 'stablecoins',
    'transaction-activity': 'stablecoins',
    'liquidity-velocity': 'stablecoins',
    'mint-burn': 'stablecoins',
    'cexs': 'stablecoins',
    'stablecoins-tvl': 'stablecoins',
    'compute-units': 'compute-units',
    'transaction-bytes': 'compute-units',
    'cu-overspending': 'compute-units',
    'holders-supply': 'wrapped-btc',
    'btc-tvl': 'wrapped-btc',
    'transfers': 'wrapped-btc',
    'dex-activity': 'wrapped-btc',
    'raydium-financials': 'raydium',
    'raydium-traction': 'raydium',
    'raydium-protocol-token': 'raydium',
    'raydium-competetive-landscape': 'raydium',
    'test': 'test'
  };
  
  return domainMap[page] || 'overview';
}

function suggestChartTypes(columns: string[]): string[] {
  const hasTime = columns.some(col => classifyColumn(col) === 'time');
  const hasVolume = columns.some(col => classifyColumn(col) === 'volume');
  const hasCount = columns.some(col => classifyColumn(col) === 'count');
  
  if (hasTime && hasVolume) return ['area', 'line'];
  if (hasTime && hasCount) return ['line', 'bar'];
  if (hasTime) return ['line'];
  if (hasVolume) return ['bar', 'area'];
  
  return ['bar', 'line'];
}

function createCatalogEntry(api: OriginalApiConfig): ApiCatalogEntry {
  const domain = getDomainFromPage(api.page);
  const keywords = extractKeywords(api);
  const chartTypes = suggestChartTypes(api.columns);
  
  // Create response schema
  const responseSchema: { [column: string]: string } = {};
  api.columns.forEach(col => {
    responseSchema[col] = classifyColumn(col);
  });
  
  // Extract time aggregation info
  const aggregationTypes: string[] = [];
  if (api.additionalOptions?.filters?.timeFilter?.options) {
    const timeOptions = api.additionalOptions.filters.timeFilter.options;
    if (timeOptions.includes('D')) aggregationTypes.push('daily');
    if (timeOptions.includes('W')) aggregationTypes.push('weekly');
    if (timeOptions.includes('M')) aggregationTypes.push('monthly');
    if (timeOptions.includes('Q')) aggregationTypes.push('quarterly');
    if (timeOptions.includes('Y')) aggregationTypes.push('yearly');
  }
  
  // Create description from chart title or name
  const description = api.chartTitle || api.name || `${domain} data endpoint`;
  
  return {
    id: api.id,
    domain,
    title: description,
    url: api.endpoint,
    method: api.method,
    response_schema: responseSchema,
    keywords,
    description,
    aggregation_types: aggregationTypes.length > 0 ? aggregationTypes : undefined,
    chart_types: chartTypes
  };
}

async function main() {
  console.log('🚀 Building API Catalog for RAG System...');
  
  // Read original API cache
  const cacheFilePath = path.join(process.cwd(), 'public', 'api-cache.json');
  const originalApis: OriginalApiConfig[] = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
  
  console.log(`📊 Found ${originalApis.length} APIs to convert`);
  
  // Convert to catalog format
  const catalogEntries: ApiCatalogEntry[] = originalApis.map(api => createCatalogEntry(api));
  
  // Create catalog
  const catalog: ApiCatalog = {
    entries: catalogEntries,
    version: '1.0.0',
    last_updated: new Date().toISOString()
  };
  
  // Save catalog
  const catalogPath = path.join(process.cwd(), 'data', 'api-catalog.json');
  
  // Create data directory if it doesn't exist
  const dataDir = path.dirname(catalogPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
  
  console.log(`✅ API Catalog created with ${catalog.entries.length} entries`);
  console.log(`📝 Saved to: ${catalogPath}`);
  
  // Print statistics
  const domainStats = catalog.entries.reduce((stats, entry) => {
    stats[entry.domain] = (stats[entry.domain] || 0) + 1;
    return stats;
  }, {} as Record<string, number>);
  
  console.log('\n📈 Domain Statistics:');
  Object.entries(domainStats).forEach(([domain, count]) => {
    console.log(`  ${domain}: ${count} APIs`);
  });
  
  console.log('\n🎯 RAG-ready API catalog created successfully!');
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as buildApiCatalog }; 