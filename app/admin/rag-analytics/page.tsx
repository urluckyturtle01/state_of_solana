'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/shared/Card';
import Button from '../components/Button';

interface AnalyticsData {
  timestamp: string;
  timeRange: {
    days: number;
    start: string;
    end: string;
  };
  overview: {
    totalQueries: number;
    uniqueQueries: number;
    cacheHitRate: number;
    successRate: number;
    avgProcessingTime: number;
    cacheSize: number;
    avgCacheConfidence: number;
  };
  performance: {
    responseTime: {
      average: number;
      distribution: number;
    };
    caching: {
      hitRate: number;
      totalEntries: number;
      avgConfidence: number;
    };
    success: {
      rate: number;
      errorTypes: Record<string, number>;
    };
  };
  usage: {
    popularQueries: Array<{
      query: string;
      count: number;
      avgConfidence: number;
      successRate: number;
      avgProcessingTime: number;
    }>;
    popularDomains: Array<{ domain: string; count: number }>;
    timeDistribution: Record<string, number>;
    topApis: Array<{
      id: string;
      usage: number;
      successRate: number;
      avgConfidence: number;
      lastUsed: string;
      popularQueries: string[];
    }>;
  };
  insights: {
    suggestions: string[];
    trends: {
      queryGrowth: string;
      popularityShifts: Array<{ query: string; hits: number }>;
      emergingPatterns: string[];
    };
    health: {
      status: 'excellent' | 'good' | 'needs_attention';
      issues: string[];
      recommendations: string[];
    };
  };
}

export default function RagAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(7);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics?days=${timeRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const analyticsData = await response.json();
      setData(analyticsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_cache' })
      });
      
      if (response.ok) {
        alert('Cache cleared successfully');
        fetchAnalytics();
      } else {
        alert('Failed to clear cache');
      }
    } catch (err) {
      alert('Error clearing cache');
    }
  };

  const cleanupLogs = async () => {
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup_logs', maxAge: 30 * 24 * 60 * 60 * 1000 })
      });
      
      if (response.ok) {
        alert('Logs cleaned up successfully');
        fetchAnalytics();
      } else {
        alert('Failed to cleanup logs');
      }
    } catch (err) {
      alert('Error cleaning up logs');
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  useEffect(() => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    setRefreshInterval(interval);
    
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, []);

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatTime = (ms: number) => `${ms.toFixed(0)}ms`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-yellow-600';
      case 'needs_attention': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading && !data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">RAG System Analytics</h1>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">RAG System Analytics</h1>
        <Card>
          <CardContent className="p-6">
            <div className="text-red-600">Error: {error}</div>
            <Button onClick={fetchAnalytics} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">RAG System Analytics</h1>
        <div className="flex gap-2 items-center">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-3 py-1 border rounded"
          >
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button onClick={fetchAnalytics} variant="secondary" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            System Health
            <span className={`text-sm font-medium ${getHealthColor(data.insights.health.status)}`}>
              {data.insights.health.status.replace('_', ' ').toUpperCase()}
            </span>
          </CardTitle>
          <CardDescription>
            Last updated: {formatDate(data.timestamp)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.insights.health.issues.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-sm mb-2">Current Issues:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {data.insights.health.issues.map((issue, i) => (
                  <li key={i}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}
          
          {data.insights.health.recommendations.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">Recommendations:</h4>
              <ul className="text-sm text-blue-600 space-y-1">
                {data.insights.health.recommendations.map((rec, i) => (
                  <li key={i}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{data.overview.totalQueries.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Queries</div>
            <div className="text-xs text-gray-500 mt-1">
              {data.overview.uniqueQueries} unique
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{formatPercentage(data.overview.cacheHitRate)}</div>
            <div className="text-sm text-gray-600">Cache Hit Rate</div>
            <div className="text-xs text-gray-500 mt-1">
              {data.overview.cacheSize} entries
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{formatPercentage(data.overview.successRate)}</div>
            <div className="text-sm text-gray-600">Success Rate</div>
            <div className="text-xs text-gray-500 mt-1">
              {formatTime(data.overview.avgProcessingTime)} avg
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{formatPercentage(data.overview.avgCacheConfidence)}</div>
            <div className="text-sm text-gray-600">Avg Confidence</div>
            <div className="text-xs text-gray-500 mt-1">
              Cache quality
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Queries */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Queries</CardTitle>
          <CardDescription>Most frequently asked questions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.usage.popularQueries.slice(0, 8).map((query, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div className="flex-1">
                  <div className="font-medium text-sm">{query.query}</div>
                  <div className="text-xs text-gray-500">
                    {query.count} uses • {formatPercentage(query.successRate)} success • {formatTime(query.avgProcessingTime)}
                  </div>
                </div>
                <div className="text-sm font-medium text-blue-600">
                  {formatPercentage(query.avgConfidence)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Usage and Domains */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top APIs</CardTitle>
            <CardDescription>Most frequently used APIs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.usage.topApis.slice(0, 10).map((api, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{api.id}</div>
                    <div className="text-xs text-gray-500">
                      {formatPercentage(api.successRate)} success
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{api.usage}</div>
                    <div className="text-xs text-gray-500">uses</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Popular Domains</CardTitle>
            <CardDescription>API domains by usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.usage.popularDomains.map((domain, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <div className="font-medium capitalize">{domain.domain}</div>
                  <div className="text-gray-600">{domain.count} uses</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Insights */}
      <Card>
        <CardHeader>
          <CardTitle>System Insights</CardTitle>
          <CardDescription>AI-generated suggestions for improvement</CardDescription>
        </CardHeader>
        <CardContent>
          {data.insights.suggestions.length > 0 ? (
            <div className="space-y-2">
              {data.insights.suggestions.map((suggestion, i) => (
                <div key={i} className="p-3 bg-blue-50 rounded text-sm">
                  <span className="text-blue-800">💡</span> {suggestion}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-600 text-sm">
              ✅ No improvement suggestions at this time. System is performing well!
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Actions */}
      <Card>
        <CardHeader>
          <CardTitle>System Management</CardTitle>
          <CardDescription>Administrative actions for the RAG system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button onClick={clearCache} variant="secondary">
              Clear Cache
            </Button>
            <Button onClick={cleanupLogs} variant="secondary">
              Cleanup Old Logs
            </Button>
            <Button onClick={fetchAnalytics} variant="secondary">
              Force Refresh
            </Button>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>• Clear Cache: Removes all cached chart specifications</p>
            <p>• Cleanup Logs: Removes analytics logs older than 30 days</p>
            <p>• Force Refresh: Immediately updates all analytics data</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 