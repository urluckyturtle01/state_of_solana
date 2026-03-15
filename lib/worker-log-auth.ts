/**
 * Worker Log authentication.
 * Requires in .env:
 *   WORKER_LOG_PASSWORD - password for access
 *   WORKER_LOG_SECRET   - random 32+ char string for signing session tokens
 */
import crypto from 'crypto';

const COOKIE_NAME = 'worker_log_token';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

export { COOKIE_NAME };

export function getSecret(): string | null {
  const secret = process.env.WORKER_LOG_SECRET;
  if (!secret || secret.length < 32) return null;
  return secret;
}

export function createSignedToken(): string {
  const secret = getSecret();
  if (!secret) throw new Error('WORKER_LOG_SECRET not configured');
  const payload = {
    v: 1,
    exp: Date.now() + COOKIE_MAX_AGE * 1000,
    rnd: crypto.randomBytes(16).toString('hex'),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifySignedToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const secret = getSecret();
    if (!secret) return false;
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return false;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payloadB64)
      .digest('base64url');
    if (sig.length !== expectedSig.length) return false;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig)))
      return false;
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    );
    return payload.v === 1 && payload.exp > Date.now();
  } catch {
    return false;
  }
}
