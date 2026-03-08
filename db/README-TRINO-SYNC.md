# Trino Chart Sync System - Setup Guide

## Overview

This system replaces the file-based chart data system with a PostgreSQL-based architecture that:
- Stores SQL queries and results in PostgreSQL
- Uses a job queue for Trino query execution
- Syncs chart configs from GitHub automatically
- Handles backfills, incremental updates, and full refreshes

## Architecture

```
GitHub Repo (SQL + YAML)
    ↓ (GitHub Action)
PostgreSQL (chart_definitions, query_results, trino_job_queue)
    ↓ (External Worker polls queue)
Trino (executes queries)
    ↓ (stores results)
PostgreSQL (json_data)
    ↓ (UI reads)
Charts rendered
```

## Setup Steps

### 1. Create Database

```bash
# Connect to PostgreSQL
psql -h your-postgres-host -U your-user -d your-database

# Run setup script
\i /root/state_of_solana/db/setup-trino-sync-db.sql
```

### 2. Verify Tables Created

```sql
-- Check tables
\dt

-- Should see:
-- chart_definitions
-- query_results
-- trino_job_queue

-- Check views
\dv

-- Should see:
-- job_queue_summary
-- chart_status
```

### 3. Test with Sample Data

```sql
-- Insert a test chart
INSERT INTO chart_definitions (uuid, yaml_config, chart_config, sql_hash) VALUES
(
    'test-uuid-1111-2222-3333-444444444444',
    'id: test-uuid-1111-2222-3333-444444444444
title: Test Chart
page: test',
    '{
        "id": "test-uuid-1111-2222-3333-444444444444",
        "title": "Test Chart",
        "page": "test",
        "sql_query": "SELECT block_date, COUNT(*) as count FROM transactions WHERE block_date BETWEEN ''{from_date}'' AND ''{to_date}'' GROUP BY block_date",
        "queryRunConfig": {
            "isIncremental": true,
            "isBackfill": true
        }
    }',
    'test-sql-hash-123'
);

-- Check if backfill job was created
SELECT * FROM trino_job_queue;

-- Should see one job with:
-- job_type: 'backfill'
-- status: 'pending'
-- priority: 10
```

### 4. Monitor System

```sql
-- Job queue summary
SELECT * FROM job_queue_summary;

-- Chart status
SELECT * FROM chart_status;

-- Failed jobs
SELECT * FROM trino_job_queue 
WHERE status = 'failed_permanent' 
ORDER BY completed_at DESC;
```

## Next Steps

### 1. Set up GitHub Action

Create `.github/workflows/sync-charts.yml` in your SQL repo:

```yaml
name: Sync Charts to PostgreSQL

on:
  push:
    branches: [main]
    paths: ['**/*.sql', '**/*.yaml']

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - run: pip install psycopg2-binary pyyaml
      
      - name: Sync to PostgreSQL
        env:
          PG_HOST: ${{ secrets.PG_HOST }}
          PG_USER: ${{ secrets.PG_USER }}
          PG_PASSWORD: ${{ secrets.PG_PASSWORD }}
          PG_DATABASE: ${{ secrets.PG_DATABASE }}
        run: python scripts/sync_charts.py
```

### 2. Create Sync Script

See the architecture document for `scripts/sync_charts.py`

### 3. Deploy Trino Worker

See the architecture document for `trino_worker.py`

The worker should run as a service:
```bash
# Using systemd
sudo systemctl enable trino-worker
sudo systemctl start trino-worker
```

## Job Types

| Job Type | When Created | Behavior |
|----------|--------------|----------|
| `backfill` | New SQL or SQL changed | Fetch today → 2025-01-01 (descending), replace all |
| `incremental` | Every 12 hours (if isIncremental=true) | Fill gaps + fetch new, append |
| `full_refresh` | Every 12 hours (if isIncremental=false) | Re-run full query, replace all |

## Monitoring Queries

```sql
-- Active jobs
SELECT * FROM trino_job_queue 
WHERE status IN ('pending', 'running') 
ORDER BY priority DESC, created_at;

-- Failed jobs (last 24 hours)
SELECT * FROM trino_job_queue 
WHERE status = 'failed_permanent' 
AND completed_at > NOW() - INTERVAL '24 hours';

-- Retry a failed job
UPDATE trino_job_queue 
SET status = 'pending', attempts = 0, retry_after = NULL 
WHERE id = <job_id>;

-- Check data coverage
WITH json_dates AS (
    SELECT DISTINCT (e->>'block_date')::date as d
    FROM query_results, jsonb_array_elements(json_data) e
    WHERE sql_hash = '<your-sql-hash>'
),
expected AS (
    SELECT d::date 
    FROM generate_series('2025-01-01'::date, CURRENT_DATE, '1 day') d
)
SELECT 
    (SELECT COUNT(*) FROM json_dates) as days_covered,
    (SELECT COUNT(*) FROM expected) as expected_days,
    (SELECT COUNT(*) FROM expected e 
     LEFT JOIN json_dates j ON j.d = e.d 
     WHERE j.d IS NULL) as missing_days;

-- Charts without data
SELECT 
    cd.uuid,
    cd.chart_config->>'title' as title,
    cd.sql_hash
FROM chart_definitions cd
JOIN query_results qr ON qr.sql_hash = cd.sql_hash
WHERE jsonb_array_length(qr.json_data) = 0;
```

## Troubleshooting

### Jobs stuck in "running"

```sql
-- Find stuck jobs (running > 1 hour)
SELECT * FROM trino_job_queue 
WHERE status = 'running' 
AND started_at < NOW() - INTERVAL '1 hour';

-- Reset stuck jobs
UPDATE trino_job_queue 
SET status = 'pending', started_at = NULL 
WHERE status = 'running' 
AND started_at < NOW() - INTERVAL '1 hour';
```

### pg_cron not scheduling

```sql
-- Check pg_cron jobs
SELECT * FROM cron.job;

-- Check pg_cron job runs
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;

-- Manually trigger scheduled job
INSERT INTO trino_job_queue (sql_hash, job_type, priority)
SELECT DISTINCT 
    qr.sql_hash,
    CASE 
        WHEN (cd.chart_config->'queryRunConfig'->>'isIncremental')::boolean = true 
        THEN 'incremental'
        ELSE 'full_refresh'
    END,
    5
FROM query_results qr
JOIN chart_definitions cd ON cd.sql_hash = qr.sql_hash
WHERE NOT EXISTS (
    SELECT 1 FROM trino_job_queue j 
    WHERE j.sql_hash = qr.sql_hash 
    AND j.status IN ('pending', 'running')
);
```

## Migration from File-based System

To migrate from the current file-based system:

1. **Keep both systems running** during transition
2. **Sync existing charts** to PostgreSQL using sync script
3. **Backfill historical data** (will be queued automatically)
4. **Switch UI** to read from PostgreSQL once data is ready
5. **Deprecate file-based system** after verification

## Benefits

- ✅ **Centralized**: All data in PostgreSQL
- ✅ **Scalable**: Job queue handles load
- ✅ **Reliable**: Automatic retries
- ✅ **Efficient**: Shared data for multiple charts
- ✅ **Monitored**: Easy to track job status
- ✅ **Flexible**: Easy to re-run queries
