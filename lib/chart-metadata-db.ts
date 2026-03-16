import { Pool } from 'pg';
import type { ChartMetadata } from '@/app/share/chart/seo-meta';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'trino_charts',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
});

/**
 * Fetch chart metadata from PostgreSQL for DB-backed charts (trino_worker).
 * Returns null if chart not found.
 */
export async function getChartMetadataFromDb(chartId: string): Promise<ChartMetadata | null> {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT chart_config->>'title' as title, chart_config->>'subtitle' as subtitle
         FROM chart_definitions WHERE uuid::text = $1`,
        [chartId]
      );
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      const title = row.title || 'Chart';
      const desc = row.subtitle || `Explore ${title} on Solana`;
      return {
        title: `${title} - State of Solana`,
        description: desc,
        ogTitle: title,
        ogDescription: desc,
        ogImage: '/og-images/charts/default-chart.png',
        keywords: 'Solana, blockchain, analytics, charts, DeFi, DEX, crypto',
      };
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('getChartMetadataFromDb error:', err);
    return null;
  }
}
