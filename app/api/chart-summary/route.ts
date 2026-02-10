import { NextRequest, NextResponse } from 'next/server';
import { detectBot, isWhitelistedBot, patternAnalyzer } from '@/app/lib/bot-detection';
import { apiMonitor } from '@/app/lib/api-monitor';
import { getFromS3 } from '@/lib/s3';
import crypto from 'crypto';

// Pre-generated Chart Summary API
// This API serves only pre-generated summaries from S3
// No live AI generation - summaries are created in batches via script

// Simple in-memory cache for chart summaries (upgrade to Redis for production)
interface CacheEntry {
  summary: string;
  timestamp: number;
  metadata: any;
}

const summaryCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

function getCacheKey(chartId: string, pageId: string): string {
  return crypto.createHash('md5').update(`${chartId}:${pageId}`).digest('hex');
}

function getCachedSummary(chartId: string, pageId: string): CacheEntry | null {
  const key = getCacheKey(chartId, pageId);
  const entry = summaryCache.get(key);
  
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
    return entry;
  }
  
  // Clean up expired entry
  if (entry) {
    summaryCache.delete(key);
  }
  
  return null;
}

function setCachedSummary(chartId: string, pageId: string, summary: string, metadata: any): void {
  const key = getCacheKey(chartId, pageId);
  summaryCache.set(key, {
    summary,
    timestamp: Date.now(),
    metadata
  });
  
  // Periodic cleanup (1% chance per request)
  if (Math.random() < 0.01) {
    const now = Date.now();
    for (const [key, entry] of summaryCache.entries()) {
      if (now - entry.timestamp >= CACHE_DURATION) {
        summaryCache.delete(key);
      }
    }
  }
}

interface ChartSummaryRequest {
  chartId: string;
  pageId: string;
  version?: number; // Optional version selection (1-5)
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 🛡️ PROTECTION LAYER 1: Bot Detection  
    const userAgent = request.headers.get('user-agent') || '';
    const botDetection = detectBot(request);
    
    // Get client identifier for logging
    const getClientId = () => {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const cfConnecting = request.headers.get('cf-connecting-ip');
      const ip = forwarded?.split(',')[0] || realIp || cfConnecting || 'unknown';
      const simpleUA = userAgent.slice(0, 50);
      return `${ip}:${simpleUA}`;
    };
    const clientId = getClientId();
    
    if (botDetection.isBot && !isWhitelistedBot(userAgent)) {
      console.warn(`Blocked bot request: ${clientId}`, {
        userAgent,
        confidence: botDetection.confidence,
        reasons: botDetection.reasons
      });
      
      // Record blocked request for monitoring
      apiMonitor.recordBlockedRequest();
      
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // 🛡️ PROTECTION LAYER 2: Request Pattern Analysis
    const isSuspiciousPattern = patternAnalyzer.addRequest(clientId);
    if (isSuspiciousPattern) {
      console.warn(`Suspicious request pattern detected: ${clientId}`);
      
      // Record blocked request for monitoring
      apiMonitor.recordBlockedRequest();
      
      return NextResponse.json(
        { error: 'Suspicious activity detected. Please wait before making more requests.' },
        { status: 429 }
      );
    }

    const body: ChartSummaryRequest = await request.json();
    const { chartId, pageId, version } = body;

    // Validate required fields
    if (!chartId || !pageId) {
      return NextResponse.json(
        { error: 'Missing required fields: chartId and pageId' },
        { status: 400 }
      );
    }

    // 🚀 PERFORMANCE LAYER: Check in-memory cache first
    const cacheKey = `${chartId}:${pageId}:${version || 1}`;
    const cachedResult = getCachedSummary(chartId, pageId);
    if (cachedResult) {
      console.log(`Cache hit for ${chartId}:${pageId}`);
      return NextResponse.json({
        summary: cachedResult.summary,
        metadata: {
          ...cachedResult.metadata,
          cached: true,
          cacheAge: Math.floor((Date.now() - cachedResult.timestamp) / 1000)
        }
      });
    }

    // 📥 FETCH PRE-GENERATED SUMMARIES FROM S3
    const chartKey = `${pageId}:${chartId}`;
    
    try {
      console.log(`📥 Fetching pre-generated summaries for ${chartKey}...`);
      
      const summariesData = await getFromS3('chart-summaries.json') as any;
      
      if (!summariesData || !summariesData.summaries) {
        throw new Error('No pre-generated summaries found in S3');
      }
      
      const chartSummaries = summariesData.summaries[chartKey];
      
      if (!chartSummaries || !chartSummaries.versions || chartSummaries.versions.length === 0) {
        throw new Error(`No summaries found for chart ${chartKey}`);
      }
      
      // Select the requested version (default to version 1)
      const requestedVersion = Math.max(1, Math.min(version || 1, chartSummaries.versions.length));
      const selectedSummary = chartSummaries.versions[requestedVersion - 1];
      
      if (!selectedSummary || selectedSummary.error) {
        throw new Error(`Summary version ${requestedVersion} not available or has error`);
      }
      
      console.log(`✅ Found pre-generated summary for ${chartKey}, version ${requestedVersion}`);
      
      // Prepare metadata
      const metadata = {
        chartId,
        pageId,
        chartTitle: chartSummaries.chartTitle,
        chartType: chartSummaries.chartType,
        pageName: chartSummaries.pageName,
        version: requestedVersion,
        totalVersions: chartSummaries.versions.length,
        generatedAt: selectedSummary.generatedAt,
        aiService: selectedSummary.aiService,
        aiModel: selectedSummary.aiModel,
        dataStats: selectedSummary.dataStats,
        preGenerated: true,
        cached: false,
        processingTimeMs: Date.now() - startTime
      };

      // 💾 Cache the result for future requests
      setCachedSummary(chartId, pageId, selectedSummary.summary, metadata);

      // 📊 Log successful retrieval for monitoring
      const processingTime = Date.now() - startTime;
      console.log(`Pre-generated summary served: ${chartKey}`, {
        clientId,
        processingTime,
        version: requestedVersion,
        totalVersions: chartSummaries.versions.length
      });

      // Record successful request for monitoring
      apiMonitor.recordRequest(true, processingTime);

      // Return the pre-generated summary
      return NextResponse.json({
        summary: selectedSummary.summary,
        metadata
      });
      
    } catch (s3Error: any) {
      console.error(`❌ Failed to fetch from S3: ${s3Error?.message || 'Unknown error'}`);
      
      // No fallback - pre-generated summaries only
      return NextResponse.json(
        { 
          error: 'Pre-generated summaries unavailable. Please try again later or contact support.',
          details: s3Error?.message || 'Unable to fetch chart summary from storage'
        },
        { status: 503 }
      );
    }

    // If we reach here, no pre-generated summary was found
    return NextResponse.json(
      { 
        error: 'Chart summary not available',
        details: 'This chart does not have a pre-generated summary. Please contact support.'
      },
      { status: 404 }
    );

  } catch (error) {
    // 📊 Enhanced error logging for monitoring
    const processingTime = Date.now() - startTime;
    const errorDetails = {
      timestamp: new Date().toISOString(),
      clientId: 'error-context',
      userAgent: request.headers.get('user-agent'),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime
    };
    
    console.error('Chart summarization error:', errorDetails);
    
    // Record failed request for monitoring
    apiMonitor.recordRequest(false, processingTime);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate chart summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


