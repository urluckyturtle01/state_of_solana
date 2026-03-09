#!/usr/bin/env python3
"""
Trino Worker - Processes job queue and executes queries
========================================================

Polls trino_job_queue, executes queries on Trino, stores results in PostgreSQL.

Job Types:
- backfill: Full historical data (today → 2025-01-01, descending)
- incremental: Gap fill + fresh data (max_date → today), append
- full_refresh: Run full SQL, replace entire JSON
"""

import os
import sys
import json
import time
from datetime import date, timedelta, datetime
from pathlib import Path
import psycopg2
from psycopg2.extras import Json
import pandas as pd
import numpy as np

# Load environment variables from .env file
env_file = Path('/root/state_of_solana/.env')
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value

# Add trino_client to path
sys.path.append('/root/tl-reserach-tool-sqls')
from trino_client import TrinoClient

# Custom exception for partial completion
class PartialCompletionException(Exception):
    def __init__(self, message, rows_saved):
        super().__init__(message)
        self.rows_saved = rows_saved

# Configuration
BACKFILL_START = date(2025, 1, 1)
POLL_INTERVAL = 10  # seconds
MAX_RETRIES = 3

# PostgreSQL connection
PG_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'trino_charts',
    'user': 'root',
    'password': 'root',
}

def convert_to_json_safe(obj):
    """Convert numpy/pandas types to JSON-safe Python types."""
    if isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, (np.bool_)):
        return bool(obj)
    elif isinstance(obj, (datetime)):
        return obj.isoformat()
    elif isinstance(obj, (pd.Timestamp)):
        return obj.isoformat()
    elif hasattr(obj, 'isoformat'):  # Catches date, datetime, etc.
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: convert_to_json_safe(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_json_safe(item) for item in obj]
    elif pd.isna(obj):
        return None
    return obj

def get_pg_conn():
    """Get PostgreSQL connection."""
    return psycopg2.connect(**PG_CONFIG)

def get_next_job(pg):
    """
    Get next pending job from queue using row-level locking.
    Returns: (job_id, sql_hash, job_type, attempts, max_attempts) or None
    """
    cur = pg.cursor()
    try:
        cur.execute("""
            UPDATE trino_job_queue SET 
                status = 'running', 
                started_at = NOW(), 
                attempts = attempts + 1
            WHERE id = (
                SELECT id FROM trino_job_queue 
                WHERE status = 'pending' 
                AND (retry_after IS NULL OR retry_after <= NOW())
                ORDER BY priority DESC, created_at 
                LIMIT 1
                FOR UPDATE SKIP LOCKED
            )
            RETURNING id, sql_hash, job_type, attempts, max_attempts
        """)
        pg.commit()
        return cur.fetchone()
    except Exception as e:
        pg.rollback()
        print(f"❌ Error getting next job: {e}")
        return None

