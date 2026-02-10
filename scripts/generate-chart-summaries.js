#!/usr/bin/env node

/**
 * Chart Summary Pre-Generation Script
 * 
 * This script generates 5 versions of AI summaries for all charts
 * and stores them in S3 as a JSON file for fast retrieval.
 * 
 * Usage:
 *   node scripts/generate-chart-summaries.js
 *   
 * Environment Variables:
 *   - USE_LOCAL_AI=true/false (default: false - uses OpenAI)
 *   - LOCAL_AI_URL=http://... (for local AI)
 *   - LOCAL_AI_MODEL=model_name (for local AI)
 *   - OPENAI_API_KEY=your_key (for OpenAI)
 *   - AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION (for S3)
 */

const fs = require('fs').promises;
const path = require('path');
const OpenAI = require('openai');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// AI Configuration - matches the route.ts configuration
const USE_LOCAL_API = process.env.USE_LOCAL_AI === 'true';
const LOCAL_API_URL = process.env.LOCAL_AI_URL || 'http://84.32.32.11:11434/api/generate';
const LOCAL_AI_MODEL = process.env.LOCAL_AI_MODEL || 'gpt-oss:20b';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// S3 Configuration
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const S3_BUCKET = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'topledger-chart-data';
const SUMMARIES_KEY = 'chart-summaries.json';

// Summary generation parameters
const VERSIONS_PER_CHART = 5;
const DELAY_BETWEEN_REQUESTS = 2000; // 2 seconds to avoid rate limits

// Utility function to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to call local AI API
async function callLocalAI(prompt) {
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
async function callOpenAI(systemMessage, userPrompt) {
  const response = await openai.responses.create({
    model: 'gpt-5-nano',
    input: [
      {
        role: 'developer',
        content: systemMessage
      },
      {
        role: 'user', 
        content: userPrompt
      }
    ],
  });

  // Extract text from response
  let outputText = '';
  for (const item of response.output) {
    if (item && typeof item === 'object' && 'content' in item) {
      const content = item.content;
      if (Array.isArray(content)) {
        for (const contentItem of content) {
          if (contentItem && typeof contentItem === 'object' && 'text' in contentItem) {
            outputText += contentItem.text;
          }
        }
      }
    }
  }

  return outputText || '';
}

// Time aggregation function (copied from route.ts)
function aggregateDataByTimePeriod(rawData, timePeriod, xField, yFields, groupByField) {
  if (!rawData || rawData.length === 0) return [];
  
  const isStackedWithGroupBy = groupByField;
  const groupedData = {};
  
  rawData.forEach(item => {
    const dateValue = item[xField];
    if (!dateValue) return;
    
    let timeGroupKey;
    const date = new Date(dateValue);
    
    switch (timePeriod) {
      case 'D':
        timeGroupKey = dateValue;
        break;
      case 'W':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay() + 1);
        timeGroupKey = weekStart.toISOString().split('T')[0];
        break;
      case 'M':
        timeGroupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        break;
      case 'Q':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        const quarterStartMonth = (quarter - 1) * 3 + 1;
        timeGroupKey = `${date.getFullYear()}-${String(quarterStartMonth).padStart(2, '0')}-01`;
        break;
      case 'Y':
        timeGroupKey = `${date.getFullYear()}-01-01`;
        break;
      default:
        timeGroupKey = dateValue;
    }
    
    let groupKey;
    if (groupByField) {
      const groupValue = String(item[groupByField]);
      groupKey = `${timeGroupKey}|${groupValue}`;
    } else {
      groupKey = timeGroupKey;
    }
    
    if (!groupedData[groupKey]) {
      groupedData[groupKey] = {
        [xField]: timeGroupKey,
        _count: 0,
        _firstDate: date
      };
      
      if (groupByField) {
        groupedData[groupKey][groupByField] = item[groupByField];
      }
      
      yFields.forEach(field => {
        groupedData[groupKey][field] = 0;
      });
    }
    
    yFields.forEach(field => {
      if (item[field] !== undefined && item[field] !== null) {
        const value = Number(item[field]) || 0;
        
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
          groupedData[groupKey][field] = Math.max(groupedData[groupKey][field], value);
        } else {
          groupedData[groupKey][field] += value;
        }
      }
    });
    
    groupedData[groupKey]._count++;
    
    if (date < groupedData[groupKey]._firstDate) {
      groupedData[groupKey]._firstDate = date;
    }
  });
  
  const aggregatedData = Object.values(groupedData)
    .sort((a, b) => {
      const timeCompare = a._firstDate.getTime() - b._firstDate.getTime();
      if (timeCompare !== 0) return timeCompare;
      
      if (isStackedWithGroupBy && groupByField) {
        const groupA = String(a[groupByField]);
        const groupB = String(b[groupByField]);
        return groupA.localeCompare(groupB);
      }
      
      return 0;
    })
    .map(item => {
      const fieldsToRemove = ['_count', '_firstDate'];
      const cleanItem = { ...item };
      fieldsToRemove.forEach(fieldToRemove => {
        delete cleanItem[fieldToRemove];
      });
      
      return cleanItem;
    });
  
  return aggregatedData;
}

