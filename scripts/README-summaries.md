# Chart Summary Pre-Generation System

This system generates multiple AI summary versions for all charts and stores them in S3 for fast retrieval, avoiding real-time OpenAI API calls.

## 🚀 Quick Start

### Generate Summaries
```bash
npm run summaries:generate
```

### View Help
```bash
npm run summaries:help
```

## 📋 How It Works

### 1. **Pre-Generation Script** (`generate-chart-summaries.js`)
- Scans all charts in `public/temp/chart-data/` and `server/chart-configs/`
- Generates **5 different versions** of AI summaries per chart:
  - Version 1: Comprehensive and detailed
  - Version 2: Concise and focused  
  - Version 3: Technical and data-driven
  - Version 4: Strategic and business-oriented
  - Version 5: Trend-focused and future-looking
- Stores results in S3 as `chart-summaries.json`
- Handles rate limiting (2 second delays between requests)
- Supports both OpenAI and Local AI

### 2. **API Integration** (`/api/chart-summary`)
- **Primary**: Fetches pre-generated summaries from S3
- **Fallback**: Falls back to live AI generation if S3 fails
- Supports version selection (1-5)
- 5x higher rate limits since no AI calls needed
- In-memory caching for faster repeated access

### 3. **UI Integration** (`ChartCard.tsx`)
- Version selector buttons when multiple versions available
- Seamless user experience
- Shows metadata (generation time, AI service used, etc.)
- Fallback error handling

## 🔧 Configuration

### Environment Variables
```bash
# AI Service (choose one)
USE_LOCAL_AI=false              # Use OpenAI (default)
USE_LOCAL_AI=true               # Use Local AI
OPENAI_API_KEY=your_openai_key  # For OpenAI
LOCAL_AI_URL=http://...         # For Local AI (optional)
LOCAL_AI_MODEL=gpt-oss:20b      # For Local AI (optional)

# AWS S3 (required)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET=topledger-chart-data
```

## 📊 Usage Examples

### Generate All Summaries
```bash
npm run summaries:generate
```

### Check Generation Status
The script will output:
- Total charts found
- Processing progress
- Generated summaries count
- Error handling
- Final S3 upload confirmation

### Request Specific Version (API)
```javascript
fetch('/api/chart-summary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chartId: 'chart_1748087823998_ru1ktw2',
    pageId: 'compute-units',
    version: 3  // Request version 3 (technical)
  })
})
```

## 📁 Data Structure

### S3 Storage Format (`chart-summaries.json`)
```json
{
  "lastUpdated": "2024-01-20T10:30:00Z",
  "totalCharts": 45,
  "generationStats": {
    "totalChartsProcessed": 45,
    "totalSummariesGenerated": 225,
    "processingTimeMs": 1800000,
    "aiService": "OpenAI"
  },
  "summaries": {
    "compute-units:chart_1748087823998_ru1ktw2": {
      "chartId": "chart_1748087823998_ru1ktw2",
      "pageId": "compute-units", 
      "chartTitle": "Transactions Using Compute Budget Program",
      "chartType": "stacked_bar",
      "pageName": "Compute Units",
      "lastUpdated": "2024-01-20T10:15:00Z",
      "versions": [
        {
          "version": 1,
          "summary": "**Key Findings:**\n- Transaction volume increased 340% year-over-year [EXPONENTIAL]\n- Compute budget adoption growing among developers [GROWTH]\n\n**Trend Analysis:**\nSteady adoption pattern with seasonal spikes during major protocol updates...",
          "generatedAt": "2024-01-20T10:15:00Z",
          "aiService": "OpenAI",
          "aiModel": "gpt-5-nano",
          "dataStats": {
            "totalRows": 1250,
            "aggregatedCount": 24,
            "dateRange": "2023-01-01 to 2024-01-15"
          }
        }
        // ... versions 2-5
      ]
    }
    // ... more charts
  }
}
```

## 🔄 Re-Generation Strategy

### When to Re-Generate
- **Weekly**: For charts with frequently changing data
- **Monthly**: For stable metrics  
- **On-Demand**: After major protocol updates
- **Selective**: Only specific charts/pages

### Incremental Updates
The script automatically:
- Skips charts that already have summaries
- Preserves existing summaries when re-running
- Only generates missing summaries
- Updates metadata timestamps

### Force Re-Generation
To force regeneration of all summaries:
1. Delete `chart-summaries.json` from S3
2. Run `npm run summaries:generate`

## 🛡️ Error Handling

### Script-Level
- Network timeout handling
- Rate limit compliance  
- S3 upload retry logic
- Progress saving (every 5 charts)
- Graceful error logging

### API-Level
- S3 fetch failure → Live AI fallback
- Version not found → Default to version 1
- Cache miss → Fresh S3 fetch
- Malformed data → Clear error messages

### UI-Level  
- Loading states during version switching
- Error display with retry options
- Fallback to basic chart information
- Rate limit countdown timers

## 📈 Performance Benefits

### Before (Live AI Generation)
- **Response Time**: 3-15 seconds per request
- **Rate Limits**: 10 requests per 30 minutes
- **Cost**: $0.01-0.05 per summary
- **Reliability**: Dependent on AI service uptime

### After (Pre-Generated S3)
- **Response Time**: 50-200ms per request  
- **Rate Limits**: 50 requests per 30 minutes
- **Cost**: ~$0.001 per summary (S3 storage)
- **Reliability**: 99.9% S3 uptime

## 🚨 Monitoring

### Script Monitoring
```bash
# Check last generation
tail -f /var/log/chart-summaries.log

# Verify S3 upload
aws s3 ls s3://topledger-chart-data/chart-summaries.json
```

### API Monitoring  
```bash
# Check API logs
grep "Pre-generated summary served" /var/log/api.log

# Monitor S3 fetch failures
grep "Failed to fetch from S3" /var/log/api.log
```

## 💡 Tips

### Optimization
- Run generation during low-traffic hours
- Use Local AI for faster/cheaper generation
- Monitor S3 costs and optimize retention
- Batch generation by chart importance

### Customization
- Modify summary prompts in the script
- Adjust version count (currently 5)
- Customize rate limiting delays
- Add chart-specific prompt variations

### Troubleshooting
- Check AWS credentials and permissions
- Verify chart data file formats
- Monitor AI service rate limits
- Ensure S3 bucket access
