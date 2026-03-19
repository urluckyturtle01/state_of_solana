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
/** x-axis fields that are actual dates; date-range filter applies */
const DATE_FIELDS = ['date', 'block_date', 'month', 'period', 'week', 'day', 'timestamp', 'created_at'];
/** x-axis fields that are NOT dates (e.g. epoch numbers); skip date filtering */
const NON_DATE_FIELDS = ['epoch', 'epoch_number', 'epoch_id'];

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

function buildColumnSchema(chartConfig: any, sampleRow: Record<string, unknown>): string {
  const dm = chartConfig?.dataMapping;
  if (!dm) return 'Columns: ' + Object.keys(sampleRow || {}).join(', ');

  const lines: string[] = [];

  const xAxis = dm.xAxis;
  const xField =
    typeof xAxis === 'string'
      ? xAxis
      : Array.isArray(xAxis) && xAxis[0]
        ? typeof xAxis[0] === 'string'
          ? xAxis[0]
          : xAxis[0]?.field
        : null;
  if (xField) {
    const isEpoch = NON_DATE_FIELDS.some((f) => xField.toLowerCase().includes(f));
    lines.push(
      isEpoch
        ? `- ${xField}: Solana epoch number (not a date)`
        : `- ${xField}: time/date dimension`
    );
  }

  const yAxis = dm.yAxis;
  const yFields = Array.isArray(yAxis)
    ? yAxis.map((y: any) => (typeof y === 'string' ? { field: y, unit: '' } : y))
    : typeof yAxis === 'string'
      ? [{ field: yAxis, unit: '' }]
      : [];
  for (const y of yFields) {
    const field = y?.field || y;
    const unit = y?.unit ? ` (unit: ${y.unit})` : '';
    lines.push(`- ${field}: metric${unit}`);
  }

  const groupBy = dm.groupBy;
  if (groupBy && typeof groupBy === 'string') {
    lines.push(`- ${groupBy}: dimension for grouping/categories`);
  }

  const known = new Set([xField, groupBy, ...yFields.map((y: any) => y?.field || y)].filter(Boolean));
  const otherCols = Object.keys(sampleRow || {}).filter((k) => !known.has(k));
  if (otherCols.length > 0) {
    lines.push(`- Other columns: ${otherCols.join(', ')}`);
  }

  return lines.length > 0 ? lines.join('\n') : 'Columns: ' + Object.keys(sampleRow || {}).join(', ');
}

function parseDate(val: any): Date | null {
  if (val == null) return null;
  if (val instanceof Date) return val;
  const str = String(val);
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function isDateField(dateField: string | null): boolean {
  if (!dateField) return false;
  const lower = dateField.toLowerCase();
  if (NON_DATE_FIELDS.some((f) => lower.includes(f))) return false;
  return true;
}

function filterByDateRange(
  rows: any[],
  dateField: string | null,
  startDate: string,
  endDate: string
): { rows: any[]; dateFilterApplied: boolean } {
  if (!dateField || rows.length === 0) return { rows, dateFilterApplied: false };
  if (!isDateField(dateField)) {
    return { rows, dateFilterApplied: false };
  }
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const filtered = rows.filter((row) => {
    const val = row[dateField];
    const d = parseDate(val);
    if (!d) return true;
    const t = d.getTime();
    return t >= start && t <= end;
  });
  return { rows: filtered, dateFilterApplied: true };
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
    const payloads: {
      chartTitle: string;
      chartDescription?: string;
      associatedCharts: { title: string; subtitle?: string }[];
      columnSchema: string;
      dateFilterApplied: boolean;
      xAxisField: string | null;
      data: any[];
    }[] = [];

    for (const sqlHash of sqlHashes.slice(0, 5)) {
      const cdResult = await client.query(
        `SELECT chart_config FROM chart_definitions WHERE sql_hash = $1`,
        [sqlHash]
      );
      const qrResult = await client.query(
        `SELECT json_data FROM query_results WHERE sql_hash = $1`,
        [sqlHash]
      );

      const chartConfigs = cdResult.rows.map((r: { chart_config: any }) => r.chart_config);
      const chartConfig = chartConfigs[0];
      const jsonData = qrResult.rows[0]?.json_data;

      if (!jsonData || !Array.isArray(jsonData)) continue;

      const dateField = inferDateField(chartConfig);
      const { rows: filteredRows, dateFilterApplied } = filterByDateRange(
        jsonData,
        dateField,
        startDate,
        endDate
      );
      let rows = filteredRows;
      if (rows.length > MAX_ROWS_PER_CHART) {
        rows = rows.slice(-MAX_ROWS_PER_CHART);
      }

      const title = chartConfig?.title ?? chartConfig?.sqlFile ?? sqlHash.slice(0, 12);
      const subtitle = chartConfig?.subtitle;
      const seen = new Set<string>();
      const associatedCharts = chartConfigs
        .map((c: any) => ({
          title: c?.title ?? c?.sqlFile ?? 'Chart',
          subtitle: c?.subtitle,
        }))
        .filter((c: { title: string; subtitle?: string }) => {
          if (!c.title) return false;
          const key = `${c.title}|${c.subtitle ?? ''}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      const columnSchema = buildColumnSchema(chartConfig, rows[0] as Record<string, unknown>);

      payloads.push({
        chartTitle: title,
        chartDescription: subtitle,
        associatedCharts,
        columnSchema,
        dateFilterApplied,
        xAxisField: dateField,
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
          (p.associatedCharts.length > 0
            ? `\n\nCharts using this data (title + subtitle for context):\n${p.associatedCharts
                .map((c) => `- ${c.title}${c.subtitle ? `: ${c.subtitle}` : ''}`)
                .join('\n')}`
            : '') +
          (p.dateFilterApplied
            ? `\n\nDate range: ${startDate} to ${endDate} (filtered by x-axis)`
            : `\n\nNote: x-axis is "${p.xAxisField}" (epoch/not a date). Date filter ${startDate}–${endDate} was not applied; all data is included.`) +
          `\n\nColumn schema (use this to interpret the data correctly):\n${p.columnSchema}` +
          `\n\nRaw data (${p.data.length} rows):\n\`\`\`json\n${JSON.stringify(p.data)}\n\`\`\``
      )
      .join('\n\n---\n\n');

    const userPrompt =
      `You are a data analyst and content creator for Solana ecosystem metrics.

IMPORTANT: Each chart includes a "Column schema" that explains what each column means:
- time/date dimension: the x-axis (e.g. block_date, epoch)
- metric (unit: $): values in USD; (unit: %): percentages; (unit: SOL): values in SOL
- dimension for grouping: categorical breakdown (e.g. dex_type = "prop_amm" vs "other")

Use the column schema to interpret the data correctly. Do not confuse columns or units.

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
