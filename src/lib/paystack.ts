import { supabase } from '@/lib/supabase';

/**
 * Paystack Inline (like Flutterwave's checkout) uses a PUBLIC key that is
 * safe to expose to the browser — it can only open a checkout popup, not
 * charge or read anything on its own. The actual charge confirmation
 * happens in paystack-verify (server-side, secret key, never exposed).
 */
export const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined;

export function isPaystackConfigured() {
  return Boolean(PAYSTACK_PUBLIC_KEY);
}

const PLAN_PRICES_USD: Record<string, { monthly: number; annual: number }> = {
  starter: { monthly: 19, annual: 190 },
  growth: { monthly: 49, annual: 490 },
  pro: { monthly: 119, annual: 1190 },
  enterprise: { monthly: 219, annual: 2190 },
};

interface PaystackHandler {
  openIframe: () => void;
}
interface PaystackPopSetupOptions {
  key: string;
  email: string;
  amount: number;
  currency: string;
  ref: string;
  metadata: Record<string, unknown>;
  callback: (response: { reference: string }) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    PaystackPop?: { setup: (options: PaystackPopSetupOptions) => PaystackHandler };
  }
}

export function initiatePaystackCheckout(params: {
  plan: string;
  email: string;
  orgId: string;
  billingCycle?: 'monthly' | 'annual';
  onSuccess: (reference: string) => void;
  onClose: () => void;
}) {
  const { plan, email, orgId, billingCycle = 'monthly', onSuccess, onClose } = params;
  const prices = PLAN_PRICES_USD[plan];
  if (!prices || !PAYSTACK_PUBLIC_KEY) return;
  const usd = prices[billingCycle];

  const ref = `atlas_${orgId}_${plan}_${Date.now()}`;
  const existing = document.getElementById('paystack-script');
  const loadScript = () => new Promise<void>((resolve) => {
    if (window.PaystackPop) return resolve();
    if (existing) { existing.addEventListener('load', () => resolve()); return; }
    const script = document.createElement('script');
    script.id = 'paystack-script';
    script.src = 'https://js.paystack.co/v2/inline.js';
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });

  loadScript().then(() => {
    const handler = window.PaystackPop?.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email,
      amount: usd * 100, // Paystack expects the smallest currency unit
      currency: 'USD',
      ref,
      metadata: { org_id: orgId, plan, billing_cycle: billingCycle },
      callback: (response) => onSuccess(response.reference),
      onClose: () => onClose(),
    });
    handler?.openIframe();
  });
}

/**
 * Confirm a Paystack payment and activate the subscription — verifies
 * server-side with Paystack's own API before writing anything, same
 * pattern as Flutterwave and PayUnit.
 */
export async function confirmPaystackPayment(params: { orgId: string; plan: string; reference: string; billingCycle?: 'monthly' | 'annual' }): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session?.access_token}`,
      },
      body: JSON.stringify({ org_id: params.orgId, plan: params.plan, reference: params.reference, billing_cycle: params.billingCycle || 'monthly' }),
    });
    const result = await res.json();
    return result.ok ? { success: true } : { success: false, error: result.msg || 'Verification failed' };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
