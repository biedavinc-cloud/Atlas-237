import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Atlas public REST API — what an API key from "API & Webhooks" opens.
// Used by Zapier / Make / n8n "HTTP request" steps, a website form, an ERP…
//
//   Authorization: Bearer atlas_sk_…
//   GET    /public-api/{resource}?limit=50&offset=0&updated_since=ISO&q=text
//   GET    /public-api/{resource}/{id}
//   POST   /public-api/{resource}            (JSON body)
//   PATCH  /public-api/{resource}/{id}       (JSON body)
//   resource ∈ contacts, companies, leads, deals
//
// verify_jwt is false (callers have an API key, not a Supabase session).
// The key is hashed (SHA-256) and looked up in api_keys; every query is
// pinned to that key's org_id with the service role, writes only accept a
// whitelist of columns, and the org's plan must include API access and its
// trial/subscription must be live — the same rules RLS applies in the app.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

const RESOURCES: Record<string, { writable: string[]; search: string[] }> = {
  contacts: {
    writable: ["first_name", "last_name", "email", "phone", "whatsapp", "job_title", "company_id", "company", "address", "country", "city", "language", "timezone", "lead_source", "status", "lead_score", "customer_value", "tags", "notes", "custom_fields"],
    search: ["first_name", "last_name", "email", "phone"],
  },
  companies: {
    writable: ["name", "industry", "website", "size", "country", "address", "city", "revenue", "currency", "status", "tags", "notes", "custom_fields"],
    search: ["name", "website", "city"],
  },
  leads: {
    writable: ["first_name", "last_name", "email", "phone", "company_name", "title", "source", "status", "temperature", "qualification", "lead_score", "potential_value", "notes", "tags", "custom_fields"],
    search: ["first_name", "last_name", "email", "company_name"],
  },
  deals: {
    writable: ["name", "value", "currency", "probability", "closing_date", "pipeline_id", "stage_id", "contact_id", "company_id", "status", "won_reason", "lost_reason", "notes", "tags", "custom_fields"],
    search: ["name"],
  },
};

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function pick(body: Record<string, unknown>, allowed: string[]) {
  const out: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) out[k] = body[k];
  return out;
}

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Records created/updated through the API fire the same webhook events as
// the app (contact.created, deal.updated…), so automations stay consistent.
// deno-lint-ignore no-explicit-any
async function fireWebhooks(admin: any, orgId: string, event: string, data: Record<string, unknown>) {
  const { data: hooks } = await admin.from("webhooks").select("id, url, secret").eq("org_id", orgId).eq("active", true).contains("events", [event]);
  for (const wh of (hooks || []) as { id: string; url: string; secret: string | null }[]) {
    try {
      const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data });
      const res = await fetch(wh.url, { method: "POST", headers: { "Content-Type": "application/json", "X-Atlas-Signature": wh.secret ? await hmacHex(wh.secret, body) : "" }, body });
      await admin.from("webhooks").update({ last_triggered_at: new Date().toISOString(), last_response_code: res.status }).eq("id", wh.id);
    } catch { /* one endpoint failing never blocks the API response */ }
  }
}

