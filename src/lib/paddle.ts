import { supabase } from '@/lib/supabase';
import { publicKey } from '@/lib/platformConfig';

/**
 * Paddle Billing checkout. The "client-side token" (pt_...) is safe to
 * expose to the browser — like a public key, it can only open a checkout,
 * not read or charge anything on its own. The actual charge confirmation
 * happens in paddle-verify (server-side, secret API key, never exposed).
 *
 * Unlike Flutterwave/Paystack (which accept a raw amount), Paddle Billing
 * checkouts are built around Price objects you create once in the Paddle
 * dashboard — one per plan. Those Price IDs are configured via env vars
 * below; until all four are set, isPaddleConfigured() returns false and
 * Paddle simply doesn't appear as a payment option, same as any other PSP
 * in this registry when it isn't configured.
 */
const PADDLE_CLIENT_TOKEN_BUILD = (import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string | undefined) || 'live_9743c25ef8324a998b966c0bc8d';
const PADDLE_ENVIRONMENT_BUILD = (import.meta.env.VITE_PADDLE_ENVIRONMENT as string | undefined) || 'production';
const paddleClientToken = () => publicKey('PADDLE_CLIENT_TOKEN', PADDLE_CLIENT_TOKEN_BUILD);
const paddleEnvironment = () => publicKey('PADDLE_ENVIRONMENT', PADDLE_ENVIRONMENT_BUILD);

const PADDLE_PRICE_IDS_BUILD: Record<string, string | undefined> = {
  starter: (import.meta.env.VITE_PADDLE_PRICE_STARTER as string | undefined) || 'pri_01m1m7t4b0ssysw2tq8tw8fc0j',
  growth: (import.meta.env.VITE_PADDLE_PRICE_GROWTH as string | undefined) || 'pri_01m1m7xjf76rjm1zws3xz9jcv3',
  pro: (import.meta.env.VITE_PADDLE_PRICE_PRO as string | undefined) || 'pri_01m1m7z8mg4v3kvnctkjvr71yw',
  enterprise: (import.meta.env.VITE_PADDLE_PRICE_ENTERPRISE as string | undefined) || 'pri_01m1m810d2pv6njj4dat4enr5d',
};

/**
 * Annual Price IDs — NOT set yet. Paddle Billing checkouts reference
 * pre-created Price objects (not a raw amount), so a real annual option
 * needs 4 more prices created in the Paddle dashboard (Catalog → Prices,
 * one per plan, billed yearly) before this can go live. Until then,
 * isPaddleAnnualConfigured() returns false and the annual toggle simply
 * doesn't offer Paddle as an option — same "never claim available
 * without real config" rule as everywhere else in this PSP registry.
 */
const PADDLE_PRICE_IDS_ANNUAL_BUILD: Record<string, string | undefined> = {
  starter: (import.meta.env.VITE_PADDLE_PRICE_STARTER_ANNUAL as string | undefined) || 'pri_01m219ewv01df2azda6p2s21fg',
  growth: (import.meta.env.VITE_PADDLE_PRICE_GROWTH_ANNUAL as string | undefined) || 'pri_01m219g8ejmh03bntqcfhx1rwf',
  pro: (import.meta.env.VITE_PADDLE_PRICE_PRO_ANNUAL as string | undefined) || 'pri_01m219hdz50gsc3hbvc2s4y05h',
  enterprise: (import.meta.env.VITE_PADDLE_PRICE_ENTERPRISE_ANNUAL as string | undefined) || 'pri_01m219jf6jvz5wmngpx06p8znd',
};


/** Price ID for a plan: dashboard value (/super-admin/keys) first, then the build-time one. */
function priceId(plan: string, cycle: 'monthly' | 'annual'): string | undefined {
  const name = `PADDLE_PRICE_${plan.toUpperCase()}${cycle === 'annual' ? '_ANNUAL' : ''}`;
  return publicKey(name, (cycle === 'annual' ? PADDLE_PRICE_IDS_ANNUAL_BUILD : PADDLE_PRICE_IDS_BUILD)[plan]);
}
const PLANS = ['starter', 'growth', 'pro', 'enterprise'];

