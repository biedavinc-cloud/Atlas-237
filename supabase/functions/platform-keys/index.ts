import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getSecrets } from "../_shared/secrets.ts";

/**
 * Super-admin only. Two actions, neither ever returns a secret value:
 *  - status: for every key, whether it is set in the dashboard (Vault) and
 *    whether an environment-variable fallback exists on the functions.
 *  - test:   calls the provider's own API with the configured credentials
 *    (the endpoint each provider's docs give for an authenticated read) and
 *    reports ok / invalid / not configured, plus the detected mode
 *    (test or live) so a test key in production is visible.
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

type Result = { ok: boolean; mode?: "test" | "live"; detail: string };

async function call(url: string, init: RequestInit = {}): Promise<{ status: number; body: any }> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(12_000) });
  const text = await res.text();
  let body: any = text;
  try { body = JSON.parse(text); } catch { /* keep text */ }
  return { status: res.status, body };
}

const TESTS: Record<string, { keys: string[]; run: (k: Record<string, string | undefined>) => Promise<Result> }> = {
  flutterwave: {
    keys: ["FLW_SECRET_KEY", "FLW_PUBLIC_KEY"],
    async run(k) {
      if (!k.FLW_SECRET_KEY) return { ok: false, detail: "Secret key missing" };
      const mode = k.FLW_SECRET_KEY.includes("_TEST") ? "test" : "live";
      if (k.FLW_PUBLIC_KEY && k.FLW_PUBLIC_KEY.includes("_TEST") !== (mode === "test")) return { ok: false, mode, detail: "Public and secret keys are from different modes (test vs live)" };
      const r = await call("https://api.flutterwave.com/v3/balances", { headers: { Authorization: `Bearer ${k.FLW_SECRET_KEY}` } });
      return r.status === 200 && r.body?.status === "success" ? { ok: true, mode, detail: "Secret key accepted" } : { ok: false, mode, detail: r.body?.message || `HTTP ${r.status}` };
    },
  },
  paystack: {
    keys: ["PAYSTACK_SECRET_KEY", "PAYSTACK_PUBLIC_KEY"],
    async run(k) {
      if (!k.PAYSTACK_SECRET_KEY) return { ok: false, detail: "Secret key missing" };
      const mode = k.PAYSTACK_SECRET_KEY.startsWith("sk_live_") ? "live" : "test";
      if (k.PAYSTACK_PUBLIC_KEY && k.PAYSTACK_PUBLIC_KEY.startsWith("pk_live_") !== (mode === "live")) return { ok: false, mode, detail: "Public and secret keys are from different modes (test vs live)" };
      const r = await call("https://api.paystack.co/balance", { headers: { Authorization: `Bearer ${k.PAYSTACK_SECRET_KEY}` } });
      return r.status === 200 && r.body?.status === true ? { ok: true, mode, detail: "Secret key accepted" } : { ok: false, mode, detail: r.body?.message || `HTTP ${r.status}` };
    },
  },
  paddle: {
    keys: ["PADDLE_API_KEY", "PADDLE_ENVIRONMENT", "PADDLE_CLIENT_TOKEN"],
    async run(k) {
      if (!k.PADDLE_API_KEY) return { ok: false, detail: "API key missing" };
      const sandboxKey = k.PADDLE_API_KEY.startsWith("pdl_sdbx_");
      const env = k.PADDLE_ENVIRONMENT || "production";
      const mode = sandboxKey ? "test" : "live";
      if (sandboxKey !== (env === "sandbox")) return { ok: false, mode, detail: `API key is ${sandboxKey ? "sandbox" : "live"} but environment is ${env}` };
      if (k.PADDLE_CLIENT_TOKEN && k.PADDLE_CLIENT_TOKEN.startsWith("test_") !== sandboxKey) return { ok: false, mode, detail: "Client-side token and API key are from different environments" };
      const base = sandboxKey ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";
      const r = await call(`${base}/event-types`, { headers: { Authorization: `Bearer ${k.PADDLE_API_KEY}` } });
      return r.status === 200 ? { ok: true, mode, detail: "API key accepted" } : { ok: false, mode, detail: r.body?.error?.detail || `HTTP ${r.status}` };
    },
  },
  payunit: {
    keys: ["PAYUNIT_API_USER", "PAYUNIT_API_PASSWORD", "PAYUNIT_API_KEY", "PAYUNIT_MODE"],
    async run(k) {
      if (!k.PAYUNIT_API_USER || !k.PAYUNIT_API_PASSWORD || !k.PAYUNIT_API_KEY) return { ok: false, detail: "API user, password and application key are all required" };
      const mode = (k.PAYUNIT_MODE || "test") === "live" ? "live" : "test";
      if (k.PAYUNIT_API_KEY.startsWith("sand_") && mode === "live") return { ok: false, mode, detail: "Sandbox application key with mode live" };
      if (k.PAYUNIT_API_KEY.startsWith("live_") && mode === "test") return { ok: false, mode, detail: "Live application key with mode test" };
      // Status lookup of a reference that cannot exist: bad credentials give 401/403.
      const r = await call("https://gateway.payunit.net/api/gateway/paymentstatus/atlas-credentials-check", {
        headers: { Authorization: `Basic ${btoa(`${k.PAYUNIT_API_USER}:${k.PAYUNIT_API_PASSWORD}`)}`, "x-api-key": k.PAYUNIT_API_KEY, mode, "Content-Type": "application/json" },
      });
      return r.status === 401 || r.status === 403 ? { ok: false, mode, detail: "Credentials rejected" } : { ok: true, mode, detail: `Credentials accepted (HTTP ${r.status} for a test reference)` };
    },
  },
  cinetpay: {
    keys: ["CINETPAY_API_KEY", "CINETPAY_SITE_ID"],
    async run(k) {
      if (!k.CINETPAY_API_KEY || !k.CINETPAY_SITE_ID) return { ok: false, detail: "API key and site ID are both required" };
      const r = await call("https://api-checkout.cinetpay.com/v2/payment/check", {
        method: "POST", headers: { "Content-Type": "application/json", "User-Agent": "Atlas-CRM" },
        body: JSON.stringify({ apikey: k.CINETPAY_API_KEY, site_id: k.CINETPAY_SITE_ID, transaction_id: "atlas-credentials-check" }),
      });
      const code = String(r.body?.code ?? "");
      // 609 = bad apikey, 613 = bad site_id (CinetPay error table); anything else means both were recognised.
      if (code === "609") return { ok: false, detail: "API key rejected" };
      if (code === "613") return { ok: false, detail: "Site ID rejected" };
      return { ok: true, detail: `Credentials recognised (${r.body?.message || code || r.status})` };
    },
  },
  korapay: {
    keys: ["KORAPAY_SECRET_KEY"],
    async run(k) {
      if (!k.KORAPAY_SECRET_KEY) return { ok: false, detail: "Secret key missing" };
      const mode = k.KORAPAY_SECRET_KEY.startsWith("sk_live_") ? "live" : "test";
      const base = Deno.env.get("KORAPAY_BASE_URL") || "https://api.korapay.com/merchant/api/v1";
      const r = await call(`${base}/balances`, { headers: { Authorization: `Bearer ${k.KORAPAY_SECRET_KEY}` } });
      return r.status === 200 && r.body?.status === true ? { ok: true, mode, detail: "Secret key accepted" } : { ok: false, mode, detail: r.body?.message || `HTTP ${r.status}` };
    },
  },
  resend: {
    keys: ["RESEND_API_KEY"],
    async run(k) {
      if (!k.RESEND_API_KEY) return { ok: false, detail: "API key missing" };
      const r = await call("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${k.RESEND_API_KEY}` } });
      if (r.status === 200) {
        const verified = (r.body?.data || []).filter((d: any) => d.status === "verified").map((d: any) => d.name);
        return { ok: true, detail: verified.length ? `Verified domains: ${verified.join(", ")}` : "Key accepted, but no verified sending domain yet" };
      }
      if (r.status === 401 && r.body?.name === "restricted_api_key") return { ok: true, detail: "Sending-only key accepted" };
      return { ok: false, detail: r.body?.message || `HTTP ${r.status}` };
    },
  },
  gemini: {
    keys: ["GEMINI_API_KEY"],
    async run(k) {
      if (!k.GEMINI_API_KEY) return { ok: false, detail: "API key missing" };
      const r = await call(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(k.GEMINI_API_KEY)}`);
      return r.status === 200 ? { ok: true, detail: "API key accepted" } : { ok: false, detail: r.body?.error?.message || `HTTP ${r.status}` };
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ ok: false, msg: "Not authenticated" }, 401);
    const { data: isAdmin } = await userClient.rpc("is_super_admin", { check_user_id: u.user.id });
    if (!isAdmin) return json({ ok: false, msg: "Not authorized" }, 403);

    const { action, provider, keys } = await req.json().catch(() => ({}));

    if (action === "status") {
      const list: string[] = Array.isArray(keys) ? keys.filter((x: unknown) => typeof x === "string" && /^[A-Z0-9_]{2,64}$/.test(x as string)) : [];
      const env: Record<string, boolean> = {};
      for (const key of list) env[key] = Boolean(Deno.env.get(key));
      return json({ ok: true, env });
    }

    if (action === "test") {
      const t = TESTS[String(provider)];
      if (!t) return json({ ok: false, msg: "Unknown provider" }, 400);
      const k = await getSecrets(t.keys, { fresh: true });
      const result = await t.run(k).catch((e) => ({ ok: false, detail: `Provider unreachable: ${e?.message || e}` }));
      return json({ ok: true, provider, result });
    }

    return json({ ok: false, msg: "Unknown action" }, 400);
  } catch (e) {
    return json({ ok: false, msg: String((e as Error)?.message || e) }, 500);
  }
});
