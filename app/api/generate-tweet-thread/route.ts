import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import { verifySignedToken, COOKIE_NAME } from '@/lib/worker-log-auth';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'trino_charts',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
});

const MAX_ROWS_PER_CHART = 3000;
const DATE_FIELDS = ['date', 'block_date', 'month', 'period', 'week', 'day', 'timestamp', 'created_at'];

function inferDateField(chartConfig: any): string | null {
  const dm = chartConfig?.dataMapping;
  if (!dm) return null;
  const xAxis = dm.xAxis;
  if (typeof xAxis === 'string') return xAxis;
  if (Array.isArray(xAxis) && xAxis[0]) {
    const first = xAxis[0];
    return typeof first === 'string' ? first : first?.field;
  }
  return null;
}

function parseDate(val: any): Date | null {
  if (val == null) return null;
  if (val instanceof Date) return val;
  const str = String(val);
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function filterByDateRange(rows: any[], dateField: string | null, startDate: string, endDate: string): any[] {
  if (!dateField || rows.length === 0) return rows;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return rows.filter((row) => {
    const val = row[dateField];
    const d = parseDate(val);
    if (!d) return true;
    const t = d.getTime();
    return t >= start && t <= end;
  });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!verifySignedToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured. Add it to .env' },
      { status: 500 }
    );
  }

  let body: { sqlHashes: string[]; startDate: string; endDate: string; optionalPrompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sqlHashes, startDate, endDate, optionalPrompt } = body;
  if (!Array.isArray(sqlHashes) || sqlHashes.length === 0 || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'Missing required fields: sqlHashes (array), startDate, endDate' },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  try {
    const payloads: { chartTitle: string; chartDescription?: string; data: any[] }[] = [];

    for (const sqlHash of sqlHashes.slice(0, 5)) {
      const cdResult = await client.query(
        `SELECT chart_config FROM chart_definitions WHERE sql_hash = $1 LIMIT 1`,
        [sqlHash]
      );
      const qrResult = await client.query(
        `SELECT json_data FROM query_results WHERE sql_hash = $1`,
        [sqlHash]
      );

      const chartConfig = cdResult.rows[0]?.chart_config;
      const jsonData = qrResult.rows[0]?.json_data;

      if (!jsonData || !Array.isArray(jsonData)) continue;

      const dateField = inferDateField(chartConfig);
      let rows = filterByDateRange(jsonData, dateField, startDate, endDate);
      if (rows.length > MAX_ROWS_PER_CHART) {
        rows = rows.slice(-MAX_ROWS_PER_CHART);
      }

      const title = chartConfig?.title ?? chartConfig?.sqlFile ?? sqlHash.slice(0, 12);
      const subtitle = chartConfig?.subtitle;

      payloads.push({
        chartTitle: title,
        chartDescription: subtitle,
        data: rows,
      });
    }

    if (payloads.length === 0) {
      return NextResponse.json(
        { error: 'No data found for the selected charts. Ensure query_results has json_data.' },
        { status: 404 }
      );
    }

    const dataBlock = payloads
      .map(
        (p) =>
          `## Chart: ${p.chartTitle}` +
          (p.chartDescription ? `\nDescription: ${p.chartDescription}` : '') +
          `\nDate range: ${startDate} to ${endDate}` +
          `\n\nRaw data (${p.data.length} rows):\n\`\`\`json\n${JSON.stringify(p.data)}\n\`\`\``
      )
      .join('\n\n---\n\n');

    const userPrompt =
      `You are a data analyst and content creator for Solana ecosystem metrics. Analyze the following chart data deeply. Identify trends, outliers, notable comparisons, and insights that would be interesting to a crypto/Solana audience.

${optionalPrompt ? `User's additional guidance: ${optionalPrompt}\n\n` : ''}${dataBlock}

Based on your analysis, write a tweet thread (3-7 tweets) that:
1. Opens with a compelling hook
2. Presents data-backed insights with specific numbers where relevant
3. Flows naturally from tweet to tweet
4. Ends with a takeaway or call to action
5. Uses appropriate tone for crypto Twitter (informative, engaging, not overly promotional)

Return ONLY the tweet thread as a JSON array of strings, one string per tweet. No other text, no markdown code blocks, no backticks. Raw JSON only. Example: ["First tweet...", "Second tweet...", "Third tweet..."]`;

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let text =
      response.content?.find((b) => b.type === 'text')?.type === 'text'
        ? (response.content?.find((b) => b.type === 'text') as { type: 'text'; text: string }).text
        : '';

    text = text.trim();
    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    const fenceMatch = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
    if (fenceMatch) {
      text = fenceMatch[1].trim();
    }

    let tweets: string[] = [];
    try {
      const parsed = JSON.parse(text);
      tweets = Array.isArray(parsed)
        ? parsed
            .filter((x): x is string => typeof x === 'string')
            .map((s) => s.replace(/\\n/g, '\n').trim())
            .filter(Boolean)
        : [text];
    } catch {
      const lines = text.split(/\n/).filter((s) => s.trim().length > 0);
      tweets = lines.length > 0 ? lines : [text];
    }

    return NextResponse.json({ tweets });
  } catch (err) {
    console.error('Tweet thread generation error:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to generate tweet thread',
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
