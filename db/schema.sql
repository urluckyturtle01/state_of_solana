--
-- PostgreSQL database dump
--

\restrict s5d52idRCn4RZYkqE7TMo9AW9q3EpvBebLE8yGz1CLXrE2H4rOk711W1K6Urlf1

-- Dumped from database version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_cron; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION pg_cron; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';


--
-- Name: cleanup_orphaned_results(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_orphaned_results() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.cleanup_orphaned_results() OWNER TO postgres;

--
-- Name: on_chart_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.on_chart_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.on_chart_insert() OWNER TO postgres;

--
-- Name: on_sql_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.on_sql_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    backfill_enabled BOOLEAN;
    p_sql_query TEXT;
    job_already_queued BOOLEAN;
BEGIN
    IF OLD.sql_hash IS DISTINCT FROM NEW.sql_hash THEN
        backfill_enabled := COALESCE(
            (NEW.chart_config->'queryRunConfig'->>'isBackfill')::boolean,
            true
        );
        p_sql_query := NEW.chart_config->>'sql_query';

        INSERT INTO query_results (sql_hash, sql_query, json_data)
        VALUES (NEW.sql_hash, p_sql_query, '[]'::jsonb)
        ON CONFLICT (sql_hash) DO NOTHING;

        IF backfill_enabled THEN
            UPDATE query_results
            SET json_data = '[]'::jsonb, updated_at = NOW()
            WHERE sql_hash = NEW.sql_hash;

            SELECT EXISTS(
                SELECT 1 FROM trino_job_queue
                WHERE sql_hash = NEW.sql_hash
                AND status IN ('pending', 'running')
            ) INTO job_already_queued;

            IF NOT job_already_queued THEN
                INSERT INTO trino_job_queue (sql_hash, job_type, priority)
                VALUES (NEW.sql_hash, 'backfill', 10);
                RAISE NOTICE 'SQL changed for chart %, queued backfill', NEW.uuid;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.on_sql_change() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: chart_definitions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chart_definitions (
    uuid uuid NOT NULL,
    yaml_config text NOT NULL,
    chart_config jsonb NOT NULL,
    sql_hash text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.chart_definitions OWNER TO postgres;

--
-- Name: TABLE chart_definitions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.chart_definitions IS 'Chart metadata synced from GitHub repo';


--
-- Name: COLUMN chart_definitions.uuid; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chart_definitions.uuid IS 'Unique chart ID from YAML';


--
-- Name: COLUMN chart_definitions.yaml_config; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chart_definitions.yaml_config IS 'Original YAML content';


--
-- Name: COLUMN chart_definitions.chart_config; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chart_definitions.chart_config IS 'Parsed config including queryRunConfig';


--
-- Name: COLUMN chart_definitions.sql_hash; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chart_definitions.sql_hash IS 'MD5 hash of SQL query';


--
-- Name: query_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.query_results (
    sql_hash text NOT NULL,
    sql_query text NOT NULL,
    json_data jsonb DEFAULT '[]'::jsonb,
    last_run_at timestamp without time zone,
    last_run_status text,
    last_error text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.query_results OWNER TO postgres;

--
-- Name: TABLE query_results; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.query_results IS 'SQL queries and their results stored as JSON';


--
-- Name: COLUMN query_results.sql_hash; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.query_results.sql_hash IS 'MD5 hash of SQL query (PK)';


--
-- Name: COLUMN query_results.json_data; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.query_results.json_data IS 'Query results as JSONB array';


--
-- Name: trino_job_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trino_job_queue (
    id integer NOT NULL,
    sql_hash text NOT NULL,
    job_type text NOT NULL,
    status text DEFAULT 'pending'::text,
    priority integer DEFAULT 0,
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    retry_after timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    error_message text
);


ALTER TABLE public.trino_job_queue OWNER TO postgres;

--
-- Name: TABLE trino_job_queue; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.trino_job_queue IS 'Job queue for Trino query execution';


--
-- Name: COLUMN trino_job_queue.job_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trino_job_queue.job_type IS 'backfill (historical), incremental (gaps+new), full_refresh (replace all)';


--
-- Name: COLUMN trino_job_queue.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trino_job_queue.status IS 'pending, running, completed, failed, failed_permanent';


--
-- Name: COLUMN trino_job_queue.priority; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trino_job_queue.priority IS 'Higher = more important (backfill=10, scheduled=5)';


--
-- Name: chart_status; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.chart_status AS
 SELECT cd.uuid,
    (cd.chart_config ->> 'title'::text) AS title,
    cd.sql_hash,
    qr.last_run_at,
    qr.last_run_status,
    jsonb_array_length(qr.json_data) AS row_count,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM public.trino_job_queue j
              WHERE ((j.sql_hash = cd.sql_hash) AND (j.status = ANY (ARRAY['pending'::text, 'running'::text]))))) THEN 'job_queued'::text
            WHEN (qr.last_run_status = 'success'::text) THEN 'ready'::text
            WHEN (qr.last_run_status IS NULL) THEN 'no_data'::text
            ELSE 'error'::text
        END AS status
   FROM (public.chart_definitions cd
     JOIN public.query_results qr ON ((qr.sql_hash = cd.sql_hash)));


ALTER VIEW public.chart_status OWNER TO postgres;

--
-- Name: job_queue_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.job_queue_summary AS
 SELECT status,
    job_type,
    count(*) AS count,
    min(created_at) AS oldest,
    max(created_at) AS newest
   FROM public.trino_job_queue
  GROUP BY status, job_type
  ORDER BY status, job_type;


ALTER VIEW public.job_queue_summary OWNER TO postgres;

--
-- Name: trino_job_queue_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.trino_job_queue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trino_job_queue_id_seq OWNER TO postgres;

--
-- Name: trino_job_queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.trino_job_queue_id_seq OWNED BY public.trino_job_queue.id;


--
-- Name: trino_job_queue id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trino_job_queue ALTER COLUMN id SET DEFAULT nextval('public.trino_job_queue_id_seq'::regclass);


--
-- Name: chart_definitions chart_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_definitions
    ADD CONSTRAINT chart_definitions_pkey PRIMARY KEY (uuid);


--
-- Name: query_results query_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.query_results
    ADD CONSTRAINT query_results_pkey PRIMARY KEY (sql_hash);


--
-- Name: trino_job_queue trino_job_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trino_job_queue
    ADD CONSTRAINT trino_job_queue_pkey PRIMARY KEY (id);


--
-- Name: idx_chart_definitions_sql_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chart_definitions_sql_hash ON public.chart_definitions USING btree (sql_hash);


--
-- Name: idx_job_queue_pending; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_queue_pending ON public.trino_job_queue USING btree (status, priority DESC, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'running'::text]));


