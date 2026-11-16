import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getSecret } from "../_shared/secrets.ts";
import { claimReceipt, nextPeriod, releaseReceipt } from "../_shared/receipts.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Why this exists: the checkout flow used to trust whatever tx_ref /
// transaction_id the browser's Flutterwave popup callback reported, and
// wrote directly to subscriptions/organizations from the client using the
// user's own session. That meant calling recordSubscription() (or even
// the underlying table writes) with fabricated values — with no real
// payment ever made — would still activate a paid plan for free. This
// function is the real fix: it re-verifies the transaction with
// Flutterwave's own server-side API using the secret key (which never
// reaches the browser), confirms the amount/currency/status actually
// match what's being claimed, and only then activates the plan — using
// the Supabase service role, since regular authenticated users no longer
// have write access to these tables/columns at all (see migration 025).

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const secretKey = (await getSecret("FLW_SECRET_KEY"));
    if (!secretKey) {
      return new Response(JSON.stringify({ ok: false, msg: "Flutterwave not configured (missing FLW_SECRET_KEY)" }), {
        status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate the caller (must be a real logged-in user) — this
    // client is only used to confirm identity, never for the actual writes.
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

    const { org_id, plan, tx_ref, transaction_id, billing_cycle } = await req.json();
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

    // Confirm membership: the caller must actually belong to the org
    // they're trying to activate a plan for.
    const { data: profile } = await authClient.from("profiles").select("org_id").eq("id", userData.user.id).maybeSingle();
    if (!profile || profile.org_id !== org_id) {
      return new Response(JSON.stringify({ ok: false, msg: "Not a member of this organization" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The real verification: ask Flutterwave directly whether this
    // transaction actually happened and matches what's being claimed.
    const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const verifyData = await verifyRes.json();
    const tx = verifyData?.data;

    if (!verifyRes.ok || !tx || verifyData.status !== "success") {
      return new Response(JSON.stringify({ ok: false, msg: "Flutterwave could not confirm this transaction." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (tx.status !== "successful") {
      return new Response(JSON.stringify({ ok: false, msg: `Transaction status is "${tx.status}", not successful.` }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // The checkout builds tx_ref as atlas_<first 8 chars of org id>_<time>.
    if (!String(tx.tx_ref || "").startsWith(`atlas_${String(org_id).slice(0, 8)}_`)) {
      return new Response(JSON.stringify({ ok: false, msg: "This transaction was not opened for this organization." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (tx_ref && tx.tx_ref !== tx_ref) {
      return new Response(JSON.stringify({ ok: false, msg: "Transaction reference mismatch." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Flutterwave settles in whatever currency was charged — the
    // checkout was set up to charge in USD, so require that here too
    // rather than trusting a client-supplied currency.
    if ((tx.currency || "").toUpperCase() !== "USD" || Number(tx.amount) < expectedUsd) {
      return new Response(JSON.stringify({ ok: false, msg: "Paid amount/currency does not match the plan price." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verified — now actually activate the plan, using the service role
    // (bypasses RLS; this is the only code path allowed to do so).
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // A payment reference activates exactly one period (replay protection).
    const claim = await claimReceipt(adminClient, "flutterwave", String(transaction_id), org_id, plan, cycle);
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
      payment_provider: "flutterwave",
      flutterwave_tx_ref: tx.tx_ref,
      flutterwave_payment_id: String(transaction_id),
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    }, { onConflict: "org_id" });
    if (subError) {
      await releaseReceipt(adminClient, "flutterwave", String(transaction_id));
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
