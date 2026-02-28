#!/usr/bin/env python3
"""
Test script for percentage_calculator module
"""

import pandas as pd
from percentage_calculator import extract_percentage_configs, process_chart_percentages

# Test chart definition (similar to dex_fee_share.yaml)
test_chart_def = {
    'id': 'test-chart',
    'title': 'Test Cumulative Chart',
    'dataMapping': {
        'xAxis': 'block_date',
        'yAxis': [
            {
                'field': 'cum_network_fee_sol',
                'type': 'line',
                'unit': 'SOL'
            },
            {
                'field': 'cum_dex_fee_sol',
                'type': 'line',
                'unit': 'SOL'
            },
            {
                'field': 'cum_dex_fee_pct',
                'type': 'line',
                'unit': '%',
                'percentageConfig': {
                    'numerator': 'cum_dex_fee_sol',
                    'denominator': 'cum_network_fee_sol'
                }
            }
        ],
        'groupBy': ''
    }
}

# Test data - simulating cumulative values after merge
test_data = pd.DataFrame([
    {
        'block_date': '2026-02-18',
        'cum_network_fee_sol': 1000.0,
        'cum_dex_fee_sol': 250.0,
        'cum_dex_fee_pct': 20.0  # Old incorrect value
    },
    {
        'block_date': '2026-02-19',
        'cum_network_fee_sol': 1500.0,
        'cum_dex_fee_sol': 400.0,
        'cum_dex_fee_pct': 25.0  # Old incorrect value
    },
    {
        'block_date': '2026-02-20',
        'cum_network_fee_sol': 2000.0,
        'cum_dex_fee_sol': 600.0,
        'cum_dex_fee_pct': 28.0  # Old incorrect value
    }
])

print("=" * 60)
print("Testing Percentage Calculator")
print("=" * 60)

print("\n1. Extract Percentage Configs:")
configs = extract_percentage_configs(test_chart_def)
print(f"   Found configs: {configs}")

print("\n2. Original Data (with incorrect percentages):")
print(test_data.to_string(index=False))

print("\n3. Processing with percentage recalculation:")
result_df = process_chart_percentages(test_data.copy(), test_chart_def, is_cumulative=True)

print("\n4. Result Data (with recalculated percentages):")
print(result_df.to_string(index=False))

print("\n5. Verification:")
for idx, row in result_df.iterrows():
    expected_pct = (row['cum_dex_fee_sol'] / row['cum_network_fee_sol']) * 100
    actual_pct = row['cum_dex_fee_pct']
    match = "✓" if abs(expected_pct - actual_pct) < 0.01 else "✗"
    print(f"   {row['block_date']}: {actual_pct:.2f}% (expected: {expected_pct:.2f}%) {match}")

print("\n" + "=" * 60)
print("Test Complete!")
print("=" * 60)