// Keep background work (webhooks, last_used_at) alive after the response.
function background(p: Promise<unknown>) {
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(p); else p.catch(() => {});
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: cors });

  const auth = req.headers.get("Authorization") || "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!key.startsWith("atlas_sk_")) return json({ error: "missing_api_key", message: "Send your Atlas API key as: Authorization: Bearer atlas_sk_…" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: apiKey } = await admin.from("api_keys").select("id, org_id, active, expires_at, permissions").eq("key_hash", await sha256Hex(key)).maybeSingle();
  if (!apiKey || !apiKey.active || (apiKey.expires_at && new Date(apiKey.expires_at) < new Date())) {
    return json({ error: "invalid_api_key", message: "This API key does not exist, was revoked or has expired." }, 401);
  }
  const orgId = apiKey.org_id as string;

  const [{ data: planOk }, { data: billingOk }] = await Promise.all([
    admin.rpc("org_plan_has_feature", { target_org_id: orgId, feature: "apiAccess" }),
    admin.rpc("org_billing_ok", { target_org_id: orgId }),
  ]);
  if (!planOk) return json({ error: "plan", message: "API access is included from the Growth plan." }, 403);
  if (!billingOk) return json({ error: "billing", message: "This workspace's trial or subscription has ended." }, 402);

  const scopes: string[] = (apiKey.permissions as { scopes?: string[] } | null)?.scopes || ["read"];
  background(Promise.resolve(admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", apiKey.id)));

  // Path after the function name: /public-api/contacts/<id>
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("public-api");
  const [resource, id] = idx >= 0 ? parts.slice(idx + 1) : parts.slice(-2);
  if (!resource) return json({ resources: Object.keys(RESOURCES), docs: "GET/POST /{resource}, GET/PATCH /{resource}/{id}" });
  const def = RESOURCES[resource];
  if (!def) return json({ error: "unknown_resource", message: `Use one of: ${Object.keys(RESOURCES).join(", ")}` }, 404);
  const singular = resource.replace(/ies$/, "y").replace(/s$/, "");

  try {
    if (req.method === "GET") {
      if (!scopes.includes("read")) return json({ error: "scope", message: "This key cannot read." }, 403);
      if (id) {
        const { data, error } = await admin.from(resource).select("*").eq("org_id", orgId).eq("id", id).is("deleted_at", null).maybeSingle();
        if (error) return json({ error: "query", message: error.message }, 400);
        return data ? json({ data }) : json({ error: "not_found" }, 404);
      }
      const url = new URL(req.url);
      const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 200);
      const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
      let q = admin.from(resource).select("*", { count: "exact" }).eq("org_id", orgId).is("deleted_at", null);
      const since = url.searchParams.get("updated_since");
      if (since && !Number.isNaN(Date.parse(since))) q = q.gte("updated_at", new Date(since).toISOString());
      const text = (url.searchParams.get("q") || "").replace(/[%,()]/g, " ").trim();
      if (text) q = q.or(def.search.map((c) => `${c}.ilike.%${text}%`).join(","));
      const { data, error, count } = await q.order("updated_at", { ascending: false }).range(offset, offset + limit - 1);
      if (error) return json({ error: "query", message: error.message }, 400);
      return json({ data, count, limit, offset });
    }

    if (req.method === "POST" || req.method === "PATCH") {
      if (!scopes.includes("write")) return json({ error: "scope", message: "This key cannot write." }, 403);
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "body", message: "Send a JSON object." }, 400);
      const values = pick(body, def.writable);
      if (Object.keys(values).length === 0) return json({ error: "body", message: `Writable fields: ${def.writable.join(", ")}` }, 400);

      if (req.method === "POST") {
        if (id) return json({ error: "method", message: "POST to /{resource}, PATCH to /{resource}/{id}." }, 405);
        const { data, error } = await admin.from(resource).insert({ ...values, org_id: orgId }).select("*").single();
        if (error) return json({ error: "insert", message: error.message }, 400);
        background(fireWebhooks(admin, orgId, `${singular}.created`, data));
        return json({ data }, 201);
      }
      if (!id) return json({ error: "method", message: "PATCH needs /{resource}/{id}." }, 405);
      const { data, error } = await admin.from(resource).update({ ...values, updated_at: new Date().toISOString() }).eq("org_id", orgId).eq("id", id).select("*").maybeSingle();
      if (error) return json({ error: "update", message: error.message }, 400);
      if (!data) return json({ error: "not_found" }, 404);
      background(fireWebhooks(admin, orgId, `${singular}.updated`, data));
      return json({ data });
    }

    return json({ error: "method", message: "Use GET, POST or PATCH." }, 405);
  } catch (e) {
    return json({ error: "server", message: e instanceof Error ? e.message : String(e) }, 500);
  }
});
