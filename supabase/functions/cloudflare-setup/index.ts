import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getSecrets } from "../_shared/secrets.ts";
import { cf, cfError, ensureInboundRule, INBOUND_WORKER } from "../_shared/cloudflare.ts";

// Super admin only: installs inbound customer e-mail end to end with the
// Cloudflare token saved in /super-admin/keys —
//  1. uploads the Email Worker (same code as cloudflare/email-worker/worker.js)
//     with INBOUND_EMAIL_SECRET as a secret binding;
//  2. turns on Email Routing for INBOUND_EMAIL_DOMAIN (a subdomain, so the
//     apex mailboxes are untouched);
//  3. creates one routing rule per Pro/Enterprise workspace address.
// Safe to run again: every step is idempotent.

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const WORKER_JS = "// Atlas inbound e-mail -> Supabase edge function `email-inbound`.\n// Installed automatically by the `cloudflare-setup` edge function\n// (/super-admin/keys -> \"Install inbound e-mail\"), which uploads this code\n// with INBOUND_EMAIL_SECRET as a secret and adds one Email Routing rule\n// per workspace address (<slug>@INBOUND_EMAIL_DOMAIN -> this Worker).\nexport default {\n  async email(message, env) {\n    const raw = new Uint8Array(await new Response(message.raw).arrayBuffer());\n    if (raw.byteLength > 10 * 1024 * 1024) {\n      message.setReject(\"Message too large\");\n      return;\n    }\n    let bin = \"\";\n    for (let i = 0; i < raw.length; i += 0x8000) bin += String.fromCharCode(...raw.subarray(i, i + 0x8000));\n    const res = await fetch(env.ATLAS_INBOUND_URL, {\n      method: \"POST\",\n      headers: { \"Content-Type\": \"application/json\", \"x-atlas-inbound-secret\": env.INBOUND_EMAIL_SECRET },\n      body: JSON.stringify({ from: message.from, to: message.to, raw: btoa(bin) }),\n    });\n    if (res.status === 404) message.setReject(\"Unknown mailbox\");\n    else if (!res.ok) throw new Error(`Atlas answered ${res.status}`); // Cloudflare retries / bounces\n  },\n};\n";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const { data: u } = await user.auth.getUser();
  if (!u.user) return json({ ok: false, msg: "Not signed in" }, 401);
  const { data: isAdmin } = await user.rpc("is_super_admin", { check_user_id: u.user.id });
  if (!isAdmin) return json({ ok: false, msg: "Super admin only" }, 403);

  const k = await getSecrets(["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_ZONE_ID", "INBOUND_EMAIL_DOMAIN", "INBOUND_EMAIL_SECRET"], { fresh: true });
  if (!k.CLOUDFLARE_API_TOKEN || !k.CLOUDFLARE_ACCOUNT_ID || !k.CLOUDFLARE_ZONE_ID || !k.INBOUND_EMAIL_DOMAIN || !k.INBOUND_EMAIL_SECRET) {
    return json({ ok: false, msg: "Missing Cloudflare keys or inbound e-mail domain/secret in /super-admin/keys." });
  }
  const steps: { step: string; ok: boolean; msg: string }[] = [];
  const t = k.CLOUDFLARE_API_TOKEN;

  // 1. Worker
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify({
    main_module: "worker.js", compatibility_date: "2026-11-01",
    bindings: [
      { type: "plain_text", name: "ATLAS_INBOUND_URL", text: `${url}/functions/v1/email-inbound` },
      { type: "secret_text", name: "INBOUND_EMAIL_SECRET", text: k.INBOUND_EMAIL_SECRET },
    ],
  })], { type: "application/json" }));
  form.append("worker.js", new Blob([WORKER_JS], { type: "application/javascript+module" }), "worker.js");
  const up = await cf(t, `/accounts/${k.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${INBOUND_WORKER}`, { method: "PUT", body: form });
  steps.push({ step: "worker", ok: Boolean(up.success), msg: up.success ? `${INBOUND_WORKER} deployed` : `${cfError(up)} (token needs Workers Scripts: Edit)` });

  // 2. Email Routing on the subdomain
  const dns = await cf(t, `/zones/${k.CLOUDFLARE_ZONE_ID}/email/routing/dns`, { method: "POST", body: JSON.stringify({ name: k.INBOUND_EMAIL_DOMAIN }) });
  const already = /already|exist/i.test(cfError(dns));
  steps.push({ step: "routing", ok: Boolean(dns.success) || already, msg: dns.success || already ? `Email Routing on for ${k.INBOUND_EMAIL_DOMAIN}` : `${cfError(dns)} (token needs Email Routing / Zone Settings: Edit)` });

  // 3. One rule per Pro/Enterprise workspace
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: orgs } = await admin.from("organizations").select("slug").not("slug", "is", null).in("plan", ["pro", "enterprise"]);
  for (const o of orgs || []) {
    const r = await ensureInboundRule(k, o.slug as string);
    steps.push({ step: `rule ${o.slug}`, ok: r.ok, msg: r.ok ? r.msg : `${r.msg} (token needs Email Routing Rules: Edit)` });
  }
  if (!(orgs || []).length) steps.push({ step: "rules", ok: true, msg: "No workspace address yet: rules are created when an organization activates its address." });
  return json({ ok: steps.every((s) => s.ok), steps });
});
