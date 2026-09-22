import { loadHeliumPagesModule, proxyHeliumHtml } from '@/lib/helium-apis-html-proxy';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (process.env.VERCEL) {
    const proxied = await proxyHeliumHtml(request, '/helium-apis', false);
    if (proxied) return proxied;
  }

  const pages = await loadHeliumPagesModule();
  return pages.getHeliumLandingResponse(request);
}
