#!/usr/bin/env python3
"""
daily_refresh.py

Runs every day at 5:00 AM IST (23:30 UTC):
  1. Deletes stale jobs from trino_job_queue whose sql_hash has no matching chart_definitions
  2. Deletes orphaned rows from query_results (no matching chart_definitions)
  3. Queues incremental jobs for date-templated charts (isIncremental=true)
  4. Queues full_refresh jobs for static charts (isIncremental=true, no date placeholder)
"""

import sys
import os
import psycopg2
from datetime import datetime

DELETABLE_STATUSES = ('pending', 'running', 'completed', 'partial', 'failed', 'failed_permanent')

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


def cleanup_stale_jobs(pg) -> int:
    """Delete jobs whose sql_hash has no matching chart in chart_definitions."""
    cur = pg.cursor()
    cur.execute("""
        DELETE FROM trino_job_queue
        WHERE status = ANY(%s)
          AND sql_hash NOT IN (
              SELECT DISTINCT sql_hash FROM chart_definitions
          )
    """, (list(DELETABLE_STATUSES),))
    deleted = cur.rowcount
    pg.commit()
    cur.close()
    return deleted


def cleanup_old_completed_jobs(pg, keep_per_hash: int = 3) -> int:
    """For each sql_hash, keep only the latest N jobs. Delete the rest."""
    cur = pg.cursor()
    cur.execute("""
        DELETE FROM trino_job_queue
        WHERE id NOT IN (
            SELECT id FROM (
                SELECT id,
                       ROW_NUMBER() OVER (PARTITION BY sql_hash ORDER BY created_at DESC) AS rn
                FROM trino_job_queue
            ) ranked
            WHERE rn <= %s
        )
        AND status NOT IN ('pending', 'running')
    """, (keep_per_hash,))
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

    # Step 1: Clean stale jobs for charts that no longer exist
    print("🧹 Step 1: Cleaning stale jobs for deleted charts...")
    stale = cleanup_stale_jobs(pg)
    print(f"   Deleted {stale} stale job(s)\n")

    # Step 2: Clean orphaned query_results rows
    print("🗑️  Step 2: Cleaning orphaned query_results...")
    deleted = cleanup_orphans(pg)
    print(f"   Deleted {deleted} orphaned row(s)\n")

    # Step 3: Queue incremental / full_refresh jobs
    print("📋 Step 3: Queuing incremental/full_refresh jobs...")
    inc, fr = queue_incremental_jobs(pg)
    print(f"   Queued {inc} incremental job(s)")
    print(f"   Queued {fr} full_refresh job(s)\n")

    # Step 4: Prune old history — runs after queuing so new pending row is kept
    print("✂️  Step 4: Pruning old job history (keeping latest 1 per hash)...")
    pruned = cleanup_old_completed_jobs(pg, keep_per_hash=1)
    print(f"   Pruned {pruned} old job(s)\n")

    pg.close()

    print(f"✅ Daily refresh complete — {stale} stale + {pruned} old jobs removed, {inc + fr} new jobs queued")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
