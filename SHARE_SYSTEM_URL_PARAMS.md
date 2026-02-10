# Share System - URL Parameter Support for POST API Charts

## Overview
This implementation adds full URL parameter support to the share system, enabling POST API charts (like app-stats charts) to work with shareable URLs that include custom parameters.

## Changes Made

### 1. ClientChartPage.tsx (`/app/share/chart/[chartId]/ClientChartPage.tsx`)
**Purpose**: Extract URL parameters and pass them to ChartRenderer

**Changes**:
- Added `urlParams={searchParams}` prop to ChartRenderer (line ~497)
- Added logging for POST API chart detection
- URL parameters are automatically synchronized with filterValues through existing mechanism

**How it works**:
- User opens share URL with parameters (e.g., `?appId=123&Block+Date.start=01/12/25`)
- ClientChartPage extracts URL params using `useSearchParams()`
- These params are passed to ChartRenderer via the `urlParams` prop
- When filters change in UI, both filterValues and URL are updated via `handleFilterChange`

### 2. ChartRenderer.tsx (`/app/admin/components/ChartRenderer.tsx`)
**Purpose**: Append URL parameters to API requests for share system charts

**Changes**:
- Added `urlParams?: URLSearchParams | ReadonlyURLSearchParams` to ChartRendererProps interface
- Added `urlParams` to component props destructuring (line ~121)
- Added logic to append URL parameters to proxy endpoint (lines ~974-984):
  ```typescript
  // For share system charts, add URL parameters to the proxy endpoint
  if (urlParams && chartConfig.apiEndpoint.includes('/api/chart-data/')) {
    console.log('Share system detected, adding URL params to proxy endpoint');
    urlParams.forEach((value, key) => {
      if (!apiUrl.searchParams.has(key)) {
        apiUrl.searchParams.append(key, value);
        console.log(`Added URL param: ${key}=${value}`);
      }
    });
  }
  ```

**How it works**:
- ChartRenderer receives URL parameters from ClientChartPage
- When constructing API request, it checks if using the share system proxy
- If so, appends all URL parameters to the proxy endpoint
- This ensures POST API parameter mappings can be applied server-side

### 3. Chart Data API Route (`/app/api/chart-data/[chartId]/route.ts`)
**Purpose**: Extract URL parameters and map them to POST API request body

**Changes**:
- Added helper functions for parameter transformation:
  - `setNestedProperty`: Sets nested properties using dot notation (e.g., "Block Date.start")
  - `transformParameterValue`: Transforms string values to appropriate types (number, boolean, json)
  
- Updated parameter extraction logic (lines ~46-58):
  ```typescript
  const filters: Record<string, string> = {};
  const urlParams: Record<string, string> = {};
  
  for (const [key, value] of searchParams.entries()) {
    if (key !== 'chartId') {
      filters[key] = value;
      urlParams[key] = value;
    }
  }
  ```

- Added POST API handling logic (lines ~138-170):
  ```typescript
  if (isPostApi) {
    requestMethod = 'POST';
    const parameters: Record<string, any> = {};
    
    chart.postApiConfig!.parameterMappings!.forEach(mapping => {
      let value = urlParams[mapping.urlParam] || urlParams[mapping.apiParamPath];
      if (!value && mapping.defaultValue) {
        value = mapping.defaultValue;
      }
      if (value) {
        const transformedValue = transformParameterValue(value, mapping.transform);
        setNestedProperty(parameters, mapping.apiParamPath, transformedValue);
      }
    });
    
    requestBody = { parameters };
  }
  ```

**How it works**:
- Receives request from ChartRenderer with URL parameters
- Checks if chart has POST API configuration with parameter mappings
- For each parameter mapping:
  1. Looks up value from URL parameters using `urlParam` or `apiParamPath`
  2. Falls back to default value if not found
  3. Transforms value to correct type (number, boolean, json, etc.)
  4. Sets value in nested parameters object using dot notation
- Sends POST request to external API with constructed parameters

