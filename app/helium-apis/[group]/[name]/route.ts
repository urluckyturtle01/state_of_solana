export const dynamic = 'force-dynamic';

type PagesModule = {
  getHeliumCatalogPageResponse: (request: Request) => Promise<Response>;
};

function loadPagesModule(): PagesModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../../../queries/app/helium-apis-pages.js') as PagesModule;
}

type RouteContext = { params: { group: string; name: string } };

export async function GET(request: Request, context: RouteContext) {
  const { group, name } = context.params;
  if (!group || !name || group.includes('/') || name.includes('/')) {
    return new Response('Not Found', { status: 404 });
  }
  return loadPagesModule().getHeliumCatalogPageResponse(request);
}
