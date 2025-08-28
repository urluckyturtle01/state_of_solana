import { NextRequest, NextResponse } from 'next/server';
import { ChartConfig } from '@/app/admin/types';
import { 
  getFromS3, 
  listFromS3, 
  getChartPageIndex,
  getChartsBatch,
  getBatchedObjectsFromS3
} from '@/lib/s3';

/**
 * Admin-only Chart API
 * Returns full chart configurations including sensitive data like API endpoints
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
interface CacheEntry {
  data: ChartConfig[];
  timestamp: number;
}

const CACHE_TTL = 300000; // 5 minutes for admin cache
const ADMIN_CHARTS_CACHE: Record<string, CacheEntry> = {};
const ALL_ADMIN_CHARTS_CACHE: CacheEntry = { data: [], timestamp: 0 };

async function getChartsByPageForAdmin(pageId: string): Promise<ChartConfig[]> {
  // Check memory cache first
  if (ADMIN_CHARTS_CACHE[pageId] && 
      (Date.now() - ADMIN_CHARTS_CACHE[pageId].timestamp) < CACHE_TTL) {
    console.log(`Admin cache hit for page ${pageId}`);
    return ADMIN_CHARTS_CACHE[pageId].data;
  }

  try {
    // Try to get from batch file first
    const batchCharts = await getChartsBatch(pageId);
    
    if (batchCharts && batchCharts.length > 0) {
      console.log(`Admin: Retrieved ${batchCharts.length} charts from batch file for page ${pageId}`);
      
      // Update cache
      ADMIN_CHARTS_CACHE[pageId] = {
        data: batchCharts,
        timestamp: Date.now()
      };
      
      return batchCharts;
    }
    
    // Try to get from page index
    const chartIds = await getChartPageIndex(pageId);
    
    if (chartIds && chartIds.length > 0) {
      console.log(`Admin: Retrieved ${chartIds.length} chart IDs from page index`);
      
      // Get each chart in parallel
      const chartPromises = chartIds.map(id => 
        getFromS3<ChartConfig>(`charts/${id}.json`)
      );
      
      const charts = await Promise.all(chartPromises);
      const validCharts = charts.filter(chart => chart !== null) as ChartConfig[];
      
      console.log(`Admin: Fetched ${validCharts.length} charts using index`);
      
      // Update cache
      ADMIN_CHARTS_CACHE[pageId] = {
        data: validCharts,
        timestamp: Date.now()
      };
      
      return validCharts;
    }
    
    // Fallback: get all charts and filter
    const allCharts = await getAllChartsForAdmin();
    const pageCharts = allCharts.filter(chart => chart.page === pageId);
    
    // Update cache
    ADMIN_CHARTS_CACHE[pageId] = {
      data: pageCharts,
      timestamp: Date.now()
    };
    
    return pageCharts;
  } catch (error) {
    console.error(`Admin: Error fetching charts for page ${pageId}:`, error);
    return [];
  }
}

async function getAllChartsForAdmin(): Promise<ChartConfig[]> {
  // Check memory cache first
  if (ALL_ADMIN_CHARTS_CACHE.data.length > 0 && 
      (Date.now() - ALL_ADMIN_CHARTS_CACHE.timestamp) < CACHE_TTL) {
    console.log('Admin cache hit for all charts');
    return ALL_ADMIN_CHARTS_CACHE.data;
  }

  try {
    const keys = await listFromS3('charts/');
    const charts: ChartConfig[] = [];

    for (const key of keys) {
      try {
        const chart = await getFromS3<ChartConfig>(key);
        if (chart) {
          charts.push(chart);
        }
      } catch (error) {
        console.warn(`Admin: Failed to fetch chart ${key}:`, error);
      }
    }

    // Update cache
    ALL_ADMIN_CHARTS_CACHE.data = charts;
    ALL_ADMIN_CHARTS_CACHE.timestamp = Date.now();

    return charts;
  } catch (error) {
    console.error('Admin: Error fetching all charts:', error);
    return [];
  }
}

// GET /api/admin/charts - Get all charts with full configuration (admin only)
export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    if (!checkAdminAuth(req)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      );
    }

    // Get optional page parameter from URL
    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get('page');
    const skipCache = searchParams.get('skipCache') === 'true';
    
    let charts: ChartConfig[] = [];
    let source = 'unknown';
    
    if (pageId) {
      console.log(`Admin API: Fetching charts for page ${pageId}`);
      
      if (skipCache) {
        delete ADMIN_CHARTS_CACHE[pageId];
      }
      
      charts = await getChartsByPageForAdmin(pageId);
      source = 'admin_page_cache';
    } else {
      console.log("Admin API: Fetching all charts");
      
      if (skipCache) {
        ALL_ADMIN_CHARTS_CACHE.data = [];
      }
      
      charts = await getAllChartsForAdmin();
      source = 'admin_full_cache';
    }
    
    // Return full chart configurations (no sanitization)
    return NextResponse.json({ 
      charts,
      source,
      count: charts.length,
      pageId: pageId || null,
      timestamp: new Date().toISOString(),
      adminAccess: true // Indicate this is admin data
    });

  } catch (error) {
    console.error('Admin API: Error fetching charts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch charts', details: String(error) },
      { status: 500 }
    );
  }
}