def fix_cumulative_fields(pg, sql_hash):
    """
    Fix cumulative fields in query_results by recalculating them properly across all data.
    This ensures cumulative values accumulate correctly across months/weeks instead of resetting.
    
    Args:
        pg: PostgreSQL connection
        sql_hash: SQL hash to identify the query results
    """
    cur = pg.cursor()
    
    # Check if this query has cumulative fields
    cur.execute("""
        SELECT 
            EXISTS(
                SELECT 1 FROM query_results 
                WHERE sql_hash = %s 
                AND json_data::text LIKE '%%cumulative%%'
            ) as has_cumulative
    """, (sql_hash,))
    
    has_cumulative = cur.fetchone()[0]
    if not has_cumulative:
        return
    
    # Get the groupBy field from chart_definitions
    cur.execute("""
        SELECT chart_config->'dataMapping'->>'groupBy' as group_by
        FROM chart_definitions 
        WHERE sql_hash = %s 
        LIMIT 1
    """, (sql_hash,))
    
    row = cur.fetchone()
    group_by_field = row[0] if row and row[0] else None
    
    print(f"      🔄 Fixing cumulative fields (groupBy: {group_by_field or 'none'})...")
    
    # Recalculate cumulative fields in the database
    if group_by_field:
        # Group-wise cumulative (e.g., per category/program)
        # Use the same approach as the manual fix
        cur.execute("""
            WITH ordered_data AS (
              SELECT jsonb_array_elements(json_data) as row_data
              FROM query_results 
              WHERE sql_hash = %s
            ),
            expanded AS (
              SELECT 
                (row_data->>'block_date')::date as block_date,
                row_data->>%s as category,
                (row_data->>'active_traders')::bigint as active_traders,
                (row_data->>'new_traders')::bigint as new_traders,
                row_data - 'cumulative_new_traders' as base_data
              FROM ordered_data
            ),
            cumulative_calc AS (
              SELECT 
                block_date,
                category,
                active_traders,
                new_traders,
                SUM(new_traders) OVER (PARTITION BY category ORDER BY block_date) as cumulative_new_traders,
                base_data
              FROM expanded
              ORDER BY block_date, category
            ),
            json_rebuild AS (
              SELECT jsonb_agg(
                base_data || jsonb_build_object(
                  'cumulative_new_traders', cumulative_new_traders
                ) ORDER BY block_date, active_traders DESC
              ) as new_json_data
              FROM cumulative_calc
            )
            UPDATE query_results
            SET 
              json_data = (SELECT new_json_data FROM json_rebuild),
              updated_at = NOW()
            WHERE sql_hash = %s
        """, (sql_hash, group_by_field, sql_hash))
    else:
        # Overall cumulative (no grouping)
        cur.execute("""
            WITH ordered_data AS (
              SELECT jsonb_array_elements(json_data) as row_data
              FROM query_results 
              WHERE sql_hash = %s
            ),
            expanded AS (
              SELECT 
                (row_data->>'block_date')::date as block_date,
                (row_data->>'active_traders')::bigint as active_traders,
                (row_data->>'new_traders')::bigint as new_traders,
                (row_data->>'new_trader_pct')::numeric as new_trader_pct,
                row_data - 'cumulative_new_traders' as base_data
              FROM ordered_data
            ),
            cumulative_calc AS (
              SELECT 
                block_date,
                active_traders,
                new_traders,
                new_trader_pct,
                SUM(new_traders) OVER (ORDER BY block_date) as cumulative_new_traders,
                base_data
              FROM expanded
              ORDER BY block_date
            ),
            json_rebuild AS (
              SELECT jsonb_agg(
                base_data || jsonb_build_object(
                  'cumulative_new_traders', cumulative_new_traders
                ) ORDER BY block_date
              ) as new_json_data
              FROM cumulative_calc
            )
            UPDATE query_results
            SET 
              json_data = (SELECT new_json_data FROM json_rebuild),
              updated_at = NOW()
            WHERE sql_hash = %s
        """, (sql_hash, sql_hash))
    
    pg.commit()
    print(f"      ✅ Cumulative fields recalculated")