/** Values baked into this build (Cloudflare VITE_* or code defaults), shown in /super-admin/keys. */
export function paddleBuildValues(): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = { PADDLE_CLIENT_TOKEN: PADDLE_CLIENT_TOKEN_BUILD, PADDLE_ENVIRONMENT: PADDLE_ENVIRONMENT_BUILD };
  for (const p of PLANS) {
    out[`PADDLE_PRICE_${p.toUpperCase()}`] = PADDLE_PRICE_IDS_BUILD[p];
    out[`PADDLE_PRICE_${p.toUpperCase()}_ANNUAL`] = PADDLE_PRICE_IDS_ANNUAL_BUILD[p];
  }
  return out;
}

export function isPaddleAnnualConfigured() {
  return PLANS.every((p) => Boolean(priceId(p, 'annual')));
}

export function isPaddleConfigured() {
  return Boolean(paddleClientToken()) && PLANS.every((p) => Boolean(priceId(p, 'monthly')));
}

interface PaddleCheckoutEvent {
  name: string;
  data?: { transaction_id?: string; id?: string };
}

declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: string) => void };
      Initialize: (opts: { token: string; eventCallback?: (event: PaddleCheckoutEvent) => void }) => void;
      Checkout: { open: (opts: { items: { priceId: string; quantity: number }[]; customData?: Record<string, unknown>; customer?: { email: string }; settings?: { successUrl?: string; displayMode?: string } }) => void };
    };
  }
}

let paddleInitialized = false;

function loadPaddleScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.Paddle) return resolve();
    const existing = document.getElementById('paddle-script');
    if (existing) { existing.addEventListener('load', () => resolve()); return; }
    const script = document.createElement('script');
    script.id = 'paddle-script';
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

export function initiatePaddleCheckout(params: {
  plan: string;
  email: string;
  orgId: string;
  billingCycle?: 'monthly' | 'annual';
  onSuccess: (transactionId: string) => void;
  onClose: () => void;
}) {
  const { plan, email, orgId, billingCycle = 'monthly', onSuccess, onClose } = params;
  const price = priceId(plan, billingCycle === 'annual' ? 'annual' : 'monthly');
  const token = paddleClientToken();
  if (!price || !token) return;

  loadPaddleScript().then(() => {
    if (!window.Paddle) return;
    if (!paddleInitialized) {
      if (paddleEnvironment() === 'sandbox') window.Paddle.Environment.set('sandbox');
      window.Paddle.Initialize({
        token,
        eventCallback: (event) => {
          if (event.name === 'checkout.completed') {
            const txId = event.data?.transaction_id || event.data?.id;
            if (txId) onSuccess(txId);
          } else if (event.name === 'checkout.closed') {
            onClose();
          }
        },
      });
      paddleInitialized = true;
    }
    window.Paddle.Checkout.open({
      items: [{ priceId: price, quantity: 1 }],
      customData: { org_id: orgId, plan, billing_cycle: billingCycle },
      customer: { email },
      // Paddle's account-wide "Default payment link" setting can't work
      // when one Paddle account serves multiple products (this account
      // runs several SaaS products) — each needs its own return URL, so
      // it must be set per-checkout-call, not relied on as a dashboard
      // default. This is what actually fixes
      // "transaction_default_checkout_url_not_set": that error means
      // Paddle had no URL to use at all for this specific transaction,
      // not that the dashboard default itself was wrong or missing.
      settings: {
        successUrl: `${window.location.origin}/app/billing?paddle_status=success`,
        displayMode: 'overlay',
      },
    });
  });
}

/**
 * Confirm a Paddle transaction and activate the subscription — verifies
 * server-side with Paddle's own API before writing anything, same pattern
 * as Flutterwave/Paystack/PayUnit.
 */
export async function confirmPaddlePayment(params: { orgId: string; plan: string; transactionId: string; billingCycle?: 'monthly' | 'annual' }): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paddle-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session?.access_token}`,
      },
      body: JSON.stringify({ org_id: params.orgId, plan: params.plan, transaction_id: params.transactionId, billing_cycle: params.billingCycle || 'monthly' }),
    });
    const result = await res.json();
    return result.ok ? { success: true } : { success: false, error: result.msg || 'Verification failed' };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
