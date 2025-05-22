import { NextRequest, NextResponse } from 'next/server';
import { ChartConfig } from '@/app/admin/types';
import { 
  saveToS3, 
  getFromS3, 
  listFromS3, 
  saveChartPageIndex,
  getChartPageIndex,
  saveChartsBatch,
  getChartsBatch,
  getBatchedObjectsFromS3
} from '@/lib/s3';

// Enable ISR for this API route with 30-second revalidation
export const dynamic = 'force-dynamic';
export const revalidate = 30;

// Memory cache for charts to avoid repeated S3 calls
interface CacheEntry {
  data: ChartConfig[];
  timestamp: number;
}

const ALL_CHARTS_CACHE: CacheEntry = {
  data: [],
  timestamp: 0
};

const PAGE_CHARTS_CACHE: Record<string, CacheEntry> = {};

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

// Get charts for specific page with optimized caching
async function getChartsByPageWithCache(pageId: string): Promise<ChartConfig[]> {
  // Check memory cache first (fastest)
  if (PAGE_CHARTS_CACHE[pageId] && 
      (Date.now() - PAGE_CHARTS_CACHE[pageId].timestamp) < CACHE_TTL) {
    console.log(`Cache hit for page ${pageId} charts`);
    return PAGE_CHARTS_CACHE[pageId].data;
  }
  
  // Try to get from batch file (very fast)
  console.log(`Trying to get charts from batch file for page ${pageId}`);
  const batchStart = startTimer();
  const batchCharts = await getChartsBatch(pageId);
  
  if (batchCharts && batchCharts.length > 0) {
    endTimer(batchStart, `Retrieved ${batchCharts.length} charts from batch file for page ${pageId}`);
    
    // Update memory cache
    PAGE_CHARTS_CACHE[pageId] = {
      data: batchCharts,
      timestamp: Date.now()
    };
    
    return batchCharts;
  }
  
  // Try to get from page index file (still fast)
  console.log(`Trying to get charts from page index for ${pageId}`);
  const indexStart = startTimer();
  const chartIds = await getChartPageIndex(pageId);
  
  if (chartIds && chartIds.length > 0) {
    endTimer(indexStart, `Retrieved ${chartIds.length} chart IDs from page index`);
    
    // Get each chart in parallel
    const fetchStart = startTimer();
    const chartPromises = chartIds.map(id => 
      getFromS3<ChartConfig>(`charts/${id}.json`)
    );
    
    const charts = await Promise.all(chartPromises);
    const validCharts = charts.filter(chart => chart !== null) as ChartConfig[];
    
    endTimer(fetchStart, `Fetched ${validCharts.length} charts using index`);
    
    // Create a batch file for future requests
    if (validCharts.length > 0) {
      const batchSaveStart = startTimer();
      await saveChartsBatch(pageId, validCharts);
      endTimer(batchSaveStart, `Created batch file for page ${pageId}`);
    }
    
    // Update memory cache
    PAGE_CHARTS_CACHE[pageId] = {
      data: validCharts,
      timestamp: Date.now()
    };
    
    return validCharts;
  }
  
  // Check if we have all charts cached
  if (ALL_CHARTS_CACHE.data.length > 0 && 
      (Date.now() - ALL_CHARTS_CACHE.timestamp) < CACHE_TTL) {
    console.log(`Using all charts cache to filter for page ${pageId}`);
    const pageCharts = ALL_CHARTS_CACHE.data.filter(chart => chart.page === pageId);
    
    // Cache the page charts
    PAGE_CHARTS_CACHE[pageId] = {
      data: pageCharts,
      timestamp: Date.now()
    };
    
    // Create index and batch files for future requests
    if (pageCharts.length > 0) {
      const indexSaveStart = startTimer();
      
      // Save page index
      await saveChartPageIndex(
        pageId, 
        pageCharts.map(chart => chart.id)
      );
      
      // Save batch file
      await saveChartsBatch(pageId, pageCharts);
      
      endTimer(indexSaveStart, `Created index and batch files for page ${pageId}`);
    }
    
    return pageCharts;
  }
  
  // Get all charts and filter
  const allCharts = await getAllChartsFromS3();
  const pageCharts = allCharts.filter(chart => chart.page === pageId);
  
  // Cache the page charts
  PAGE_CHARTS_CACHE[pageId] = {
    data: pageCharts,
    timestamp: Date.now()
  };
  
  // Create index and batch files for future requests
  if (pageCharts.length > 0) {
    const indexSaveStart = startTimer();
    
    // Save page index
    await saveChartPageIndex(
      pageId, 
      pageCharts.map(chart => chart.id)
    );
    
    // Save batch file
    await saveChartsBatch(pageId, pageCharts);
    
    endTimer(indexSaveStart, `Created index and batch files for page ${pageId}`);
  }
  
  return pageCharts;
}

