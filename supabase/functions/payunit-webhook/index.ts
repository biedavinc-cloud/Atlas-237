import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { settlePayunit } from "../_shared/payunit.ts";

// PayUnit's servers call this directly (verify_jwt = false in config.toml).
// The body is only used to find the transaction id: the status is always
// re-queried from PayUnit's API, and the org/plan/cycle come from the
// intent recorded at checkout, never from the notification.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
// Always 200: this endpoint acknowledges receipt, it does not report our state.
const ack = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    let body: { transaction_id?: string; data?: { transaction_id?: string } } = {};
    const raw = await req.text();
    try { body = JSON.parse(raw); } catch {
      const form = new URLSearchParams(raw);
      body = { transaction_id: form.get("transaction_id") || undefined };
    }
    const transactionId = body.transaction_id || body.data?.transaction_id;
    if (!transactionId) return ack({ ok: false, msg: "No transaction_id in notification" });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: intent } = await admin.from("billing_payment_intents")
      .select("id, org_id, plan, billing_cycle, price_usd, status, reference")
      .eq("provider", "payunit").eq("reference", transactionId).maybeSingle();
    if (!intent) return ack({ ok: false, msg: "Unknown transaction" });

    return ack(await settlePayunit(admin, intent));
  } catch (e) {
    return ack({ ok: false, msg: e instanceof Error ? e.message : String(e) });
  }
});
