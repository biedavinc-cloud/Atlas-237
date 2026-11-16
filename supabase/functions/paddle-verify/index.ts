import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getSecret } from "../_shared/secrets.ts";
import { claimReceipt, nextPeriod, releaseReceipt } from "../_shared/receipts.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Same pattern as flutterwave-verify/paystack-verify: the checkout overlay's
// client-side "checkout.completed" event is never trusted on its own. This
// independently re-checks the transaction with Paddle's own server-side API
// (secret API key, never exposed to the browser) before activating anything.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PLAN_PRICES_USD: Record<string, { monthly: number; annual: number }> = {
  starter: { monthly: 19, annual: 190 },
  growth: { monthly: 49, annual: 490 },
  pro: { monthly: 119, annual: 1190 },
  enterprise: { monthly: 219, annual: 2190 },
};

// Same defaults as src/lib/paddle.ts; a value set in /super-admin/keys wins.
const DEFAULT_PRICE_IDS: Record<string, string> = {
  PADDLE_PRICE_STARTER: "pri_01m1m7t4b0ssysw2tq8tw8fc0j",
  PADDLE_PRICE_GROWTH: "pri_01m1m7xjf76rjm1zws3xz9jcv3",
  PADDLE_PRICE_PRO: "pri_01m1m7z8mg4v3kvnctkjvr71yw",
  PADDLE_PRICE_ENTERPRISE: "pri_01m1m810d2pv6njj4dat4enr5d",
  PADDLE_PRICE_STARTER_ANNUAL: "pri_01m219ewv01df2azda6p2s21fg",
  PADDLE_PRICE_GROWTH_ANNUAL: "pri_01m219g8ejmh03bntqcfhx1rwf",
  PADDLE_PRICE_PRO_ANNUAL: "pri_01m219hdz50gsc3hbvc2s4y05h",
  PADDLE_PRICE_ENTERPRISE_ANNUAL: "pri_01m219jf6jvz5wmngpx06p8znd",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = (await getSecret("PADDLE_API_KEY"));
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, msg: "Paddle not configured (missing PADDLE_API_KEY)" }), {
        status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apiBase = (await getSecret("PADDLE_ENVIRONMENT")) === "sandbox"
      ? "https://sandbox-api.paddle.com"
      : "https://api.paddle.com";

    const authHeader = req.headers.get("Authorization") || "";
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, msg: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { org_id, plan, transaction_id, billing_cycle } = await req.json();
    if (!org_id || !plan || !transaction_id) {
      return new Response(JSON.stringify({ ok: false, msg: "Missing org_id, plan, or transaction_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const cycle = billing_cycle === "annual" ? "annual" : "monthly";
    const prices = PLAN_PRICES_USD[plan];
    if (!prices) {
      return new Response(JSON.stringify({ ok: false, msg: "Unknown plan" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const expectedUsd = prices[cycle];

    const { data: profile } = await authClient.from("profiles").select("org_id").eq("id", userData.user.id).maybeSingle();
    if (!profile || profile.org_id !== org_id) {
      return new Response(JSON.stringify({ ok: false, msg: "Not a member of this organization" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verifyRes = await fetch(`${apiBase}/transactions/${encodeURIComponent(transaction_id)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const verifyData = await verifyRes.json();
    const tx = verifyData?.data;

    if (!verifyRes.ok || !tx) {
      return new Response(JSON.stringify({ ok: false, msg: "Paddle could not confirm this transaction." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (tx.status !== "completed" && tx.status !== "paid") {
      return new Response(JSON.stringify({ ok: false, msg: `Transaction status is "${tx.status}", not completed.` }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (tx.custom_data?.org_id !== org_id) {
      return new Response(JSON.stringify({ ok: false, msg: "Organization mismatch." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Paddle localises the charge into the buyer's currency, so the proof
    // of price is the catalogue Price ID on the transaction (its amount is
    // set in Paddle, not by the browser). A plain USD total also passes.
    const priceKey = `PADDLE_PRICE_${String(plan).toUpperCase()}${cycle === "annual" ? "_ANNUAL" : ""}`;
    const expectedPriceId = (await getSecret(priceKey)) || DEFAULT_PRICE_IDS[priceKey];
    const hasExpectedPrice = Array.isArray(tx.items) && tx.items.some((it: { price?: { id?: string }; price_id?: string }) => (it.price?.id || it.price_id) === expectedPriceId);
    const paidUsd = Number(tx.details?.totals?.grand_total || 0) / 100;
    const paidCurrency = (tx.currency_code || "").toUpperCase();
    if (!hasExpectedPrice && (paidCurrency !== "USD" || paidUsd < expectedUsd)) {
      return new Response(JSON.stringify({ ok: false, msg: "Paid amount/currency does not match the plan price." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // A payment reference activates exactly one period (replay protection).
    const claim = await claimReceipt(adminClient, "paddle", String(transaction_id), org_id, plan, cycle);
    if (claim === "other") {
      return new Response(JSON.stringify({ ok: false, msg: "This payment was already used by another organization." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (claim === "same") {
      return new Response(JSON.stringify({ ok: true, already_applied: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { now, end: periodEnd } = await nextPeriod(adminClient, org_id, cycle);

    const { error: subError } = await adminClient.from("subscriptions").upsert({
      org_id,
      plan,
      status: "active",
      price_cents: expectedUsd * 100,
      currency: "USD",
      billing_cycle: cycle,
      payment_provider: "paddle",
      paddle_transaction_id: transaction_id,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    }, { onConflict: "org_id" });
    if (subError) {
      await releaseReceipt(adminClient, "paddle", String(transaction_id));
      return new Response(JSON.stringify({ ok: false, msg: subError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: orgError } = await adminClient.from("organizations").update({ plan }).eq("id", org_id);
    if (orgError) {
      return new Response(JSON.stringify({ ok: false, msg: orgError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, msg: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
