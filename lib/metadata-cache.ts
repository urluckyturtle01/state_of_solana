import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface CachedChartSpec {
  id: string;
  normalizedQuery: string;
  originalQuery: string;
  chartSpec: any;
  selectedApis: string[];
  confidence: number;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  hitCount: number;
  lastAccessed: number;
  userFeedback?: 'positive' | 'negative' | 'neutral';
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  avgConfidence: number;
  popularQueries: Array<{ query: string; hits: number }>;
  apiUsageFrequency: Record<string, number>;
}

export class MetadataCache {
  private cache: Map<string, CachedChartSpec> = new Map();
  private cacheFilePath: string;
  private maxEntries: number;
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    cacheDir: string = 'public/temp',
    maxEntries: number = 1000,
    defaultTTL: number = 24 * 60 * 60 * 1000 // 24 hours
  ) {
    this.cacheFilePath = path.join(cacheDir, 'metadata-cache.json');
    this.maxEntries = maxEntries;
    this.defaultTTL = defaultTTL;
    this.startCleanupProcess();
  }

  /**
   * Normalize query to improve cache hit rates
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Standardize common terms
      .replace(/\b(show|display|chart|graph|plot)\b/g, '')
      .replace(/\b(over time|across time|by time|vs time)\b/g, 'time_series')
      .replace(/\b(compare|comparison|vs|versus)\b/g, 'compare')
      .replace(/\b(volume|trading volume|trade volume)\b/g, 'volume')
      .replace(/\b(price|pricing|cost)\b/g, 'price')
      // Remove common words
      .replace(/\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generate cache key from normalized query
   */
  private generateCacheKey(normalizedQuery: string): string {
    return crypto.createHash('md5').update(normalizedQuery).digest('hex');
  }

  /**
   * Check if cache entry is valid (not expired)
   */
  private isValidEntry(entry: CachedChartSpec): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Load cache from disk
   */
  async loadCache(): Promise<void> {
    try {
      const data = await fs.readFile(this.cacheFilePath, 'utf-8');
      const cacheData = JSON.parse(data);
      
      this.cache.clear();
      for (const [key, value] of Object.entries(cacheData)) {
        const entry = value as CachedChartSpec;
        if (this.isValidEntry(entry)) {
          this.cache.set(key, entry);
        }
      }
      
      console.log(`Loaded ${this.cache.size} valid cache entries`);
    } catch (error) {
      console.log('No existing cache found, starting fresh');
    }
  }

  /**
   * Save cache to disk
   */
  async saveCache(): Promise<void> {
    try {
      const cacheObject = Object.fromEntries(this.cache);
      await fs.writeFile(this.cacheFilePath, JSON.stringify(cacheObject, null, 2));
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }

  /**
   * Get cached chart spec for a query
   */
  async get(query: string): Promise<CachedChartSpec | null> {
    const normalizedQuery = this.normalizeQuery(query);
    const cacheKey = this.generateCacheKey(normalizedQuery);
    
    const entry = this.cache.get(cacheKey);
    if (!entry || !this.isValidEntry(entry)) {
      return null;
    }

    // Update access statistics
    entry.hitCount++;
    entry.lastAccessed = Date.now();
    
    return entry;
  }

  /**
   * Store chart spec in cache
   */
  async set(
    query: string,
    chartSpec: any,
    selectedApis: string[],
    confidence: number,
    ttl?: number
  ): Promise<void> {
    const normalizedQuery = this.normalizeQuery(query);
    const cacheKey = this.generateCacheKey(normalizedQuery);
    
    const entry: CachedChartSpec = {
      id: cacheKey,
      normalizedQuery,
      originalQuery: query,
      chartSpec,
      selectedApis,
      confidence,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hitCount: 0,
      lastAccessed: Date.now()
    };

    this.cache.set(cacheKey, entry);

    // Enforce max entries limit
    if (this.cache.size > this.maxEntries) {
      await this.evictOldestEntries();
    }

    await this.saveCache();
  }

  /**
   * Update user feedback for a cached entry
   */
  async updateFeedback(query: string, feedback: 'positive' | 'negative' | 'neutral'): Promise<void> {
    const normalizedQuery = this.normalizeQuery(query);
    const cacheKey = this.generateCacheKey(normalizedQuery);
    
    const entry = this.cache.get(cacheKey);
    if (entry) {
      entry.userFeedback = feedback;
      await this.saveCache();
    }
  }

  /**
   * Evict oldest entries when cache is full
   */
  private async evictOldestEntries(): Promise<void> {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    const toRemove = entries.slice(0, Math.floor(this.maxEntries * 0.1)); // Remove 10%
    for (const [key] of toRemove) {
      this.cache.delete(key);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(): void {
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (!this.isValidEntry(entry)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Start periodic cleanup process
   */
  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60 * 60 * 1000); // Cleanup every hour
  }

  /**
   * Stop cleanup process
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0);
    
    // Calculate hit rate (entries with hits > 0)
    const entriesWithHits = entries.filter(e => e.hitCount > 0).length;
    const hitRate = entries.length > 0 ? entriesWithHits / entries.length : 0;
    
    // Average confidence
    const avgConfidence = entries.length > 0 
      ? entries.reduce((sum, entry) => sum + entry.confidence, 0) / entries.length 
      : 0;
    
    // Popular queries
    const popularQueries = entries
      .filter(e => e.hitCount > 0)
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, 10)
      .map(e => ({ query: e.originalQuery, hits: e.hitCount }));

    // API usage frequency
    const apiUsageFrequency: Record<string, number> = {};
    for (const entry of entries) {
      for (const api of entry.selectedApis) {
        apiUsageFrequency[api] = (apiUsageFrequency[api] || 0) + entry.hitCount;
      }
    }

    return {
      totalEntries: entries.length,
      hitRate,
      avgConfidence,
      popularQueries,
      apiUsageFrequency
    };
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    await this.saveCache();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
let metadataCache: MetadataCache | null = null;

export function getMetadataCache(): MetadataCache {
  if (!metadataCache) {
    metadataCache = new MetadataCache();
  }
  return metadataCache;
} 