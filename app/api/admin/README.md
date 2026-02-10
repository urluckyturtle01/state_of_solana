# Admin API Routes

This directory contains all admin API routes for the State of Solana admin panel.

## Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/fetch-all-apis` | POST | Bulk fetch and analyze all APIs with AI |
| `/api/admin/fetch-api-response` | POST | Fetch and analyze single API response |
| `/api/admin/load-api-data` | GET | Load saved API data from S3 |
| `/api/admin/save-api-data` | POST | Save API data to S3 with versioning |

## Routes Overview

### 🚀 fetch-all-apis/
**Bulk AI-powered API analysis**
- Processes multiple APIs simultaneously
- Generates intelligent column definitions
- Rate-limited with 15s timeout per API
- Handles TopLedger and standard REST formats

### 🔍 fetch-api-response/
**Single API analysis**
- Analyzes individual API responses
- 30-second timeout for complex APIs
- Smart data extraction from nested structures
- Pattern recognition for data types

### 📥 load-api-data/
**S3 data retrieval**
- Loads latest saved API data from S3
- Graceful fallback when no data exists
- Returns enriched API data with column definitions

### 💾 save-api-data/
**S3 data persistence**
- Saves timestamped and latest versions
- Includes metadata and versioning
- Validates S3 credentials before saving

## Usage in Components

```typescript
// Load existing data
const response = await fetch('/api/admin/load-api-data');
const data = await response.json();

// Bulk analyze APIs
const bulkResponse = await fetch('/api/admin/fetch-all-apis', {
  method: 'POST',
  body: JSON.stringify({ apis: apiArray })
});

// Save to S3
const saveResponse = await fetch('/api/admin/save-api-data', {
  method: 'POST', 
  body: JSON.stringify({ metadata, apis })
});
```

## Environment Setup

Required environment variables:
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=tl-state-of-solana
```

## Features

- ✅ **AI-Powered Analysis**: Blockchain-aware column descriptions
- ✅ **Rate Limiting**: Prevents API overload
- ✅ **Error Resilience**: Individual failures don't stop bulk operations
- ✅ **S3 Versioning**: Maintains historical data
- ✅ **Type Detection**: Advanced data type classification
- ✅ **Format Agnostic**: Handles various API response structures

## Full Documentation

See `/docs/admin-api-documentation.md` for complete API reference with examples, request/response schemas, and error handling details.
