-- 1) The scheduled-workflows job now reads its secret from Vault at run
--    time (the hardcoded value from migration 041 no longer works).
SELECT cron.unschedule('run-scheduled-workflows')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-scheduled-workflows');

SELECT cron.schedule(
  'run-scheduled-workflows',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://wmajotxkrbriudqrkuxr.supabase.co/functions/v1/run-scheduled-workflows',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'atlas_cron_secret' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 2) Keep-alive: a real REST API request every 6 hours so the project never
--    looks idle (free-tier projects are paused after a week of inactivity).
--    Uses the public anon key — the same one shipped in the web app — and
--    reads nothing (RLS returns no rows to anon). The GitHub Actions
--    workflow .github/workflows/supabase-keepalive.yml does the same from
--    outside, as a second, independent signal.
SELECT cron.unschedule('supabase-keepalive')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'supabase-keepalive');

SELECT cron.schedule(
  'supabase-keepalive',
  '17 */6 * * *',
  $$
  SELECT net.http_get(
    url := 'https://wmajotxkrbriudqrkuxr.supabase.co/rest/v1/organizations?select=id&limit=1',
    headers := jsonb_build_object(
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtYWpvdHhrcmJyaXVkcXJrdXhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxNzg5MjAsImV4cCI6MjEwMTc1NDkyMH0.uwmzl9Abpy_q0iuG2uMC-kjKYHYxxMrNPAgvuxGMUf4',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtYWpvdHhrcmJyaXVkcXJrdXhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxNzg5MjAsImV4cCI6MjEwMTc1NDkyMH0.uwmzl9Abpy_q0iuG2uMC-kjKYHYxxMrNPAgvuxGMUf4'
    )
  );
  $$
);
