-- Makes Atlas API keys real.
--
-- Until now the API & Webhooks page generated a key in the browser, showed
-- it once and stored only a display prefix: nothing could ever check a key,
-- and no endpoint accepted one. The key's SHA-256 is now stored (never the
-- key itself) and the `public-api` edge function authenticates requests by
-- hashing the presented key and looking it up here with the service role.
-- Keys created before this migration have no hash and cannot be used: the
-- UI tells the user to create a new one.

ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS key_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash) WHERE key_hash IS NOT NULL;
