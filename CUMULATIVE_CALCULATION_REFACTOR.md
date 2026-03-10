# Cumulative Calculation Refactor

## Summary

Refactored cumulative field calculation logic from `trino_worker.py` into a separate, cleaner module `calculate_cumulative_fields.py`. This module now handles both cumulative calculation AND date backfilling in a single pass.

## Changes Made

### 1. New File: `calculate_cumulative_fields.py`

**Purpose**: Calculate cumulative fields from daily/base fields with automatic date backfilling.

**Key Features**:
- **Single-pass processing**: Calculates cumulative values while simultaneously backfilling missing dates
- **Dynamic field detection**: Automatically finds all cumulative fields and their corresponding base fields
- **Grouped & non-grouped support**: Handles both grouped data (e.g., by `prop_amm_name`) and ungrouped data
- **Global max date**: Extends all groups to the same end date (prevents "dips" in charts)
- **Zero-fill missing dates**: Missing dates get `daily=0` and carried-forward cumulative values

**Main Function**:
```python
calculate_cumulative_fields(pg, sql_hash)
```

**Logic Flow**:
1. Fetch data from `query_results`
2. Detect date field (only processes `block_date` - daily data)
3. Detect cumulative fields and their base fields (e.g., `cumulative_txn_count` ← `txn_count`)
4. Detect group field (e.g., `prop_amm_name`, `pool_category`)
5. If grouped:
   - Find global max date across ALL groups
   - For each group:
     - Sort by date
     - Loop from min_date to global_max_date
     - For existing dates: calculate cumulative (add daily to running total)
     - For missing dates: insert row with `daily=0`, carry forward cumulative
6. If not grouped:
   - Sort by date
   - Calculate cumulative for each row
7. Update `query_results` with new data

### 2. Modified: `trino_worker.py`

**Removed**:
- `fix_cumulative_fields()` function (~250 lines)
- `backfill_missing_dates()` function (~150 lines)

**Added**:
- Import: `from calculate_cumulative_fields import calculate_cumulative_fields`

**Updated** (line ~1220):
```python
# OLD (2 separate function calls):
fix_cumulative_fields(pg, sql_hash)
backfill_missing_dates(pg, sql_hash)

# NEW (1 function call):
calculate_cumulative_fields(pg, sql_hash)
```

## Why This Is Better

### Before (2 separate functions):
1. **`fix_cumulative_fields`**: Recalculated cumulative values using complex SQL window functions
2. **`backfill_missing_dates`**: Separately identified and filled missing dates

**Problems**:
- ❌ Two passes over the data
- ❌ Complex SQL with dynamic string building
- ❌ Harder to debug
- ❌ Logic split across two functions
- ❌ ~400 lines of code in `trino_worker.py`

### After (1 combined function):
1. **`calculate_cumulative_fields`**: Does both in a single Python loop

**Benefits**:
- ✅ Single pass over the data
- ✅ Simple Python logic (no complex SQL)
- ✅ Easier to understand and debug
- ✅ All logic in one place
- ✅ Separate module (cleaner architecture)
- ✅ ~200 lines of clean, commented code

## Example

**Input data** (from Trino):
```json
[
  {"block_date": "2026-03-01", "prop_amm_name": "Raydium", "txn_count": 1000},
  {"block_date": "2026-03-02", "prop_amm_name": "Raydium", "txn_count": 1500},
  {"block_date": "2026-03-01", "prop_amm_name": "GoonFi", "txn_count": 500}
  // GoonFi has no data for Mar 2
]
```

**Output data** (after `calculate_cumulative_fields`):
```json
[
  {"block_date": "2026-03-01", "prop_amm_name": "Raydium", "txn_count": 1000, "cumulative_txn_count": 1000},
  {"block_date": "2026-03-02", "prop_amm_name": "Raydium", "txn_count": 1500, "cumulative_txn_count": 2500},
  {"block_date": "2026-03-01", "prop_amm_name": "GoonFi", "txn_count": 500, "cumulative_txn_count": 500},
  {"block_date": "2026-03-02", "prop_amm_name": "GoonFi", "txn_count": 0, "cumulative_txn_count": 500}  // ADDED
]
```

## Testing

Tested on Prop AMM data (`sql_hash: 79e243e932844470476f663d1aae3e66`):
- ✅ Detected 2 cumulative fields: `cumulative_txn_count`, `cumulative_volume_usd`
- ✅ Grouped by: `prop_amm_name`
- ✅ Processed 1863 rows
- ✅ GoonFi extended from 2026-02-06 to 2026-03-08 with zero daily values
- ✅ Cumulative values stay flat (48,018,575) after last real data point

## Future Job Runs

When `trino_worker.py` runs a job:

1. **Fetch data** from Trino (raw daily values)
2. **Save to database** (`query_results`)
3. **Calculate cumulative** (`calculate_cumulative_fields`)
   - Adds cumulative fields
   - Fills missing dates
4. **Calculate percentages** (`calculate_percentage_fields`)
5. **Mark job complete**

For incremental runs:
- Fetches only new data (resume mode)
- Merges with existing data
- Re-runs `calculate_cumulative_fields` on FULL dataset
- Ensures all groups extend to new global max date

## Files Changed

- ✅ **NEW**: `/root/state_of_solana/calculate_cumulative_fields.py`
- ✅ **MODIFIED**: `/root/state_of_solana/trino_worker.py`

## Related Modules

- `calculate_percentage_fields.py`: Calculates percentage fields (e.g., `cumulative_dex_fee_pct`)
- `sync-charts-to-db.py`: Syncs chart definitions from YAML to database
