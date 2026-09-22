import { loadHeliumPagesModule, proxyHeliumHtml } from '@/lib/helium-apis-html-proxy';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { group: string; name: string } };

export async function GET(request: Request, context: RouteContext) {
  const { group, name } = context.params;
  if (!group || !name || group.includes('/') || name.includes('/')) {
    return new Response('Not Found', { status: 404 });
  }

  const requestUrl = new URL(request.url);
  let catalogPath = requestUrl.pathname.replace(/\/+$/, '') || requestUrl.pathname;
  if (requestUrl.pathname !== catalogPath) {
    return Response.redirect(`${catalogPath}${requestUrl.search}`, 301);
  }

  if (process.env.VERCEL) {
    const proxied = await proxyHeliumHtml(request, catalogPath, true);
    if (proxied) return proxied;
  }

  const pages = await loadHeliumPagesModule();
  return pages.getHeliumCatalogPageResponse(request);
}
