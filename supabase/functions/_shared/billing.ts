// Shared subscription-billing helpers for the Korapay / CinetPay flows
// (billing-initialize, billing-verify, billing-webhook).
//
// Trust model, same as every other PSP in Atlas: nothing the browser or a
// webhook body says is trusted. A checkout's expected plan/price is written
// to billing_payment_intents before redirecting; activation only happens
// after re-querying the provider's own API with server-side secrets and
// comparing the real paid amount/currency against that row.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-korapay-signature, x-token",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Must match src/lib/plans.ts PLAN_PRICES (see AGENTS.md "Billing").
export const PLAN_PRICES_USD: Record<string, { monthly: number; annual: number }> = {
  starter: { monthly: 19, annual: 190 },
  growth: { monthly: 49, annual: 490 },
  pro: { monthly: 119, annual: 1190 },
  enterprise: { monthly: 219, annual: 2190 },
};

export type BillingProvider = "korapay" | "cinetpay";
export type BillingCycle = "monthly" | "annual";

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
}

export function userClient(authHeader: string): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
  });
}

/** Which providers have their server-side secrets set. */
export function configuredProviders(): Record<BillingProvider, boolean> {
  return {
    korapay: Boolean(Deno.env.get("KORAPAY_SECRET_KEY")),
    cinetpay: Boolean(Deno.env.get("CINETPAY_API_KEY") && Deno.env.get("CINETPAY_SITE_ID")),
  };
}

/** Settlement currency per provider (overridable with a secret). */
export function chargeCurrency(provider: BillingProvider): string {
  const env = provider === "korapay" ? Deno.env.get("KORAPAY_CURRENCY") : Deno.env.get("CINETPAY_CURRENCY");
  return (env || "XAF").toUpperCase();
}

const ZERO_DECIMAL = new Set(["XAF", "XOF", "GNF", "UGX", "RWF"]);

/**
 * Converts the USD plan price into the provider's settlement currency at the
 * live rate. If the rate can't be fetched we refuse to start the checkout
 * rather than guess a price.
 */
export async function convertUsd(usd: number, currency: string): Promise<number> {
  if (currency === "USD") return usd;
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  const data = await res.json().catch(() => null);
  const rate = data?.rates?.[currency];
  if (typeof rate !== "number" || rate <= 0) throw new Error(`Exchange rate USD→${currency} unavailable, try again in a moment.`);
  let amount = usd * rate;
  if (ZERO_DECIMAL.has(currency)) {
    amount = Math.ceil(amount);
    // CinetPay requires XOF/XAF amounts to be multiples of 5.
    if (currency === "XAF" || currency === "XOF") amount = Math.ceil(amount / 5) * 5;
  } else {
    amount = Math.ceil(amount * 100) / 100;
  }
  return amount;
}

/** Atlas origins a checkout may return to (prevents open redirects). */
export function isAllowedReturnUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const extra = (Deno.env.get("APP_ORIGINS") || "").split(",").map((s) => s.trim()).filter(Boolean);
    const allowed = new Set([
      "https://atlas.liafrik.com",
      "https://atlas-237.pages.dev",
      "http://localhost:3000",
      "http://localhost:5173",
      ...extra,
    ]);
    return allowed.has(u.origin) || u.hostname.endsWith(".atlas-237.pages.dev");
  } catch {
    return false;
  }
}

export interface ProviderStatus {
  paid: boolean;
  failed: boolean;
  amount: number;
  currency: string;
  raw: string;
}

/** Asks Korapay for the real status of a charge. */
export async function korapayStatus(reference: string): Promise<ProviderStatus> {
  const base = Deno.env.get("KORAPAY_BASE_URL") || "https://api.korapay.com/merchant/api/v1";
  const res = await fetch(`${base}/charges/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${Deno.env.get("KORAPAY_SECRET_KEY")}` },
  });
  const body = await res.json().catch(() => null);
  const d = body?.data || {};
  const status = String(d.status || "").toLowerCase();
  return {
    paid: res.ok && body?.status === true && status === "success",
    failed: ["failed", "expired", "cancelled"].includes(status),
    amount: Number(d.amount ?? d.amount_paid ?? 0),
    currency: String(d.currency || "").toUpperCase(),
    raw: status || `http_${res.status}`,
  };
}

