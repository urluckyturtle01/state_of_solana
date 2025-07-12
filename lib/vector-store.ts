import OpenAI from 'openai';
import { ApiCatalogEntry } from '../types/api-catalog';

// Vector store entry interface
export interface VectorEntry {
  id: string;
  embedding: number[];
  metadata: ApiCatalogEntry;
  searchText: string;
}

// Vector store configuration
export interface VectorStoreConfig {
  openaiApiKey: string;
  embeddingModel: string;
  maxResults: number;
}

// Cosine similarity function
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vector dimensions must match');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

// Search result interface
export interface SearchResult {
  id: string;
  score: number;
  metadata: ApiCatalogEntry;
}

// In-memory vector store implementation
export class ApiVectorStore {
  private openai: OpenAI;
  private entries: VectorEntry[] = [];
  private config: VectorStoreConfig;
  private isInitialized: boolean = false;

  constructor(config: VectorStoreConfig) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });
  }

  // Build search text from API catalog entry
  private buildSearchText(entry: ApiCatalogEntry): string {
    const parts = [
      entry.title,
      entry.description || '',
      entry.domain,
      entry.keywords.join(' '),
      Object.keys(entry.response_schema).join(' '),
      entry.aggregation_types?.join(' ') || '',
      entry.chart_types?.join(' ') || ''
    ];

    return parts.filter(part => part.trim()).join(' ').toLowerCase();
  }

  // Get embedding for text
  private async getEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.config.embeddingModel,
        input: text,
        encoding_format: 'float',
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  // Initialize vector store with API catalog
  async initialize(catalogEntries: ApiCatalogEntry[]): Promise<void> {
    console.log('🔄 Initializing vector store with embeddings...');
    
    const entries: VectorEntry[] = [];
    const batchSize = 10; // Process embeddings in batches to avoid rate limits
    
    for (let i = 0; i < catalogEntries.length; i += batchSize) {
      const batch = catalogEntries.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (entry) => {
        const searchText = this.buildSearchText(entry);
        const embedding = await this.getEmbedding(searchText);
        
        return {
          id: entry.id,
          embedding,
          metadata: entry,
          searchText
        };
      });

      const batchResults = await Promise.all(batchPromises);
      entries.push(...batchResults);
      
      console.log(`📊 Processed ${Math.min(i + batchSize, catalogEntries.length)}/${catalogEntries.length} embeddings`);
      
      // Small delay to respect rate limits
      if (i + batchSize < catalogEntries.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.entries = entries;
    this.isInitialized = true;
    console.log('✅ Vector store initialized successfully');
  }

  // Search for similar APIs
  async search(query: string, topK: number = 5, domainFilter?: string): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      throw new Error('Vector store not initialized. Call initialize() first.');
    }

    // Get query embedding
    const queryEmbedding = await this.getEmbedding(query.toLowerCase());

    // Calculate similarities
    const similarities = this.entries.map(entry => {
      const similarity = cosineSimilarity(queryEmbedding, entry.embedding);
      return {
        id: entry.id,
        score: similarity,
        metadata: entry.metadata
      };
    });

    // Filter by domain if specified
    let filteredSimilarities = similarities;
    if (domainFilter) {
      filteredSimilarities = similarities.filter(result => 
        result.metadata.domain === domainFilter
      );
    }

    // Sort by similarity score and return top results
    return filteredSimilarities
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(topK, this.config.maxResults));
  }

  // Get API by ID
  getApiById(id: string): ApiCatalogEntry | null {
    const entry = this.entries.find(e => e.id === id);
    return entry ? entry.metadata : null;
  }

  // Get all APIs in a domain
  getApisByDomain(domain: string): ApiCatalogEntry[] {
    return this.entries
      .filter(entry => entry.metadata.domain === domain)
      .map(entry => entry.metadata);
  }

  // Get statistics
  getStats(): {
    totalApis: number;
    domains: Record<string, number>;
    initialized: boolean;
  } {
    const domains: Record<string, number> = {};
    
    this.entries.forEach(entry => {
      const domain = entry.metadata.domain;
      domains[domain] = (domains[domain] || 0) + 1;
    });

    return {
      totalApis: this.entries.length,
      domains,
      initialized: this.isInitialized
    };
  }

  // Save vector store to file (for persistence)
  async saveToFile(filePath: string): Promise<void> {
    const fs = await import('fs');
    const storeData = {
      entries: this.entries,
      config: {
        embeddingModel: this.config.embeddingModel,
        maxResults: this.config.maxResults
      },
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        totalEntries: this.entries.length
      }
    };

    fs.writeFileSync(filePath, JSON.stringify(storeData, null, 2));
    console.log(`💾 Vector store saved to ${filePath}`);
  }

  // Load vector store from file
  static async loadFromFile(filePath: string, openaiApiKey: string): Promise<ApiVectorStore> {
    const fs = await import('fs');
    const storeData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    const config: VectorStoreConfig = {
      openaiApiKey,
      embeddingModel: storeData.config.embeddingModel,
      maxResults: storeData.config.maxResults
    };

    const store = new ApiVectorStore(config);
    store.entries = storeData.entries;
    store.isInitialized = true;

    console.log(`📂 Vector store loaded from ${filePath} (${storeData.entries.length} entries)`);
    return store;
  }
}

// Utility function to create and initialize vector store
export async function createVectorStore(
  catalogEntries: ApiCatalogEntry[],
  config: VectorStoreConfig
): Promise<ApiVectorStore> {
  const store = new ApiVectorStore(config);
  await store.initialize(catalogEntries);
  return store;
} 