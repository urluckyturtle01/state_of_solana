export const dynamic = 'force-dynamic';

type PagesModule = {
  getHeliumLandingResponse: (request: Request) => Promise<Response>;
};

function loadPagesModule(): PagesModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../../queries/app/helium-apis-pages.js') as PagesModule;
}

export async function GET(request: Request) {
  return loadPagesModule().getHeliumLandingResponse(request);
}
