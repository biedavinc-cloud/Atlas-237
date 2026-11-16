import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import PostalMime from "npm:postal-mime@2.4.4";
import { getSecrets } from "../_shared/secrets.ts";
import { safeEqual } from "../_shared/sign.ts";

// Customer e-mails → the right agent.
// A Cloudflare Email Worker (cloudflare/email-worker.js) receives mail sent
// to <org-slug>@<INBOUND_EMAIL_DOMAIN> and posts { from, to, raw (base64) }
// here with the shared INBOUND_EMAIL_SECRET. The e-mail is stored on the
// sender's contact (or lead) timeline; the record's owner is notified. With
// portfolios on, RLS (activities_portfolio) means only that agent and the
// supervising roles can read it — colleagues cannot.

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false }, 405);
  const s = await getSecrets(["INBOUND_EMAIL_SECRET", "INBOUND_EMAIL_DOMAIN"]);
  if (!s.INBOUND_EMAIL_SECRET || !safeEqual(req.headers.get("x-atlas-inbound-secret") || "", s.INBOUND_EMAIL_SECRET)) return json({ ok: false, error: "Unauthorized" }, 401);
  const body = await req.json().catch(() => null) as { from?: string; to?: string; raw?: string } | null;
  if (!body?.raw || !body.to) return json({ ok: false, error: "Missing message" }, 400);
  if (body.raw.length > 14_000_000) return json({ ok: false, error: "Too large" }, 413);

  const toAddr = body.to.toLowerCase().trim();
  const [local, domain] = toAddr.split("@");
  if (s.INBOUND_EMAIL_DOMAIN && domain !== s.INBOUND_EMAIL_DOMAIN.toLowerCase()) return json({ ok: false, error: "Unknown domain" }, 404);
  const slug = local.split("+")[0];

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: org } = await db.from("organizations").select("id, plan").eq("slug", slug).maybeSingle();
  if (!org || !["pro", "enterprise"].includes(org.plan)) return json({ ok: false, error: "Unknown mailbox" }, 404);

  const bytes = Uint8Array.from(atob(body.raw), (c) => c.charCodeAt(0));
  const mail = await PostalMime.parse(bytes);
  const fromEmail = (mail.from?.address || body.from || "").toLowerCase().trim();
  const fromName = mail.from?.name || "";
  if (!fromEmail.includes("@")) return json({ ok: false, error: "No sender" }, 400);
  const subject = (mail.subject || "(sans objet)").slice(0, 300);
  const text = (mail.text || (mail.html || "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).slice(0, 20000);

  let contactId: string | null = null, leadId: string | null = null, owner: string | null = null;
  const { data: c } = await db.from("contacts").select("id, owner_id").eq("org_id", org.id).ilike("email", fromEmail).is("deleted_at", null).limit(1).maybeSingle();
  if (c) { contactId = c.id; owner = c.owner_id; }
  else {
    const { data: l } = await db.from("leads").select("id, assigned_to").eq("org_id", org.id).ilike("email", fromEmail).is("deleted_at", null).neq("status", "converted").limit(1).maybeSingle();
    if (l) { leadId = l.id; owner = l.assigned_to; }
    else {
      const [first, ...rest] = (fromName || fromEmail.split("@")[0]).split(/\s+/);
      const { data: nl } = await db.from("leads").insert({ org_id: org.id, first_name: first || fromEmail, last_name: rest.join(" ") || "", email: fromEmail, source: "email", status: "new" }).select("id").single();
      leadId = nl?.id ?? null;
    }
  }

  const { data: act, error } = await db.from("activities").insert({
    org_id: org.id, type: "email", title: subject, description: text,
    contact_id: contactId, lead_id: leadId, user_id: owner, status: "completed", completed_at: new Date().toISOString(),
    metadata: { direction: "inbound", from: fromEmail, from_name: fromName, to: toAddr, message_id: mail.messageId || null, attachments: (mail.attachments || []).map((a) => a.filename).filter(Boolean).slice(0, 20) },
  }).select("id").single();
  if (error) return json({ ok: false, error: error.message }, 500);

  const link = contactId ? `/app/contacts/${contactId}` : leadId ? `/app/leads/${leadId}` : null;
  let recipients: string[] = owner ? [owner] : [];
  if (!recipients.length) {
    const { data: managers } = await db.from("profiles").select("id").eq("org_id", org.id).in("role", ["owner", "admin", "manager"]);
    recipients = (managers || []).map((m: { id: string }) => m.id);
  }
  if (recipients.length) {
    await db.from("notifications").insert(recipients.map((uid) => ({
      org_id: org.id, user_id: uid, type: "info", link,
      title: `E-mail de ${fromName || fromEmail}`, message: subject,
    })));
  }
  return json({ ok: true, activity: act?.id });
});
