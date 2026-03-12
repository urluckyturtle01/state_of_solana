#!/usr/bin/env python3
"""
daily_refresh.py

Runs every day at 5:00 AM IST (23:30 UTC):
  1. Deletes orphaned rows from query_results (no matching chart_definitions)
  2. Queues incremental jobs for date-templated charts (isIncremental=true)
  3. Queues full_refresh jobs for static charts (isIncremental=true, no date placeholder)
"""

import sys
import os
import psycopg2
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

DB_CONFIG = {
    'host':     os.getenv('PG_HOST', 'localhost'),
    'port':     int(os.getenv('PG_PORT', 5432)),
    'database': os.getenv('PG_DB', 'trino_charts'),
    'user':     os.getenv('PG_USER', 'root'),
    'password': os.getenv('PG_PASSWORD', 'root'),
}

DATE_PLACEHOLDERS = ['{date}', '{from_date}', '{to_date}', '{block_date}', '{week}', '{week_start}', '{month}']


def is_date_templated(raw_sql: str) -> bool:
    return any(p in raw_sql for p in DATE_PLACEHOLDERS)


def connect():
    return psycopg2.connect(**DB_CONFIG)


def cleanup_orphans(pg) -> int:
    cur = pg.cursor()
    cur.execute("""
        DELETE FROM query_results qr
        WHERE NOT EXISTS (
            SELECT 1 FROM chart_definitions cd WHERE cd.sql_hash = qr.sql_hash
        )
    """)
    deleted = cur.rowcount
    pg.commit()
    cur.close()
    return deleted


def queue_incremental_jobs(pg) -> tuple[int, int]:
    cur = pg.cursor()

    # Fetch all unique sql_hashes where isIncremental = true, with their raw SQL
    cur.execute("""
        SELECT DISTINCT cd.sql_hash, qr.sql_query
        FROM chart_definitions cd
        JOIN query_results qr ON qr.sql_hash = cd.sql_hash
        WHERE cd.chart_config->'queryRunConfig'->>'isIncremental' = 'true'
          AND cd.sql_hash NOT IN (
              SELECT sql_hash FROM trino_job_queue
              WHERE status IN ('pending', 'running')
          )
    """)
    charts = cur.fetchall()

    incremental_count = 0
    full_refresh_count = 0

    for sql_hash, raw_sql in charts:
        raw_sql = raw_sql or ''
        job_type = 'incremental' if is_date_templated(raw_sql) else 'full_refresh'

        cur.execute("""
            INSERT INTO trino_job_queue (sql_hash, job_type, status)
            VALUES (%s, %s, 'pending')
        """, (sql_hash, job_type))

        if job_type == 'incremental':
            incremental_count += 1
        else:
            full_refresh_count += 1

    pg.commit()
    cur.close()
    return incremental_count, full_refresh_count


def main():
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"\n{'='*60}")
    print(f"  Daily Refresh — {now}")
    print(f"{'='*60}\n")

    pg = connect()

    # Step 1: Clean orphans
    print("🗑️  Step 1: Cleaning orphaned query_results...")
    deleted = cleanup_orphans(pg)
    print(f"   Deleted {deleted} orphaned row(s)\n")

    # Step 2: Queue jobs
    print("📋 Step 2: Queuing incremental/full_refresh jobs...")
    inc, fr = queue_incremental_jobs(pg)
    print(f"   Queued {inc} incremental job(s)")
    print(f"   Queued {fr} full_refresh job(s)\n")

    pg.close()

    print(f"✅ Daily refresh complete — {inc + fr} jobs queued")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
