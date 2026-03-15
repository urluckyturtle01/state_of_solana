/**
 * Get the correct base URL for server-side redirects.
 * When Next.js runs with -H 0.0.0.0 or behind a proxy, request.url may use
 * 0.0.0.0 instead of the actual public host. This helper fixes that.
 */
import type { NextRequest } from 'next/server';

export function getRedirectBaseUrl(request: NextRequest): string {
  // 1. Explicit SITE_URL env (e.g. http://84.32.71.101:8137 on self-hosted)
  const siteUrl = process.env.SITE_URL;
  if (siteUrl) {
    return siteUrl.replace(/\/$/, ''); // strip trailing slash
  }

  // 2. X-Forwarded-* headers (when behind reverse proxy)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'http';
  const forwardedPort = request.headers.get('x-forwarded-port');

  if (forwardedHost) {
    const port = forwardedPort ? `:${forwardedPort}` : '';
    return `${forwardedProto}://${forwardedHost}${port}`;
  }

  // 3. Fallback: use request URL, but replace 0.0.0.0 with host header if present
  const url = new URL(request.url);
  if (url.hostname === '0.0.0.0' || url.hostname === '::') {
    const hostHeader = request.headers.get('host');
    if (hostHeader) {
      return `${url.protocol}//${hostHeader}`;
    }
  }

  return url.origin;
}
