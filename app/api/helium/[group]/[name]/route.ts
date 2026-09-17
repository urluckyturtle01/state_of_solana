import { NextRequest, NextResponse } from 'next/server';
import { paramsFromRequest } from '@/lib/helium-queries/params-from-request';
import { runHeliumQuery } from '@/lib/helium-queries/run-query';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

type RouteContext = { params: { group: string; name: string } };

async function handle(request: NextRequest, context: RouteContext) {
  const { group, name } = context.params;
  try {
    const params = await paramsFromRequest(request);
    const result = await runHeliumQuery(group, name, params);
    const status = result.success ? 200 : result.error?.includes('not found') ? 404 : 500;
    return NextResponse.json(result, { status });
  } catch (error) {
    console.error(`Helium query ${group}/${name} failed:`, error);
    return NextResponse.json(
      {
        success: false,
        query: `${group}/${name}`,
        error: error instanceof Error ? error.message : 'Query execution failed',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}
