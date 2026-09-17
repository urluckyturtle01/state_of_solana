import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFileAsync = promisify(execFile);

export type HeliumQueryResult = {
  success: boolean;
  query?: string;
  count?: number;
  rows?: Record<string, unknown>[];
  error?: string;
};

function proxyOrigin(): string | undefined {
  const raw =
    process.env.HELIUM_QUERY_PROXY_ORIGIN?.trim() ||
    process.env.HELIUM_SELF_HOSTED_ORIGIN?.trim();
  return raw ? raw.replace(/\/$/, '') : undefined;
}

async function runHeliumQueryViaProxy(
  origin: string,
  group: string,
  name: string,
  params: Record<string, unknown>
): Promise<HeliumQueryResult> {
  const url = new URL(`${origin}/api/helium/${encodeURIComponent(group)}/${encodeURIComponent(name)}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(180_000),
    cache: 'no-store',
  });

  const bodyText = await res.text();
  let data: HeliumQueryResult;
  try {
    data = JSON.parse(bodyText) as HeliumQueryResult;
  } catch {
    const nextData = bodyText.match(
      /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
    );
    if (nextData) {
      try {
        const payload = JSON.parse(nextData[1]) as {
          err?: { message?: string };
        };
        const msg = payload.err?.message?.trim();
        if (msg) {
          return {
            success: false,
            query: `${group}/${name}`,
            error: `Self-hosted API ${origin} error (${res.status}): ${msg}`,
          };
        }
      } catch {
        /* fall through */
      }
    }
    const snippet = bodyText.replace(/\s+/g, ' ').trim().slice(0, 120);
    return {
      success: false,
      query: `${group}/${name}`,
      error: `Self-hosted API ${origin} returned HTTP ${res.status} (not JSON). Fix/restart that server. ${snippet ? `Body: ${snippet}` : ''}`,
    };
  }

  if (!data.query) data.query = `${group}/${name}`;
  return data;
}

export async function runHeliumQuery(
  group: string,
  name: string,
  params: Record<string, unknown> = {}
): Promise<HeliumQueryResult> {
  const proxy = proxyOrigin();
  if (proxy) {
    return runHeliumQueryViaProxy(proxy, group, name, params);
  }

  if (process.env.VERCEL) {
    return {
      success: false,
      query: `${group}/${name}`,
      error:
        'Helium queries cannot run on Vercel (no Python/Trino). Set HELIUM_QUERY_PROXY_ORIGIN to your self-hosted app URL, e.g. http://84.32.71.101:8137',
    };
  }

  const root = process.cwd();
  const script = path.join(root, 'pipeline', 'run_helium_query.py');
  try {
    const { stdout } = await execFileAsync(
      'python3',
      [script, group, name, JSON.stringify(params)],
      {
        cwd: root,
        maxBuffer: 50 * 1024 * 1024,
        timeout: 180_000,
        env: process.env,
      }
    );
    return JSON.parse(stdout) as HeliumQueryResult;
  } catch (err) {
    const execErr = err as { stdout?: string; code?: string; message?: string };
    if (execErr.stdout?.trim()) {
      try {
        return JSON.parse(execErr.stdout) as HeliumQueryResult;
      } catch {
        /* fall through */
      }
    }
    if (execErr.code === 'ENOENT') {
      return {
        success: false,
        query: `${group}/${name}`,
        error:
          'python3 not found. On serverless hosts set HELIUM_QUERY_PROXY_ORIGIN to a machine that runs the Helium API.',
      };
    }
    throw err;
  }
}
