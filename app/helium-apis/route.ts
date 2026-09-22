import path from 'path';

export const dynamic = 'force-dynamic';

type PagesModule = {
  getHeliumLandingResponse: (request: Request) => Promise<Response>;
};

async function loadPagesModule(): Promise<PagesModule> {
  const modulePath = path.join(process.cwd(), 'queries', 'app', 'helium-apis-pages.js');
  return import(/* webpackIgnore: true */ modulePath) as Promise<PagesModule>;
}

export async function GET(request: Request) {
  const pages = await loadPagesModule();
  return pages.getHeliumLandingResponse(request);
}
