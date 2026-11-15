-- NOTE: the secret below was retired by migrations 044/045 (now in Vault).
-- Real pg_cron job that calls run-scheduled-workflows every 5 minutes,
-- making the "schedule" trigger_type on a Workflow genuinely automated
-- instead of a stored-but-never-executed value. Uses a dedicated shared
-- secret (see run-scheduled-workflows/index.ts CRON_SECRET) rather than
-- the real service role key, since that value can't be read or set as a
-- project secret through the tools available when this was built.
SELECT cron.schedule(
  'run-scheduled-workflows',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://wmajotxkrbriudqrkuxr.supabase.co/functions/v1/run-scheduled-workflows',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer da73caf38062ff5e07e232f3e5396ad73708ca4b592962e24d1ce07257bc6ec3'
    ),
    body := '{}'::jsonb
  );
  $$
);
