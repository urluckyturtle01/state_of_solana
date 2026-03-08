-- Trino Chart Sync Database Setup
-- ================================

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- TABLE: chart_definitions
-- ============================================================================
-- Stores chart metadata and configuration
-- One row per chart UUID
-- Multiple charts can reference the same sql_hash (shared data)

CREATE TABLE IF NOT EXISTS chart_definitions (
    uuid UUID PRIMARY KEY,
    yaml_config TEXT NOT NULL,                    -- Original YAML content
    chart_config JSONB NOT NULL,                  -- Parsed chart config (includes queryRunConfig)
    sql_hash TEXT NOT NULL,                       -- MD5 hash of SQL query (FK to query_results)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chart_definitions_sql_hash 
    ON chart_definitions(sql_hash);

COMMENT ON TABLE chart_definitions IS 'Chart metadata synced from GitHub repo';
COMMENT ON COLUMN chart_definitions.uuid IS 'Unique chart ID from YAML';
COMMENT ON COLUMN chart_definitions.yaml_config IS 'Original YAML content';
COMMENT ON COLUMN chart_definitions.chart_config IS 'Parsed config including queryRunConfig';
COMMENT ON COLUMN chart_definitions.sql_hash IS 'MD5 hash of SQL query';

-- ============================================================================
-- TABLE: query_results
-- ============================================================================
-- Stores SQL queries and their results as JSON
-- One row per unique SQL query (identified by hash)
-- Multiple charts can share the same query results

CREATE TABLE IF NOT EXISTS query_results (
    sql_hash TEXT PRIMARY KEY,
    sql_query TEXT NOT NULL,                      -- The actual SQL query
    json_data JSONB DEFAULT '[]'::jsonb,          -- Query results as JSON array
    last_run_at TIMESTAMP,                        -- Last successful execution
    last_run_status TEXT,                         -- success, failed, etc.
    last_error TEXT,                              -- Last error message if failed
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE query_results IS 'SQL queries and their results stored as JSON';
COMMENT ON COLUMN query_results.sql_hash IS 'MD5 hash of SQL query (PK)';
COMMENT ON COLUMN query_results.json_data IS 'Query results as JSONB array';

-- ============================================================================
-- TABLE: trino_job_queue
-- ============================================================================
-- Job queue for Trino query execution
-- External worker polls this table and executes jobs

CREATE TABLE IF NOT EXISTS trino_job_queue (
    id SERIAL PRIMARY KEY,                        -- Auto-increment job ID
    sql_hash TEXT NOT NULL REFERENCES query_results(sql_hash) ON DELETE CASCADE,
    job_type TEXT NOT NULL,                       -- 'backfill', 'incremental', 'full_refresh'
    status TEXT DEFAULT 'pending',                -- pending, running, completed, failed, failed_permanent
    priority INT DEFAULT 0,                       -- Higher = more important (backfill=10, scheduled=5)
    attempts INT DEFAULT 0,                       -- Number of execution attempts
    max_attempts INT DEFAULT 3,                   -- Max retries before permanent failure
    retry_after TIMESTAMP,                        -- Don't retry before this time
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,                         -- When job started running
    completed_at TIMESTAMP,                       -- When job finished (success or permanent failure)
    error_message TEXT                            -- Error details if failed
);

CREATE INDEX IF NOT EXISTS idx_job_queue_pending 
    ON trino_job_queue(status, priority DESC, created_at)
    WHERE status IN ('pending', 'running');

COMMENT ON TABLE trino_job_queue IS 'Job queue for Trino query execution';
COMMENT ON COLUMN trino_job_queue.job_type IS 'backfill (historical), incremental (gaps+new), full_refresh (replace all)';
COMMENT ON COLUMN trino_job_queue.status IS 'pending, running, completed, failed, failed_permanent';
COMMENT ON COLUMN trino_job_queue.priority IS 'Higher = more important (backfill=10, scheduled=5)';

-- ============================================================================
-- TRIGGER: on_chart_insert
-- ============================================================================
-- When a new chart is inserted:
-- 1. Create query_results entry if sql_hash doesn't exist
-- 2. Queue backfill job if isBackfill=true (default)

CREATE OR REPLACE FUNCTION on_chart_insert()
RETURNS TRIGGER AS $$
DECLARE
    sql_hash_exists BOOLEAN;
    backfill_enabled BOOLEAN;
    p_sql_query TEXT;
BEGIN
    -- Check if sql_hash already exists
    SELECT EXISTS(SELECT 1 FROM query_results WHERE sql_hash = NEW.sql_hash) 
    INTO sql_hash_exists;
    
    -- Get isBackfill from queryRunConfig (default true)
    backfill_enabled := COALESCE(
        (NEW.chart_config->'queryRunConfig'->>'isBackfill')::boolean, 
        true
    );
    
    -- Get SQL query from chart_config
    p_sql_query := NEW.chart_config->>'sql_query';
    
    -- If new sql_hash, create query_results entry
    IF NOT sql_hash_exists THEN
        INSERT INTO query_results (sql_hash, sql_query, json_data)
        VALUES (NEW.sql_hash, p_sql_query, '[]'::jsonb);
        
        -- Queue backfill job if enabled
        IF backfill_enabled THEN
            INSERT INTO trino_job_queue (sql_hash, job_type, priority)
            VALUES (NEW.sql_hash, 'backfill', 10);
            
            RAISE NOTICE 'Queued backfill job for new sql_hash: %', NEW.sql_hash;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chart_insert ON chart_definitions;
CREATE TRIGGER trg_chart_insert
AFTER INSERT ON chart_definitions
FOR EACH ROW EXECUTE FUNCTION on_chart_insert();

-- ============================================================================
-- TRIGGER: on_sql_change
-- ============================================================================
-- When sql_hash changes for a chart:
-- 1. Create new query_results entry
-- 2. If isBackfill=true, delete old JSON and queue backfill

CREATE OR REPLACE FUNCTION on_sql_change()
RETURNS TRIGGER AS $$
DECLARE
    backfill_enabled BOOLEAN;
    p_sql_query TEXT;
BEGIN
    -- Only trigger if sql_hash actually changed
    IF OLD.sql_hash IS DISTINCT FROM NEW.sql_hash THEN
        -- Get isBackfill from queryRunConfig (default true)
        backfill_enabled := COALESCE(
            (NEW.chart_config->'queryRunConfig'->>'isBackfill')::boolean, 
            true
        );
        
        -- Get SQL query from chart_config
        p_sql_query := NEW.chart_config->>'sql_query';
        
        -- Create new query_results entry (ignore if exists)
        INSERT INTO query_results (sql_hash, sql_query, json_data)
        VALUES (NEW.sql_hash, p_sql_query, '[]'::jsonb)
        ON CONFLICT (sql_hash) DO NOTHING;
        
        -- If backfill enabled, clear old data and queue backfill
        IF backfill_enabled THEN
            -- Clear existing data
            UPDATE query_results 
            SET json_data = '[]'::jsonb, updated_at = NOW()
            WHERE sql_hash = NEW.sql_hash;
            
            -- Queue backfill job
            INSERT INTO trino_job_queue (sql_hash, job_type, priority)
            VALUES (NEW.sql_hash, 'backfill', 10);
            
            RAISE NOTICE 'SQL changed for chart %, queued backfill', NEW.uuid;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sql_change ON chart_definitions;
CREATE TRIGGER trg_sql_change
AFTER UPDATE OF sql_hash ON chart_definitions
FOR EACH ROW EXECUTE FUNCTION on_sql_change();

-- ============================================================================
-- TRIGGER: cleanup_orphaned_results
-- ============================================================================
-- When a chart is deleted, clean up query_results if no other charts use it

CREATE OR REPLACE FUNCTION cleanup_orphaned_results()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete query_results if no other charts reference this sql_hash
    DELETE FROM query_results qr
    WHERE qr.sql_hash = OLD.sql_hash
    AND NOT EXISTS (
        SELECT 1 FROM chart_definitions cd 
        WHERE cd.sql_hash = OLD.sql_hash
    );
    
    IF FOUND THEN
        RAISE NOTICE 'Cleaned up orphaned query_results for sql_hash: %', OLD.sql_hash;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cleanup_orphaned ON chart_definitions;
CREATE TRIGGER trg_cleanup_orphaned
AFTER DELETE ON chart_definitions
FOR EACH ROW EXECUTE FUNCTION cleanup_orphaned_results();

-- ============================================================================
-- PG_CRON: Schedule jobs every 12 hours
-- ============================================================================
-- Queue incremental or full_refresh jobs based on isIncremental flag

SELECT cron.schedule(
    'queue-scheduled-jobs',
    '0 */12 * * *',  -- Every 12 hours
    $$
    INSERT INTO trino_job_queue (sql_hash, job_type, priority)
    SELECT DISTINCT 
        qr.sql_hash,
        CASE 
            WHEN (cd.chart_config->'queryRunConfig'->>'isIncremental')::boolean = true 
            THEN 'incremental'
            ELSE 'full_refresh'
        END as job_type,
        5 as priority
    FROM query_results qr
    JOIN chart_definitions cd ON cd.sql_hash = qr.sql_hash
    WHERE NOT EXISTS (
        SELECT 1 FROM trino_job_queue j 
        WHERE j.sql_hash = qr.sql_hash 
        AND j.status IN ('pending', 'running')
    )
    GROUP BY qr.sql_hash, (cd.chart_config->'queryRunConfig'->>'isIncremental')::boolean
    $$
);

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View: Job queue summary
CREATE OR REPLACE VIEW job_queue_summary AS
SELECT 
    status,
    job_type,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM trino_job_queue
GROUP BY status, job_type
ORDER BY status, job_type;

-- View: Charts with their query status
CREATE OR REPLACE VIEW chart_status AS
SELECT 
    cd.uuid,
    cd.chart_config->>'title' as title,
    cd.sql_hash,
    qr.last_run_at,
    qr.last_run_status,
    jsonb_array_length(qr.json_data) as row_count,
    CASE 
        WHEN EXISTS(
            SELECT 1 FROM trino_job_queue j 
            WHERE j.sql_hash = cd.sql_hash 
            AND j.status IN ('pending', 'running')
        ) THEN 'job_queued'
        WHEN qr.last_run_status = 'success' THEN 'ready'
        WHEN qr.last_run_status IS NULL THEN 'no_data'
        ELSE 'error'
    END as status
FROM chart_definitions cd
JOIN query_results qr ON qr.sql_hash = cd.sql_hash;

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Uncomment to insert sample data:
/*
INSERT INTO chart_definitions (uuid, yaml_config, chart_config, sql_hash) VALUES
(
    'a1b2c3d4-1111-4000-8000-000000000001',
    'id: a1b2c3d4-1111-4000-8000-000000000001
title: Test Chart
page: test',
    '{
        "id": "a1b2c3d4-1111-4000-8000-000000000001",
        "title": "Test Chart",
        "page": "test",
        "sql_query": "SELECT block_date, COUNT(*) as count FROM transactions WHERE block_date BETWEEN ''{from_date}'' AND ''{to_date}'' GROUP BY block_date",
        "queryRunConfig": {
            "isIncremental": true,
            "isBackfill": true
        }
    }',
    'abc123def456'
);
*/

-- ============================================================================
-- MONITORING QUERIES
-- ============================================================================

-- Check job queue status
-- SELECT * FROM job_queue_summary;

-- View all charts and their status
-- SELECT * FROM chart_status;

-- Find failed jobs
-- SELECT * FROM trino_job_queue WHERE status = 'failed_permanent' ORDER BY completed_at DESC;

-- Retry a failed job
-- UPDATE trino_job_queue SET status = 'pending', attempts = 0, retry_after = NULL WHERE id = <job_id>;

-- Check data coverage for a sql_hash
/*
WITH json_dates AS (
    SELECT DISTINCT (e->>'block_date')::date as d
    FROM query_results, jsonb_array_elements(json_data) e
    WHERE sql_hash = '<hash>'
),
expected AS (
    SELECT d::date FROM generate_series('2025-01-01'::date, CURRENT_DATE, '1 day') d
)
SELECT 
    (SELECT COUNT(*) FROM json_dates) as days_covered,
    (SELECT COUNT(*) FROM expected) as expected_days,
    (SELECT COUNT(*) FROM expected e LEFT JOIN json_dates j ON j.d = e.d WHERE j.d IS NULL) as missing_days;
*/
