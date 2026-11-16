import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { IS_DEMO } from '@/lib/demo/mode';

/**
 * Browser-safe platform keys (public keys, client tokens, price IDs, OAuth
 * client IDs) set by a super admin in /super-admin/keys. Loaded once per
 * page load; the build-time VITE_* value stays the fallback, so nothing
 * that is configured the old way stops working. Secret keys are never
 * exposed here: get_public_platform_config() only returns scope "public".
 */
let cache: Record<string, string> = {};
let pending: Promise<Record<string, string>> | null = null;

export function loadPublicConfig(): Promise<Record<string, string>> {
  if (pending) return pending;
  pending = (async () => {
    if (IS_DEMO || !isSupabaseConfigured) return cache;
    try {
      const { data, error } = await supabase.rpc('get_public_platform_config');
      if (!error && data && typeof data === 'object') cache = data as Record<string, string>;
    } catch { /* offline: keep the build-time values */ }
    return cache;
  })();
  return pending;
}

/** Synchronous read after loadPublicConfig() resolved; falls back to the build-time value. */
export function publicKey(name: string, fallback?: string): string | undefined {
  return cache[name] || fallback || undefined;
}

/** Forget the cached values (after a super admin saves a key on this device). */
export function resetPublicConfig() {
  pending = null;
}
