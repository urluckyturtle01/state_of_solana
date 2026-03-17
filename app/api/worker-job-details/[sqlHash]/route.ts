import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifySignedToken, COOKIE_NAME } from '@/lib/worker-log-auth';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'trino_charts',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sqlHash: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!verifySignedToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sqlHash } = await params;
  if (!sqlHash) {
    return NextResponse.json({ error: 'Missing sqlHash' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const cdResult = await client.query(
      `SELECT yaml_config, chart_config
       FROM chart_definitions
       WHERE sql_hash = $1
       LIMIT 1`,
      [sqlHash]
    );

    const qrResult = await client.query(
      `SELECT json_data, sql_query
       FROM query_results
       WHERE sql_hash = $1`,
      [sqlHash]
    );

    const configYml = cdResult.rows[0]?.yaml_config ?? null;
    const chartConfig = cdResult.rows[0]?.chart_config;
    const sqlQuery = qrResult.rows[0]?.sql_query ?? null;

    // Build configJson with truncated sql_query (full query shown via sql query chip)
    let configJson: string | null = null;
    if (chartConfig != null) {
      const configForDisplay = { ...chartConfig };
      if (typeof configForDisplay === 'object' && configForDisplay !== null && 'sql_query' in configForDisplay) {
        const full = String((configForDisplay as { sql_query?: string }).sql_query ?? '');
        (configForDisplay as { sql_query: string }).sql_query = full.length > 40 ? `${full.slice(0, 40)}......` : full;
      }
      configJson = JSON.stringify(configForDisplay, null, 2);
    }

    const jsonData = qrResult.rows[0]?.json_data;
    const jsonDataStr = jsonData != null ? JSON.stringify(jsonData, null, 2) : null;

    return NextResponse.json({
      configYml,
      configJson,
      jsonData: jsonDataStr,
      sqlQuery,
    });
  } finally {
    client.release();
  }
}
