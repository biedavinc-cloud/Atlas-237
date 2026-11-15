import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Korapay and CinetPay subscription checkouts (redirect flow).
 *
 * Both keep every credential server-side (supabase/functions/billing-*), so
 * availability can only be learnt by asking the server. The browser never
 * computes the charged amount either: billing-initialize converts the USD
 * plan price (src/lib/plans.ts) into the provider's settlement currency
 * (XAF by default) at the live rate and records it before redirecting.
 */
export type RedirectProvider = 'korapay' | 'cinetpay';

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
let availability: Promise<Record<RedirectProvider, boolean>> | null = null;

/** One shared ping for both providers (cached for the page's lifetime). */
export function redirectProvidersAvailable(): Promise<Record<RedirectProvider, boolean>> {
  if (!isSupabaseConfigured) return Promise.resolve({ korapay: false, cinetpay: false });
  if (!availability) {
    availability = fetch(`${FN}/billing-initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // The anon key is a valid JWT for the gateway; no user session needed for this check.
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ check: true }),
    })
      .then((r) => r.json())
      .then((d) => ({ korapay: Boolean(d?.providers?.korapay), cinetpay: Boolean(d?.providers?.cinetpay) }))
      .catch(() => ({ korapay: false, cinetpay: false }));
  }
  return availability;
}

export async function startRedirectCheckout(params: {
  provider: RedirectProvider;
  plan: string;
  orgId: string;
  billingCycle?: 'monthly' | 'annual';
}): Promise<{ ok: boolean; checkoutUrl?: string; msg?: string }> {
  try {
    const { data } = await supabase.auth.getSession();
    const res = await fetch(`${FN}/billing-initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` },
      body: JSON.stringify({
        provider: params.provider,
        plan: params.plan,
        org_id: params.orgId,
        billing_cycle: params.billingCycle || 'monthly',
        return_url: `${window.location.origin}/app/billing`,
      }),
    });
    const result = await res.json();
    if (!result.ok || !result.checkout_url) return { ok: false, msg: result.msg || 'checkout_failed' };
    return { ok: true, checkoutUrl: result.checkout_url };
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : 'network_error' };
  }
}

/** Confirms a returning checkout with the provider (server-side). */
export async function verifyRedirectCheckout(reference: string): Promise<{ ok: boolean; status: 'succeeded' | 'pending' | 'failed'; msg?: string }> {
  try {
    const { data } = await supabase.auth.getSession();
    const res = await fetch(`${FN}/billing-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` },
      body: JSON.stringify({ reference }),
    });
    const result = await res.json();
    return { ok: Boolean(result.ok), status: result.status || 'failed', msg: result.msg };
  } catch (e) {
    return { ok: false, status: 'pending', msg: e instanceof Error ? e.message : 'network_error' };
  }
}
