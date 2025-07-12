import { promises as fs } from 'fs';
import * as path from 'path';

export interface QueryAnalytics {
  id: string;
  timestamp: number;
  originalQuery: string;
  normalizedQuery: string;
  selectedApis: string[];
  chartType: string;
  confidence: number;
  processingTimeMs: number;
  cacheHit: boolean;
  success: boolean;
  errorMessage?: string;
  userFeedback?: 'positive' | 'negative' | 'neutral';
  sessionId?: string;
  userAgent?: string;
}

export interface ApiUsageStats {
  apiId: string;
  totalUsage: number;
  successRate: number;
  avgConfidence: number;
  popularQueries: string[];
  lastUsed: number;
}

export interface SystemMetrics {
  totalQueries: number;
  uniqueQueries: number;
  cacheHitRate: number;
  avgProcessingTime: number;
  successRate: number;
  popularDomains: Record<string, number>;
  errorTypes: Record<string, number>;
  timeDistribution: Record<string, number>; // Hour of day distribution
}

export class AnalyticsTracker {
  private logFilePath: string;
  private metricsFilePath: string;
  private maxLogEntries: number;

  constructor(
    dataDir: string = 'public/temp',
    maxLogEntries: number = 10000
  ) {
    this.logFilePath = path.join(dataDir, 'query-analytics.jsonl');
    this.metricsFilePath = path.join(dataDir, 'system-metrics.json');
    this.maxLogEntries = maxLogEntries;
  }

  /**
   * Log a query interaction
   */
  async logQuery(analytics: Omit<QueryAnalytics, 'id' | 'timestamp'>): Promise<void> {
    const entry: QueryAnalytics = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...analytics
    };

