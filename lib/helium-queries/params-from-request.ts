import { NextRequest } from 'next/server';

/** Map query-string (GET) or JSON body (POST) to bind parameters. */
export async function paramsFromRequest(
  request: NextRequest
): Promise<Record<string, unknown>> {
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        const { parameters, ...rest } = body as Record<string, unknown>;
        if (parameters && typeof parameters === 'object' && !Array.isArray(parameters)) {
          return { ...(parameters as Record<string, unknown>), ...rest };
        }
        return rest;
      }
    } catch {
      /* fall through to query string */
    }
  }

  const out: Record<string, unknown> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key === 'offset' || key === 'limit' || key === 'now_ts') {
      const n = Number(value);
      if (!Number.isNaN(n)) out[key] = n;
    } else if (key === 'free') {
      out[key] = value;
    } else {
      out[key] = value;
    }
  });
  return out;
}