def run_trino_query(sql_query, from_date, to_date, trino_client, checkpoint_callback=None, checkpoint_interval=1):
    """
    Execute SQL query on Trino with date range.
    
    Args:
        sql_query: SQL query string (may contain {from_date}, {to_date}, {block_date}, {week}, or {month} placeholders)
        from_date: Start date
        to_date: End date
        trino_client: TrinoClient instance
        checkpoint_callback: Optional callback function(all_data) to save progress periodically
        checkpoint_interval: Save checkpoint every N iterations (default: 5)
        
    Returns:
        list: Query results as list of dictionaries
    """
    try:
        # Check if query uses {week} or {week_start} (weekly queries)
        if '{week}' in sql_query or '{week_start}' in sql_query:
            # Loop through each week and aggregate results
            all_results = []
            # Start at Monday of from_date's week
            current = from_date - timedelta(days=from_date.weekday())
            # End at Monday of to_date's week
            end_week = to_date - timedelta(days=to_date.weekday())
            # Support both forward and backward iteration
            backward = from_date > to_date
            
            # Calculate total weeks
            if backward:
                total_weeks = ((current - end_week).days // 7) + 1
            else:
                total_weeks = ((end_week - current).days // 7) + 1
            
            week_count = 0

            while (current >= end_week if backward else current <= end_week):
                week_count += 1
                print(f"      Fetching week {current} ({week_count}/{total_weeks})...", end='', flush=True)

                try:
                    sql = sql_query.replace('{week}', str(current))
                    sql = sql.replace('{week_start}', str(current))

                    df = trino_client.query(sql)
                    if df is not None and not df.empty:
                        records = df.to_dict('records')
                        all_results.extend(convert_to_json_safe(records))
                        print(f" ✅ {len(records)} rows")
                    else:
                        print(f" ⚠️ 0 rows")
                    
                    # Checkpoint every N weeks
                    if checkpoint_callback and week_count % checkpoint_interval == 0:
                        checkpoint_callback(all_results)
                        print(f"      💾 Checkpoint: {week_count} weeks processed")
                
                except Exception as e:
                    print(f" ❌ Error: {e}")
                    # Save progress before failing
                    if checkpoint_callback and all_results:
                        checkpoint_callback(all_results)
                        print(f"      💾 Saved {week_count-1} successful weeks before error")
                    raise

                # Advance to next/previous week
                if backward:
                    current -= timedelta(weeks=1)
                else:
                    current += timedelta(weeks=1)

            return all_results
        # Check if query uses {month} (monthly queries)
        elif '{month}' in sql_query:
            # Loop through each month and aggregate results
            all_results = []
            # Start at first day of from_date's month
            current = date(from_date.year, from_date.month, 1)
            # End at first day of to_date's month
            end_month = date(to_date.year, to_date.month, 1)
            # Support both forward (from_date <= to_date) and backward (from_date > to_date) iteration
            backward = from_date > to_date
            total_months = abs((end_month.year - current.year) * 12 + (end_month.month - current.month)) + 1
            month_count = 0

            def month_done():
                if backward:
                    if current.month == 1:
                        return date(current.year - 1, 12, 1)
                    return date(current.year, current.month - 1, 1)
                else:
                    if current.month == 12:
                        return date(current.year + 1, 1, 1)
                    return date(current.year, current.month + 1, 1)

            while (current >= end_month if backward else current <= end_month):
                month_count += 1
                print(f"      Fetching month {current} ({month_count}/{total_months})...", end='', flush=True)

                try:
                    sql = sql_query.replace('{month}', str(current))

                    df = trino_client.query(sql)
                    if df is not None and not df.empty:
                        records = df.to_dict('records')
                        all_results.extend(convert_to_json_safe(records))
                        print(f" ✅ {len(records)} rows")
                    else:
                        print(f" ⚠️ 0 rows")
                    
                    # Checkpoint every N months
                    if checkpoint_callback and month_count % checkpoint_interval == 0:
                        checkpoint_callback(all_results)
                        print(f"      💾 Checkpoint: {month_count} months processed")
                
                except Exception as e:
                    print(f" ❌ Error: {e}")
                    # Save progress before failing
                    if checkpoint_callback and all_results:
                        checkpoint_callback(all_results)
                        print(f"      💾 Saved {month_count-1} successful months before error")
                    raise

                current = month_done()

            return all_results
        # Check if query uses {block_date} (single-day queries)
        elif '{block_date}' in sql_query:
            # Loop through each day and aggregate results
            all_results = []
            current_date = from_date
            total_days = (to_date - from_date).days + 1
            day_count = 0

            while current_date <= to_date:
                day_count += 1
                print(f"      Fetching {current_date} ({day_count}/{total_days})...", end='', flush=True)

                sql = sql_query.replace('{block_date}', str(current_date))

                df = trino_client.query(sql)
                if df is not None and not df.empty:
                    records = df.to_dict('records')
                    all_results.extend(convert_to_json_safe(records))
                    print(f" ✅ {len(records)} rows")
                else:
                    print(f" ⚠️ 0 rows")

                current_date += timedelta(days=1)

            return all_results
        else:
            # Replace date range placeholders ({from_date}, {to_date})
            sql = sql_query.replace('{from_date}', str(from_date))
            sql = sql.replace('{to_date}', str(to_date))

            # Execute query
            df = trino_client.query(sql)

            if df is None or df.empty:
                return []

            # Convert to records and make JSON-safe
            records = df.to_dict('records')
            return convert_to_json_safe(records)
        
    except Exception as e:
        print(f"❌ Trino query error: {e}")
        raise

def get_dates_info(pg, sql_hash):
    """
    Get gap dates (before max_date) and max_date from JSON.
    
    Returns:
        tuple: (gap_dates[], max_date)
    """
    cur = pg.cursor()
    cur.execute("""
        WITH json_dates AS (
            SELECT DISTINCT (e->>'block_date')::date as d
            FROM query_results, jsonb_array_elements(json_data) e
            WHERE sql_hash = %s AND e->>'block_date' IS NOT NULL
        ),
        max_dt AS (
            SELECT COALESCE(MAX(d), %s) as d FROM json_dates
        ),
        expected AS (
            SELECT d::date FROM generate_series(%s, (SELECT d FROM max_dt) - INTERVAL '1 day', '1 day') d
        ),
        gaps AS (
            SELECT e.d FROM expected e
            LEFT JOIN json_dates j ON j.d = e.d
            WHERE j.d IS NULL
        )
        SELECT 
            COALESCE((SELECT array_agg(d ORDER BY d) FROM gaps), ARRAY[]::date[]) as gap_dates,
            (SELECT d FROM max_dt) as max_date
    """, (sql_hash, BACKFILL_START, BACKFILL_START))
    
    result = cur.fetchone()
    return result if result else ([], BACKFILL_START)

def process_backfill(pg, sql_hash, sql_query, trino_client):
    """
    Process backfill job:
    - If query_results already has data for this sql_hash: only fetch missing dates (resume).
    - If empty: full backfill today → BACKFILL_START, replace all JSON.
    """
    cur = pg.cursor()
    cur.execute("""
        SELECT jsonb_array_length(json_data) as row_count
        FROM query_results WHERE sql_hash = %s
    """, (sql_hash,))
    row = cur.fetchone()
    existing_count = (row[0] or 0) if row else 0

    if existing_count > 0:
        # Resume: only fetch missing dates and max_date → today, then merge
        gap_dates, max_date = get_dates_info(pg, sql_hash)
        today = date.today()
        print(f"   📅 Backfill (resume): existing {existing_count} rows, {len(gap_dates)} gaps, max_date={max_date}")

        all_new_data = []
        dates_to_remove = set()

        # 1. Fill gaps
        if gap_dates:
            print(f"   🔧 Filling {len(gap_dates)} gaps...")
            for gap_date in gap_dates:
                try:
                    print(f"      Gap {gap_date}...", end='', flush=True)
                    data = run_trino_query(sql_query, gap_date, gap_date, trino_client)
                    all_new_data.extend(data)
                    dates_to_remove.add(gap_date)
                    print(f" {len(data)} rows")
                except Exception as e:
                    print(f" ❌ Error: {e}")

        # 2. Fetch max_date → today
        print(f"   📅 Fetching {max_date} → {today}...")
        data = run_trino_query(sql_query, max_date, today, trino_client)
        all_new_data.extend(data)
        d = max_date
        while d <= today:
            dates_to_remove.add(d)
            d += timedelta(days=1)

        # 3. Merge: keep rows whose block_date is not in dates_to_remove, then append new
        cur.execute("""
            UPDATE query_results SET
                json_data = COALESCE(
                    (SELECT jsonb_agg(e ORDER BY (e->>'block_date'))
                     FROM jsonb_array_elements(json_data) e
                     WHERE e->>'block_date' IS NULL OR (e->>'block_date')::date != ALL(%s)),
                    '[]'::jsonb
                ) || %s::jsonb,
                last_run_at = NOW(),
                last_run_status = 'success',
                updated_at = NOW()
            WHERE sql_hash = %s
        """, (list(dates_to_remove), json.dumps(all_new_data, default=str), sql_hash))
        pg.commit()

        cur.execute("SELECT jsonb_array_length(json_data) FROM query_results WHERE sql_hash = %s", (sql_hash,))
        total = cur.fetchone()[0] or 0
        print(f"   ✅ Backfill (resume) complete: +{len(all_new_data)} rows, total {total} rows")
        return total
    else:
        # Full backfill: no existing data, fetch entire range
        print(f"   📅 Backfill (full): {date.today()} → {BACKFILL_START}")

        all_new_data = []

        if '{month}' in sql_query or '{week}' in sql_query or '{week_start}' in sql_query:
            # Monthly/weekly queries: iterate with checkpointing
            def checkpoint(data):
                """Save progress to database and fix cumulative fields."""
                # Use a separate connection for checkpoint to ensure data is saved
                # even if the main job transaction is rolled back later
                checkpoint_pg = get_pg_conn()
                checkpoint_cur = checkpoint_pg.cursor()
                checkpoint_cur.execute("""
                    UPDATE query_results SET
                        json_data = %s::jsonb,
                        last_run_at = NOW(),
                        last_run_status = 'success',
                        updated_at = NOW()
                    WHERE sql_hash = %s
                """, (json.dumps(data, default=str), sql_hash))
                checkpoint_pg.commit()
                # Fix cumulative fields after each checkpoint
                fix_cumulative_fields(checkpoint_pg, sql_hash)
                checkpoint_pg.close()
            
            try:
                all_new_data = run_trino_query(sql_query, date.today(), BACKFILL_START, trino_client, 
                                              checkpoint_callback=checkpoint, checkpoint_interval=1)
            except Exception as e:
                print(f"   ❌ Error during processing: {e}")
                # Data already saved via checkpoint before error
                # Get the current row count from database
                cur = pg.cursor()
                cur.execute("SELECT jsonb_array_length(json_data) FROM query_results WHERE sql_hash = %s", (sql_hash,))
                row = cur.fetchone()
                saved_count = (row[0] or 0) if row else 0
                print(f"   ℹ️  Partial data saved via checkpoints: {saved_count} rows")
                # Raise exception with partial status info
                raise PartialCompletionException(f"Partial completion: {saved_count} rows saved", saved_count)
        else:
            # Daily queries: iterate day-by-day
            d = date.today()
            days_processed = 0

            while d >= BACKFILL_START:
                try:
                    print(f"      Fetching {d}...", end='', flush=True)
                    data = run_trino_query(sql_query, d, d, trino_client)
                    all_new_data.extend(data)
                    print(f" {len(data)} rows")
                    days_processed += 1

                    if days_processed % 30 == 0:
                        cur = pg.cursor()
                        cur.execute("""
                            UPDATE query_results SET
                                json_data = %s::jsonb,
                                last_run_at = NOW(),
                                last_run_status = 'success',
                                updated_at = NOW()
                            WHERE sql_hash = %s
                        """, (json.dumps(all_new_data, default=str), sql_hash))
                        pg.commit()
                        print(f"      💾 Checkpoint: {days_processed} days processed")

                except Exception as e:
                    print(f" ❌ Error: {e}")

                d -= timedelta(days=1)

        # Get final count from database (data already saved via checkpoints)
        cur = pg.cursor()
        cur.execute("SELECT jsonb_array_length(json_data) FROM query_results WHERE sql_hash = %s", (sql_hash,))
        row = cur.fetchone()
        final_count = (row[0] or 0) if row else 0
        
        print(f"   ✅ Backfill (full) complete: {final_count} total rows")
        return final_count

def process_full_refresh(pg, sql_hash, sql_query, trino_client):
    """
    Process full_refresh job: Run entire date range, replace all JSON.
    """
    print(f"   🔄 Full refresh: {BACKFILL_START} → {date.today()}")
    
    all_new_data = run_trino_query(sql_query, BACKFILL_START, date.today(), trino_client)
    
    cur = pg.cursor()
    cur.execute("""
        UPDATE query_results SET 
            json_data = %s::jsonb,
            last_run_at = NOW(), 
            last_run_status = 'success',
            updated_at = NOW()
        WHERE sql_hash = %s
    """, (json.dumps(all_new_data, default=str), sql_hash))
    pg.commit()
    
    print(f"   ✅ Full refresh complete: {len(all_new_data)} rows")
    return len(all_new_data)

def process_incremental(pg, sql_hash, sql_query, trino_client):
    """
    Process incremental job: Fill gaps + fetch max_date → today, append.
    """
    gap_dates, max_date = get_dates_info(pg, sql_hash)
    today = date.today()
    
    print(f"   📊 Incremental: {len(gap_dates)} gaps, max_date={max_date}")
    
    all_new_data = []
    dates_to_remove = set()
    
    # 1. Fill gaps (dates before max_date with no data)
    if gap_dates:
        print(f"   🔧 Filling {len(gap_dates)} gaps...")
        for gap_date in gap_dates:
            try:
                print(f"      Gap {gap_date}...", end='', flush=True)
                data = run_trino_query(sql_query, gap_date, gap_date, trino_client)
                all_new_data.extend(data)
                dates_to_remove.add(gap_date)
                print(f" {len(data)} rows")
            except Exception as e:
                print(f" ❌ Error: {e}")
    
    # 2. Fetch max_date → today (replace max_date, add new)
    print(f"   📅 Fetching {max_date} → {today}...")
    data = run_trino_query(sql_query, max_date, today, trino_client)
    all_new_data.extend(data)
    
    # Mark dates for removal
    d = max_date
    while d <= today:
        dates_to_remove.add(d)
        d += timedelta(days=1)
    
    # 3. Merge: remove old dates, append new
    cur = pg.cursor()
    cur.execute("""
        UPDATE query_results SET
            json_data = COALESCE(
                (SELECT jsonb_agg(e ORDER BY (e->>'block_date'))
                 FROM jsonb_array_elements(json_data) e 
                 WHERE (e->>'block_date')::date != ALL(%s)),
                '[]'::jsonb
            ) || %s::jsonb,
            last_run_at = NOW(),
            last_run_status = 'success',
            updated_at = NOW()
        WHERE sql_hash = %s
    """, (list(dates_to_remove), json.dumps(all_new_data, default=str), sql_hash))
    pg.commit()
    
    print(f"   ✅ Incremental complete: {len(all_new_data)} new rows")
    return len(all_new_data)

def process_job(pg, job, trino_client):
    """
    Process a single job from the queue.
    
    Args:
        pg: PostgreSQL connection
        job: (job_id, sql_hash, job_type, attempts, max_attempts)
        trino_client: TrinoClient instance
    """
    job_id, sql_hash, job_type, attempts, max_attempts = job
    
    print(f"\n🔄 Processing job #{job_id} ({job_type}) - attempt {attempts}/{max_attempts}")
    print(f"   SQL hash: {sql_hash}")
    
    cur = pg.cursor()
    
    try:
        # Get SQL query
        cur.execute("SELECT sql_query FROM query_results WHERE sql_hash = %s", (sql_hash,))
        row = cur.fetchone()
        if not row:
            raise Exception(f"No SQL found for hash {sql_hash}")
        
        sql_query = row[0]
        
        # Process based on job type
        if job_type == 'backfill':
            rows_processed = process_backfill(pg, sql_hash, sql_query, trino_client)
        elif job_type == 'full_refresh':
            rows_processed = process_full_refresh(pg, sql_hash, sql_query, trino_client)
        elif job_type == 'incremental':
            rows_processed = process_incremental(pg, sql_hash, sql_query, trino_client)
        else:
            raise Exception(f"Unknown job type: {job_type}")
        
        # After processing, recalculate cumulative fields if needed
        fix_cumulative_fields(pg, sql_hash)
        
        # Check if we got any data
        if rows_processed == 0:
            # Complete failure: 0 rows
            error_msg = "Query returned 0 rows after processing"
            
            if attempts >= max_attempts:
                print(f"⛔ Job #{job_id} COMPLETE FAILURE: 0 rows after {attempts} attempts")
                cur.execute("""
                    UPDATE trino_job_queue 
                    SET status = 'failed_permanent', 
                        error_message = %s, 
                        completed_at = NOW()
                    WHERE id = %s
                """, (error_msg, job_id))
            else:
                backoff_minutes = 2 ** (attempts - 1)
                print(f"⚠️  Job #{job_id} returned 0 rows, will retry in {backoff_minutes} minutes")
                cur.execute("""
                    UPDATE trino_job_queue 
                    SET status = 'pending', 
                        error_message = %s, 
                        retry_after = NOW() + INTERVAL '%s minutes'
                    WHERE id = %s
                """, (error_msg, backoff_minutes, job_id))
            pg.commit()
        else:
            # Success: got data
            print(f"✅ Job #{job_id} SUCCESSFUL: {rows_processed} rows")
            cur.execute("""
                UPDATE trino_job_queue 
                SET status = 'completed', completed_at = NOW(), error_message = NULL
                WHERE id = %s
            """, (job_id,))
            pg.commit()
        
    except PartialCompletionException as e:
        # Partial success: some data saved via checkpoints but not all periods completed
        pg.rollback()  # Rollback any uncommitted changes
        error_msg = str(e)
        print(f"⚠️  Job #{job_id} PARTIALLY SUCCESSFUL: {e.rows_saved} rows saved")
        cur = pg.cursor()
        cur.execute("""
            UPDATE trino_job_queue 
            SET status = 'partial', 
                error_message = %s, 
                completed_at = NOW()
            WHERE id = %s
        """, (error_msg, job_id))
        pg.commit()
        
    except Exception as e:
        pg.rollback()
        error_msg = str(e)[:500]
        
        print(f"❌ Job #{job_id} failed: {error_msg}")
        
        # Check if we should retry or mark as permanently failed
        if attempts >= max_attempts:
            print(f"   ⛔ Max attempts reached, marking as failed_permanent")
            cur.execute("""
                UPDATE trino_job_queue 
                SET status = 'failed_permanent', 
                    error_message = %s, 
                    completed_at = NOW()
                WHERE id = %s
            """, (error_msg, job_id))
        else:
            # Exponential backoff: 2^(attempts-1) minutes
            backoff_minutes = 2 ** (attempts - 1)
            print(f"   🔄 Will retry in {backoff_minutes} minutes")
            cur.execute("""
                UPDATE trino_job_queue 
                SET status = 'pending', 
                    error_message = %s, 
                    retry_after = NOW() + INTERVAL '%s minutes'
                WHERE id = %s
            """, (error_msg, backoff_minutes, job_id))
        
        pg.commit()

def main():
    """Main worker loop."""
    print("="*70)
    print("🚀 TRINO WORKER STARTED")
    print("="*70)
    print(f"📍 PostgreSQL: {PG_CONFIG['host']}:{PG_CONFIG['port']}/{PG_CONFIG['database']}")
    print(f"📅 Backfill start date: {BACKFILL_START}")
    print(f"⏱️  Poll interval: {POLL_INTERVAL}s")
    print(f"🔄 Max retries: {MAX_RETRIES}")
    print("="*70)
    print()
    
    # Initialize connections
    pg = get_pg_conn()
    trino_client = TrinoClient()
    
    jobs_processed = 0
    
    try:
        while True:
            # Get next job
            job = get_next_job(pg)
            
            if job:
                jobs_processed += 1
                process_job(pg, job, trino_client)
            else:
                # No jobs available, wait
                if jobs_processed > 0:
                    print(f"\n⏳ No pending jobs. Waiting {POLL_INTERVAL}s... (processed {jobs_processed} jobs so far)")
                time.sleep(POLL_INTERVAL)
    
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down worker...")
        pg.close()
        print("✅ Worker stopped")
    
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        pg.close()
        sys.exit(1)

if __name__ == '__main__':
    main()
