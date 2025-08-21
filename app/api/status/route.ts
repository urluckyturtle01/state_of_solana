import { NextRequest, NextResponse } from 'next/server';
import { apiMonitor } from '@/app/lib/api-monitor';
import { rateLimiters, getClientIdentifier } from '@/app/lib/rate-limiter';

// Simple authentication for status endpoint (use a secure token in production)
const STATUS_API_KEY = process.env.STATUS_API_KEY || 'dev-status-key';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    const providedKey = authHeader?.replace('Bearer ', '');
    
    if (providedKey !== STATUS_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get monitoring metrics
    const metrics = apiMonitor.getMetrics();

    // Get system information
    const status = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      
      // API metrics
      api: {
        ...metrics,
        rateLimits: {
          aiSummary: '10 requests per 30 minutes',
          chartData: 'No limit',
          general: 'No limit'
        }
      },

      // Service status
      services: {
        openai: {
          enabled: !process.env.USE_LOCAL_AI || process.env.USE_LOCAL_AI === 'false',
          hasApiKey: !!process.env.OPENAI_API_KEY,
          model: 'gpt-5-nano'
        },
        localAi: {
          enabled: process.env.USE_LOCAL_AI === 'true',
          url: process.env.LOCAL_AI_URL || 'http://84.32.32.11:11434/api/generate',
          model: process.env.LOCAL_AI_MODEL || 'gpt-oss:20b'
        }
      },

      // Health checks
      health: {
        status: 'healthy',
        checks: {
          api: metrics.failureRate < 0.5 ? 'ok' : 'degraded',
          responseTime: metrics.averageResponseTime < 10000 ? 'ok' : 'slow',
          errorRate: metrics.failureRate < 0.1 ? 'ok' : 'high'
        }
      }
    };

    return NextResponse.json(status);

  } catch (error) {
    console.error('Status endpoint error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get status',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// POST endpoint to reset metrics (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    const providedKey = authHeader?.replace('Bearer ', '');
    
    if (providedKey !== STATUS_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    if (body.action === 'reset-metrics') {
      apiMonitor.resetMetrics();
      
      return NextResponse.json({
        message: 'Metrics reset successfully',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Status POST endpoint error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