// Extract date range function
function extractDateRange(data, xAxisField) {
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

// Generate a single summary
async function generateSummary(chartId, pageId, chartData, chartConfig, version) {
  try {
    console.log(`🤖 Generating summary ${version + 1}/${VERSIONS_PER_CHART} for ${chartId}...`);
    
    // Process data similar to route.ts
    const { xAxis, yAxis, groupBy } = chartConfig.dataMapping;
    const xAxisField = Array.isArray(xAxis) ? xAxis[0] : xAxis;
    
    let yAxisFields = [];
    if (Array.isArray(yAxis)) {
      yAxisFields = yAxis.map(field => typeof field === 'object' ? field.field : field);
    } else {
      yAxisFields = [typeof yAxis === 'object' ? yAxis.field : yAxis];
    }
    
    let aggregatedData = [];
    let groupByDistinctItems = [];
    
    if (xAxisField && chartData.length > 0) {
      const sortedData = [...chartData].sort((a, b) => {
        const dateA = new Date(a[xAxisField]);
        const dateB = new Date(b[xAxisField]);
        return dateA.getTime() - dateB.getTime();
      });
      
      aggregatedData = aggregateDataByTimePeriod(sortedData, 'M', xAxisField, yAxisFields, groupBy);
      
      if (groupBy && chartData.length > 0) {
        groupByDistinctItems = [...new Set(chartData.map(item => String(item[groupBy])))].sort();
      }
    } else {
      // Simple aggregation for non-time series
      aggregatedData = chartData.slice(0, 15);
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

    // Create the prompt
    const prompt = `
You are a Solana blockchain data analyst. Analyze this aggregated chart data.

**Chart Information:**
- Title: ${chartConfig.title}
- Description: ${chartConfig.subtitle || 'No description provided'}
- Chart Type: ${chartConfig.chartType || 'Unknown'}
- Page: ${pageId}
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

IMPORTANT: Based on the actual data patterns you observe, intelligently add appropriate trend indicators at the end of each key insight. Choose from these custom trend indicators based on what you actually see in the data:

- [EXPONENTIAL] for explosive/accelerating growth patterns
- [GROWTH] for steady upward trends  
- [DECLINE] for downward trends
- [VOLATILE] for high volatility/rapid changes
- [STABLE] for flat/steady patterns
- [PEAK] for reaching highs/local peaks
- [DIP] for reaching lows/local dips
- [RECOVERY] for bouncing back from lows
- [VOLUME] for volume-related insights
- [CYCLE] for cyclical/seasonal patterns

Example: "Transaction fees increased 45% month-over-month [GROWTH]"

Let the data guide your trend indicator choice - only use indicators that match actual patterns you observe. Keep each section concise (1-2 sentences max). Use proper line breaks and markdown formatting.

Version ${version + 1}: Provide a ${version === 0 ? 'comprehensive and detailed' : version === 1 ? 'concise and focused' : version === 2 ? 'technical and data-driven' : version === 3 ? 'strategic and business-oriented' : 'trend-focused and future-looking'} perspective.
`;

    // Call AI API
    let summary;
    
    if (USE_LOCAL_API) {
      const fullPrompt = `You are a senior blockchain data analyst. Provide structured, professional analysis with clear sections and proper line breaks. Focus on the most impactful insights while keeping sections concise. Use markdown formatting for readability. Always include trend indicators at the end of bullet points as specified.

${prompt}`;
      
      summary = await callLocalAI(fullPrompt);
    } else {
      const systemMessage = 'You are a senior blockchain data analyst. Provide structured, professional analysis with clear sections and proper line breaks. Focus on the most impactful insights while keeping sections concise. Use markdown formatting for readability. Always include trend indicators at the end of bullet points as specified.';
      summary = await callOpenAI(systemMessage, prompt);
    }

    return {
      version: version + 1,
      summary: summary.trim(),
      generatedAt: new Date().toISOString(),
      aiService: USE_LOCAL_API ? 'Local AI' : 'OpenAI',
      aiModel: USE_LOCAL_API ? LOCAL_AI_MODEL : 'gpt-5-nano',
      dataStats: {
        totalRows: dataStats.totalRows,
        aggregatedCount: dataStats.aggregatedCount,
        dateRange: dataStats.dateRange,
        yAxisFields: dataStats.yAxisFields
      }
    };

  } catch (error) {
    console.error(`❌ Failed to generate summary ${version + 1} for ${chartId}:`, error.message);
    return {
      version: version + 1,
      error: error.message,
      generatedAt: new Date().toISOString(),
      aiService: USE_LOCAL_API ? 'Local AI' : 'OpenAI'
    };
  }
}

// Find all charts from the temp directories
async function findAllCharts() {
  const charts = [];
  
  try {
    const dataDir = path.join(process.cwd(), 'public', 'temp', 'chart-data');
    const configDir = path.join(process.cwd(), 'server', 'chart-configs');
    
    const dataFiles = await fs.readdir(dataDir);
    
    for (const dataFile of dataFiles) {
      if (!dataFile.endsWith('.json')) continue;
      
      const pageId = dataFile.replace('.json', '');
      const dataPath = path.join(dataDir, dataFile);
      const configPath = path.join(configDir, dataFile);
      
      try {
        const [dataContent, configContent] = await Promise.all([
          fs.readFile(dataPath, 'utf-8'),
          fs.readFile(configPath, 'utf-8')
        ]);
        
        const dataFile = JSON.parse(dataContent);
        const configFile = JSON.parse(configContent);
        
        if (dataFile.charts && configFile.charts) {
          for (const chartData of dataFile.charts) {
            const chartConfig = configFile.charts.find(c => c.id === chartData.chartId);
            if (chartConfig && chartData.data && chartData.data.length > 0) {
              charts.push({
                chartId: chartData.chartId,
                pageId,
                data: chartData.data,
                config: chartConfig,
                pageName: dataFile.pageName || pageId
              });
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️  Skipping ${pageId}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to scan chart directories:', error.message);
  }
  
  return charts;
}

// Load existing summaries from S3
async function loadExistingSummaries() {
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: SUMMARIES_KEY
    });
    
    const response = await s3Client.send(command);
    const body = await response.Body.transformToString();
    const data = JSON.parse(body);
    
    console.log(`📥 Loaded ${Object.keys(data.summaries || {}).length} existing chart summaries from S3`);
    return data;
    
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      console.log('📄 No existing summaries found in S3, starting fresh');
      return {
        lastUpdated: new Date().toISOString(),
        totalCharts: 0,
        summaries: {}
      };
    }
    throw error;
  }
}

// Save summaries to S3
async function saveSummariesToS3(summariesData) {
  try {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: SUMMARIES_KEY,
      Body: JSON.stringify(summariesData, null, 2),
      ContentType: 'application/json'
    });
    
    await s3Client.send(command);
    console.log(`💾 Saved summaries to S3: s3://${S3_BUCKET}/${SUMMARIES_KEY}`);
    
  } catch (error) {
    console.error('❌ Failed to save summaries to S3:', error.message);
    throw error;
  }
}

// Main function
async function main() {
  const startTime = Date.now();
  
  console.log('🚀 Starting chart summary pre-generation...');
  console.log(`🤖 AI Service: ${USE_LOCAL_API ? `Local AI (${LOCAL_AI_MODEL})` : 'OpenAI (gpt-5-nano)'}`);
  console.log(`📊 Versions per chart: ${VERSIONS_PER_CHART}`);
  console.log('');
  
  try {
    // Load existing summaries
    const summariesData = await loadExistingSummaries();
    
    // Find all charts
    const charts = await findAllCharts();
    console.log(`📈 Found ${charts.length} charts to process`);
    
    if (charts.length === 0) {
      console.log('❌ No charts found to process');
      return;
    }
    
    let totalGenerated = 0;
    let totalSkipped = 0;
    
    // Process each chart
    for (let i = 0; i < charts.length; i++) {
      const chart = charts[i];
      const chartKey = `${chart.pageId}:${chart.chartId}`;
      
      console.log(`\n📊 Processing ${i + 1}/${charts.length}: ${chart.config.title}`);
      console.log(`   Chart ID: ${chart.chartId}`);
      console.log(`   Page: ${chart.pageId}`);
      console.log(`   Data points: ${chart.data.length}`);
      
      // Check if we already have summaries for this chart
      if (summariesData.summaries[chartKey]) {
        console.log(`   ✅ Already have ${summariesData.summaries[chartKey].versions.length} versions, skipping...`);
        totalSkipped++;
        continue;
      }
      
      // Generate summaries for this chart
      const versions = [];
      
      for (let v = 0; v < VERSIONS_PER_CHART; v++) {
        if (v > 0) {
          console.log(`   ⏳ Waiting ${DELAY_BETWEEN_REQUESTS}ms to avoid rate limits...`);
          await sleep(DELAY_BETWEEN_REQUESTS);
        }
        
        const summary = await generateSummary(
          chart.chartId,
          chart.pageId,
          chart.data,
          chart.config,
          v
        );
        
        versions.push(summary);
        totalGenerated++;
        
        if (summary.error) {
          console.log(`   ❌ Version ${v + 1} failed: ${summary.error}`);
        } else {
          console.log(`   ✅ Version ${v + 1} generated (${summary.summary.length} characters)`);
        }
      }
      
      // Store summaries for this chart
      summariesData.summaries[chartKey] = {
        chartId: chart.chartId,
        pageId: chart.pageId,
        chartTitle: chart.config.title,
        chartType: chart.config.chartType,
        pageName: chart.pageName,
        lastUpdated: new Date().toISOString(),
        versions
      };
      
      // Save progress every 5 charts
      if ((i + 1) % 5 === 0) {
        summariesData.lastUpdated = new Date().toISOString();
        summariesData.totalCharts = Object.keys(summariesData.summaries).length;
        await saveSummariesToS3(summariesData);
        console.log(`   💾 Progress saved (${i + 1}/${charts.length})`);
      }
    }
    
    // Final save
    summariesData.lastUpdated = new Date().toISOString();
    summariesData.totalCharts = Object.keys(summariesData.summaries).length;
    summariesData.generationStats = {
      totalChartsProcessed: charts.length,
      totalSummariesGenerated: totalGenerated,
      totalChartsSkipped: totalSkipped,
      versionsPerChart: VERSIONS_PER_CHART,
      processingTimeMs: Date.now() - startTime,
      aiService: USE_LOCAL_API ? 'Local AI' : 'OpenAI',
      completedAt: new Date().toISOString()
    };
    
    await saveSummariesToS3(summariesData);
    
    // Final summary
    const processingTime = Date.now() - startTime;
    console.log('\n🎉 Chart summary generation completed!');
    console.log(`📊 Total charts: ${charts.length}`);
    console.log(`✅ Summaries generated: ${totalGenerated}`);
    console.log(`⏭️  Charts skipped: ${totalSkipped}`);
    console.log(`⏱️  Processing time: ${Math.round(processingTime / 1000)}s`);
    console.log(`💾 Saved to: s3://${S3_BUCKET}/${SUMMARIES_KEY}`);
    
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };
