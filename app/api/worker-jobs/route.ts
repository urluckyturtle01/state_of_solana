import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'trino_charts',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
});

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        j.id,
        j.sql_hash,
        j.job_type,
        j.status,
        j.attempts,
        j.max_attempts,
        j.created_at,
        j.started_at,
        j.completed_at,
        j.error_message,

        -- Chart info (first matching chart definition)
        (
          SELECT cd.chart_config->>'title'
          FROM chart_definitions cd
          WHERE cd.sql_hash = j.sql_hash
          LIMIT 1
        ) AS chart_title,

        (
          SELECT cd.yaml_config
          FROM chart_definitions cd
          WHERE cd.sql_hash = j.sql_hash
          LIMIT 1
        ) AS yaml_config,

        -- Row count in query_results
        COALESCE(qr.row_count, 0) AS row_count,
        qr.last_run_at,

        -- Parse months/weeks/days fetched from job log (approximate via row_count & period)
        qr.last_run_status

      FROM trino_job_queue j
      LEFT JOIN (
        SELECT sql_hash,
               jsonb_array_length(json_data) AS row_count,
               last_run_at,
               last_run_status
        FROM query_results
      ) qr ON qr.sql_hash = j.sql_hash
      ORDER BY j.created_at DESC
      LIMIT 200
    `);

    const jobs = result.rows.map(row => {
      // Extract page from yaml_config  (page: <value>)
      const pageMatch = row.yaml_config?.match(/^\s*page:\s*(\S+)/m);
      const page = pageMatch ? pageMatch[1] : null;

      return {
        id: row.id,
        sqlHash: row.sql_hash,
        jobType: row.job_type,
        status: row.status,
        attempts: row.attempts,
        maxAttempts: row.max_attempts,
        createdAt: row.created_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        errorMessage: row.error_message,
        chartTitle: row.chart_title || row.sql_hash.slice(0, 12) + '…',
        page,
        rowCount: row.row_count,
        lastRunAt: row.last_run_at,
        lastRunStatus: row.last_run_status,
      };
    });

    return NextResponse.json({ jobs });
  } finally {
    client.release();
  }
}
