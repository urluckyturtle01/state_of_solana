# Percentage Recalculation for Cumulative Data

## Overview

When performing incremental updates on cumulative data, percentage fields need to be recalculated after adding cumulative values. This is because percentages are derived from the ratio of two cumulative fields.

## Problem

For cumulative data with percentage fields (e.g., `cum_dex_fee_pct`):
- The SQL query returns daily incremental data
- The Python script adds the last cumulative value to create new cumulative totals
- However, percentage fields were also being added, causing incorrect spikes in charts
- **Solution**: Recalculate percentages using their numerator and denominator after cumulative addition

## Implementation

### 1. YAML Configuration

Add `percentageConfig` to percentage fields in the chart's `yAxis`:

```yaml
yAxis:
  - field: cum_dex_fee_pct
    type: line
    unit: "%"
    rightAxis: true
    percentageConfig:
      numerator: cum_dex_fee_sol
      denominator: cum_network_fee_sol
```

### 2. Percentage Calculator Module

**File**: `/root/state_of_solana/public/temp/percentage_calculator.py`

This utility module provides:
- `extract_percentage_configs()`: Extracts percentage configurations from chart definitions
- `recalculate_percentages()`: Recalculates percentage fields using the formula: `(numerator / denominator) * 100`
- `process_chart_percentages()`: Main function to process percentage recalculation for a chart

### 3. Integration in fetch-dex-data.py

The main script imports and uses the percentage calculator:

```python
from percentage_calculator import process_chart_percentages

# After merging cumulative data:
if is_cumulative and merged_data_records:
    merged_df = pd.DataFrame(merged_data_records)
    merged_df = process_chart_percentages(merged_df, chart_config, is_cumulative)
    merged_data_records = merged_df.to_dict('records')
```

## Example

### Chart Configuration (YAML)

```yaml
- id: b2c3d4e5-2222-4000-8000-000000000003
  title: Cumulative Dex Fee Share
  subtitle: Cumulative DEX fees vs network fees with running percentage
  page: network_fees
  chartType: line
  dataMapping:
    xAxis: block_date
    yAxis:
      - field: cum_network_fee_sol
        type: line
        unit: SOL
      - field: cum_dex_fee_sol
        type: line
        unit: SOL
      - field: cum_dex_fee_pct
        type: line
        unit: "%"
        rightAxis: true
        percentageConfig:
          numerator: cum_dex_fee_sol
          denominator: cum_network_fee_sol
```

### Data Flow

1. **SQL returns daily data** (2026-02-25):
   ```
   daily_network_fee_sol: 500
   daily_dex_fee_sol: 150
   daily_dex_fee_pct: 30.0
   ```

2. **Script adds last cumulative value** (from 2026-02-24):
   ```
   Last cum_network_fee_sol: 1000
   Last cum_dex_fee_sol: 250
   
   New cum_network_fee_sol: 1000 + 500 = 1500
   New cum_dex_fee_sol: 250 + 150 = 400
   ```

3. **Percentage calculator recalculates**:
   ```
   cum_dex_fee_pct = (400 / 1500) * 100 = 26.67%
   ```

   Without recalculation, it would incorrectly be: `20% + 30% = 50%` ❌

## Files Modified

1. **YAML Configuration**:
   - `/root/tl-reserach-tool-sqls/dex-trades/network_fees/dex_fee_share.yaml`
   - Added `percentageConfig` to charts with IDs `...000000000003` and `...000000000004`

2. **New Module**:
   - `/root/state_of_solana/public/temp/percentage_calculator.py`
   - Standalone utility for percentage recalculation

3. **Main Script**:
   - `/root/state_of_solana/public/temp/fetch-dex-data.py`
   - Added import: `from percentage_calculator import process_chart_percentages`
   - Added recalculation logic after `merge_data()` call (lines 778-782)

## Testing

Run the test script to verify the percentage calculator:

```bash
cd /root/state_of_solana/public/temp
python3 test_percentage_calculator.py
```

Expected output shows correct percentage recalculation:
- 2026-02-18: 25.00% (250/1000)
- 2026-02-19: 26.67% (400/1500)
- 2026-02-20: 30.00% (600/2000)

## Usage

### Adding Percentage Config to New Charts

1. Identify the percentage field and its numerator/denominator
2. Add `percentageConfig` to the field in YAML:
   ```yaml
   - field: your_pct_field
     type: line
     unit: "%"
     percentageConfig:
       numerator: your_numerator_field
       denominator: your_denominator_field
   ```
3. The script will automatically detect and recalculate during incremental updates

### Notes

- Only applies to cumulative data (`isCumulative: true` in `queryRunConfig`)
- Handles division by zero (returns 0%)
- Works with or without `groupBy` fields
- Preserves all other data fields unchanged