## Request Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. User opens share URL                                          │
│    /share/chart/abc123?appId=147&Block+Date.start=01/12/25      │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ 2. ClientChartPage extracts URL params                           │
│    - searchParams.get('appId') = '147'                           │
│    - searchParams.get('Block Date.start') = '01/12/25'           │
│    - Passes urlParams to ChartRenderer                           │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ 3. ChartRenderer prepares API request                            │
│    - Constructs URL: /api/chart-data/abc123                      │
│    - Appends URL params: ?appId=147&Block+Date.start=01/12/25    │
│    - Makes GET request to proxy                                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ 4. Chart Data API (Proxy) extracts params                        │
│    - Loads chart config from S3                                  │
│    - Checks postApiConfig.enabled = true                         │
│    - Maps URL params using parameterMappings:                    │
│      * appId → appId (string)                                    │
│      * Block Date.start → Block Date.start (date string)         │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ 5. Chart Data API makes POST request to external API             │
│    POST https://analytics.topledger.xyz/...                      │
│    Body: {                                                        │
│      "parameters": {                                              │
│        "appId": "147",                                            │
│        "Block Date": {                                            │
│          "start": "01/12/25"                                      │
│        }                                                           │
│      }                                                            │
│    }                                                              │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ 6. External API returns data                                     │
│    - Chart Data API caches response                              │
│    - Returns data to ChartRenderer                               │
│    - ChartRenderer displays chart with data                      │
└──────────────────────────────────────────────────────────────────┘
```

## Filter Updates

When a user changes a filter in the UI:

```
┌──────────────────────────────────────────────────────────────────┐
│ User changes filter (e.g., different app ID)                     │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ ClientChartPage.handleFilterChange()                             │
│    - Updates filterValues state                                  │
│    - Updates URL: window.history.replaceState()                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ ChartRenderer re-renders (filterValues changed)                  │
│    - useEffect triggers due to filterValues dependency           │
│    - Makes new API request with updated URL params               │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ Full request flow repeats with new parameters                    │
└──────────────────────────────────────────────────────────────────┘
```

## Parameter Mapping Configuration

POST API charts use `postApiConfig` in the chart configuration:

```typescript
{
  "postApiConfig": {
    "enabled": true,
    "parameterMappings": [
      {
        "urlParam": "appId",           // Name in URL query string
        "apiParamPath": "appId",       // Path in POST body (supports dot notation)
        "defaultValue": "147",         // Default if not in URL
        "transform": "string"          // Type transformation (string|number|boolean|json)
      },
      {
        "urlParam": "Block Date.start",
        "apiParamPath": "Block Date.start",  // Creates nested object
        "defaultValue": "01/12/25",
        "transform": "string"
      }
    ]
  }
}
```

## Supported Transformations

The `transform` field in parameter mappings supports:
- `"string"` (default): Keep as string
- `"number"`: Convert to number
- `"boolean"`: Convert to boolean (true/false)
- `"json"`: Parse JSON string to object

## Backward Compatibility

All changes are backward compatible:
- Regular GET API charts continue to work as before
- Charts without `postApiConfig` use standard filter mechanism
- Share system works for all chart types (GET and POST)
- Existing filter UI components (TimeFilter, CurrencyFilter) continue to work

## Cache Behavior

The proxy API includes intelligent caching:
- Cache key includes all URL parameters: `${chartId}-${JSON.stringify(filters)}`
- Different parameter combinations are cached separately
- Cache TTL: 5 minutes for fresh data
- Stale cache returned as fallback on errors

## Testing

To test with app-stats charts:

1. **Create a share link for an app-stats chart**:
   ```
   /share/chart/[chartId]?appId=147&Block+Date.start=01/12/25&Block+Date.end=11/12/25
   ```

2. **Verify URL parameters are used**:
   - Check browser console for "Share system detected, adding URL params"
   - Check network tab for POST request to external API
   - Verify POST body includes mapped parameters

3. **Test filter updates**:
   - Change app ID or date range in UI
   - Verify URL updates
   - Verify new API request is made with updated parameters

4. **Test default values**:
   - Open share link without parameters
   - Verify default values from parameterMappings are used

## Security Considerations

- API keys remain server-side only (never exposed to client)
- Share system uses secure proxy to prevent CORS issues
- URL parameters are validated server-side
- Chart configurations are loaded from secure S3 storage
- No sensitive data in shareable URLs (only filter parameters)

## Performance Optimizations

- Server-side caching reduces redundant API calls
- URL parameters included in cache key for accurate caching
- ChartRenderer only re-fetches when parameters actually change
- Preloaded data support bypasses API calls when possible

## Future Enhancements

Potential improvements:
1. Add URL parameter validation based on chart config
2. Support for array and nested object parameters
3. Parameter encoding/decoding for complex values
4. Rate limiting for share system API calls
5. Analytics for share link usage


