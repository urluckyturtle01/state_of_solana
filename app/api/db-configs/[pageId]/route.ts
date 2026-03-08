import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { sanitizeChartConfigs, isAdminRequest } from '@/lib/chart-sanitizer';

// PostgreSQL connection pool
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'trino_charts',
  user: 'root',
  password: 'root',
});

export async function GET(
  request: NextRequest,
  { params }: { params: { pageId: string } }
) {
  try {
    const { pageId } = params;
    
    console.log(`📊 Fetching charts from DB for page: ${pageId}`);
    
    // Get all charts for this page from chart_definitions
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT uuid, chart_config, sql_hash 
         FROM chart_definitions 
         WHERE chart_config->>'pageId' = $1
         ORDER BY (chart_config->>'order')::int NULLS LAST, 
                  (chart_config->>'position')::int NULLS LAST`,
        [pageId]
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Page config not found' }, { status: 404 });
      }
      
      console.log(`✅ Found ${result.rows.length} charts in DB for ${pageId}`);
      
      // Extract chart configs and enrich with data from query_results
      const charts = await Promise.all(
        result.rows.map(async (row) => {
          const chartConfig = row.chart_config;
          const sqlHash = row.sql_hash;
          
          // Get data from query_results
          const dataResult = await client.query(
            `SELECT json_data FROM query_results WHERE sql_hash = $1`,
            [sqlHash]
          );
          
          if (dataResult.rows.length > 0 && dataResult.rows[0].json_data) {
            const allData = dataResult.rows[0].json_data;
            
            // Filter columns based on chart's dataMapping
            const dataMapping = chartConfig.dataMapping || {};
            const requiredFields = new Set<string>();
            
            // Add x-axis field
            if (dataMapping.xAxis) requiredFields.add(dataMapping.xAxis);
            if (dataMapping.x) requiredFields.add(dataMapping.x);
            
            // Add y-axis fields
            if (dataMapping.yAxis) {
              if (Array.isArray(dataMapping.yAxis)) {
                dataMapping.yAxis.forEach((item: any) => {
                  if (typeof item === 'string') {
                    requiredFields.add(item);
                  } else if (item && item.field) {
                    requiredFields.add(item.field);
                  }
                });
              } else if (typeof dataMapping.yAxis === 'string') {
                requiredFields.add(dataMapping.yAxis);
              }
            }
            if (dataMapping.y) {
              if (Array.isArray(dataMapping.y)) {
                dataMapping.y.forEach((field: string) => requiredFields.add(field));
              } else {
                requiredFields.add(dataMapping.y);
              }
            }
            
            // Add groupBy field
            if (dataMapping.groupBy) requiredFields.add(dataMapping.groupBy);
            
            // Add dual axis fields
            if (chartConfig.dualAxisConfig) {
              const dualConfig = chartConfig.dualAxisConfig;
              if (dualConfig.leftYAxis?.fields) {
                dualConfig.leftYAxis.fields.forEach((field: string) => requiredFields.add(field));
              }
              if (dualConfig.rightYAxis?.fields) {
                dualConfig.rightYAxis.fields.forEach((field: string) => requiredFields.add(field));
              }
            }
            
            // Filter data to only include required columns
            const filteredData = allData.map((row: any) => {
              const filtered: any = {};
              requiredFields.forEach(field => {
                if (field in row) {
                  filtered[field] = row[field];
                }
              });
              return filtered;
            });
            
            console.log(`   📦 Chart ${chartConfig.id}: ${allData.length} rows, ${requiredFields.size} columns`);
            
            // Add filtered data to chart config
            return {
              ...chartConfig,
              data: filteredData
            };
          }
          
          console.log(`   ⚠️  Chart ${chartConfig.id}: No data found`);
          return {
            ...chartConfig,
            data: []
          };
        })
      );
      
      const pageConfig = {
        charts,
        counters: [], // TODO: Add counter support later
        tables: []    // TODO: Add table support later
      };
      
      // Sanitize chart data for public consumption (unless admin request)
      const isAdmin = isAdminRequest(request);
      if (!isAdmin && pageConfig.charts) {
        pageConfig.charts = sanitizeChartConfigs(pageConfig.charts);
      }
      
      return NextResponse.json(pageConfig, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error reading from DB:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
