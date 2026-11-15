-- The pg_cron → run-scheduled-workflows call used a secret hardcoded in a
-- public repository (migration 041). It now uses a random value stored in
-- Supabase Vault. The edge function reads it via get_cron_secret(), which
-- only the service role can execute.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'atlas_cron_secret') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'atlas_cron_secret', 'Auth for pg_cron -> run-scheduled-workflows');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_cron_secret()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'atlas_cron_secret' LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_cron_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_secret() TO service_role;
