import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import {
  COOKIE_NAME,
  createSignedToken,
  getSecret,
} from '@/lib/worker-log-auth';

const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

function verifyPassword(input: string): boolean {
  const stored = process.env.WORKER_LOG_PASSWORD;
  if (!stored || typeof input !== 'string') return false;
  const a = Buffer.from(input, 'utf8');
  const b = Buffer.from(stored, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = body?.password;
    if (typeof password !== 'string' || !password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }
    if (!verifyPassword(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    if (!getSecret()) {
      return NextResponse.json(
        { error: 'WORKER_LOG_SECRET not configured' },
        { status: 500 }
      );
    }
    const token = createSignedToken();
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Worker log auth error:', err);
    return NextResponse.json(
      { error: 'Authentication not configured' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { verifySignedToken } = await import('@/lib/worker-log-auth');
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!verifySignedToken(token)) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
