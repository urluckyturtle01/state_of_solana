import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

export async function GET(
  request: NextRequest,
  { params }: { params: { pageId: string } }
): Promise<Response> {
  try {
    const { pageId } = params;
    const url = new URL(request.url);
    
    // Get query parameters for intelligent aggregation level selection
    const requestedLevel = url.searchParams.get('level'); // 'raw', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
    const chartId = url.searchParams.get('chartId'); // specific chart ID
    const timeRange = url.searchParams.get('timeRange'); // time range hint for auto-selection
    const preferPerformance = url.searchParams.get('performance') === 'true'; // prioritize performance over detail
    
    // Paths to aggregated and fallback files
    const aggregatedFilePath = path.join(process.cwd(), 'public', 'temp', 'chart-data', 'aggregated', `${pageId}.json.gz`);
    const aggregatedUncompressedPath = path.join(process.cwd(), 'public', 'temp', 'chart-data', 'aggregated', `${pageId}.json`);
    const fallbackCompressedPath = path.join(process.cwd(), 'public', 'temp', 'chart-data', `${pageId}.json.gz`);
    const fallbackUncompressedPath = path.join(process.cwd(), 'public', 'temp', 'chart-data', `${pageId}.json`);
    
    let fileData: Buffer;
    let isAggregated = false;
    let isCompressed = false;
    
    // Try to load aggregated data first
    if (fs.existsSync(aggregatedFilePath)) {
      console.log(`📦 Serving aggregated compressed data for page: ${pageId}`);
      fileData = fs.readFileSync(aggregatedFilePath);
      isAggregated = true;
      isCompressed = true;
    } else if (fs.existsSync(aggregatedUncompressedPath)) {
      console.log(`📄 Serving aggregated uncompressed data for page: ${pageId}`);
      fileData = fs.readFileSync(aggregatedUncompressedPath);
      isAggregated = true;
    } else if (fs.existsSync(fallbackCompressedPath)) {
      console.log(`📦 Fallback to original compressed data for page: ${pageId}`);
      fileData = fs.readFileSync(fallbackCompressedPath);
      isCompressed = true;
    } else if (fs.existsSync(fallbackUncompressedPath)) {
      console.log(`📄 Fallback to original uncompressed data for page: ${pageId}`);
      fileData = fs.readFileSync(fallbackUncompressedPath);
    } else {
      console.log(`❌ No data found for page: ${pageId}`);
      return NextResponse.json({ error: 'Page data not found' }, { status: 404 });
    }
    
    // Decompress if needed
    let jsonData: string;
    if (isCompressed) {
      try {
        const decompressed = zlib.gunzipSync(fileData);
        jsonData = decompressed.toString('utf8');
      } catch (decompressionError) {
        console.error(`❌ Failed to decompress data for page ${pageId}:`, decompressionError);
        return NextResponse.json({ error: 'Failed to decompress data' }, { status: 500 });
      }
    } else {
      jsonData = fileData.toString('utf8');
    }
    
    let chartDataFile;
    try {
      chartDataFile = JSON.parse(jsonData);
    } catch (parseError) {
      console.error(`❌ Failed to parse JSON data for page ${pageId}:`, parseError);
      return NextResponse.json({ error: 'Failed to parse data' }, { status: 500 });
    }
    
    // If this is aggregated data, apply intelligent level selection
    if (isAggregated && chartDataFile.aggregationOptimized) {
      chartDataFile = selectOptimalAggregationLevel(chartDataFile, {
        requestedLevel,
        chartId,
        timeRange,
        preferPerformance
      });
    }
    
    // Add response metadata
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'application/json');
    responseHeaders.set('X-Data-Type', isAggregated ? 'aggregated' : 'original');
    
    if (isAggregated) {
      responseHeaders.set('X-Aggregation-Info', JSON.stringify({
        optimized: true,
        originalPoints: chartDataFile.totalOriginalPoints,
        optimizedPoints: chartDataFile.totalOptimizedPoints,
        optimizedAt: chartDataFile.optimizedAt
      }));
    }
    
    console.log(`✅ Served ${isAggregated ? 'aggregated' : 'original'} data for page: ${pageId}`);
    
    return new NextResponse(JSON.stringify(chartDataFile), {
      status: 200,
      headers: responseHeaders
    });
    
  } catch (error) {
    console.error(`❌ Error serving data for page ${params.pageId}:`, error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * Intelligent aggregation level selection based on request context
 */
function selectOptimalAggregationLevel(
  chartDataFile: any,
  options: {
    requestedLevel?: string | null;
    chartId?: string | null;
    timeRange?: string | null;
    preferPerformance?: boolean;
  }
): any {
  const { requestedLevel, chartId, timeRange, preferPerformance } = options;
  
  // If specific level is requested, try to honor it
  if (requestedLevel && requestedLevel !== 'auto') {
    return selectSpecificLevel(chartDataFile, requestedLevel, chartId);
  }
  
  // Intelligent auto-selection based on context
  return selectLevelByContext(chartDataFile, { timeRange, preferPerformance, chartId });
}

/**
 * Select a specific aggregation level
 */
function selectSpecificLevel(chartDataFile: any, level: string, chartId?: string | null): any {
  const processedCharts = chartDataFile.charts.map((chart: any) => {
    if (!chart.aggregatedData) return chart;
    
    // If specific chart ID is requested, only process that chart
    if (chartId && chart.chartId !== chartId) return chart;
    
    const availableLevels = Object.keys(chart.aggregatedData);
    console.log(`🎯 Requested level '${level}' for chart ${chart.chartId}, available: [${availableLevels.join(', ')}]`);
    
    // Try to use requested level, fallback to best available
    let selectedLevel = level;
    if (!chart.aggregatedData[level]) {
      // Fallback strategy: find the closest level
      const levelPriority = ['raw', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
      const requestedIndex = levelPriority.indexOf(level);
      
      if (requestedIndex !== -1) {
        // Try levels closer to requested (both directions)
        for (let offset = 1; offset < levelPriority.length; offset++) {
          const lowerIndex = requestedIndex - offset;
          const higherIndex = requestedIndex + offset;
          
          if (lowerIndex >= 0 && chart.aggregatedData[levelPriority[lowerIndex]]) {
            selectedLevel = levelPriority[lowerIndex];
            break;
          }
          
          if (higherIndex < levelPriority.length && chart.aggregatedData[levelPriority[higherIndex]]) {
            selectedLevel = levelPriority[higherIndex];
            break;
          }
        }
      }
      
      // Final fallback to any available level
      if (!chart.aggregatedData[selectedLevel]) {
        selectedLevel = availableLevels[0];
      }
    }
    
    const selectedData = chart.aggregatedData[selectedLevel];
    console.log(`📊 Selected '${selectedLevel}' level with ${selectedData.length} points`);
    
    return {
      ...chart,
      data: selectedData,
      selectedAggregationLevel: selectedLevel,
      availableAggregationLevels: availableLevels
    };
  });
  
  return {
    ...chartDataFile,
    charts: processedCharts,
    responseMetadata: {
      requestedLevel: level,
      levelSelection: 'specific'
    }
  };
}

/**
 * Intelligent level selection based on context
 */
function selectLevelByContext(
  chartDataFile: any,
  context: {
    timeRange?: string | null;
    preferPerformance?: boolean;
    chartId?: string | null;
  }
): any {
  const { timeRange, preferPerformance, chartId } = context;
  
  const processedCharts = chartDataFile.charts.map((chart: any) => {
    if (!chart.aggregatedData || !chart.aggregationMetadata) return chart;
    
    // If specific chart ID is requested, only process that chart
    if (chartId && chart.chartId !== chartId) return chart;
    
    const metadata = chart.aggregationMetadata;
    const availableLevels = Object.keys(chart.aggregatedData);
    
    let selectedLevel: string;
    
    // Intelligent selection based on context
    if (preferPerformance) {
      // Choose the most aggregated level for maximum performance
      const performanceLevels = ['yearly', 'quarterly', 'monthly', 'weekly', 'daily', 'raw'];
      selectedLevel = performanceLevels.find(level => availableLevels.includes(level)) || availableLevels[0];
    } else if (timeRange) {
      // Choose appropriate level based on time range
      selectedLevel = selectLevelByTimeRange(timeRange, availableLevels, metadata);
    } else {
      // Use the default level from metadata
      selectedLevel = metadata.defaultLevel && availableLevels.includes(metadata.defaultLevel) 
        ? metadata.defaultLevel 
        : availableLevels[0];
    }
    
    const selectedData = chart.aggregatedData[selectedLevel];
    console.log(`🤖 Auto-selected '${selectedLevel}' level with ${selectedData.length} points for chart ${chart.chartId}`);
    
    return {
      ...chart,
      data: selectedData,
      selectedAggregationLevel: selectedLevel,
      availableAggregationLevels: availableLevels,
      selectionReason: preferPerformance ? 'performance-optimized' : timeRange ? 'time-range-optimized' : 'default'
    };
  });
  
  return {
    ...chartDataFile,
    charts: processedCharts,
    responseMetadata: {
      levelSelection: 'intelligent',
      context: { timeRange, preferPerformance }
    }
  };
}

/**
 * Select aggregation level based on time range
 */
function selectLevelByTimeRange(timeRange: string, availableLevels: string[], metadata: any): string {
  // Map time ranges to appropriate aggregation levels
  const timeRangeMapping: Record<string, string[]> = {
    'D': ['raw', 'daily'],           // Last day - prefer raw or daily
    'W': ['daily', 'raw'],           // Last week - prefer daily
    'M': ['weekly', 'daily'],        // Last month - prefer weekly
    'Q': ['monthly', 'weekly'],      // Last quarter - prefer monthly
    'Y': ['quarterly', 'monthly'],   // Last year - prefer quarterly
    'ALL': ['yearly', 'quarterly']   // All time - prefer yearly
  };
  
  const preferredLevels = timeRangeMapping[timeRange] || ['monthly', 'weekly'];
  
  // Find the first available level from preferred list
  for (const level of preferredLevels) {
    if (availableLevels.includes(level)) {
      return level;
    }
  }
  
  // Fallback to default or first available
  return metadata.defaultLevel && availableLevels.includes(metadata.defaultLevel) 
    ? metadata.defaultLevel 
    : availableLevels[0];
} 