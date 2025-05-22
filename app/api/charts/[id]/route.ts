import { NextRequest, NextResponse } from 'next/server';
import { ChartConfig } from '@/app/admin/types';
import { getFromS3, saveToS3, deleteFromS3 } from '@/lib/s3';

// Enable ISR for this API route - cache for 30 seconds
export const dynamic = 'force-dynamic';
export const revalidate = 30; // Cache revalidation time in seconds

// Memory cache for charts to avoid repeated S3 calls
const CHART_CACHE: Record<string, {
  data: ChartConfig;
  timestamp: number;
}> = {};

// Cache TTL (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

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

// Get chart with caching strategy
async function getChartWithCache(chartId: string): Promise<ChartConfig | null> {
  // Check memory cache first (fastest)
  if (CHART_CACHE[chartId] && 
      (Date.now() - CHART_CACHE[chartId].timestamp) < CACHE_TTL) {
    console.log(`Cache hit for chart ${chartId}`);
    return CHART_CACHE[chartId].data;
  }
  
  // Cache miss, get from S3
  console.log(`Cache miss for chart ${chartId}, fetching from S3`);
  const chart = await getFromS3<ChartConfig>(`charts/${chartId}.json`);
  
  // Update cache if chart was found
  if (chart) {
    CHART_CACHE[chartId] = {
      data: chart,
      timestamp: Date.now()
    };
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
    
    // Create response with caching headers
    const response = NextResponse.json(chart);
    
    // Add caching headers
    response.headers.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
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
