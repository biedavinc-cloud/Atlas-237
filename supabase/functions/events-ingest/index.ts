import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { hmacHex, safeEqual, sha256Hex } from "../_shared/sign.ts";

// Live customer events from any outside platform (trading back office,
// Zanldo or any shop, Aircall / Ringover call logs, a custom app), plus the
// Twilio recording callback for calls started from Atlas.
//
// Auth: an event-source key (atlas_ek_…) as `Authorization: Bearer` or
// `?key=` (for tools that only let you paste a URL). Only its SHA-256 is
// stored. Every write is pinned to the source's own org_id (service role).
//
// Generic body (one event or {"events": [...]}, max 100):
// { "type": "deposit", "id": "ext-123", "title": "Dépôt", "amount": 500,
//   "currency": "USD", "occurred_at": "2026-11-16T10:00:00Z",
//   "customer": { "email": "...", "phone": "...", "first_name": "...", "last_name": "...", "external_id": "..." },
//   "data": { ...anything } }

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Customer = { email?: string; phone?: string; first_name?: string; last_name?: string; name?: string; external_id?: string };
type Ev = {
  type: string; id?: string; title?: string; amount?: number; currency?: string; occurred_at?: string;
  customer?: Customer; data?: Record<string, unknown>;
  call?: { direction?: string; duration?: number; recording_url?: string; agent_email?: string };
};

const str = (v: unknown) => (v === null || v === undefined ? undefined : String(v));
const digits = (v?: string) => (v || "").replace(/\D/g, "");

/** Provider adapters → the generic shape. */
function adapt(kind: string, body: Record<string, unknown>): Ev[] {
  if (kind === "aircall") {
    // https://developer.aircall.io/api-references/#call-events : { event, resource, data: Call }
    const ev = str(body.event) || "";
    if (!ev.startsWith("call.")) return [];
    if (!["call.ended", "call.answered", "call.missed", "call.voicemail_left"].includes(ev)) return [];
    const d = (body.data || {}) as Record<string, unknown>;
    const user = (d.user || {}) as Record<string, unknown>;
    return [{
      type: ev === "call.ended" ? "call" : ev.replace(".", "_"),
      id: `${str(d.id)}:${ev}`,
      title: `${d.direction === "inbound" ? "Appel entrant" : "Appel sortant"} (Aircall)`,
      occurred_at: d.ended_at ? new Date(Number(d.ended_at) * 1000).toISOString() : undefined,
      customer: { phone: str(d.raw_digits) },
      call: { direction: str(d.direction), duration: Number(d.duration) || undefined, recording_url: str(d.recording) || str(d.asset), agent_email: str(user.email) },
      data: { provider: "aircall", event: ev, call_id: d.id },
    }];
  }
  if (kind === "ringover") {
    // Ringover webhooks post the call object; field names differ between
    // event types, so read the common ones defensively.
    const d = ((body.data as Record<string, unknown>) || body) as Record<string, unknown>;
    const dir = str(d.direction) || "";
    const customerNumber = dir === "in" || dir === "inbound" ? str(d.from_number) : str(d.to_number);
    const user = (d.user || {}) as Record<string, unknown>;
    return [{
      type: "call",
      id: str(d.call_id) || str(d.cdr_id) || str(d.id),
      title: `${dir.startsWith("in") ? "Appel entrant" : "Appel sortant"} (Ringover)`,
      customer: { phone: customerNumber || str(d.contact_number) },
      call: { direction: dir, duration: Number(d.total_duration ?? d.duration) || undefined, recording_url: str(d.record) || str(d.record_url) || str(d.recording_url), agent_email: str(user.email) },
      data: { provider: "ringover", event: body.event ?? null, call_id: d.call_id ?? d.id ?? null },
    }];
  }
  const list = Array.isArray(body.events) ? body.events : [body];
  return (list as Record<string, unknown>[]).slice(0, 100).map((e) => ({
    type: str(e.type) || "event",
    id: str(e.id) || str(e.external_id),
    title: str(e.title),
    amount: e.amount === undefined ? undefined : Number(e.amount),
    currency: str(e.currency)?.toUpperCase(),
    occurred_at: str(e.occurred_at),
    customer: (e.customer || {}) as Customer,
    data: (e.data || {}) as Record<string, unknown>,
    call: e.call as Ev["call"],
  }));
}

