// Atlas inbound e-mail -> Supabase edge function `email-inbound`.
// Installed automatically by the `cloudflare-setup` edge function
// (/super-admin/keys -> "Install inbound e-mail"), which uploads this code
// with INBOUND_EMAIL_SECRET as a secret and adds one Email Routing rule
// per workspace address (<slug>@INBOUND_EMAIL_DOMAIN -> this Worker).
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
