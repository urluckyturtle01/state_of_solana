import { NextRequest, NextResponse } from 'next/server';
import { ChartConfig } from '@/app/admin/types';
import { getFromS3 } from '@/lib/s3';

/**
 * Admin-only Individual Chart API
 * Returns full chart configuration including sensitive data like API endpoints
 * This endpoint should only be accessible to authenticated admin users
 */

// Simple admin authentication check
function checkAdminAuth(request: NextRequest): boolean {
  const adminAuth = request.headers.get('x-admin-auth');
  const referer = request.headers.get('referer');
  const userAgent = request.headers.get('user-agent');
  
  // Allow requests from admin pages
  if (referer && referer.includes('/admin/')) {
    return true;
  }
  
  // Allow fetch-charts script
  if (adminAuth === 'chart-fetch-script' || userAgent?.includes('fetch-charts-script')) {
    return true;
  }
  
  // Check for other admin auth headers
  if (adminAuth) {
    return true;
  }
  
  return false;
}

// Memory cache for admin charts
const ADMIN_CHART_CACHE: Record<string, {
  data: ChartConfig;
  timestamp: number;
}> = {};

const CACHE_TTL = 300000; // 5 minutes

async function getChartForAdmin(chartId: string): Promise<ChartConfig | null> {
  // Check memory cache first
  if (ADMIN_CHART_CACHE[chartId] && 
      (Date.now() - ADMIN_CHART_CACHE[chartId].timestamp) < CACHE_TTL) {
    console.log(`Admin cache hit for chart ${chartId}`);
    return ADMIN_CHART_CACHE[chartId].data;
  }

  try {
    const chart = await getFromS3<ChartConfig>(`charts/${chartId}.json`);
    
    if (chart) {
      // Update cache
      ADMIN_CHART_CACHE[chartId] = {
        data: chart,
        timestamp: Date.now()
      };
    }
    
    return chart;
  } catch (error) {
    console.error(`Admin: Error fetching chart ${chartId}:`, error);
    return null;
  }
}

// GET /api/admin/charts/[id] - Get individual chart with full configuration (admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: chartId } = await params;

  try {
    // Check admin authentication
    if (!checkAdminAuth(req)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      );
    }

    console.log(`Admin API: Fetching chart with ID ${chartId}`);
    
    const chart = await getChartForAdmin(chartId);
    
    if (!chart) {
      console.log(`Admin API: Chart not found with ID ${chartId}`);
      
      return NextResponse.json(
        { error: 'Chart not found' },
        { status: 404 }
      );
    }
    
    // Return full chart configuration (no sanitization)
    return NextResponse.json({
      ...chart,
      adminAccess: true // Indicate this is admin data
    });

  } catch (error) {
    console.error(`Admin API: Error fetching chart ${chartId}:`, error);
    
    return NextResponse.json(
      { error: 'Failed to fetch chart', details: String(error) },
      { status: 500 }
    );
  }
}