async function findContact(db: SupabaseClient, org: string, c: Customer | undefined, autoCreate: boolean, tag: string): Promise<string | null> {
  if (!c) return null;
  const email = c.email?.trim().toLowerCase();
  if (email) {
    const { data } = await db.from("contacts").select("id").eq("org_id", org).ilike("email", email).limit(1).maybeSingle();
    if (data) return data.id;
  }
  const d = digits(c.phone);
  if (d.length >= 6) {
    const tail = d.slice(-9);
    const { data } = await db.from("contacts").select("id, phone, whatsapp").eq("org_id", org).or(`phone.ilike.%${tail.slice(-4)}%,whatsapp.ilike.%${tail.slice(-4)}%`).limit(50);
    const hit = (data || []).find((r: { phone?: string; whatsapp?: string }) => digits(r.phone).endsWith(tail) || digits(r.whatsapp).endsWith(tail));
    if (hit) return hit.id;
  }
  if (!autoCreate || (!email && d.length < 6)) return null;
  const [first, ...rest] = (c.first_name || c.name || email?.split("@")[0] || c.phone || "Client").trim().split(/\s+/);
  const { data, error } = await db.from("contacts").insert({
    org_id: org, first_name: first, last_name: c.last_name || rest.join(" ") || "",
    email: email || null, phone: c.phone || null, tags: [tag],
  }).select("id").single();
  return error ? null : data.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  const url = new URL(req.url);
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const db = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, { auth: { persistSession: false } });
  const raw = await req.text();
  if (raw.length > 512_000) return json({ ok: false, error: "Body too large" }, 413);

  // ── Twilio recording callback for a call started from Atlas (signed URL) ──
  if (url.searchParams.get("provider") === "twilio") {
    const org = url.searchParams.get("org") || "";
    const user = url.searchParams.get("user") || "";
    const contact = url.searchParams.get("contact");
    const lead = url.searchParams.get("lead");
    const kind = contact ? "contact" : "lead";
    const expected = await hmacHex(serviceKey, `twilio|${org}|${user}|${kind}|${contact || lead}`);
    if (!safeEqual(expected, url.searchParams.get("sig") || "")) return json({ ok: false, error: "Bad signature" }, 401);
    const f = new URLSearchParams(raw);
    if (f.get("RecordingStatus") && f.get("RecordingStatus") !== "completed") return json({ ok: true, ignored: true });
    const rec = f.get("RecordingUrl");
    await db.from("activities").insert({
      org_id: org, type: "call", user_id: user || null,
      contact_id: contact || null, lead_id: lead || null,
      title: "Enregistrement d’appel (Twilio)", status: "completed", completed_at: new Date().toISOString(),
      description: rec ? `${rec}.mp3` : null,
      metadata: { provider: "twilio", call_sid: f.get("CallSid"), recording_sid: f.get("RecordingSid"), duration: Number(f.get("RecordingDuration")) || null, recording_url: rec ? `${rec}.mp3` : null },
    });
    return json({ ok: true });
  }

  // ── Event-source key ──
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const key = bearer.startsWith("atlas_ek_") ? bearer : url.searchParams.get("key") || "";
  if (!key.startsWith("atlas_ek_")) return json({ ok: false, error: "Missing event key (atlas_ek_…)" }, 401);
  const { data: source } = await db.from("event_sources").select("id, org_id, kind, active, auto_create_contacts").eq("key_hash", await sha256Hex(key)).maybeSingle();
  if (!source || !source.active) return json({ ok: false, error: "Unknown or disabled event key" }, 401);
  const { data: allowed } = await db.rpc("org_plan_has_feature", { target_org_id: source.org_id, feature: "liveEvents" });
  if (allowed === false) return json({ ok: false, error: "Live events need the Pro or Enterprise plan" }, 402);

  let body: Record<string, unknown>;
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = Object.fromEntries(new URLSearchParams(raw)); }
  const events = adapt(source.kind, body);
  if (!events.length) return json({ ok: true, stored: 0 });

  const org = source.org_id as string;
  let stored = 0;
  const agentCache = new Map<string, string | null>();
  for (const e of events) {
    if (!e.type || e.type.length > 60) continue;
    const contactId = await findContact(db, org, e.customer, source.auto_create_contacts, `source:${source.kind}`);
    const { error } = await db.from("customer_events").insert({
      org_id: org, source_id: source.id, contact_id: contactId,
      event_type: e.type.toLowerCase(), title: e.title?.slice(0, 200) || null,
      amount: Number.isFinite(e.amount) ? e.amount : null, currency: e.currency?.slice(0, 3) || null,
      external_id: e.id?.slice(0, 200) || null,
      payload: { ...(e.data || {}), ...(e.call ? { call: e.call } : {}), customer_external_id: e.customer?.external_id ?? null },
      occurred_at: e.occurred_at && !Number.isNaN(Date.parse(e.occurred_at)) ? new Date(e.occurred_at).toISOString() : new Date().toISOString(),
    });
    if (error) { if (error.code === "23505") continue; return json({ ok: false, error: error.message, stored }, 400); }
    stored++;
    if (e.type === "call" && contactId) {
      let agent: string | null = null;
      const ae = e.call?.agent_email?.toLowerCase();
      if (ae) {
        if (!agentCache.has(ae)) {
          const { data: p } = await db.from("profiles").select("id").eq("org_id", org).ilike("email", ae).maybeSingle();
          agentCache.set(ae, p?.id ?? null);
        }
        agent = agentCache.get(ae) ?? null;
      }
      await db.from("activities").insert({
        org_id: org, type: "call", contact_id: contactId, user_id: agent,
        title: e.title || "Appel", status: "completed", completed_at: new Date().toISOString(),
        description: e.call?.recording_url || null,
        metadata: { provider: e.data?.provider ?? source.kind, direction: e.call?.direction ?? null, duration: e.call?.duration ?? null, recording_url: e.call?.recording_url ?? null, external_id: e.id ?? null },
      });
    }
  }
  await db.from("event_sources").update({ last_event_at: new Date().toISOString() }).eq("id", source.id);
  return json({ ok: true, stored });
});
