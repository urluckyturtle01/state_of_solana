import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getBatchedObjectsFromS3 } from '@/lib/s3';
import { ChartConfig } from '@/app/admin/types';

// Helper function to clean columns array
function cleanColumns(columns: string[]): string[] {
  if (!Array.isArray(columns)) return columns;
  
  // Filter out the "$" column as it's just a formatting indicator
  return columns.filter(col => col !== '$');
}

// Helper function to clean additionalOptions
function cleanAdditionalOptions(additionalOptions: any) {
  if (!additionalOptions) return additionalOptions;
  
  // Create a copy to avoid modifying the original
  const cleaned = { ...additionalOptions };
  
  // If enableTimeAggregation is true, remove timeFilter from filters
  if (cleaned.enableTimeAggregation === true && cleaned.filters?.timeFilter) {
    cleaned.filters = { ...cleaned.filters };
    delete cleaned.filters.timeFilter;
    
    // If filters object is now empty, remove it
    if (Object.keys(cleaned.filters).length === 0) {
      delete cleaned.filters;
    }
  }
  
  return cleaned;
}

// Get all charts from S3 directly (same logic as charts API)
async function getAllChartsFromS3(): Promise<ChartConfig[]> {
  console.log("Fetching all charts from S3...");
  
  // Get charts using batched retrieval
  const validCharts = await getBatchedObjectsFromS3<ChartConfig>('charts/', 20);
  
  // Only keep actual chart files (exclude batch and index files)
  const actualCharts = validCharts.filter(chart => 
    chart.id && chart.title && chart.page && chart.chartType
  );
  
  console.log(`Retrieved ${actualCharts.length} charts from S3`);
  return actualCharts;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Starting cache update process...');
    
    // Get charts directly from S3 using the same logic as the charts API
    const charts = await getAllChartsFromS3();
    console.log(`Fetched ${charts.length} charts from S3`);

    // Extract unique APIs from charts
    const apiMap = new Map();
    let processedCharts = 0;
    
    charts.forEach((chart: any, index: number) => {
      try {
        processedCharts++;
        console.log(`Processing chart ${index + 1}/${charts.length}: ${chart.title || 'Unnamed'}`);
        
        if (chart.apiEndpoint) {
          const apiId = `${chart.apiEndpoint}_${chart.method || 'GET'}`;
          
          if (!apiMap.has(apiId)) {
            // Extract columns from different mapping types
            const columns: string[] = [];
            
            // Add columns from data mapping
            if (chart.xAxisMapping?.column) {
              columns.push(chart.xAxisMapping.column);
            }
            if (chart.yAxisMapping?.column) {
              columns.push(chart.yAxisMapping.column);
            }
            
            // Handle dataMapping object
            if (chart.dataMapping) {
              if (typeof chart.dataMapping === 'object') {
                Object.entries(chart.dataMapping).forEach(([key, mapping]: [string, any]) => {
                  if (typeof mapping === 'string') {
                    columns.push(mapping);
                  } else if (mapping?.column) {
                    columns.push(mapping.column);
                  } else if (mapping?.field) {
                    columns.push(mapping.field);
                  }
                  
                  // Handle array of field mappings (for yAxis)
                  if (Array.isArray(mapping)) {
                    mapping.forEach((item: any) => {
                      if (item?.field) {
                        columns.push(item.field);
                      }
                      if (item?.column) {
                        columns.push(item.column);
                      }
                    });
                  }
                });
                
                // Add direct string values from dataMapping
                if (chart.dataMapping.xAxis && typeof chart.dataMapping.xAxis === 'string') {
                  columns.push(chart.dataMapping.xAxis);
                }
                if (chart.dataMapping.yAxis && typeof chart.dataMapping.yAxis === 'string') {
                  columns.push(chart.dataMapping.yAxis);
                }
                if (chart.dataMapping.groupBy && typeof chart.dataMapping.groupBy === 'string') {
                  columns.push(chart.dataMapping.groupBy);
                }
              }
            }
            
            // Remove duplicates and empty values, then clean the columns
            const uniqueColumns = [...new Set(columns.filter((col: string) => col && col.trim()))];
            const cleanedColumns = cleanColumns(uniqueColumns);
            
            console.log(`  API: ${chart.apiEndpoint} - Columns: ${cleanedColumns.join(', ')}`);
            
            apiMap.set(apiId, {
              id: apiId,
              name: chart.title || chart.apiEndpoint.split('/').pop() || 'API',
              endpoint: chart.apiEndpoint,
              method: chart.method || 'GET',
              columns: cleanedColumns,
              chartTitle: chart.title,
              apiKey: chart.apiKey,
              additionalOptions: cleanAdditionalOptions(chart.additionalOptions),
              page: chart.page
            });
          }
        } else {
          console.log(`  Chart has no apiEndpoint: ${chart.title || 'Unnamed'}`);
        }
      } catch (chartError) {
        console.error(`Error processing chart ${index + 1}:`, chartError);
      }
    });
    
    // Convert to array and sort by name
    const apis = Array.from(apiMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    console.log(`Extracted ${apis.length} unique APIs from ${processedCharts} processed charts`);

    // Save to JSON file
    const cacheFilePath = path.join(process.cwd(), 'public', 'api-cache.json');
    console.log(`Saving cache to: ${cacheFilePath}`);
    
    await fs.writeFile(cacheFilePath, JSON.stringify(apis, null, 2));
    console.log('Cache file saved successfully');

    return NextResponse.json({
      success: true,
      message: `Cache updated successfully with ${apis.length} APIs from ${charts.length} charts`,
      apiCount: apis.length,
      chartCount: charts.length,
      processedCharts
    });

  } catch (error) {
    console.error('Cache update failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update cache',
        details: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 