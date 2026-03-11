#!/usr/bin/env python3
"""
Static Query Runner
====================
Handles SQL queries that have NO date/month/week placeholders.
These queries fetch their entire dataset in a single Trino call
(e.g. epoch-based REV metrics, summary tables, etc.).

Called by trino_worker.py for backfill/full_refresh jobs whose
SQL does not contain {date}, {month}, {week}, or {week_start}.
"""

import json
import psycopg2


def is_static_query(sql_query: str) -> bool:
    """Return True if the SQL has no date/period placeholders."""
    placeholders = ['{date}', '{month}', '{week}', '{week_start}']
    return not any(p in sql_query for p in placeholders)


def run_static_query(pg, sql_hash: str, sql_query: str, trino_client) -> int:
    """
    Execute a static (no-date-placeholder) SQL query once and store the
    entire result set in query_results.

    Returns the number of rows saved (0 on failure).
    """
    print(f"      Running static query (no date placeholders)...", end='', flush=True)

    try:
        df = trino_client.query(sql_query)
    except Exception as e:
        print(f" ❌ Trino error: {e}")
        return 0

    if df is None or df.empty:
        print(" 0 rows")
        return 0

    # Convert to JSON-safe records
    records = _convert_to_json_safe(df.to_dict('records'))
    row_count = len(records)
    print(f" {row_count} rows")

    # Persist to query_results (full replace)
    cur = pg.cursor()
    cur.execute("""
        UPDATE query_results
        SET json_data       = %s::jsonb,
            last_run_at     = NOW(),
            last_run_status = 'success',
            updated_at      = NOW()
        WHERE sql_hash = %s
    """, (json.dumps(records, default=str), sql_hash))
    pg.commit()
    cur.close()

    print(f"   ✅ Static query complete: {row_count} rows saved")
    return row_count


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _convert_to_json_safe(records):
    """Convert numpy / date types to JSON-serialisable Python types."""
    import numpy as np
    from datetime import date, datetime

    safe = []
    for row in records:
        safe_row = {}
        for k, v in row.items():
            if isinstance(v, (np.integer,)):
                v = int(v)
            elif isinstance(v, (np.floating,)):
                v = float(v)
            elif isinstance(v, (np.bool_,)):
                v = bool(v)
            elif isinstance(v, (date, datetime)):
                v = str(v)
            elif isinstance(v, float) and (v != v):  # NaN
                v = None
            safe_row[k] = v
        safe.append(safe_row)
    return safe
