-- Reconstructed from supabase_migrations.schema_migrations (applied directly
-- to production on 2026-09-08, never committed). Kept so repo == database.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS next_run_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_workflows_next_run_at ON public.workflows (next_run_at) WHERE trigger_type = 'schedule' AND enabled = true;