// Get all charts from S3 with optimized fetching
async function getAllChartsFromS3(): Promise<ChartConfig[]> {
  console.log("Fetching all charts from S3...");
  const fetchStart = startTimer();
  
  // Get charts using batched retrieval
  const validCharts = await getBatchedObjectsFromS3<ChartConfig>('charts/', 20);
  
  // Only keep actual chart files (exclude batch and index files)
  const actualCharts = validCharts.filter(chart => 
    chart.id && chart.title && chart.page && chart.chartType
  );
  
  // Cache all charts
  ALL_CHARTS_CACHE.data = actualCharts;
  ALL_CHARTS_CACHE.timestamp = Date.now();
  
  endTimer(fetchStart, `Retrieved ${actualCharts.length} charts from S3`);
  return actualCharts;
}

// GET /api/charts - Get all charts or filtered by page
export async function GET(req: NextRequest) {
  const overallStart = startTimer();
  try {
    // Get optional page parameter from URL
    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get('page');
    const skipCache = searchParams.get('skipCache') === 'true';
    
    // Check for conditional request
    const ifNoneMatch = req.headers.get('If-None-Match');
    const etag = `"charts-${pageId || 'all'}-${Date.now()}"`;
    
    // Get charts based on request
    let charts: ChartConfig[] = [];
    let source = 'unknown';
    
    if (pageId) {
      console.log(`API: Fetching charts for page ${pageId}`);
      
      // Skip memory cache if requested
      if (skipCache) {
        delete PAGE_CHARTS_CACHE[pageId];
      }
      
      const fetchStart = startTimer();
      charts = await getChartsByPageWithCache(pageId);
      endTimer(fetchStart, `Retrieved ${charts.length} charts for page ${pageId}`);
      source = 'page_optimized';
    } else {
      console.log("API: Fetching all charts");
      
      // Skip memory cache if requested
      if (skipCache) {
        ALL_CHARTS_CACHE.data = [];
      }
      
      // Check memory cache first (fastest)
      if (ALL_CHARTS_CACHE.data.length > 0 && 
          (Date.now() - ALL_CHARTS_CACHE.timestamp) < CACHE_TTL) {
        console.log(`Cache hit for all charts`);
        charts = ALL_CHARTS_CACHE.data;
        source = 'memory_cache';
      } else {
        const fetchStart = startTimer();
        charts = await getAllChartsFromS3();
        endTimer(fetchStart, `Retrieved ${charts.length} charts from S3`);
        source = 'full_s3';
      }
    }
    
    // Create response with caching headers
    const response = NextResponse.json({ 
      charts,
      source,
      count: charts.length,
      pageId: pageId || null,
      timestamp: new Date().toISOString()
    });
    
    // Add caching headers
    response.headers.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
    response.headers.set('ETag', etag);
    response.headers.set('X-Response-Time', `${endTimer(overallStart, "Total GET request time").toFixed(2)}ms`);
    
    return response;
  } catch (error) {
    console.error('API: Error fetching charts:', error);
    endTimer(overallStart, "Total GET request time (error)");
    
    return NextResponse.json(
      { error: 'Failed to fetch charts', details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/charts - Create a new chart
export async function POST(req: NextRequest) {
  const overallStart = startTimer();
  try {
    console.log("API: Creating new chart...");
    const chartConfig = await req.json() as ChartConfig;
    
    // Log the chart config we're trying to save
    console.log(`API: Saving chart with ID ${chartConfig.id}, title: ${chartConfig.title}`);
    
    // Validate the chart config
    if (!chartConfig.title || !chartConfig.page || !chartConfig.chartType) {
      console.log("API: Invalid chart configuration - missing required fields");
      endTimer(overallStart, "Total POST request time (invalid)");
      
      return NextResponse.json(
        { error: 'Invalid chart configuration' },
        { status: 400 }
      );
    }
    
    // Update timestamps if not already set
    chartConfig.updatedAt = new Date().toISOString();
    if (!chartConfig.createdAt) {
      chartConfig.createdAt = chartConfig.updatedAt;
    }
    
    // Save to S3
    const saveStart = startTimer();
    const s3Result = await saveToS3(`charts/${chartConfig.id}.json`, chartConfig);
    endTimer(saveStart, `Saved chart ${chartConfig.id} to S3`);
    
    if (!s3Result) {
      console.log(`API: Failed to save chart to S3`);
      endTimer(overallStart, "Total POST request time (S3 error)");
      
      return NextResponse.json(
        { error: 'Failed to save chart to S3' },
        { status: 500 }
      );
    }
    
    // Update memory caches
    const pageId = chartConfig.page;
    
    // Update all charts cache if it exists
    if (ALL_CHARTS_CACHE.data.length > 0) {
      const existingIndex = ALL_CHARTS_CACHE.data.findIndex(c => c.id === chartConfig.id);
      if (existingIndex >= 0) {
        ALL_CHARTS_CACHE.data[existingIndex] = chartConfig;
      } else {
        ALL_CHARTS_CACHE.data.push(chartConfig);
      }
    }
    
    // Update page cache if it exists
    if (PAGE_CHARTS_CACHE[pageId]) {
      const existingIndex = PAGE_CHARTS_CACHE[pageId].data.findIndex(c => c.id === chartConfig.id);
      if (existingIndex >= 0) {
        PAGE_CHARTS_CACHE[pageId].data[existingIndex] = chartConfig;
      } else {
        PAGE_CHARTS_CACHE[pageId].data.push(chartConfig);
      }
    }
    
    // Update indexes and batch files
    setTimeout(async () => {
      try {
        // Get existing page index
        const existingIds = await getChartPageIndex(pageId) || [];
        
        // Add this chart if not already in the index
        if (!existingIds.includes(chartConfig.id)) {
          await saveChartPageIndex(pageId, [...existingIds, chartConfig.id]);
        }
        
        // Update batch file with the latest charts
        // Get all charts for this page
        let pageCharts: ChartConfig[] = [];
        
        if (PAGE_CHARTS_CACHE[pageId]) {
          pageCharts = PAGE_CHARTS_CACHE[pageId].data;
        } else {
          const allCharts = ALL_CHARTS_CACHE.data.length > 0
            ? ALL_CHARTS_CACHE.data
            : await getAllChartsFromS3();
          
          pageCharts = allCharts.filter(c => c.page === pageId);
        }
        
        // Save updated batch
        await saveChartsBatch(pageId, pageCharts);
        console.log(`Updated indexes and batch file for page ${pageId}`);
      } catch (error) {
        console.error(`Error updating indexes for page ${pageId}:`, error);
      }
    }, 0);
    
    console.log(`API: Chart saved successfully to S3 with ID ${chartConfig.id}`);
    endTimer(overallStart, "Total POST request time");
    
    return NextResponse.json({ 
      message: 'Chart saved to S3 successfully',
      chartId: chartConfig.id
    });
  } catch (error) {
    console.error('API: Error creating/updating chart:', error);
    endTimer(overallStart, "Total POST request time (error)");
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error 
      ? error.message
      : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to create/update chart', 
        details: errorMessage
      },
      { status: 500 }
    );
  }
} 