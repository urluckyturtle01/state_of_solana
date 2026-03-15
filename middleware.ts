import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRedirectBaseUrl } from '@/lib/redirect-base-url';

export function middleware(request: NextRequest) {
  // Block direct access to worker-log.html - must use /worker-log (auth-protected route)
  if (request.nextUrl.pathname === '/worker-log.html') {
    const baseUrl = getRedirectBaseUrl(request);
    return NextResponse.redirect(new URL('/worker-log', baseUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/worker-log.html',
};
