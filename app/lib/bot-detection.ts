interface BotDetectionResult {
  isBot: boolean;
  confidence: number;
  reasons: string[];
}

export function detectBot(request: Request): BotDetectionResult {
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';
  const accept = request.headers.get('accept') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  
  const reasons: string[] = [];
  let botScore = 0;

  // 1. Known bot user agents
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /go-http/i,
    /postman/i, /insomnia/i, /httpie/i,
    /facebookexternalhit/i, /twitterbot/i,
    /linkedinbot/i, /telegrambot/i, /slackbot/i,
    /googlebot/i, /bingbot/i, /yandexbot/i,
    /axios/i, /node-fetch/i, /okhttp/i
  ];

  for (const pattern of botPatterns) {
    if (pattern.test(userAgent)) {
      botScore += 0.8;
      reasons.push(`Bot user agent: ${pattern.source}`);
      break;
    }
  }

  // 2. Missing or suspicious headers
  if (!userAgent) {
    botScore += 0.7;
    reasons.push('Missing user agent');
  }

  if (!accept || accept === '*/*') {
    botScore += 0.3;
    reasons.push('Generic or missing accept header');
  }

  if (!acceptLanguage) {
    botScore += 0.2;
    reasons.push('Missing accept-language');
  }

  // 3. No referer (suspicious for API calls from web)
  if (!referer && !isDirectAPIAccess(request)) {
    botScore += 0.3;
    reasons.push('Missing referer for web request');
  }

  // 4. Suspicious user agent patterns
  if (userAgent.length < 20) {
    botScore += 0.4;
    reasons.push('Very short user agent');
  }

  if (!/Mozilla/i.test(userAgent) && !/Chrome|Firefox|Safari|Edge/i.test(userAgent)) {
    botScore += 0.5;
    reasons.push('Non-browser user agent');
  }

  // 5. Check for headless browser patterns
  const headlessPatterns = [
    /headless/i, /phantom/i, /selenium/i, /webdriver/i,
    /puppeteer/i, /playwright/i, /chromedriver/i
  ];

  for (const pattern of headlessPatterns) {
    if (pattern.test(userAgent)) {
      botScore += 0.9;
      reasons.push(`Headless browser: ${pattern.source}`);
      break;
    }
  }

  // 6. Rapid successive requests (would need to track timing)
  // This would require additional state management

  const isBot = botScore >= 0.6;
  
  return {
    isBot,
    confidence: Math.min(botScore, 1.0),
    reasons
  };
}

function isDirectAPIAccess(request: Request): boolean {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
}

// Whitelist for legitimate bots (if needed)
export function isWhitelistedBot(userAgent: string): boolean {
  const whitelistedBots = [
    /googlebot/i,
    /bingbot/i,
    /slackbot/i,
    /facebookexternalhit/i,
    /twitterbot/i,
    /linkedinbot/i
  ];

  return whitelistedBots.some(pattern => pattern.test(userAgent));
}

// Advanced bot detection using request timing patterns
export class RequestPatternAnalyzer {
  private requestTimes = new Map<string, number[]>();
  private readonly maxTrackedRequests = 10;
  private readonly suspiciousInterval = 1000; // < 1 second between requests

  addRequest(identifier: string): boolean {
    const now = Date.now();
    const times = this.requestTimes.get(identifier) || [];
    
    times.push(now);
    
    // Keep only recent requests
    const recentTimes = times.filter(time => now - time < 60000); // Last minute
    this.requestTimes.set(identifier, recentTimes.slice(-this.maxTrackedRequests));

    // Check for suspicious patterns
    if (recentTimes.length >= 3) {
      const intervals = [];
      for (let i = 1; i < recentTimes.length; i++) {
        intervals.push(recentTimes[i] - recentTimes[i - 1]);
      }

      // Check if requests are too regular (bot-like)
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => 
        sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;

      // Very regular intervals suggest automated requests
      return avgInterval < this.suspiciousInterval || variance < 100;
    }

    return false;
  }
}

export const patternAnalyzer = new RequestPatternAnalyzer();
