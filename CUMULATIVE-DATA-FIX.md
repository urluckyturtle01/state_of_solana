# Cumulative Data Incremental Update Fix

## Problem

When fetching incremental data for cumulative metrics (like `cumulative_traders`), the SQL query returns only NEW data for new dates. But cumulative values should BUILD ON the previous values.

### Example of the Problem

**Scenario:** Tracking cumulative traders by program

**Existing data (Feb 24):**
```json
{
  "date": "2026-02-24",
  "program_name": "Raydium",
  "cumulative_traders": 500
}
```

**New SQL query (Feb 25) returns:**
```json
{
  "date": "2026-02-25",
  "program_name": "Raydium",
  "cumulative_traders": 20
}
```
(This is the NEW traders on Feb 25, not the total)

**What was happening (WRONG):**
The script would just append this, resulting in:
```json
{
  "date": "2026-02-25",
  "program_name": "Raydium",
  "cumulative_traders": 20  // WRONG! Should be 520
}
```

**What should happen (CORRECT):**
```json
{
  "date": "2026-02-25",
  "program_name": "Raydium",
  "cumulative_traders": 520  // 500 + 20 = 520 ✅
}
```

## Solution

Modified the `merge_data()` function in `fetch-dex-data.py` to:

1. **Detect cumulative columns** (columns with "cumulative" in name, or starting with "total_")

2. **For charts WITH groupBy:**
   - Get the last cumulative value for EACH group (e.g., each program_name)
   - Add that group's last value to all new rows for that group

3. **For charts WITHOUT groupBy:**
   - Get the last cumulative value from the last row
   - Add it to all new rows

## Code Changes

### Function Signature
```python
def merge_data(self, existing_data, new_data, is_cumulative, group_by_field=None):
```

Added `group_by_field` parameter to know which field to group by when calculating cumulative values.

### Logic Flow

1. **Identify cumulative columns:**
   ```python
   cumulative_cols = [col for col in new_df.columns 
                     if 'cumulative' in col.lower() or 
                        col.startswith('total_') or 
                        col.endswith('_count')]
   ```

2. **With groupBy:**
   - Extract last value per group from existing data
   - Add to corresponding group in new data

3. **Without groupBy:**
   - Extract last value from last row
   - Add to all new rows

4. **Merge:**
   - Remove overlapping dates from existing data
   - Append updated new data
   - Sort by date

## Testing

To test this fix:

1. **Delete existing data** for a cumulative chart
2. **Run full fetch** - should populate initial data correctly
3. **Run incremental fetch** - should add to previous cumulative values

Example test:
```bash
# Check last value
jq '.charts[] | select(.chartId | contains("cumulative")) | {chartId, lastRow: .data[-1]}' dex-summary.json

# Run incremental update
python3 fetch-dex-data.py

# Verify new value = old_value + incremental_value
jq '.charts[] | select(.chartId | contains("cumulative")) | {chartId, lastRow: .data[-1]}' dex-summary.json
```

## Impact

This fix ensures that:
- ✅ Cumulative metrics grow correctly over time
- ✅ Each group maintains its own cumulative total
- ✅ Incremental updates work properly for cumulative data
- ✅ No need to re-fetch full historical data every time
