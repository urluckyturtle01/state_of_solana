import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

export async function GET(
  request: NextRequest,
  { params }: { params: { pageId: string; chartId: string } }
): Promise<Response> {
  const startTime = performance.now();
  
  try {
    const { pageId, chartId } = params;
    console.log(`📊 SINGLE CHART API: Fetching chart ${chartId} from page ${pageId}`);
    
    // Path to the data files
    const compressedFilePath = path.join(process.cwd(), 'public', 'temp', 'chart-data', `${pageId}.json.gz`);
    const originalFilePath = path.join(process.cwd(), 'public', 'temp', 'chart-data', `${pageId}.json`);
    
    // Check which file exists
    let fileData: Buffer;
    let isCompressed = false;
    
    if (fs.existsSync(compressedFilePath)) {
      fileData = fs.readFileSync(compressedFilePath);
      isCompressed = true;
    } else if (fs.existsSync(originalFilePath)) {
      fileData = fs.readFileSync(originalFilePath);
    } else {
      const loadTime = performance.now() - startTime;
      console.log(`❌ No data found for page: ${pageId} (${loadTime.toFixed(2)}ms)`);
      return NextResponse.json({ error: 'Page data not found' }, { status: 404 });
    }
    
    // Decompress if needed
    let jsonData: string;
    if (isCompressed) {
      try {
        const decompressed = zlib.gunzipSync(fileData);
        jsonData = decompressed.toString('utf8');
      } catch (error) {
        console.error(`❌ Failed to decompress data for page ${pageId}:`, error);
        return NextResponse.json({ error: 'Failed to decompress data' }, { status: 500 });
      }
    } else {
      jsonData = fileData.toString('utf8');
    }
    
    // Parse JSON and extract the specific chart
    try {
      const pageData = JSON.parse(jsonData);
      
      if (!pageData.charts || !Array.isArray(pageData.charts)) {
        console.error(`❌ Invalid data format for page ${pageId}`);
        return NextResponse.json({ error: 'Invalid data format' }, { status: 500 });
      }
      
      // Find the specific chart by chartId
      const chart = pageData.charts.find((c: any) => c.chartId === chartId);
      
      if (!chart) {
        console.log(`❌ Chart ${chartId} not found in page ${pageId}`);
        return NextResponse.json({ error: 'Chart not found' }, { status: 404 });
      }
      
      const totalTime = performance.now() - startTime;
      const dataSize = JSON.stringify(chart).length;
      
      console.log(`✅ SINGLE CHART SUCCESS: Served chart ${chartId} in ${totalTime.toFixed(2)}ms (${(dataSize / 1024).toFixed(1)}KB)`);
      
      // Return the chart data
      return NextResponse.json({
        chartId: chart.chartId,
        success: chart.success !== false,
        data: chart.data || [],
        sqlFile: chart.sqlFile
      }, {
        headers: {
          'Cache-Control': 'public, max-age=1800, s-maxage=1800',
          'X-Response-Time': `${totalTime.toFixed(2)}ms`,
          'Content-Type': 'application/json',
        },
      });
      
    } catch (parseError) {
      console.error(`❌ Failed to parse JSON for page ${pageId}:`, parseError);
      return NextResponse.json({ error: 'Invalid JSON data' }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Error in single chart data API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
