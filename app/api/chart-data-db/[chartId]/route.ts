import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'trino_charts',
  user: 'root',
  password: 'root',
});

export async function GET(
  request: NextRequest,
  { params }: { params: { chartId: string } }
): Promise<Response> {
  const startTime = performance.now();
  
  try {
    const { chartId } = params;
    console.log(`📊 DB CHART API: Fetching chart ${chartId} from database`);
    
    const client = await pool.connect();
    
    try {
      // Get chart config and data from database
      const result = await client.query(`
        SELECT 
          cd.uuid,
          cd.chart_config,
          qr.json_data,
          jq.status as job_status
        FROM chart_definitions cd
        LEFT JOIN query_results qr ON cd.sql_hash = qr.sql_hash
        LEFT JOIN trino_job_queue jq ON cd.sql_hash = jq.sql_hash
        WHERE cd.uuid = $1
        ORDER BY jq.created_at DESC
        LIMIT 1
      `, [chartId]);
      
      if (result.rows.length === 0) {
        console.log(`❌ Chart ${chartId} not found in database`);
        return NextResponse.json({ error: 'Chart not found' }, { status: 404 });
      }
      
      const row = result.rows[0];
      const chartConfig = row.chart_config;
      const data = row.json_data || [];
      const jobStatus = row.job_status;
      
      const totalTime = performance.now() - startTime;
      const dataSize = JSON.stringify(data).length;
      
      console.log(`✅ DB CHART SUCCESS: Served chart ${chartId} in ${totalTime.toFixed(2)}ms (${(dataSize / 1024).toFixed(1)}KB, ${data.length} rows, job: ${jobStatus})`);
      
      // Return the chart data
      return NextResponse.json({
        chartId: chartId,
        success: true,
        data: data,
        jobStatus: jobStatus,
        title: chartConfig?.title || 'Unknown'
      }, {
        headers: {
          'Cache-Control': 'no-store', // Don't cache while job is running
          'X-Response-Time': `${totalTime.toFixed(2)}ms`,
          'Content-Type': 'application/json',
        },
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error in DB chart data API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
