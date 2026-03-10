"""
Calculate cumulative fields for chart data.
Handles grouped and non-grouped data, fills missing dates with zero daily values.
"""

import psycopg2
from datetime import datetime, timedelta
from collections import defaultdict
import json


def calculate_cumulative_fields(pg, sql_hash):
    """
    Calculate cumulative fields from daily/base fields.
    Automatically fills missing dates with zero daily values and carried-forward cumulative.
    
    Args:
        pg: PostgreSQL connection
        sql_hash: SQL hash to process
    """
    cur = pg.cursor()
    
    # Fetch data
    cur.execute("SELECT json_data FROM query_results WHERE sql_hash = %s", (sql_hash,))
    row = cur.fetchone()
    if not row or not row[0]:
        print(f"      ⚠️  No data found for sql_hash {sql_hash}")
        return
    
    data = row[0]
    if not data or len(data) == 0:
        print(f"      ⚠️  Empty data for sql_hash {sql_hash}")
        return
    
    # Detect date field
    first_row = data[0]
    date_field = None
    for field in ['block_date', 'week_start', 'week', 'month']:
        if field in first_row:
            date_field = field
            break
    
    if not date_field:
        print(f"      ⚠️  No date field found")
        return
    
    # Only process daily data (block_date)
    if date_field != 'block_date':
        print(f"      ℹ️  Skipping cumulative calculation for {date_field} (not daily data)")
        return
    
    # Detect cumulative fields and their base fields
    cumulative_fields = []
    for key in first_row.keys():
        if 'cumulative' in key.lower():
            # Find base field by removing 'cumulative_' prefix
            base_field = key.replace('cumulative_', '').replace('Cumulative_', '').replace('CUMULATIVE_', '')
            if base_field in first_row:
                cumulative_fields.append((key, base_field))
    
    if not cumulative_fields:
        print(f"      ℹ️  No cumulative fields detected")
        return
    
    print(f"      📊 Found {len(cumulative_fields)} cumulative field(s): {[cf[0] for cf in cumulative_fields]}")
    
    # Detect group field from chart config (groupBy field)
    cur.execute("""
        SELECT chart_config->'dataMapping'->>'groupBy' as group_by
        FROM chart_definitions 
        WHERE sql_hash = %s 
        LIMIT 1
    """, (sql_hash,))
    
    config_row = cur.fetchone()
    group_field = config_row[0] if config_row and config_row[0] else None
    
    # Verify the group field actually exists in the data
    if group_field and group_field not in first_row:
        print(f"      ⚠️  groupBy field '{group_field}' from config not found in data")
        group_field = None
    
    if group_field:
        print(f"      📊 Grouped by: {group_field}")
        result = _calculate_grouped_cumulative(data, date_field, group_field, cumulative_fields)
    else:
        print(f"      📊 Non-grouped data")
        result = _calculate_ungrouped_cumulative(data, date_field, cumulative_fields)
    
    # Update database
    cur.execute(
        "UPDATE query_results SET json_data = %s WHERE sql_hash = %s",
        (json.dumps(result), sql_hash)
    )
    pg.commit()
    print(f"      ✅ Cumulative calculation complete ({len(result)} rows)")


