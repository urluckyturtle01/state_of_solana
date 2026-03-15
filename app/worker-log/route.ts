import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { verifySignedToken, COOKIE_NAME } from '@/lib/worker-log-auth';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!verifySignedToken(token)) {
    return NextResponse.redirect(new URL('/worker-log-login', request.url));
  }
  const htmlPath = path.join(process.cwd(), 'public', 'worker-log.html');
  if (!fs.existsSync(htmlPath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-store, must-revalidate',
    },
  });
}
