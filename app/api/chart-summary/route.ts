import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { readFile } from 'fs/promises';
import { join } from 'path';

// AI Configuration - Switch between OpenAI and Local API
// 
// TO SWITCH TO LOCAL API:
// Add to your .env.local file:
// USE_LOCAL_AI=true
// LOCAL_AI_URL=http://84.32.32.11:11434/api/generate  (optional, uses default)
// LOCAL_AI_MODEL=gpt-oss:20b  (optional, uses default)
//
// TO SWITCH BACK TO OPENAI:
// Remove USE_LOCAL_AI from .env.local or set USE_LOCAL_AI=false
//
const USE_LOCAL_API = process.env.USE_LOCAL_AI === 'true'; // Set to 'true' to use local API
const LOCAL_API_URL = process.env.LOCAL_AI_URL || 'http://84.32.32.11:11434/api/generate';
const LOCAL_AI_MODEL = process.env.LOCAL_AI_MODEL || 'gpt-oss:20b';

// Initialize OpenAI client (used when USE_LOCAL_API is false)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChartSummaryRequest {
  chartId: string;
  pageId: string;
}

// Function to call local AI API
async function callLocalAI(prompt: string): Promise<string> {
  const response = await fetch(LOCAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: LOCAL_AI_MODEL,
      prompt: prompt,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Local AI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.response || data.text || '';
}

// Function to call OpenAI API
async function callOpenAI(systemMessage: string, userPrompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: systemMessage
      },
      {
        role: 'user',
        content: userPrompt
      }
    ],
    max_tokens: 400,
    temperature: 0.3,
  });

  return response.choices[0]?.message?.content || '';
}

