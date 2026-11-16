// Atlas inbound e-mail → Supabase edge function `email-inbound`.
// Deploy: `npx wrangler deploy` in this folder, set the two secrets
// (`npx wrangler secret put INBOUND_EMAIL_SECRET`, same value as in
// /super-admin/keys), then in Cloudflare → Email → Email Routing of the
// inbound domain add a catch-all rule "Send to a Worker" → atlas-inbound-email.
export default {
  async email(message, env) {
    const raw = new Uint8Array(await new Response(message.raw).arrayBuffer());
    if (raw.byteLength > 10 * 1024 * 1024) {
      message.setReject("Message too large");
      return;
    }
    let bin = "";
    for (let i = 0; i < raw.length; i += 0x8000) bin += String.fromCharCode(...raw.subarray(i, i + 0x8000));
    const res = await fetch(env.ATLAS_INBOUND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-atlas-inbound-secret": env.INBOUND_EMAIL_SECRET },
      body: JSON.stringify({ from: message.from, to: message.to, raw: btoa(bin) }),
    });
    if (res.status === 404) message.setReject("Unknown mailbox");
    else if (!res.ok) throw new Error(`Atlas answered ${res.status}`); // Cloudflare retries / bounces
  },
};
