import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getSecrets } from "../_shared/secrets.ts";

// Activates <slug>.<TENANT_ROOT_DOMAIN> for the caller's organization
// (Pro/Enterprise, owner/admin): adds it as a custom domain of the Pages
// project and makes sure a proxied CNAME exists, then reports the status.
// Cloudflare docs: POST /accounts/{account_id}/pages/projects/{project}/domains

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const body = await req.json().catch(() => ({}));
  const fr = body?.lang !== "en";
  const t = (f: string, e: string) => (fr ? f : e);
  const url = Deno.env.get("SUPABASE_URL")!;
  const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const { data: u } = await user.auth.getUser();
  if (!u.user) return json({ ok: false, msg: t("Non connecté", "Not signed in") }, 401);
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: me } = await admin.from("profiles").select("org_id, role").eq("id", u.user.id).maybeSingle();
  if (!me || !["owner", "admin"].includes(me.role)) return json({ ok: false, msg: t("Réservé au propriétaire et aux admins.", "Only an owner or admin can do this.") }, 403);
  const { data: org } = await admin.from("organizations").select("slug, plan").eq("id", me.org_id).maybeSingle();
  if (!org?.slug) return json({ ok: false, msg: t("Enregistrez d’abord une adresse.", "Save an address first.") }, 400);
  if (!["pro", "enterprise"].includes(org.plan)) return json({ ok: false, msg: t("L’adresse dédiée fait partie des plans Pro et Enterprise.", "A dedicated address is part of the Pro and Enterprise plans.") }, 402);

  const s = await getSecrets(["TENANT_ROOT_DOMAIN", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_ZONE_ID", "CLOUDFLARE_PAGES_PROJECT"]);
  if (!s.TENANT_ROOT_DOMAIN || !s.CLOUDFLARE_API_TOKEN || !s.CLOUDFLARE_ACCOUNT_ID || !s.CLOUDFLARE_ZONE_ID || !s.CLOUDFLARE_PAGES_PROJECT) {
    return json({ ok: false, msg: t("Adresse réservée. Liafrik doit encore terminer le réglage du domaine de son côté ; elle fonctionnera ensuite sans action de votre part.", "Address reserved. Liafrik still has to finish the domain setup on its side; it will then work without any action from you.") });
  }
  const host = `${org.slug}.${s.TENANT_ROOT_DOMAIN}`;
  const cf = (path: string, init: RequestInit = {}) => fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init, headers: { Authorization: `Bearer ${s.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
  }).then((r) => r.json()).catch(() => ({ success: false, errors: [{ message: "Cloudflare unreachable" }] }));

  const base = `/accounts/${s.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${s.CLOUDFLARE_PAGES_PROJECT}/domains`;
  let dom = await cf(`${base}/${host}`);
  if (!dom.success) {
    const add = await cf(base, { method: "POST", body: JSON.stringify({ name: host }) });
    if (!add.success) return json({ ok: false, msg: `Cloudflare: ${add.errors?.[0]?.message || "could not add the domain"}` });
    dom = add;
  }
  const dns = await cf(`/zones/${s.CLOUDFLARE_ZONE_ID}/dns_records?name=${encodeURIComponent(host)}`);
  if (dns.success && (dns.result || []).length === 0) {
    const rec = await cf(`/zones/${s.CLOUDFLARE_ZONE_ID}/dns_records`, {
      method: "POST", body: JSON.stringify({ type: "CNAME", name: host, content: `${s.CLOUDFLARE_PAGES_PROJECT}.pages.dev`, proxied: true, comment: "Atlas tenant address" }),
    });
    if (!rec.success) return json({ ok: false, msg: `Cloudflare DNS: ${rec.errors?.[0]?.message || "could not create the record"}` });
  }
  const status = dom.result?.status || "pending";
  return json({ ok: true, status, msg: status === "active" ? t(`https://${host} est en ligne.`, `https://${host} is live.`) : t(`https://${host} est en cours d’activation (certificat en cours, quelques minutes en général).`, `https://${host} is being activated (certificate in progress, usually a few minutes).`) });
});
