// Small Cloudflare API helper for platform automation (tenant addresses,
// inbound e-mail). Keys come from /super-admin/keys via getSecrets().
export type CfKeys = {
  CLOUDFLARE_API_TOKEN?: string; CLOUDFLARE_ACCOUNT_ID?: string; CLOUDFLARE_ZONE_ID?: string;
  INBOUND_EMAIL_DOMAIN?: string;
};

// deno-lint-ignore no-explicit-any
export async function cf(token: string, path: string, init: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (init.body && !(init.body instanceof FormData)) headers["Content-Type"] = "application/json";
  try {
    const r = await fetch(`https://api.cloudflare.com/client/v4${path}`, { ...init, headers });
    return await r.json();
  } catch {
    return { success: false, errors: [{ message: "Cloudflare unreachable" }] };
  }
}

export const cfError = (r: { errors?: { message?: string }[] }) => r?.errors?.[0]?.message || "unknown error";

export const INBOUND_WORKER = "atlas-inbound-email";

/** Literal Email Routing rule <slug>@<domain> → the inbound Worker (catch-all
 *  rules only exist on apex domains, so each workspace gets its own rule). */
export async function ensureInboundRule(k: CfKeys, slug: string): Promise<{ ok: boolean; msg: string }> {
  if (!k.CLOUDFLARE_API_TOKEN || !k.CLOUDFLARE_ZONE_ID || !k.INBOUND_EMAIL_DOMAIN) return { ok: false, msg: "inbound e-mail not configured" };
  const address = `${slug}@${k.INBOUND_EMAIL_DOMAIN}`.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const list = await cf(k.CLOUDFLARE_API_TOKEN, `/zones/${k.CLOUDFLARE_ZONE_ID}/email/routing/rules?per_page=50&page=${page}`);
    if (!list.success) return { ok: false, msg: cfError(list) };
    // deno-lint-ignore no-explicit-any
    if ((list.result || []).some((r: any) => (r.matchers || []).some((m: any) => String(m.value || "").toLowerCase() === address))) return { ok: true, msg: `${address} ready` };
    if ((list.result || []).length < 50) break;
  }
  const add = await cf(k.CLOUDFLARE_API_TOKEN, `/zones/${k.CLOUDFLARE_ZONE_ID}/email/routing/rules`, {
    method: "POST",
    body: JSON.stringify({ name: `Atlas ${slug}`, enabled: true, matchers: [{ type: "literal", field: "to", value: address }], actions: [{ type: "worker", value: [INBOUND_WORKER] }] }),
  });
  return add.success ? { ok: true, msg: `${address} ready` } : { ok: false, msg: cfError(add) };
}
