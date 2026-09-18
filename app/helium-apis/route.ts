import { NextResponse } from 'next/server';
import path from 'path';
import { createRequire } from 'module';

export const dynamic = 'force-dynamic';

type CatalogBuilder = {
  buildHeliumApisCatalogHtml: (options?: { baseUrl?: string }) => string;
};

function proxyOrigin(): string | undefined {
  const raw =
    process.env.HELIUM_QUERY_PROXY_ORIGIN?.trim() ||
    process.env.HELIUM_SELF_HOSTED_ORIGIN?.trim();
  return raw ? raw.replace(/\/$/, '') : undefined;
}

function loadCatalogBuilder(): CatalogBuilder {
  const catalogPath = path.join(process.cwd(), 'queries/app/catalog/generate-queries-index.js');
  const requireFromRoot = createRequire(path.join(process.cwd(), 'package.json'));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return requireFromRoot(catalogPath) as CatalogBuilder;
}

async function fetchCatalogFromProxy(pageOrigin: string): Promise<Response> {
  const upstream = proxyOrigin();
  if (!upstream) {
    return new NextResponse('HELIUM_QUERY_PROXY_ORIGIN is not configured', { status: 503 });
  }
  const url = `${upstream}/helium-apis`;
  const res = await fetch(url, {
    headers: { Accept: 'text/html' },
    cache: 'no-store',
    signal: AbortSignal.timeout(120_000),
  });
  const html = await res.text();
  if (!res.ok) {
    return new NextResponse(html || `Upstream catalog failed (${res.status})`, { status: res.status });
  }
  // Rewrite embedded API base to this deployment so samples hit /api/helium here (then proxy to Trino).
  const withBase = html.replace(
    /const BASE = window\.location\.origin;/,
    `const BASE = ${JSON.stringify(pageOrigin)};`
  );
  return new NextResponse(withBase, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, must-revalidate',
    },
  });
}

export async function GET(request: Request) {
  const pageOrigin = new URL(request.url).origin;

  // Vercel lambdas do not ship the full queries/sql tree unless traced; proxy catalog from bare metal.
  if (process.env.VERCEL && proxyOrigin()) {
    return fetchCatalogFromProxy(pageOrigin);
  }

  try {
    const html = loadCatalogBuilder().buildHeliumApisCatalogHtml({ baseUrl: pageOrigin });
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (err) {
    const upstream = proxyOrigin();
    if (upstream) {
      try {
        return await fetchCatalogFromProxy(pageOrigin);
      } catch (proxyErr) {
        console.error('Helium catalog proxy failed:', proxyErr);
      }
    }
    const message = err instanceof Error ? err.message : 'Catalog build failed';
    return new NextResponse(message, { status: 500 });
  }
}