/** Asks CinetPay for the real status of a transaction. */
export async function cinetpayStatus(transactionId: string): Promise<ProviderStatus> {
  const res = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: Deno.env.get("CINETPAY_API_KEY"),
      site_id: Deno.env.get("CINETPAY_SITE_ID"),
      transaction_id: transactionId,
    }),
  });
  const body = await res.json().catch(() => null);
  const d = body?.data || {};
  const status = String(d.status || body?.message || "").toUpperCase();
  return {
    paid: String(body?.code) === "00" && status === "ACCEPTED",
    failed: ["REFUSED", "CANCELED", "CANCELLED"].includes(status),
    amount: Number(d.amount ?? 0),
    currency: String(d.currency || "").toUpperCase(),
    raw: status || `http_${res.status}`,
  };
}

export interface Intent {
  id: string;
  org_id: string;
  provider: BillingProvider;
  reference: string;
  plan: string;
  billing_cycle: BillingCycle;
  price_usd: number;
  charge_amount: number;
  charge_currency: string;
  status: "pending" | "succeeded" | "failed";
  return_url: string | null;
}

/**
 * Re-checks an intent with its provider and, if genuinely paid for the
 * expected amount, activates the subscription. Idempotent: the intent is
 * flipped pending→succeeded with a conditional update, so a webhook and a
 * browser return arriving together extend the subscription only once.
 */
export async function settleIntent(admin: SupabaseClient, intent: Intent): Promise<{ ok: boolean; status: string; msg?: string }> {
  if (intent.status === "succeeded") return { ok: true, status: "succeeded" };

  const st = intent.provider === "korapay" ? await korapayStatus(intent.reference) : await cinetpayStatus(intent.reference);

  if (!st.paid) {
    if (st.failed) {
      await admin.from("billing_payment_intents")
        .update({ status: "failed", provider_status: st.raw, updated_at: new Date().toISOString() })
        .eq("id", intent.id).eq("status", "pending");
      return { ok: false, status: "failed", msg: `Payment ${st.raw.toLowerCase()}.` };
    }
    await admin.from("billing_payment_intents").update({ provider_status: st.raw, updated_at: new Date().toISOString() }).eq("id", intent.id);
    return { ok: false, status: "pending", msg: "Payment not completed yet." };
  }

  if (st.currency !== intent.charge_currency.toUpperCase() || st.amount + 0.001 < Number(intent.charge_amount)) {
    await admin.from("billing_payment_intents")
      .update({ status: "failed", provider_status: `amount_mismatch:${st.amount}${st.currency}`, updated_at: new Date().toISOString() })
      .eq("id", intent.id).eq("status", "pending");
    return { ok: false, status: "failed", msg: "Paid amount/currency does not match the plan price." };
  }

  const { data: claimed } = await admin.from("billing_payment_intents")
    .update({ status: "succeeded", provider_status: st.raw, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", intent.id).eq("status", "pending")
    .select("id");
  if (!claimed || claimed.length === 0) return { ok: true, status: "succeeded" }; // settled concurrently

  // Renewing early extends from the end of the current paid period.
  const now = new Date();
  const { data: existing } = await admin.from("subscriptions")
    .select("status, current_period_end").eq("org_id", intent.org_id).maybeSingle();
  const currentEnd = existing?.status === "active" && existing.current_period_end ? new Date(existing.current_period_end) : null;
  const start = currentEnd && currentEnd > now ? currentEnd : now;
  const periodEnd = new Date(start);
  if (intent.billing_cycle === "annual") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { error: subErr } = await admin.from("subscriptions").upsert({
    org_id: intent.org_id,
    plan: intent.plan,
    status: "active",
    price_cents: Math.round(Number(intent.price_usd) * 100),
    currency: "USD",
    billing_cycle: intent.billing_cycle,
    payment_provider: intent.provider,
    ...(intent.provider === "korapay" ? { korapay_reference: intent.reference } : { cinetpay_transaction_id: intent.reference }),
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
  }, { onConflict: "org_id" });
  if (subErr) {
    // Put the intent back so a retry (webhook or return) can settle it.
    await admin.from("billing_payment_intents").update({ status: "pending", provider_status: `activation_error:${subErr.message}` }).eq("id", intent.id);
    return { ok: false, status: "pending", msg: subErr.message };
  }
  await admin.from("organizations").update({ plan: intent.plan }).eq("id", intent.org_id);
  return { ok: true, status: "succeeded" };
}
