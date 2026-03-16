import { NextRequest, NextResponse } from 'next/server';
import { ChartConfig } from '@/app/admin/types';
import { 
  getFromS3, 
  saveToS3, 
  deleteFromS3, 
  getChartPageIndex,
  saveChartPageIndex,
  getChartsBatch,
  saveChartsBatch
} from '@/lib/s3';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { sanitizeChartConfig, isAdminRequest } from '@/lib/chart-sanitizer';
import { Pool } from 'pg';

const dbPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'trino_charts',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
});

/*
 * This API endpoint manages individual chart configurations.
 * GET: Retrieves a specific chart by ID
 * PUT: Updates an existing chart (requires authentication)
 * DELETE: Deletes a specific chart (requires authentication)
 */

// Enable ISR for this API route with 30-second revalidation
export const revalidate = 30; // Cache revalidation time in seconds

// Memory cache for charts to avoid repeated S3 calls
const CHART_CACHE: Record<string, {
  data: ChartConfig;
  timestamp: number;
}> = {};

// Cache TTL (2 hours - reduced for fresher data)
const CACHE_TTL = 2 * 60 * 60 * 1000;

// Performance metrics tracking
const startTimer = () => {
  return process.hrtime();
};

const endTimer = (start: [number, number], label: string) => {
  const diff = process.hrtime(start);
  const time = (diff[0] * 1e9 + diff[1]) / 1e6; // convert to milliseconds
  console.log(`⏱️ ${label}: ${time.toFixed(2)}ms`);
  return time;
};

// Filter data columns based on chart dataMapping (same logic as db-configs)
function filterDataByMapping(allData: any[], chartConfig: ChartConfig): any[] {
  const dataMapping = (chartConfig.dataMapping || {}) as Record<string, any>;
  const requiredFields = new Set<string>();
  const addField = (f: any) => {
    if (typeof f === 'string') requiredFields.add(f);
    else if (f?.field) requiredFields.add(f.field);
  };
  if (dataMapping.xAxis) {
    const x = dataMapping.xAxis;
    if (Array.isArray(x)) x.forEach(addField);
    else addField(x);
  }
  if (dataMapping.x) requiredFields.add(dataMapping.x);
  if (dataMapping.yAxis) {
    const y = dataMapping.yAxis;
    if (Array.isArray(y)) y.forEach(addField);
    else addField(y);
  }
  if (dataMapping.y) {
    const y = dataMapping.y;
    if (Array.isArray(y)) y.forEach((f: string) => requiredFields.add(f));
    else requiredFields.add(y);
  }
  if (dataMapping.groupBy) requiredFields.add(dataMapping.groupBy);
  const dual = chartConfig.dualAxisConfig as Record<string, any> | undefined;
  dual?.leftYAxis?.fields?.forEach((f: string) => requiredFields.add(f));
  dual?.rightYAxis?.fields?.forEach((f: string) => requiredFields.add(f));
  return allData.map((row: any) => {
    const filtered: any = {};
    requiredFields.forEach(f => { if (f in row) filtered[f] = row[f]; });
    return filtered;
  });
}

