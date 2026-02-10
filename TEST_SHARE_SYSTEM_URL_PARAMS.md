# Testing Share System URL Parameter Support

## Test Plan for POST API Charts (App Stats)

### Test Case 1: Share Link with All Parameters

**URL to Test:**
```
/share/chart/chart_1767243628928_69qztup?Block+Date.start=01/12/25&Block+Date.end=11/12/25&appId=147
```

**Expected Behavior:**
1. Page loads successfully
2. Chart displays "Daily Volume" data
3. Browser console shows:
   - "POST API chart detected - URL parameters will be passed via ChartRenderer"
   - "Share system detected, adding URL params to proxy endpoint"
   - "POST API chart detected, building parameter mappings from URL params"
4. Network tab shows POST request to external API with body:
```json
{
  "parameters": {
    "Block Date": {
      "start": "2025-12-01",
      "end": "2025-12-11"
    },
    "app_id": "147"
  }
}
```

**How to Verify:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate to the test URL
4. Check Console for log messages
5. Go to Network tab
6. Find the POST request to `analytics.topledger.xyz`
7. Click on it and view the Payload/Request body
8. Verify the parameters match expected structure

---

### Test Case 2: Share Link with Default Values

**URL to Test:**
```
/share/chart/chart_1767243628928_69qztup
```
(No URL parameters provided)

**Expected Behavior:**
1. Page loads successfully
2. Chart uses default values from parameter mappings:
   - Block Date.start: 2025-12-01
   - Block Date.end: 2025-12-11
   - app_id: 147
3. POST request body includes default values

**How to Verify:**
1. Open browser DevTools
2. Navigate to the test URL (no parameters)
3. Check Network tab for POST request
4. Verify default values are used in request body

---

### Test Case 3: Share Link with Partial Parameters

**URL to Test:**
```
/share/chart/chart_1767243628928_69qztup?appId=150
```
(Only appId provided, dates should use defaults)

**Expected Behavior:**
1. Page loads successfully
2. Chart uses:
   - Block Date.start: 2025-12-01 (default)
   - Block Date.end: 2025-12-11 (default)
   - app_id: 150 (from URL)
3. POST request body includes mixed values

**How to Verify:**
1. Open browser DevTools
2. Navigate to the test URL
3. Check POST request body
4. Verify app_id is 150 and dates are defaults

---

### Test Case 4: Date Format Transformation

**URL to Test:**
```
/share/chart/chart_1767243628928_69qztup?Block+Date.start=25/12/25&Block+Date.end=31/12/25&appId=147
```

**Expected Behavior:**
1. Dates are transformed from dd/MM/yy to yyyy-mm-dd format
2. POST request body includes:
```json
{
  "parameters": {
    "Block Date": {
      "start": "2025-12-25",
      "end": "2025-12-31"
    },
    "app_id": "147"
  }
}
```

**How to Verify:**
1. Check POST request body
2. Verify date format is yyyy-mm-dd (not dd/MM/yy)
3. Verify year is correctly expanded (25 → 2025)

---

### Test Case 5: URL Parameter Name Mapping

**Important Note:**
The URL parameters use different names than the API parameters:
- URL: `Block Date.start` → API: `Block Date.start` (nested object)
- URL: `Block Date.end` → API: `Block Date.end` (nested object)
- URL: `appId` → API: `app_id` (different casing)

**URL to Test:**
```
/share/chart/chart_1767243628928_69qztup?Block+Date.start=01/12/25&Block+Date.end=11/12/25&appId=147
```

**Expected Behavior:**
1. Parameter mapping correctly transforms:
   - `Block Date.start` → nested property at `parameters.Block Date.start`
   - `Block Date.end` → nested property at `parameters.Block Date.end`
   - `appId` → `app_id` parameter

**Note:** If parameter names don't match between URL and API, the chart configuration needs to be updated with correct urlParam values.

---

### Test Case 6: Filter UI Updates (In Share Page)

**If the share page includes filter controls:**

1. Open share link with initial parameters
2. Change appId using dropdown (if available)
3. Change date range using date picker (if available)

**Expected Behavior:**
1. URL updates to reflect new filter values
2. New API request is made with updated parameters
3. Chart re-renders with new data

