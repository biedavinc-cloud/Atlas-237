import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { settlePayunit } from "../_shared/payunit.ts";

// Called by the Billing page when the customer returns from PayUnit:
// { transaction_id } → { ok, status }. The intent is read with the
// caller's own session (RLS: only their org's intents), the status comes
// from PayUnit's API, and a payment activates exactly one period.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const { data: userData, error: userErr } = await supabaseClient.auth.getUser();
    if (userErr || !userData.user) return json({ ok: false, msg: "Not authenticated" }, 401);

    const { transaction_id } = await req.json().catch(() => ({}));
    if (!transaction_id) return json({ ok: false, msg: "Missing transaction_id" }, 400);

    const { data: intent } = await supabaseClient.from("billing_payment_intents")
      .select("id, org_id, plan, billing_cycle, price_usd, status, reference")
      .eq("provider", "payunit").eq("reference", transaction_id).maybeSingle();
    if (!intent) return json({ ok: false, msg: "No pending transaction found for this id." }, 404);

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const result = await settlePayunit(admin, intent);
    return json(result, result.ok ? 200 : 502);
  } catch (e) {
    return json({ ok: false, msg: e instanceof Error ? e.message : String(e) }, 500);
  }
});