--
-- Name: chart_definitions trg_chart_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_chart_insert AFTER INSERT ON public.chart_definitions FOR EACH ROW EXECUTE FUNCTION public.on_chart_insert();


--
-- Name: chart_definitions trg_cleanup_orphaned; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_cleanup_orphaned AFTER DELETE ON public.chart_definitions FOR EACH ROW EXECUTE FUNCTION public.cleanup_orphaned_results();


--
-- Name: chart_definitions trg_sql_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sql_change AFTER UPDATE OF sql_hash ON public.chart_definitions FOR EACH ROW EXECUTE FUNCTION public.on_sql_change();


--
-- Name: trino_job_queue trino_job_queue_sql_hash_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trino_job_queue
    ADD CONSTRAINT trino_job_queue_sql_hash_fkey FOREIGN KEY (sql_hash) REFERENCES public.query_results(sql_hash) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO root;
GRANT USAGE ON SCHEMA public TO redash_reader;


--
-- Name: TABLE chart_definitions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.chart_definitions TO root;
GRANT SELECT ON TABLE public.chart_definitions TO redash_reader;


--
-- Name: TABLE query_results; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.query_results TO root;
GRANT SELECT ON TABLE public.query_results TO redash_reader;


--
-- Name: TABLE trino_job_queue; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.trino_job_queue TO root;
GRANT SELECT ON TABLE public.trino_job_queue TO redash_reader;


--
-- Name: TABLE chart_status; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.chart_status TO root;
GRANT SELECT ON TABLE public.chart_status TO redash_reader;


--
-- Name: TABLE job_queue_summary; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.job_queue_summary TO root;
GRANT SELECT ON TABLE public.job_queue_summary TO redash_reader;


--
-- Name: SEQUENCE trino_job_queue_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.trino_job_queue_id_seq TO root;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO redash_reader;


--
-- PostgreSQL database dump complete
--

\unrestrict s5d52idRCn4RZYkqE7TMo9AW9q3EpvBebLE8yGz1CLXrE2H4rOk711W1K6Urlf1

