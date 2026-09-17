import { NextResponse } from 'next/server';
import { apiPath, listHeliumQueries } from '@/lib/helium-queries/registry';

export const dynamic = 'force-dynamic';

export async function GET() {
  const queries = listHeliumQueries().map((q) => ({
    ...q,
    methods: ['GET', 'POST'],
    endpoint: apiPath(q.group, q.name),
  }));

  return NextResponse.json({
    success: true,
    count: queries.length,
    queries,
    docs: '/queries/API.md',
  });
}
