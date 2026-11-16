// Platform keys: the super-admin dashboard (Vault, via platform_secrets)
// wins; the function's environment variable is the fallback, so a key set
// the old way keeps working. Values are cached for 60 s per instance so a
// key changed in the dashboard is picked up within a minute.
import { createClient } from "jsr:@supabase/supabase-js@2";

const TTL_MS = 60_000;
const cache = new Map<string, { v: string | null; at: number }>();

export async function getSecrets<K extends string>(names: K[], opts: { fresh?: boolean } = {}): Promise<Record<K, string | undefined>> {
  const now = Date.now();
  const missing = names.filter((n) => { const c = cache.get(n); return opts.fresh || !c || now - c.at > TTL_MS; });
  if (missing.length) {
    let found: Record<string, string> = {};
    try {
      const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
      const { data, error } = await admin.rpc("platform_secrets", { p_keys: missing });
      if (!error && data && typeof data === "object") found = data as Record<string, string>;
    } catch { /* database unreachable: fall back to env below */ }
    for (const n of missing) cache.set(n, { v: found[n] ?? null, at: now });
  }
  const out = {} as Record<K, string | undefined>;
  for (const n of names) out[n] = cache.get(n)?.v || Deno.env.get(n) || undefined;
  return out;
}

export async function getSecret(name: string): Promise<string | undefined> {
  return (await getSecrets([name]))[name];
}
