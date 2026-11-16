import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getSecret } from "../_shared/secrets.ts";
import { corsHeaders, json, adminClient, settleIntent, type Intent } from "../_shared/billing.ts";

// Server-to-server notifications from Korapay and CinetPay, plus CinetPay's
// customer return (which arrives as a POST). verify_jwt is disabled for this
// function in supabase/config.toml: providers can't send a Supabase JWT.
//
// The body is never trusted: it only tells us WHICH reference to look at.
// settleIntent() re-queries the provider with our own secrets and checks the
// amount against the intent recorded before the checkout started.
//
//   ?provider=korapay                 Korapay webhook (charge.success)
//   ?provider=cinetpay                CinetPay notify_url (cpm_trans_id)
//   ?provider=cinetpay&return=1&ref=  CinetPay customer return → 303 to Atlas

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const type = req.headers.get("content-type") || "";
  const text = await req.text();
  if (!text) return {};
  if (type.includes("application/json")) {
    try { return JSON.parse(text); } catch { return {}; }
  }
  return Object.fromEntries(new URLSearchParams(text));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const url = new URL(req.url);
  const provider = url.searchParams.get("provider");
  const admin = adminClient();

  try {
    // CinetPay customer return.
    if (provider === "cinetpay" && url.searchParams.get("return") === "1") {
      const ref = url.searchParams.get("ref") || "";
      const { data: intent } = await admin.from("billing_payment_intents").select("*").eq("reference", ref).maybeSingle();
      const fallback = "https://atlas.liafrik.com/app/billing";
      const dest = new URL(intent?.return_url || fallback);
      dest.searchParams.set("billing_provider", "cinetpay");
      dest.searchParams.set("billing_ref", ref);
      return new Response(null, { status: 303, headers: { Location: dest.toString() } });
    }

    // CinetPay checks that notify_url is reachable with a GET.
    if (req.method === "GET") return json({ ok: true });

    const raw = await req.clone().text();
    const body = await readBody(req);
    let reference = "";

    if (provider === "korapay") {
      const secret = (await getSecret("KORAPAY_SECRET_KEY")) || "";
      const signature = req.headers.get("x-korapay-signature") || "";
      const parsed = (() => { try { return JSON.parse(raw); } catch { return null; } })();
      // Korapay signs JSON.stringify(data) with the secret key. An invalid
      // signature is rejected; a valid one still only names the reference.
      if (!parsed?.data || !signature || (await hmacHex(secret, JSON.stringify(parsed.data))) !== signature) {
        return json({ ok: false, msg: "Invalid signature" }, 401);
      }
      reference = String(parsed.data.reference || "");
    } else if (provider === "cinetpay") {
      reference = String(body.cpm_trans_id || body.transaction_id || "");
    } else {
      return json({ ok: false, msg: "Unknown provider" }, 400);
    }

    if (!reference) return json({ ok: false, msg: "Missing reference" }, 400);
    const { data: intent } = await admin.from("billing_payment_intents").select("*").eq("reference", reference).maybeSingle();
    // Unknown references are acknowledged (200) so the provider stops retrying.
    if (!intent || intent.provider !== provider) return json({ ok: true, ignored: true });

    const result = await settleIntent(admin, intent as Intent);
    return json(result);
  } catch (e) {
    return json({ ok: false, msg: e instanceof Error ? e.message : String(e) }, 500);
  }
});