**How to Verify:**
1. Monitor browser URL bar - it should update
2. Check Network tab for new POST request
3. Verify new request has updated parameter values

---

## Manual Testing Steps

### Step 1: Setup
```bash
# Ensure dev server is running
cd /root/state_of_solana
npm run dev
```

### Step 2: Create Test Share Link
You can create a share link for any app-stats chart by:

1. Going to admin panel
2. Finding chart ID: `chart_1767243628928_69qztup` (Daily Volume chart)
3. Using the share URL pattern: `/share/chart/[chartId]?params`

### Step 3: Test Each Case
Follow each test case above and document results:

```
Test Case 1: ✓ Pass / ✗ Fail
- Console logs present: [ ]
- POST request correct: [ ]
- Data displays: [ ]

Test Case 2: ✓ Pass / ✗ Fail
- Default values used: [ ]
- Chart displays: [ ]

... (continue for all test cases)
```

---

## Automated Testing (Future)

Potential automated tests to add:

```typescript
// Test parameter transformation
describe('transformParameterValue', () => {
  it('should convert dd/MM/yy to yyyy-mm-dd', () => {
    const result = transformParameterValue('01/12/25', 'date_yyyy_mm_dd');
    expect(result).toBe('2025-12-01');
  });
  
  it('should handle 2-digit years correctly', () => {
    expect(transformParameterValue('01/12/25', 'date_yyyy_mm_dd')).toBe('2025-12-01');
    expect(transformParameterValue('01/12/50', 'date_yyyy_mm_dd')).toBe('1950-12-01');
  });
});

// Test parameter mapping
describe('POST API parameter mapping', () => {
  it('should map URL params to API params', async () => {
    const response = await fetch('/api/chart-data/test-chart?appId=147&Block+Date.start=01/12/25');
    const body = await response.json();
    
    expect(body.parameters.app_id).toBe('147');
    expect(body.parameters['Block Date'].start).toBe('2025-12-01');
  });
});
```

---

## Known Issues and Workarounds

### Issue 1: Parameter Name Mismatch
**Problem:** Chart config uses `urlParam: "Block Date"` but URL has `Block Date.start` and `Block Date.end`

**Workaround:** The chart config needs to be updated to:
```json
{
  "urlParam": "Block Date.start",
  "apiParamPath": "Block Date.start",
  ...
}
```

**Alternative:** Update parameter extraction logic to handle dot notation in URL params.

### Issue 2: URL Encoding
**Problem:** Spaces in parameter names need to be URL-encoded (`Block+Date` or `Block%20Date`)

**Solution:** Browser automatically handles this, but ensure links are properly encoded when generating share URLs.

### Issue 3: appId vs app_id
**Problem:** URL uses `appId` but API expects `app_id`

**Current Handling:** The chart config should specify the correct mapping:
```json
{
  "urlParam": "appId",
  "apiParamPath": "app_id",
  "transform": "string"
}
```

---

## Debugging Tips

### Enable Verbose Logging
Look for these console messages:
- `"POST API chart detected - URL parameters will be passed via ChartRenderer"`
- `"Share system detected, adding URL params to proxy endpoint"`
- `"Added URL param: [key]=[value]"`
- `"POST API chart detected, building parameter mappings from URL params"`
- `"Mapped [path]=[value] (from URL param: [value])"`

### Check Network Requests
1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Look for requests to `/api/chart-data/[chartId]`
4. Check if URL parameters are included
5. Look for POST requests to external API
6. Verify request body structure

### Inspect Request/Response
```javascript
// In browser console
fetch('/api/chart-data/chart_1767243628928_69qztup?appId=147&Block+Date.start=01/12/25&Block+Date.end=11/12/25')
  .then(r => r.json())
  .then(console.log)
```

---

## Success Criteria

✓ All test cases pass
✓ No console errors
✓ POST requests have correct parameter structure
✓ Charts display data correctly
✓ URL updates work properly
✓ Default values work when parameters omitted
✓ Date transformation works correctly
✓ Parameter mapping handles nested objects
✓ Caching works (same parameters = cached response)

---

## Next Steps

Once testing is complete:
1. Update chart configurations if parameter mappings need adjustment
2. Add automated tests
3. Update user documentation
4. Create share link generator UI
5. Add share link validation


