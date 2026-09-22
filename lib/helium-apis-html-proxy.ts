/** Vercel / serverless: proxy HTML from self-hosted app (queries/ not required). */
import path from 'path';

const HTML_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store, must-revalidate',
};

function proxyOrigin(): string | undefined {
  const raw =
    process.env.HELIUM_QUERY_PROXY_ORIGIN?.trim() ||
    process.env.HELIUM_SELF_HOSTED_ORIGIN?.trim();
  return raw ? raw.replace(/\/$/, '') : undefined;
}

function patchCatalogHtmlBase(html: string, pageOrigin: string): string {
  return html.replace(
    /const BASE = window\.location\.origin;/,
    `const BASE = ${JSON.stringify(pageOrigin)};`,
  );
}

export async function proxyHeliumHtml(
  request: Request,
  pathname: string,
  patchBase: boolean,
): Promise<Response | null> {
  const upstream = proxyOrigin();
  if (!upstream) return null;

  const requestUrl = new URL(request.url);
  const pageOrigin = requestUrl.origin;
  const url = `${upstream}${pathname}${requestUrl.search}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'text/html' },
      cache: 'no-store',
      signal: AbortSignal.timeout(120_000),
    });
    const html = await res.text();
    if (!res.ok) {
      return new Response(html || `Upstream Helium page failed (${res.status})`, {
        status: res.status,
      });
    }
    const body = patchBase ? patchCatalogHtmlBase(html, pageOrigin) : html;
    return new Response(body, { status: 200, headers: HTML_HEADERS });
  } catch (err) {
    console.error('Helium HTML proxy failed:', err);
    return new Response('Helium upstream unreachable', { status: 502 });
  }
}

export async function loadHeliumPagesModule(): Promise<{
  getHeliumLandingResponse: (request: Request) => Promise<Response>;
  getHeliumCatalogPageResponse: (request: Request) => Promise<Response>;
}> {
  const modulePath = path.join(process.cwd(), 'queries', 'app', 'helium-apis-pages.js');
  return import(/* webpackIgnore: true */ modulePath);
}
