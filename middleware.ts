import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Block direct access to worker-log.html - must use /worker-log (auth-protected route)
  if (request.nextUrl.pathname === '/worker-log.html') {
    return NextResponse.redirect(new URL('/worker-log', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/worker-log.html',
};
