import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type CatalogBuilder = {
  buildHeliumApisCatalogHtml: (options?: { baseUrl?: string }) => string;
};

function loadCatalogBuilder(): CatalogBuilder {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../../queries/app/catalog/generate-queries-index.js') as CatalogBuilder;
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  try {
    const html = loadCatalogBuilder().buildHeliumApisCatalogHtml({ baseUrl: origin });
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Catalog build failed';
    return new NextResponse(message, { status: 500 });
  }
}
