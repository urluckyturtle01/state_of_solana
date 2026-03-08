# Trino Chart Sync Database - Setup Complete! ✅

## Installation Summary

✅ **PostgreSQL 16** installed and running
✅ **Database** `trino_charts` created
✅ **pg_cron extension** installed and enabled
✅ **All tables** created successfully
✅ **Triggers** configured
✅ **Views** created for monitoring
✅ **Scheduled job** configured (runs every 12 hours)

## Database Details

- **Database Name**: `trino_charts`
- **PostgreSQL Version**: 16
- **Location**: localhost:5432

## Tables Created

1. **chart_definitions** - Stores chart metadata and YAML configs
2. **query_results** - Stores SQL queries and their JSON results
3. **trino_job_queue** - Job queue for Trino query execution

## Views Created

1. **job_queue_summary** - Summary of job queue status
2. **chart_status** - Chart status with query information

## Triggers Configured

1. **on_chart_insert** - Auto-creates query_results and queues backfill
2. **on_sql_change** - Detects SQL changes and queues re-backfill
3. **cleanup_orphaned_results** - Cleans up unused query results

## Scheduled Jobs

- **queue-scheduled-jobs**: Runs every 12 hours (0 */12 * * *)
  - Queues incremental or full_refresh jobs based on chart config

## Quick Start

### 1. Connect to Database

```bash
sudo -u postgres psql -d trino_charts
```

### 2. Insert Test Chart

```sql
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
```

### 3. Check Job Queue

```sql
SELECT * FROM trino_job_queue;
```

You should see a backfill job created automatically!

### 4. Monitor System

```sql
-- Job queue summary
SELECT * FROM job_queue_summary;

-- Chart status
SELECT * FROM chart_status;

-- pg_cron jobs
SELECT * FROM cron.job;
```

## Connection String

For external applications:

```
postgresql://postgres@localhost:5432/trino_charts
```

## Next Steps

1. **Create GitHub Action** - Sync charts from repo to PostgreSQL
2. **Deploy Trino Worker** - Python service to execute jobs
3. **Update UI** - Read data from PostgreSQL instead of files

## Monitoring Commands

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-16-main.log

# Connect to database
sudo -u postgres psql -d trino_charts

# List all tables
sudo -u postgres psql -d trino_charts -c "\dt"

# Check pg_cron jobs
sudo -u postgres psql -d trino_charts -c "SELECT * FROM cron.job;"
```

## Useful Queries

```sql
-- View all charts
SELECT uuid, chart_config->>'title' as title, sql_hash 
FROM chart_definitions;

-- View query results
SELECT sql_hash, 
       LEFT(sql_query, 50) as sql_preview,
       jsonb_array_length(json_data) as row_count,
       last_run_at,
       last_run_status
FROM query_results;

-- View pending jobs
SELECT * FROM trino_job_queue 
WHERE status = 'pending' 
ORDER BY priority DESC, created_at;

-- View failed jobs
SELECT * FROM trino_job_queue 
WHERE status IN ('failed', 'failed_permanent') 
ORDER BY completed_at DESC;

-- Retry a failed job
UPDATE trino_job_queue 
SET status = 'pending', attempts = 0, retry_after = NULL 
WHERE id = <job_id>;
```

## Files

- **Setup Script**: `/root/state_of_solana/db/setup-trino-sync-db.sql`
- **Documentation**: `/root/state_of_solana/db/README-TRINO-SYNC.md`
- **This File**: `/root/state_of_solana/db/SETUP-COMPLETE.md`

## System is Ready! 🚀

The database is fully configured and ready to receive chart definitions and execute Trino queries!
