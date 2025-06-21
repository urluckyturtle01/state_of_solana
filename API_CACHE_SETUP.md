# API Cache System Setup

## Overview

The API cache system stores processed API data in `public/api-cache.json` to improve performance in the API explorer. The cache automatically removes unnecessary timeFilter parameters for APIs with `enableTimeAggregation: true`.

## How It Works

1. **Cache Generation**: `/api/update-api-cache` fetches all charts from S3, extracts unique APIs, and saves to JSON
2. **Auto-Initialization**: Explorer page automatically initializes cache if empty
3. **Smart Filtering**: Removes timeFilter params for APIs with automatic time aggregation

## Local Development

The cache is automatically initialized when you visit the explorer page. If needed, you can manually update:

```bash
curl -X POST http://localhost:3000/api/update-api-cache
```

## Production Deployment

### Option 1: Cron Job (Recommended)

Set up a cron job to update the cache hourly:

```bash
# Edit crontab
crontab -e

# Add this line (update every hour)
0 * * * * /path/to/scripts/update-cache-cron.sh

# Or set environment variable and run
API_URL=https://your-domain.com /path/to/scripts/update-cache-cron.sh
```

### Option 2: External Service

Use services like:
- **GitHub Actions** with scheduled workflows
- **Vercel Cron Jobs** (Pro plan)
- **Netlify Functions** with scheduled triggers
- **AWS EventBridge** with Lambda

Example GitHub Action (`.github/workflows/update-cache.yml`):

```yaml
name: Update API Cache
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
jobs:
  update-cache:
    runs-on: ubuntu-latest
    steps:
      - name: Update Cache
        run: |
          curl -X POST https://your-domain.com/api/update-api-cache
```

### Option 3: Webhook

Set up a webhook service that calls your update endpoint hourly:
- **UptimeRobot** (monitoring with HTTP calls)
- **Pingdom** (synthetic monitoring)
- **Zapier** (scheduled webhooks)

## Troubleshooting

### Cache is Empty
1. Check if the S3 credentials are properly configured
2. Verify the charts exist in S3 under `charts/` prefix
3. Manually trigger update: `POST /api/update-api-cache`

### timeFilters Still Showing
- The system only removes timeFilters for APIs with `enableTimeAggregation: true`
- APIs without this setting keep their timeFilters for manual selection
- Check `additionalOptions.enableTimeAggregation` in the chart configuration

### Production Issues
1. Check logs for API failures
2. Verify network access to S3
3. Ensure proper environment variables are set
4. Test the update endpoint manually

## Environment Variables

```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key  
AWS_REGION=us-east-1
S3_BUCKET_NAME=topledger-dashboard-data
NEXT_PUBLIC_BASE_URL=https://your-domain.com  # For production
```

## Cache Structure

The cache file contains an array of API configurations:

```json
[
  {
    "id": "endpoint_GET",
    "name": "API Name", 
    "endpoint": "https://...",
    "method": "GET",
    "columns": ["col1", "col2"],
    "chartTitle": "Chart Title",
    "apiKey": "api_key",
    "additionalOptions": {
      "enableTimeAggregation": true,
      "filters": {
        "currencyFilter": { ... }
        // timeFilter automatically removed if enableTimeAggregation: true
      }
    },
    "page": "page-name"
  }
]
``` 