def _calculate_grouped_cumulative(data, date_field, group_field, cumulative_fields):
    """Calculate cumulative for grouped data with date backfilling."""
    
    # Group data
    grouped = defaultdict(list)
    for row in data:
        grouped[row[group_field]].append(row)
    
    # Find global max date across ALL groups
    global_max_date = None
    for rows in grouped.values():
        for row in rows:
            date_val = row.get(date_field)
            if date_val:
                row_date = datetime.strptime(date_val, '%Y-%m-%d').date()
                if global_max_date is None or row_date > global_max_date:
                    global_max_date = row_date
    
    if not global_max_date:
        return data
    
    all_results = []
    
    for group_val, rows in grouped.items():
        rows_sorted = sorted(rows, key=lambda x: x[date_field])
        if len(rows_sorted) == 0:
            continue
        
        min_date = datetime.strptime(rows_sorted[0][date_field], '%Y-%m-%d').date()
        date_to_row = {row[date_field]: row for row in rows_sorted}
        
        # Initialize cumulative trackers for each cumulative field
        cumulative_values = {cf[0]: 0 for cf in cumulative_fields}
        
        current = min_date
        while current <= global_max_date:
            date_str = str(current)
            
            if date_str in date_to_row:
                # Existing data - calculate cumulative
                row = date_to_row[date_str].copy()
                for cum_field, base_field in cumulative_fields:
                    daily_val = row.get(base_field, 0) or 0
                    cumulative_values[cum_field] += daily_val
                    row[cum_field] = cumulative_values[cum_field]
                all_results.append(row)
            else:
                # Missing date - create row with zero daily, carried-forward cumulative
                new_row = {date_field: date_str, group_field: group_val}
                
                # Set all base fields to 0
                for cum_field, base_field in cumulative_fields:
                    new_row[base_field] = 0
                    new_row[cum_field] = cumulative_values[cum_field]
                
                # Copy other non-cumulative fields from first row (for structure)
                for key in rows_sorted[0].keys():
                    if key not in new_row and key != date_field and key != group_field:
                        if 'cumulative' not in key.lower() and key not in [cf[1] for cf in cumulative_fields]:
                            new_row[key] = 0
                
                all_results.append(new_row)
            
            current += timedelta(days=1)
    
    return all_results


def _calculate_ungrouped_cumulative(data, date_field, cumulative_fields):
    """Calculate cumulative for non-grouped data with date backfilling."""
    
    rows_sorted = sorted(data, key=lambda x: x[date_field])
    if len(rows_sorted) == 0:
        return data
    
    # Find min and max dates
    min_date = datetime.strptime(rows_sorted[0][date_field], '%Y-%m-%d').date()
    max_date = datetime.strptime(rows_sorted[-1][date_field], '%Y-%m-%d').date()
    
    # Create date lookup
    date_to_row = {row[date_field]: row for row in rows_sorted}
    
    # Initialize cumulative trackers
    cumulative_values = {cf[0]: 0 for cf in cumulative_fields}
    
    result = []
    current = min_date
    
    while current <= max_date:
        date_str = str(current)
        
        if date_str in date_to_row:
            # Existing data - calculate cumulative
            row = date_to_row[date_str].copy()
            for cum_field, base_field in cumulative_fields:
                daily_val = row.get(base_field, 0) or 0
                cumulative_values[cum_field] += daily_val
                row[cum_field] = cumulative_values[cum_field]
            result.append(row)
        else:
            # Missing date - create row with zero daily, carried-forward cumulative
            new_row = {date_field: date_str}
            
            # Set all base fields to 0
            for cum_field, base_field in cumulative_fields:
                new_row[base_field] = 0
                new_row[cum_field] = cumulative_values[cum_field]
            
            # Copy other non-cumulative fields from first row (for structure)
            for key in rows_sorted[0].keys():
                if key not in new_row and key != date_field:
                    if 'cumulative' not in key.lower() and key not in [cf[1] for cf in cumulative_fields]:
                        new_row[key] = 0
            
            result.append(new_row)
        
        current += timedelta(days=1)
    
    return result


def calculate_all_cumulative_fields(pg):
    """
    Batch process all charts that need cumulative calculation.
    """
    cur = pg.cursor()
    
    # Find all charts with cumulative fields
    cur.execute("""
        SELECT DISTINCT sql_hash 
        FROM query_results 
        WHERE json_data::text LIKE '%cumulative%'
    """)
    
    sql_hashes = [row[0] for row in cur.fetchall()]
    print(f"Found {len(sql_hashes)} charts with cumulative fields")
    
    for sql_hash in sql_hashes:
        print(f"\n  Processing {sql_hash}...")
        try:
            calculate_cumulative_fields(pg, sql_hash)
        except Exception as e:
            print(f"    ❌ Error: {e}")
    
    print(f"\n✅ Batch cumulative calculation complete")


if __name__ == "__main__":
    # For testing
    PG_CONFIG = {
        'host': 'localhost',
        'port': 5432,
        'database': 'trino_charts',
        'user': 'root',
        'password': 'root'
    }
    
    pg = psycopg2.connect(**PG_CONFIG)
    
    # Test with a specific sql_hash
    # calculate_cumulative_fields(pg, '79e243e932844470476f663d1aae3e66')
    
    # Or batch process all
    calculate_all_cumulative_fields(pg)
    
    pg.close()
