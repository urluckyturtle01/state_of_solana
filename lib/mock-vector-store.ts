import { ApiCatalogEntry } from '../types/api-catalog';
import { SearchResult } from './vector-store';

// Mock vector store that uses keyword-based search instead of embeddings
export class MockVectorStore {
  private entries: ApiCatalogEntry[] = [];
  private isInitialized: boolean = false;

  constructor() {}

  // Initialize with API catalog entries
  async initialize(catalogEntries: ApiCatalogEntry[]): Promise<void> {
    console.log('🔄 Initializing mock vector store with keyword search...');
    this.entries = catalogEntries;
    this.isInitialized = true;
    console.log('✅ Mock vector store initialized successfully');
  }

  // Calculate keyword similarity score
  private calculateKeywordSimilarity(query: string, entry: ApiCatalogEntry): number {
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const entryText = [
      entry.title,
      entry.description || '',
      entry.domain,
      ...entry.keywords,
      ...Object.keys(entry.response_schema),
      ...(entry.aggregation_types || []),
      ...(entry.chart_types || [])
    ].join(' ').toLowerCase();

    let score = 0;
    let totalWords = queryWords.length;

    queryWords.forEach(word => {
      if (entryText.includes(word)) {
        // Boost exact matches
        score += 1.0;
      } else {
        // Partial matches
        const partialMatches = entryText.split(/\s+/).filter(entryWord => 
          entryWord.includes(word) || word.includes(entryWord)
        );
        score += partialMatches.length * 0.5;
      }
    });

    // Add domain relevance bonus
    if (queryWords.some(word => entry.domain.includes(word))) {
      score += 0.5;
    }

    // Add keyword relevance bonus
    const keywordMatches = entry.keywords.filter(keyword => 
      queryWords.some(word => keyword.includes(word))
    );
    score += keywordMatches.length * 0.3;

    return totalWords > 0 ? score / totalWords : 0;
  }

  // Search for similar APIs using keyword matching
  async search(query: string, topK: number = 5, domainFilter?: string): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      throw new Error('Mock vector store not initialized. Call initialize() first.');
    }

    // Filter by domain if specified
    let filteredEntries = this.entries;
    if (domainFilter) {
      filteredEntries = this.entries.filter(entry => entry.domain === domainFilter);
    }

    // Calculate similarities using keyword matching
    const similarities = filteredEntries.map(entry => {
      const score = this.calculateKeywordSimilarity(query, entry);
      return {
        id: entry.id,
        score,
        metadata: entry
      };
    });

    // Sort by similarity score and return top results
    return similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .filter(result => result.score > 0); // Only return results with some relevance
  }

  // Get API by ID
  getApiById(id: string): ApiCatalogEntry | null {
    return this.entries.find(entry => entry.id === id) || null;
  }

  // Get all APIs in a domain
  getApisByDomain(domain: string): ApiCatalogEntry[] {
    return this.entries.filter(entry => entry.domain === domain);
  }

  // Get statistics
  getStats(): {
    totalApis: number;
    domains: Record<string, number>;
    initialized: boolean;
  } {
    const domains: Record<string, number> = {};
    
    this.entries.forEach(entry => {
      const domain = entry.domain;
      domains[domain] = (domains[domain] || 0) + 1;
    });

    return {
      totalApis: this.entries.length,
      domains,
      initialized: this.isInitialized
    };
  }
}

// Utility function to create mock vector store
export async function createMockVectorStore(catalogEntries: ApiCatalogEntry[]): Promise<MockVectorStore> {
  const store = new MockVectorStore();
  await store.initialize(catalogEntries);
  return store;
} 