// Get chart from PostgreSQL (config + data from chart_definitions + query_results)
async function getChartFromDb(chartId: string): Promise<(ChartConfig & { data?: any[] }) | null> {
  try {
    const client = await dbPool.connect();
    try {
      // uuid::text allows matching both UUID and text-style ids
      const result = await client.query(
        `SELECT cd.uuid, cd.chart_config, cd.sql_hash, qr.json_data
         FROM chart_definitions cd
         LEFT JOIN query_results qr ON qr.sql_hash = cd.sql_hash
         WHERE cd.uuid::text = $1`,
        [chartId]
      );
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      let chartConfig = row.chart_config as ChartConfig;
      const uuidStr = typeof row.uuid === 'string' ? row.uuid : String(row.uuid);
      // Auto-detect dual-axis when yAxis has rightAxis: true (same as dashboard)
      const yAxis = chartConfig.dataMapping?.yAxis;
      if (Array.isArray(yAxis) && yAxis.length > 0 && typeof yAxis[0] === 'object') {
        const yAxisConfigs = yAxis as { field: string; type?: string; rightAxis?: boolean }[];
        const hasRightAxis = yAxisConfigs.some((c) => c.rightAxis === true);
        if (hasRightAxis && !chartConfig.dualAxisConfig) {
          chartConfig = {
            ...chartConfig,
            chartType: 'dual-axis',
            dualAxisConfig: {
              leftAxisFields: yAxisConfigs.filter((c) => !c.rightAxis).map((c) => c.field),
              rightAxisFields: yAxisConfigs.filter((c) => c.rightAxis).map((c) => c.field),
              leftAxisType: (yAxisConfigs.find((c) => !c.rightAxis)?.type || 'bar') as 'bar' | 'line',
              rightAxisType: (yAxisConfigs.find((c) => c.rightAxis)?.type || 'line') as 'bar' | 'line',
            },
          };
        }
      }
      const chart: ChartConfig & { data?: any[] } = { ...chartConfig, id: uuidStr };
      const rawData = row.json_data;
      if (rawData) {
        const arr = Array.isArray(rawData) ? rawData : (rawData as any)?.rows || [];
        if (arr.length > 0) {
          chart.data = filterDataByMapping(arr, chartConfig);
        }
      }
      return chart;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(`Error fetching chart ${chartId} from DB:`, err);
    return null;
  }
}

// Get chart from chart_definitions + query_results first, then S3. No temp files.
async function getChartWithCache(chartId: string): Promise<ChartConfig | null> {
  if (CHART_CACHE[chartId] && 
      (Date.now() - CHART_CACHE[chartId].timestamp) < CACHE_TTL) {
    return CHART_CACHE[chartId].data;
  }
  
  // 1. DB first: chart_definitions + query_results
  let chart = await getChartFromDb(chartId);
  if (chart) {
    CHART_CACHE[chartId] = { data: chart, timestamp: Date.now() };
    return chart;
  }
  
  // 2. S3 fallback (for non-DB charts)
  chart = await getFromS3<ChartConfig>(`charts/${chartId}.json`);
  if (chart) {
    CHART_CACHE[chartId] = { data: chart, timestamp: Date.now() };
  }
  
  return chart;
}

// GET /api/charts/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const overallStart = startTimer();
  const { id: chartId } = await params;

  try {
    console.log(`API: Fetching chart with ID ${chartId}`);
    
    // Check for conditional request
    const ifNoneMatch = req.headers.get('If-None-Match');
    const etag = `"chart-${chartId}-${Date.now()}"`;
    
    // Get chart with caching strategy
    const fetchStart = startTimer();
    const chart = await getChartWithCache(chartId);
    const fetchTime = endTimer(fetchStart, `Retrieved chart ${chartId}`);
    
    if (!chart) {
      console.log(`API: Chart not found in S3 with ID ${chartId}`);
      endTimer(overallStart, "Total GET request time (not found)");
      
      return NextResponse.json(
        { error: 'Chart not found' },
        { status: 404 }
      );
    }
    
    // Sanitize chart data for public consumption (unless admin request)
    const isAdmin = isAdminRequest(req);
    const responseChart = isAdmin ? chart : sanitizeChartConfig(chart);
    
    // Create response with caching headers
    const response = NextResponse.json({
      ...responseChart,
      sanitized: !isAdmin // Indicate if data was sanitized
    });
    
          // Add caching headers (updated for 2-hour cache duration)
    response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=7200, stale-while-revalidate=7200');
    response.headers.set('ETag', etag);
    response.headers.set('X-Response-Time', `${fetchTime.toFixed(2)}ms`);
    
    console.log(`API: Found chart in S3 with ID ${chartId}`);
    endTimer(overallStart, "Total GET request time");
    
    return response;
  } catch (error) {
    console.error(`API: Error fetching chart ${chartId}:`, error);
    endTimer(overallStart, "Total GET request time (error)");
    
    return NextResponse.json(
      { error: 'Failed to fetch chart', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/charts/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const overallStart = startTimer();
  const { id: chartId } = await params;
  
  try {
    console.log(`API: Updating chart with ID ${chartId}`);
    const chartConfig = (await req.json()) as ChartConfig;

    // Basic validation
    if (!chartConfig.title || !chartConfig.page || !chartConfig.chartType) {
      endTimer(overallStart, "Total PUT request time (invalid)");
      return NextResponse.json(
        { error: 'Invalid chart configuration' },
        { status: 400 }
      );
    }
    
    // Check if chart exists first (use cache)
    const checkStart = startTimer();
    const existingChart = await getChartWithCache(chartId);
    endTimer(checkStart, `Checked if chart ${chartId} exists`);
    
    if (!existingChart) {
      endTimer(overallStart, "Total PUT request time (not found)");
      return NextResponse.json(
        { error: 'Chart not found' },
        { status: 404 }
      );
    }
    
    // Update timestamp
    chartConfig.updatedAt = new Date().toISOString();
    
    // Preserve creation timestamp from existing chart
    chartConfig.createdAt = existingChart.createdAt;

    // Update in S3
    const saveStart = startTimer();
    const s3Result = await saveToS3(`charts/${chartId}.json`, chartConfig);
    endTimer(saveStart, `Saved chart ${chartId} to S3`);
    
    if (!s3Result) {
      endTimer(overallStart, "Total PUT request time (S3 error)");
      return NextResponse.json(
        { error: 'Failed to update chart in S3' },
        { status: 500 }
      );
    }

    // Update memory cache
    CHART_CACHE[chartId] = {
      data: chartConfig,
      timestamp: Date.now()
    };

    endTimer(overallStart, "Total PUT request time");
    return NextResponse.json({ 
      message: 'Chart updated in S3 successfully',
      chartId
    });
  } catch (error) {
    console.error(`API: Error updating chart ${chartId}:`, error);
    endTimer(overallStart, "Total PUT request time (error)");
    
    return NextResponse.json(
      { error: 'Failed to update chart', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/charts/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const overallStart = startTimer();
  const { id: chartId } = await params;
  
  try {
    console.log(`API: Deleting chart with ID ${chartId}`);
    
    // Check if chart exists first (use cache)
    const checkStart = startTimer();
    const existingChart = await getChartWithCache(chartId);
    endTimer(checkStart, `Checked if chart ${chartId} exists`);
    
    if (!existingChart) {
      endTimer(overallStart, "Total DELETE request time (not found)");
      return NextResponse.json(
        { error: 'Chart not found' },
        { status: 404 }
      );
    }
    
    // Store the page ID for batch/index updates
    const pageId = existingChart.page;
    
    // Delete from S3
    const deleteStart = startTimer();
    const deleteResult = await deleteFromS3(`charts/${chartId}.json`);
    endTimer(deleteStart, `Deleted chart ${chartId} from S3`);
    
    if (!deleteResult) {
      endTimer(overallStart, "Total DELETE request time (S3 error)");
      return NextResponse.json(
        { error: 'Failed to delete chart from S3' },
        { status: 500 }
      );
    }
    
    // Remove from memory cache
    delete CHART_CACHE[chartId];
    
    // Update batch files and indexes in the background
    setTimeout(async () => {
      try {
        if (pageId) {
          console.log(`Updating batch files and indexes for page ${pageId} after chart deletion`);
          
          // Update page index - remove this chart ID
          const existingIds = await getChartPageIndex(pageId) || [];
          if (existingIds.includes(chartId)) {
            await saveChartPageIndex(
              pageId, 
              existingIds.filter(id => id !== chartId)
            );
            console.log(`Removed chart ${chartId} from page index for ${pageId}`);
          }
          
          // Update batch file - remove this chart
          const pageCharts = await getChartsBatch(pageId) || [];
          if (pageCharts.length > 0) {
            const updatedCharts = pageCharts.filter((chart: ChartConfig) => chart.id !== chartId);
            
            if (updatedCharts.length > 0) {
              await saveChartsBatch(pageId, updatedCharts);
              console.log(`Updated batch file for page ${pageId} - removed chart ${chartId}`);
            } else {
              // If no charts left, delete the batch file
              await deleteFromS3(`charts/batches/page_${pageId}.json`);
              console.log(`Deleted empty batch file for page ${pageId}`);
            }
          }
        }
      } catch (error) {
        console.error(`Error updating batch files after chart deletion:`, error);
      }
    }, 0);
    
    endTimer(overallStart, "Total DELETE request time");
    return NextResponse.json({ 
      message: 'Chart deleted successfully',
      chartId
    });
  } catch (error) {
    console.error(`API: Error deleting chart ${chartId}:`, error);
    endTimer(overallStart, "Total DELETE request time (error)");
    
    return NextResponse.json(
      { error: 'Failed to delete chart', details: String(error) },
      { status: 500 }
    );
  }
}