    try {
      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(this.logFilePath, logLine);
      
      // Update system metrics asynchronously
      this.updateSystemMetrics(entry).catch(console.error);
    } catch (error) {
      console.error('Failed to log query analytics:', error);
    }
  }

  /**
   * Update user feedback for a logged query
   */
  async updateQueryFeedback(queryId: string, feedback: 'positive' | 'negative' | 'neutral'): Promise<void> {
    try {
      const logs = await this.loadLogs();
      const updatedLogs = logs.map(log => 
        log.id === queryId ? { ...log, userFeedback: feedback } : log
      );
      
      await this.saveLogs(updatedLogs);
    } catch (error) {
      console.error('Failed to update query feedback:', error);
    }
  }

  /**
   * Get API usage statistics
   */
  async getApiUsageStats(): Promise<ApiUsageStats[]> {
    const logs = await this.loadLogs();
    const apiStats = new Map<string, {
      total: number;
      successes: number;
      confidences: number[];
      queries: Set<string>;
      lastUsed: number;
    }>();

    for (const log of logs) {
      for (const apiId of log.selectedApis) {
        if (!apiStats.has(apiId)) {
          apiStats.set(apiId, {
            total: 0,
            successes: 0,
            confidences: [],
            queries: new Set(),
            lastUsed: 0
          });
        }

        const stats = apiStats.get(apiId)!;
        stats.total++;
        if (log.success) stats.successes++;
        stats.confidences.push(log.confidence);
        stats.queries.add(log.originalQuery);
        stats.lastUsed = Math.max(stats.lastUsed, log.timestamp);
      }
    }

    return Array.from(apiStats.entries()).map(([apiId, stats]) => ({
      apiId,
      totalUsage: stats.total,
      successRate: stats.total > 0 ? stats.successes / stats.total : 0,
      avgConfidence: stats.confidences.length > 0 
        ? stats.confidences.reduce((sum, c) => sum + c, 0) / stats.confidences.length 
        : 0,
      popularQueries: Array.from(stats.queries).slice(0, 5),
      lastUsed: stats.lastUsed
    }));
  }

  /**
   * Get system-wide metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const logs = await this.loadLogs();
    
    if (logs.length === 0) {
      return {
        totalQueries: 0,
        uniqueQueries: 0,
        cacheHitRate: 0,
        avgProcessingTime: 0,
        successRate: 0,
        popularDomains: {},
        errorTypes: {},
        timeDistribution: {}
      };
    }

    const uniqueQueries = new Set(logs.map(l => l.normalizedQuery));
    const cacheHits = logs.filter(l => l.cacheHit).length;
    const successes = logs.filter(l => l.success).length;
    const totalProcessingTime = logs.reduce((sum, l) => sum + l.processingTimeMs, 0);

    // Domain popularity (inferred from API usage)
    const domainCounts: Record<string, number> = {};
    for (const log of logs) {
      for (const api of log.selectedApis) {
        const domain = api.split('-')[0] || 'unknown';
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      }
    }

    // Error types
    const errorTypes: Record<string, number> = {};
    for (const log of logs) {
      if (!log.success && log.errorMessage) {
        const errorType = this.categorizeError(log.errorMessage);
        errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
      }
    }

    // Time distribution (hour of day)
    const timeDistribution: Record<string, number> = {};
    for (const log of logs) {
      const hour = new Date(log.timestamp).getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      timeDistribution[hourKey] = (timeDistribution[hourKey] || 0) + 1;
    }

    return {
      totalQueries: logs.length,
      uniqueQueries: uniqueQueries.size,
      cacheHitRate: logs.length > 0 ? cacheHits / logs.length : 0,
      avgProcessingTime: logs.length > 0 ? totalProcessingTime / logs.length : 0,
      successRate: logs.length > 0 ? successes / logs.length : 0,
      popularDomains: domainCounts,
      errorTypes,
      timeDistribution
    };
  }

  /**
   * Get popular queries with their performance metrics
   */
  async getPopularQueries(limit: number = 20): Promise<Array<{
    query: string;
    count: number;
    avgConfidence: number;
    successRate: number;
    avgProcessingTime: number;
  }>> {
    const logs = await this.loadLogs();
    const queryStats = new Map<string, {
      count: number;
      confidences: number[];
      successes: number;
      processingTimes: number[];
    }>();

    for (const log of logs) {
      if (!queryStats.has(log.originalQuery)) {
        queryStats.set(log.originalQuery, {
          count: 0,
          confidences: [],
          successes: 0,
          processingTimes: []
        });
      }

      const stats = queryStats.get(log.originalQuery)!;
      stats.count++;
      stats.confidences.push(log.confidence);
      if (log.success) stats.successes++;
      stats.processingTimes.push(log.processingTimeMs);
    }

    return Array.from(queryStats.entries())
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        avgConfidence: stats.confidences.reduce((sum, c) => sum + c, 0) / stats.confidences.length,
        successRate: stats.successes / stats.count,
        avgProcessingTime: stats.processingTimes.reduce((sum, t) => sum + t, 0) / stats.processingTimes.length
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get improvement suggestions based on analytics
   */
  async getImprovementSuggestions(): Promise<string[]> {
    const metrics = await this.getSystemMetrics();
    const apiStats = await this.getApiUsageStats();
    const suggestions: string[] = [];

    // Cache hit rate suggestions
    if (metrics.cacheHitRate < 0.3) {
      suggestions.push('Low cache hit rate detected. Consider improving query normalization or increasing cache TTL.');
    }

    // Success rate suggestions
    if (metrics.successRate < 0.9) {
      suggestions.push('Success rate below 90%. Review failed queries to improve API selection or chart spec generation.');
    }

    // Performance suggestions
    if (metrics.avgProcessingTime > 2000) {
      suggestions.push('Average processing time is high. Consider optimizing vector search or implementing query batching.');
    }

    // API usage suggestions
    const underutilizedApis = apiStats.filter(api => api.totalUsage < 5 && api.successRate > 0.8);
    if (underutilizedApis.length > 10) {
      suggestions.push(`${underutilizedApis.length} high-quality APIs are underutilized. Consider improving their keywords or descriptions.`);
    }

    // Error pattern suggestions
    const topErrors = Object.entries(metrics.errorTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    for (const [errorType, count] of topErrors) {
      if (count > metrics.totalQueries * 0.05) { // More than 5% of queries
        suggestions.push(`Frequent ${errorType} errors detected. This error type represents ${Math.round(count / metrics.totalQueries * 100)}% of queries.`);
      }
    }

    return suggestions;
  }

  /**
   * Generate performance report
   */
  async generateReport(days: number = 7): Promise<{
    summary: SystemMetrics;
    topApis: ApiUsageStats[];
    popularQueries: any[];
    suggestions: string[];
    timeRange: { start: number; end: number };
  }> {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const allLogs = await this.loadLogs();
    const recentLogs = allLogs.filter(log => log.timestamp >= cutoffTime);
    
    // Temporarily replace logs to calculate metrics for the time range
    const originalLogFilePath = this.logFilePath;
    this.logFilePath = this.logFilePath + '.temp';
    await this.saveLogs(recentLogs);
    
    const summary = await this.getSystemMetrics();
    const topApis = (await this.getApiUsageStats()).slice(0, 10);
    const popularQueries = await this.getPopularQueries(10);
    const suggestions = await this.getImprovementSuggestions();
    
    // Restore original log file
    await fs.unlink(this.logFilePath);
    this.logFilePath = originalLogFilePath;
    
    return {
      summary,
      topApis,
      popularQueries,
      suggestions,
      timeRange: {
        start: cutoffTime,
        end: Date.now()
      }
    };
  }

  /**
   * Private helper methods
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();
    if (message.includes('quota') || message.includes('rate limit')) return 'quota_exceeded';
    if (message.includes('api') || message.includes('request')) return 'api_error';
    if (message.includes('parse') || message.includes('json')) return 'parsing_error';
    if (message.includes('cache')) return 'cache_error';
    if (message.includes('vector') || message.includes('embedding')) return 'vector_error';
    return 'unknown_error';
  }

  private async loadLogs(): Promise<QueryAnalytics[]> {
    try {
      const data = await fs.readFile(this.logFilePath, 'utf-8');
      return data.trim().split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
    } catch (error) {
      return [];
    }
  }

  private async saveLogs(logs: QueryAnalytics[]): Promise<void> {
    const data = logs.map(log => JSON.stringify(log)).join('\n') + '\n';
    await fs.writeFile(this.logFilePath, data);
  }

  private async updateSystemMetrics(entry: QueryAnalytics): Promise<void> {
    // This could be implemented to maintain rolling metrics
    // For now, metrics are calculated on-demand from the full log
  }

  /**
   * Cleanup old logs to prevent unlimited growth
   */
  async cleanupOldLogs(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    const logs = await this.loadLogs();
    const cutoffTime = Date.now() - maxAge;
    const recentLogs = logs.filter(log => log.timestamp >= cutoffTime);
    
    if (recentLogs.length < logs.length) {
      await this.saveLogs(recentLogs);
      console.log(`Cleaned up ${logs.length - recentLogs.length} old log entries`);
    }
  }
}

// Global analytics instance
let analyticsTracker: AnalyticsTracker | null = null;

export function getAnalyticsTracker(): AnalyticsTracker {
  if (!analyticsTracker) {
    analyticsTracker = new AnalyticsTracker();
  }
  return analyticsTracker;
} 