export async function POST(request: NextRequest) {
  try {
    // Check if API is available based on configuration
    if (!USE_LOCAL_API && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const body: ChartSummaryRequest = await request.json();
    const { chartId, pageId } = body;

    // Validate required fields
    if (!chartId || !pageId) {
      return NextResponse.json(
        { error: 'Missing required fields: chartId and pageId' },
        { status: 400 }
      );
    }

    // Read chart data and config from temp directories
    const dataPath = join(process.cwd(), 'public', 'temp', 'chart-data', `${pageId}.json`);
    const configPath = join(process.cwd(), 'public', 'temp', 'chart-configs', `${pageId}.json`);

    let chartDataFile, chartConfigFile;
    try {
      const [dataFileContent, configFileContent] = await Promise.all([
        readFile(dataPath, 'utf-8'),
        readFile(configPath, 'utf-8')
      ]);
      
      chartDataFile = JSON.parse(dataFileContent);
      chartConfigFile = JSON.parse(configFileContent);
    } catch (fileError) {
      return NextResponse.json(
        { error: `Failed to read chart files for pageId: ${pageId}`, details: fileError instanceof Error ? fileError.message : 'Unknown file error' },
        { status: 404 }
      );
    }

    // Find the specific chart in the data and config
    const chartData = chartDataFile.charts?.find((chart: any) => chart.chartId === chartId)?.data;
    const chartConfig = chartConfigFile.charts?.find((chart: any) => chart.id === chartId);

    if (!chartData || !chartConfig) {
      return NextResponse.json(
        { error: `Chart with ID ${chartId} not found in ${pageId}` },
        { status: 404 }
      );
    }

    if (!Array.isArray(chartData) || chartData.length === 0) {
      return NextResponse.json(
        { error: 'No chart data available for analysis' },
        { status: 400 }
      );
    }

    // Extract field information from chart config
    const { xAxis, yAxis, groupBy } = chartConfig.dataMapping;
    const xAxisField = Array.isArray(xAxis) ? xAxis[0] : xAxis;
    
    // Extract Y-axis field names
    let yAxisFields: string[] = [];
    if (Array.isArray(yAxis)) {
      yAxisFields = yAxis.map((field: any) => typeof field === 'object' ? field.field : field);
    } else {
      yAxisFields = [typeof yAxis === 'object' ? yAxis.field : yAxis];
    }
    
    // Pre-aggregate ENTIRE dataset using smart time aggregation
    let aggregatedData = [];
    let groupByDistinctItems: string[] = [];
    
    if (xAxisField && chartData.length > 0) {
      // Sort ALL data by date
      const sortedData = [...chartData].sort((a, b) => {
        const dateA = new Date(a[xAxisField]);
        const dateB = new Date(b[xAxisField]);
        return dateA.getTime() - dateB.getTime();
      });
      
      // Use comprehensive time aggregation like ChartRenderer
      aggregatedData = aggregateDataByTimePeriod(sortedData, 'M', xAxisField, yAxisFields, groupBy);
      
      // Extract distinct groupBy items if groupBy exists
      if (groupBy && chartData.length > 0) {
        groupByDistinctItems = [...new Set(chartData.map(item => String(item[groupBy])))].sort();
      }
      
    } else {
      // If no date field, aggregate by groups
      aggregatedData = aggregateDataByBatches(chartData, 15);
    }
    
    const dataStats = {
      totalRows: chartData.length,
      aggregatedData,
      aggregatedCount: aggregatedData.length,
      dateRange: extractDateRange(chartData, xAxisField),
      groupByField: groupBy || null,
      groupByDistinctItems,
      yAxisFields,
      aggregationMethod: xAxisField ? 'monthly_time_series' : 'batch_grouping'
    };

    // Create a comprehensive prompt with aggregated data
    const prompt = `
You are a Solana blockchain data analyst. Analyze this aggregated chart data.

**Chart Information:**
- Title: ${chartConfig.title}
- Description: ${chartConfig.subtitle || 'No description provided'}
- Chart Type: ${chartConfig.chartType || 'Unknown'}
- Page: ${chartDataFile.pageName || pageId}
- Total Data Points: ${dataStats.totalRows} → Aggregated to: ${dataStats.aggregatedCount} periods
- Date Range: ${dataStats.dateRange || 'Time-series data'}
- Aggregation Method: ${dataStats.aggregationMethod}
- Y-Axis Fields: ${dataStats.yAxisFields.join(', ')}
${dataStats.groupByField ? `- Group By Field: ${dataStats.groupByField}` : ''}
${dataStats.groupByDistinctItems.length > 0 ? `- Group Categories: ${dataStats.groupByDistinctItems.join(', ')}` : ''}

**Aggregated Data:**
${JSON.stringify(dataStats.aggregatedData, null, 2)}

Analyze this data and provide a concise but comprehensive summary formatted as follows:

**Key Findings:**
[2-3 bullet points of the most important insights]

**Trend Analysis:**
[Brief analysis of patterns and growth]

**Ecosystem Impact:**
[Context within Solana ecosystem]

Keep each section concise (1-2 sentences max). Use proper line breaks and markdown formatting. Focus on actionable insights a data analyst would highlight.
`;

    // Call AI API based on configuration
    let summary: string;
    
    if (USE_LOCAL_API) {
      // For local API, combine system message and prompt
      const fullPrompt = `You are a senior blockchain data analyst. Provide structured, professional analysis with clear sections and proper line breaks. Focus on the most impactful insights while keeping sections concise. Use markdown formatting for readability.

${prompt}`;
      
      summary = await callLocalAI(fullPrompt);
    } else {
      // Use OpenAI API
      const systemMessage = 'You are a senior blockchain data analyst. Provide structured, professional analysis with clear sections and proper line breaks. Focus on the most impactful insights while keeping sections concise. Use markdown formatting for readability.';
      summary = await callOpenAI(systemMessage, prompt);
    }

    if (!summary) {
      throw new Error(`No summary generated from ${USE_LOCAL_API ? 'Local AI' : 'OpenAI'}`);
    }

    // Return the summary
    return NextResponse.json({
      summary,
      metadata: {
        chartId,
        pageId,
        chartTitle: chartConfig.title,
        chartType: chartConfig.chartType,
        dataPoints: dataStats.totalRows,
        aggregatedPoints: dataStats.aggregatedCount,
        aggregationMethod: dataStats.aggregationMethod,
        yAxisFields: dataStats.yAxisFields,
        groupByField: dataStats.groupByField,
        groupByDistinctItems: dataStats.groupByDistinctItems,
        dateRange: dataStats.dateRange,
        aiService: USE_LOCAL_API ? 'Local AI' : 'OpenAI',
        aiModel: USE_LOCAL_API ? LOCAL_AI_MODEL : 'gpt-4o',
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Chart summarization error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate chart summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to extract date range from data
function extractDateRange(data: any[], xAxisField?: string | string[]): string | null {
  if (!data || data.length === 0) return null;
  
  const dateField = Array.isArray(xAxisField) ? xAxisField[0] : xAxisField;
  if (!dateField) return null;

  const dates = data
    .map(row => row[dateField])
    .filter(date => date)
    .map(date => new Date(date))
    .filter(date => !isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) return null;

  const firstDate = dates[0].toISOString().split('T')[0];
  const lastDate = dates[dates.length - 1].toISOString().split('T')[0];
  
  return `${firstDate} to ${lastDate}`;
}

// Comprehensive time aggregation function from ChartRenderer.tsx
function aggregateDataByTimePeriod(rawData: any[], timePeriod: string, xField: string, yFields: string[], groupByField?: string): any[] {
  if (!rawData || rawData.length === 0) return [];
  
  // Check if this is a stacked chart with groupBy field
  const isStackedWithGroupBy = groupByField;
  
  // Group data by the appropriate time period (and groupBy field if stacked)
  const groupedData: Record<string, any> = {};
  
  rawData.forEach(item => {
    const dateValue = item[xField];
    if (!dateValue) return;
    
    let timeGroupKey: string;
    const date = new Date(dateValue);
    
    switch (timePeriod) {
      case 'D': // Daily - use as is
        timeGroupKey = dateValue;
        break;
      case 'W': // Weekly - group by week start (Monday), keep YYYY-MM-DD format
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay() + 1); // Monday
        timeGroupKey = weekStart.toISOString().split('T')[0];
        break;
      case 'M': // Monthly - use first day of month, keep YYYY-MM-DD format
        timeGroupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        break;
      case 'Q': // Quarterly - use first day of quarter, keep YYYY-MM-DD format
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        const quarterStartMonth = (quarter - 1) * 3 + 1; // Q1->1, Q2->4, Q3->7, Q4->10
        timeGroupKey = `${date.getFullYear()}-${String(quarterStartMonth).padStart(2, '0')}-01`;
        break;
      case 'Y': // Yearly - use first day of year, keep YYYY-MM-DD format
        timeGroupKey = `${date.getFullYear()}-01-01`;
        break;
      default:
        timeGroupKey = dateValue;
    }
    
    // For charts with groupBy (stacked or non-stacked), create composite key: time + groupBy value
    // For charts without groupBy, use just the time key
    let groupKey: string;
    if (groupByField) {
      const groupValue = String(item[groupByField]);
      groupKey = `${timeGroupKey}|${groupValue}`;
    } else {
      groupKey = timeGroupKey;
    }
    
    if (!groupedData[groupKey]) {
      groupedData[groupKey] = {
        [xField]: timeGroupKey, // Always use time value for x-axis
        _count: 0,
        _firstDate: date
      };
      
      // For charts with groupBy, preserve the groupBy field
      if (groupByField) {
        groupedData[groupKey][groupByField] = item[groupByField];
      }
      
      // Initialize all numeric fields to 0
      yFields.forEach(field => {
        groupedData[groupKey][field] = 0;
      });
    }
    
    // Aggregate values - for cumulative data use max, for additive data use sum
    yFields.forEach(field => {
      if (item[field] !== undefined && item[field] !== null) {
        const value = Number(item[field]) || 0;
        
        // Detect cumulative fields by name patterns
        const fieldLower = field.toLowerCase();
        const isCumulative = fieldLower.includes('cumulative') || 
                            (fieldLower.includes('supply') && !fieldLower.includes('revenue') && !fieldLower.includes('volume') && !fieldLower.includes('fees')) ||
                            fieldLower.includes('marketcap') ||
                            fieldLower.includes('market_cap') ||
                            fieldLower === 'total' ||
                            fieldLower.startsWith('total') ||
                            fieldLower.endsWith('_total') ||
                            fieldLower.startsWith('total_supply') ||
                            fieldLower.startsWith('total_market');
        
        if (isCumulative) {
          // For cumulative data, use the maximum (latest) value in the period
          groupedData[groupKey][field] = Math.max(groupedData[groupKey][field], value);
        } else {
          // For additive data, sum the values
          groupedData[groupKey][field] += value;
        }
      }
    });
    
    groupedData[groupKey]._count++;
    
    // Keep the earliest date for sorting
    if (date < groupedData[groupKey]._firstDate) {
      groupedData[groupKey]._firstDate = date;
    }
  });
  
  // Convert back to array and sort by date, then by group if stacked
  const aggregatedData = Object.values(groupedData)
    .sort((a, b) => {
      // First sort by time
      const timeCompare = a._firstDate.getTime() - b._firstDate.getTime();
      if (timeCompare !== 0) return timeCompare;
      
      // If times are equal and this is stacked with groupBy, sort by group value
      if (isStackedWithGroupBy && groupByField) {
        const groupA = String(a[groupByField]);
        const groupB = String(b[groupByField]);
        return groupA.localeCompare(groupB);
      }
      
      return 0;
    })
    .map(item => {
      // Remove internal fields after sorting
      const fieldsToRemove = ['_count', '_firstDate'];
      const cleanItem = { ...item };
      fieldsToRemove.forEach(fieldToRemove => {
        delete cleanItem[fieldToRemove];
      });
      
      return cleanItem;
    });
  
  return aggregatedData;
}

// Aggregate data by batches for non-date data
function aggregateDataByBatches(data: any[], batchSize: number): any[] {
  if (!data || data.length === 0) return [];
  
  const batches = [];
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    const summary: any = {
      batch: Math.floor(i / batchSize) + 1,
      data_points: batch.length
    };
    
    // Get all numeric fields and aggregate them
    const firstRow = batch[0];
    Object.keys(firstRow).forEach(key => {
      const values = batch
        .map(row => row[key])
        .filter(val => val !== null && val !== undefined && !isNaN(Number(val)))
        .map(val => Number(val));
      
      if (values.length > 0) {
        const sum = values.reduce((acc, val) => acc + val, 0);
        summary[`${key}_total`] = sum;
        summary[`${key}_avg`] = sum / values.length;
        summary[`${key}_max`] = Math.max(...values);
        summary[`${key}_min`] = Math.min(...values);
      }
    });
    
    batches.push(summary);
  }
  
  return batches;
}

// Get numeric summary for a single row (fallback)
function getNumericSummary(row: any): any {
  const summary: any = {};
  
  Object.keys(row).forEach(key => {
    const value = row[key];
    if (value !== null && value !== undefined && !isNaN(Number(value))) {
      summary[key] = Number(value);
    }
  });
  
  return summary;
}


