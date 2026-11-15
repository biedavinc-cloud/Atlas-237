import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json, adminClient, userClient, settleIntent, type Intent } from "../_shared/billing.ts";

// Called by the Billing page when the customer comes back from a Korapay or
// CinetPay checkout: { reference } → { ok, status: succeeded|pending|failed }.
// Re-queries the provider; the browser's word is never enough.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const sb = userClient(req.headers.get("Authorization") || "");
    const { data: userData, error } = await sb.auth.getUser();
    if (error || !userData?.user) return json({ ok: false, msg: "Not authenticated" }, 401);

    const { reference } = await req.json().catch(() => ({}));
    if (!reference) return json({ ok: false, msg: "Missing reference" }, 400);

    // RLS: a member can only read their own org's intents.
    const { data: intent } = await sb.from("billing_payment_intents").select("*").eq("reference", reference).maybeSingle();
    if (!intent) return json({ ok: false, msg: "Unknown payment reference" }, 404);

    const result = await settleIntent(adminClient(), intent as Intent);
    return json({ ...result, plan: intent.plan, billing_cycle: intent.billing_cycle });
  } catch (e) {
    return json({ ok: false, msg: e instanceof Error ? e.message : String(e) }, 500);
  }
});
