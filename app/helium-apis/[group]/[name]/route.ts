import path from 'path';

export const dynamic = 'force-dynamic';

type PagesModule = {
  getHeliumCatalogPageResponse: (request: Request) => Promise<Response>;
};

async function loadPagesModule(): Promise<PagesModule> {
  const modulePath = path.join(process.cwd(), 'queries', 'app', 'helium-apis-pages.js');
  return import(/* webpackIgnore: true */ modulePath) as Promise<PagesModule>;
}

type RouteContext = { params: { group: string; name: string } };

export async function GET(request: Request, context: RouteContext) {
  const { group, name } = context.params;
  if (!group || !name || group.includes('/') || name.includes('/')) {
    return new Response('Not Found', { status: 404 });
  }
  const pages = await loadPagesModule();
  return pages.getHeliumCatalogPageResponse(request);
}
