# Admin API Documentation

This documentation covers all API routes available in the `/app/api/admin` directory for the State of Solana admin panel.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Environment Variables](#environment-variables)
4. [API Endpoints](#api-endpoints)
   - [Bulk API Fetch](#bulk-api-fetch)
   - [Single API Response Fetch](#single-api-response-fetch)
   - [Load API Data from S3](#load-api-data-from-s3)
   - [Save API Data to S3](#save-api-data-to-s3)
5. [Data Structures](#data-structures)
6. [Error Handling](#error-handling)
7. [Examples](#examples)

## Overview

The admin API provides endpoints for managing API data, including:
- **AI-powered analysis** of API responses to generate column definitions
- **Bulk processing** of multiple APIs simultaneously
- **S3 persistence** for storing and retrieving API management data
- **Intelligent data type detection** and description generation

## Authentication

All admin APIs are intended for internal use by the admin panel. No explicit authentication is required, but they should only be accessible through the admin interface.

## Environment Variables

Required environment variables for S3 operations:

```bash
# AWS S3 Configuration
AWS_REGION=us-east-1                    # or S3_REGION
AWS_ACCESS_KEY_ID=your_access_key       # or S3_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=your_secret_key   # or S3_SECRET_KEY
S3_BUCKET_NAME=tl-state-of-solana      # or S3_BUCKET
```

## API Endpoints

### Bulk API Fetch

**Endpoint:** `POST /api/admin/fetch-all-apis`

**Description:** Fetches responses from multiple APIs simultaneously and generates AI-powered column definitions for each.

#### Request Body

```typescript
interface BulkFetchRequest {
  apis: Array<{
    id: string;
    endpoint: string;
    apiKey?: string;
    title: string;
    subtitle?: string;
    page: string;
    pageName: string;
  }>;
}
```

#### Example Request

```json
{
  "apis": [
    {
      "id": "api-1",
      "endpoint": "https://analytics.topledger.xyz/tl-research/api/queries/13448/results.json",
      "apiKey": "enfT00LNZEyisrWZh1mcgCLaPvcddY6r4nqlyN5J",
      "title": "Avg & Median Cu Price",
      "subtitle": "Includes all non-vote transactions",
      "page": "compute-units",
      "pageName": "Compute Units"
    }
  ]
}
```

#### Response

```typescript
interface BulkFetchResponse {
  success: boolean;
  totalProcessed: number;
  successful: number;
  failed: number;
  results: Array<{
    id: string;
    success: boolean;
    columns?: ColumnDefinition[];
    sampleCount?: number;
    dataPreview?: any[];
    error?: string;
  }>;
  completedAt: string;
}
```

#### Example Response

```json
{
  "success": true,
  "totalProcessed": 1,
  "successful": 1,
  "failed": 0,
  "results": [
    {
      "id": "api-1",
      "success": true,
      "columns": [
        {
          "name": "block_date",
          "type": "date",
          "description": "Date field providing temporal context for data aggregation and filtering",
          "example": "2025-08-22"
        },
        {
          "name": "platform",
          "type": "text",
          "description": "Text string containing human-readable content, labels, or descriptive information",
          "example": "Jupiter Studio"
        },
        {
          "name": "Volume",
          "type": "decimal",
          "description": "Trading volume indicating market liquidity, activity levels, and investor interest",
          "example": "66436.46400422597"
        }
      ],
      "sampleCount": 145,
      "dataPreview": [
        {
          "block_date": "2025-08-22",
          "platform": "Jupiter Studio",
          "Volume": 66436.46400422597
        }
      ]
    }
  ],
  "completedAt": "2025-08-25T10:15:32.123Z"
}
```

#### Features

- **Rate Limiting**: 500ms delay between requests to avoid overwhelming APIs
- **Timeout Protection**: 15-second timeout per API request
- **Format Detection**: Automatically handles TopLedger, standard REST, and various response formats
- **AI Analysis**: Generates intelligent column descriptions based on blockchain and financial patterns
- **Error Resilience**: Failed APIs don't stop the entire process

---

### Single API Response Fetch

**Endpoint:** `POST /api/admin/fetch-api-response`

**Description:** Fetches a single API response and generates column definitions with AI analysis.

#### Request Body

```typescript
interface SingleFetchRequest {
  url: string; // Full URL including API key if needed
}
```

#### Example Request

```json
{
  "url": "https://analytics.topledger.xyz/tl-research/api/queries/13448/results.json?api_key=enfT00LNZEyisrWZh1mcgCLaPvcddY6r4nqlyN5J"
}
```

#### Response

```typescript
interface SingleFetchResponse {
  success: boolean;
  columns: ColumnDefinition[];
  sampleCount: number;
  dataPreview: any[];
  message?: string;
  error?: string;
}
```

#### Example Response

```json
{
  "success": true,
  "columns": [
    {
      "name": "date",
      "type": "date",
      "description": "Calendar date for temporal organization and reporting periods",
      "example": "2025-08-22"
    },
    {
      "name": "cu_price_avg",
      "type": "decimal",
      "description": "Numerical value representing worth, measurement, or quantity",
      "example": "0.000125"
    }
  ],
  "sampleCount": 50,
  "dataPreview": [
    {
      "date": "2025-08-22",
      "cu_price_avg": 0.000125
    }
  ],
  "message": "Successfully analyzed API response"
}
```

#### Features

- **Format Auto-Detection**: Handles various API response formats
- **30-Second Timeout**: Longer timeout for complex APIs
- **Smart Data Extraction**: Finds data arrays in nested response structures
- **Sample Analysis**: Uses first 5 items for pattern recognition

---

### Load API Data from S3

**Endpoint:** `GET /api/admin/load-api-data`

**Description:** Loads previously saved API data from S3 storage.

#### Request

No request body required - this is a GET request.

#### Response

```typescript
interface LoadDataResponse {
  success: boolean;
  hasData: boolean;
  data?: {
    metadata: {
      totalApis: number;
      lastUpdated: string;
      version: string;
    };
    apis: EnrichedApiData[];
  };
  source: 's3' | 'none' | 'error';
  loadedAt?: string;
  s3Key?: string;
  message?: string;
  error?: string;
}
```

#### Example Response (Data Found)

```json
{
  "success": true,
  "hasData": true,
  "data": {
    "metadata": {
      "totalApis": 219,
      "lastUpdated": "2025-08-25T10:15:32.123Z",
      "version": "1.0"
    },
    "apis": [
      {
        "id": "api-1",
        "endpoint": "https://analytics.topledger.xyz/...",
        "apiKey": "enfT00LNZ...",
        "title": "Avg & Median Cu Price",
        "subtitle": "Includes all non-vote transactions",
        "page": "compute-units",
        "pageName": "Compute Units",
        "responseColumns": [
          {
            "name": "block_date",
            "type": "date",
            "description": "Date field providing temporal context...",
            "example": "2025-08-22"
          }
        ],
        "lastFetched": "2025-08-25T10:12:15.456Z",
        "fetchStatus": "success"
      }
    ]
  },
  "source": "s3",
  "loadedAt": "2025-08-25T11:30:45.789Z",
  "s3Key": "admin/api-data/latest.json"
}
```

#### Example Response (No Data Found)

```json
{
  "success": true,
  "hasData": false,
  "message": "No saved data found in S3",
  "source": "none",
  "error": "No previous save found"
}
```

#### Features

- **Automatic Fallback**: Gracefully handles missing S3 data
- **Latest Version**: Always loads from `admin/api-data/latest.json`
- **Error Classification**: Distinguishes between "no data" and actual errors

---

### Save API Data to S3

**Endpoint:** `POST /api/admin/save-api-data`

**Description:** Saves API management data to S3 with versioning.

#### Request Body

```typescript
interface SaveDataRequest {
  metadata: {
    totalApis: number;
    lastUpdated: string;
    version: string;
  };
  apis: EnrichedApiData[];
}
```

#### Example Request

```json
{
  "metadata": {
    "totalApis": 219,
    "lastUpdated": "2025-08-25T10:15:32.123Z",
    "version": "1.0"
  },
  "apis": [
    {
      "id": "api-1",
      "endpoint": "https://analytics.topledger.xyz/...",
      "title": "Avg & Median Cu Price",
      "responseColumns": [
        {
          "name": "block_date",
          "type": "date",
          "description": "Date field providing temporal context...",
          "example": "2025-08-22"
        }
      ],
      "fetchStatus": "success"
    }
  ]
}
```

#### Response

```typescript
interface SaveDataResponse {
  success: boolean;
  message: string;
  key: string;
  latestKey: string;
  bucket: string;
  timestamp: string;
  totalApis: number;
  error?: string;
}
```

#### Example Response

```json
{
  "success": true,
  "message": "API data saved successfully to S3",
  "key": "admin/api-data/api-data-2025-08-25T10-15-32-123Z.json",
  "latestKey": "admin/api-data/latest.json",
  "bucket": "tl-state-of-solana",
  "timestamp": "2025-08-25T10:15:32.123Z",
  "totalApis": 219
}
```

#### Features

- **Dual Storage**: Saves both timestamped and latest versions
- **Metadata Enhancement**: Automatically adds save timestamp and version info
- **S3 Metadata**: Includes custom metadata for tracking and organization
- **Error Validation**: Validates S3 credentials before attempting save

## Data Structures

### ColumnDefinition

```typescript
interface ColumnDefinition {
  name: string;        // Column name from API response
  type: string;        // Data type (date, text, decimal, bigint, etc.)
  description: string; // AI-generated intelligent description
  example?: string;    // Sample value from actual API response
}
```

### EnrichedApiData

```typescript
interface EnrichedApiData {
  id: string;
  endpoint: string;
  apiKey?: string;
  title: string;
  subtitle: string;
  page: string;
  pageName: string;
  menuId?: string;
  menuName?: string;
  responseColumns: ColumnDefinition[];
  lastFetched?: string;
  fetchStatus: 'pending' | 'loading' | 'success' | 'error';
  fetchError?: string;
}
```

## Error Handling

All APIs return standardized error responses:

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
}
```

### Common Error Codes

- **400 Bad Request**: Missing required parameters
- **500 Internal Server Error**: S3 configuration issues, API timeouts, or parsing errors
- **Network Errors**: External API unavailable or timeout

### Error Response Examples

```json
{
  "success": false,
  "error": "S3 credentials not properly configured"
}
```

```json
{
  "success": false,
  "error": "APIs array is required"
}
```

```json
{
  "success": false,
  "error": "HTTP 429: Too Many Requests"
}
```

## Examples

### Complete Workflow Example

```javascript
// 1. Load existing data from S3
const loadResponse = await fetch('/api/admin/load-api-data');
const loadResult = await loadResponse.json();

let apis = [];
if (loadResult.hasData) {
  apis = loadResult.data.apis;
  console.log(`Loaded ${apis.length} APIs from S3`);
} else {
  // Load from original source
  apis = await loadOriginalApis();
}

// 2. Fetch column definitions for all APIs
const bulkResponse = await fetch('/api/admin/fetch-all-apis', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ apis })
});

const bulkResult = await bulkResponse.json();
console.log(`Processed ${bulkResult.totalProcessed} APIs`);
console.log(`${bulkResult.successful} successful, ${bulkResult.failed} failed`);

// 3. Update APIs with new column definitions
bulkResult.results.forEach(result => {
  if (result.success) {
    const apiIndex = apis.findIndex(api => api.id === result.id);
    if (apiIndex !== -1) {
      apis[apiIndex].responseColumns = result.columns;
      apis[apiIndex].lastFetched = new Date().toISOString();
      apis[apiIndex].fetchStatus = 'success';
    }
  }
});

// 4. Save updated data to S3
const saveResponse = await fetch('/api/admin/save-api-data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    metadata: {
      totalApis: apis.length,
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    },
    apis
  })
});

const saveResult = await saveResponse.json();
console.log(`Saved to S3: ${saveResult.key}`);
```

### Testing Single API

```javascript
// Test a single API endpoint
const testResponse = await fetch('/api/admin/fetch-api-response', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://analytics.topledger.xyz/tl-research/api/queries/13448/results.json?api_key=your_key'
  })
});

const testResult = await testResponse.json();
if (testResult.success) {
  console.log('Column Definitions:', testResult.columns);
  console.log('Sample Data:', testResult.dataPreview);
} else {
  console.error('API Test Failed:', testResult.error);
}
```

## AI-Powered Features

### Intelligent Column Descriptions

The system uses advanced pattern recognition to generate contextual descriptions:

- **Blockchain Terms**: `slot`, `epoch`, `block_date`, `hash`, `signature`, `address`
- **Financial Terms**: `price`, `volume`, `balance`, `fee`, `revenue`
- **Token Terms**: `mint`, `supply`, `decimals`, `symbol`
- **Time Terms**: `timestamp`, `created`, `updated`, `date`
- **Metrics**: `count`, `ratio`, `percentage`, `score`

### Data Type Detection

Enhanced type system beyond basic JavaScript types:

- `date` - Date/time values
- `decimal` - Floating point numbers
- `bigint` - Large integers (>1B)
- `uint` - Positive integers
- `solana_address` - Base58 Solana addresses
- `hash_sha256` - 64-character hex hashes
- `url` - HTTP/HTTPS URLs
- `email` - Email addresses
- `base64` - Base64 encoded data

---

*Documentation last updated: August 25, 2025*
*Version: 1.0*
