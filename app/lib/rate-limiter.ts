// Rate limiter using in-memory store (upgrade to Redis for production)
interface RateLimitData {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitData>();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 5) {
    this.windowMs = windowMs; // 15 minutes default
    this.maxRequests = maxRequests; // 5 requests per window
  }

  isAllowed(identifier: string): { allowed: boolean; resetTime?: number; remaining?: number } {
    const now = Date.now();
    const data = this.store.get(identifier);

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    if (!data || now > data.resetTime) {
      // First request or window expired
      this.store.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return { allowed: true, remaining: this.maxRequests - 1 };
    }

    if (data.count >= this.maxRequests) {
      return { 
        allowed: false, 
        resetTime: data.resetTime,
        remaining: 0 
      };
    }

    // Increment count
    data.count++;
    this.store.set(identifier, data);

    return { 
      allowed: true, 
      remaining: this.maxRequests - data.count 
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, data] of this.store.entries()) {
      if (now > data.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// Rate limiting only for AI endpoints (expensive)
export const rateLimiters = {
  // Only rate limit AI summary endpoint
  aiSummary: new RateLimiter(30 * 60 * 1000, 10), // 10 requests per 30 minutes
  
  // No rate limiting for other endpoints
  chartData: null, // Disabled
  general: null     // Disabled
};

export function getClientIdentifier(request: Request): string {
  // Try multiple methods to identify client
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnecting = request.headers.get('cf-connecting-ip');
  
  const ip = forwarded?.split(',')[0] || realIp || cfConnecting || 'unknown';
  
  // Include user agent for additional fingerprinting
  const userAgent = request.headers.get('user-agent') || '';
  const simpleUA = userAgent.slice(0, 50); // First 50 chars
  
  return `${ip}:${simpleUA}`;
}
