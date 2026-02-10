import { NextRequest, NextResponse } from 'next/server';
import { getAnalyticsTracker } from '@/lib/analytics-tracker';
import { getMetadataCache } from '@/lib/metadata-cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const format = searchParams.get('format') || 'json';

    // Initialize analytics and cache
    const analytics = getAnalyticsTracker();
    const cache = getMetadataCache();
    await cache.loadCache();

    // Generate comprehensive analytics report
    const [systemMetrics, apiUsageStats, popularQueries, cacheStats, suggestions, fullReport] = await Promise.all([
      analytics.getSystemMetrics(),
      analytics.getApiUsageStats(),
      analytics.getPopularQueries(20),
      Promise.resolve(cache.getStats()),
      analytics.getImprovementSuggestions(),
      analytics.generateReport(days)
    ]);

    const response = {
      timestamp: new Date().toISOString(),
      timeRange: {
        days,
        start: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      },
      overview: {
        totalQueries: systemMetrics.totalQueries,
        uniqueQueries: systemMetrics.uniqueQueries,
        cacheHitRate: systemMetrics.cacheHitRate,
        successRate: systemMetrics.successRate,
        avgProcessingTime: systemMetrics.avgProcessingTime,
        cacheSize: cacheStats.totalEntries,
        avgCacheConfidence: cacheStats.avgConfidence
      },
      performance: {
        responseTime: {
          average: systemMetrics.avgProcessingTime,
          distribution: systemMetrics.avgProcessingTime
        },
        caching: {
          hitRate: systemMetrics.cacheHitRate,
          totalEntries: cacheStats.totalEntries,
          avgConfidence: cacheStats.avgConfidence
        },
        success: {
          rate: systemMetrics.successRate,
          errorTypes: systemMetrics.errorTypes
        }
      },
      usage: {
        popularQueries: popularQueries.slice(0, 10),
        popularDomains: Object.entries(systemMetrics.popularDomains)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([domain, count]) => ({ domain, count })),
        timeDistribution: systemMetrics.timeDistribution,
        topApis: apiUsageStats
          .sort((a, b) => b.totalUsage - a.totalUsage)
          .slice(0, 15)
          .map(api => ({
            id: api.apiId,
            usage: api.totalUsage,
            successRate: api.successRate,
            avgConfidence: api.avgConfidence,
            lastUsed: new Date(api.lastUsed).toISOString(),
            popularQueries: api.popularQueries.slice(0, 3)
          }))
      },
      insights: {
        suggestions: suggestions,
        trends: {
          queryGrowth: systemMetrics.totalQueries > 0 ? 'stable' : 'new_system',
          popularityShifts: cacheStats.popularQueries.slice(0, 5),
          emergingPatterns: Object.entries(systemMetrics.popularDomains)
            .filter(([, count]) => count > 5)
            .map(([domain]) => `Growing interest in ${domain} APIs`)
        },
        health: {
          status: systemMetrics.successRate > 0.9 ? 'excellent' : 
                 systemMetrics.successRate > 0.7 ? 'good' : 'needs_attention',
          issues: suggestions.length > 0 ? suggestions.slice(0, 3) : ['No issues detected'],
          recommendations: [
            systemMetrics.cacheHitRate < 0.3 ? 'Consider increasing cache TTL' : null,
            systemMetrics.avgProcessingTime > 2000 ? 'Optimize vector search performance' : null,
            systemMetrics.successRate < 0.9 ? 'Review and improve error handling' : null
          ].filter(Boolean)
        }
      },
      detailed: format === 'detailed' ? {
        fullReport,
        allApiStats: apiUsageStats,
        allQueries: popularQueries,
        cacheDetails: cacheStats
      } : undefined
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate analytics report',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json();

    switch (action) {
      case 'clear_cache':
        const cache = getMetadataCache();
        await cache.clear();
        return NextResponse.json({ success: true, message: 'Cache cleared successfully' });

      case 'cleanup_logs':
        const analytics = getAnalyticsTracker();
        const maxAge = params.maxAge || (30 * 24 * 60 * 60 * 1000); // 30 days default
        await analytics.cleanupOldLogs(maxAge);
        return NextResponse.json({ success: true, message: 'Logs cleaned up successfully' });

      case 'update_feedback':
        const { queryId, feedback } = params;
        if (!queryId || !feedback) {
          return NextResponse.json(
            { error: 'Missing queryId or feedback' },
            { status: 400 }
          );
        }
        
        const analyticsTracker = getAnalyticsTracker();
        await analyticsTracker.updateQueryFeedback(queryId, feedback);
        
        // Also update cache feedback if available
        const metadataCache = getMetadataCache();
        await metadataCache.loadCache();
        await metadataCache.updateFeedback(queryId, feedback);
        
        return NextResponse.json({ success: true, message: 'Feedback updated successfully' });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Analytics API POST error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute action',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 