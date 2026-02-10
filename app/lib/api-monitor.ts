// Simple API monitoring and alerting system
interface ApiMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  blockedRequests: number;
  averageResponseTime: number;
  lastReset: number;
}

interface AlertThresholds {
  maxRequestsPerHour: number;
  maxFailureRate: number; // 0.0 to 1.0
  maxResponseTimeMs: number;
  maxBlockedRequestsPerHour: number;
}

class ApiMonitor {
  private metrics: ApiMetrics;
  private thresholds: AlertThresholds;
  private responseTimeSamples: number[] = [];
  private readonly maxSamples = 100;

  constructor(thresholds: AlertThresholds) {
    this.thresholds = thresholds;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      blockedRequests: 0,
      averageResponseTime: 0,
      lastReset: Date.now()
    };
  }

  recordRequest(success: boolean, responseTimeMs: number) {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Track response times
    this.responseTimeSamples.push(responseTimeMs);
    if (this.responseTimeSamples.length > this.maxSamples) {
      this.responseTimeSamples.shift();
    }

    this.metrics.averageResponseTime = 
      this.responseTimeSamples.reduce((a, b) => a + b, 0) / this.responseTimeSamples.length;

    this.checkAlerts();
  }

  recordBlockedRequest() {
    this.metrics.blockedRequests++;
    this.checkAlerts();
  }

  private checkAlerts() {
    const now = Date.now();
    const hoursSinceReset = (now - this.metrics.lastReset) / (1000 * 60 * 60);

    // Check request rate
    const requestsPerHour = this.metrics.totalRequests / Math.max(hoursSinceReset, 1/60);
    if (requestsPerHour > this.thresholds.maxRequestsPerHour) {
      this.sendAlert('HIGH_REQUEST_RATE', `${requestsPerHour.toFixed(1)} requests/hour`);
    }

    // Check failure rate
    const failureRate = this.metrics.failedRequests / Math.max(this.metrics.totalRequests, 1);
    if (failureRate > this.thresholds.maxFailureRate) {
      this.sendAlert('HIGH_FAILURE_RATE', `${(failureRate * 100).toFixed(1)}% failure rate`);
    }

    // Check response time
    if (this.metrics.averageResponseTime > this.thresholds.maxResponseTimeMs) {
      this.sendAlert('HIGH_RESPONSE_TIME', `${this.metrics.averageResponseTime.toFixed(0)}ms average`);
    }

    // Check blocked requests
    const blockedPerHour = this.metrics.blockedRequests / Math.max(hoursSinceReset, 1/60);
    if (blockedPerHour > this.thresholds.maxBlockedRequestsPerHour) {
      this.sendAlert('HIGH_BLOCKED_RATE', `${blockedPerHour.toFixed(1)} blocked/hour`);
    }
  }

  private sendAlert(type: string, details: string) {
    const alert = {
      timestamp: new Date().toISOString(),
      type,
      details,
      metrics: { ...this.metrics }
    };

    console.warn(`🚨 API ALERT [${type}]: ${details}`, alert);
    
    // In production, you could send this to:
    // - Slack webhook
    // - Email service
    // - Discord webhook
    // - Monitoring service (DataDog, New Relic, etc.)
    
    // Example Slack webhook (uncomment and configure):
    // this.sendSlackAlert(alert);
  }

  // Example Slack integration (configure your webhook URL)
  /*
  private async sendSlackAlert(alert: any) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 API Alert: ${alert.type}`,
          attachments: [{
            color: 'danger',
            fields: [
              { title: 'Details', value: alert.details, short: true },
              { title: 'Total Requests', value: alert.metrics.totalRequests, short: true },
              { title: 'Success Rate', value: `${((alert.metrics.successfulRequests / alert.metrics.totalRequests) * 100).toFixed(1)}%`, short: true },
              { title: 'Avg Response Time', value: `${alert.metrics.averageResponseTime.toFixed(0)}ms`, short: true }
            ]
          }]
        })
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }
  */

  getMetrics(): ApiMetrics & { requestsPerHour: number; failureRate: number } {
    const hoursSinceReset = Math.max((Date.now() - this.metrics.lastReset) / (1000 * 60 * 60), 1/60);
    
    return {
      ...this.metrics,
      requestsPerHour: this.metrics.totalRequests / hoursSinceReset,
      failureRate: this.metrics.failedRequests / Math.max(this.metrics.totalRequests, 1)
    };
  }

  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      blockedRequests: 0,
      averageResponseTime: 0,
      lastReset: Date.now()
    };
    this.responseTimeSamples = [];
  }
}

// Configure monitoring thresholds
export const apiMonitor = new ApiMonitor({
  maxRequestsPerHour: 100, // Alert if more than 100 requests/hour
  maxFailureRate: 0.1, // Alert if more than 10% failure rate
  maxResponseTimeMs: 5000, // Alert if average response time > 5 seconds
  maxBlockedRequestsPerHour: 20 // Alert if more than 20 blocked requests/hour
});

// Auto-reset metrics daily
setInterval(() => {
  const metrics = apiMonitor.getMetrics();
  console.log('Daily API metrics reset:', metrics);
  apiMonitor.resetMetrics();
}, 24 * 60 * 60 * 1000); // 24 hours
