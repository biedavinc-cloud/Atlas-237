import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders, json, PLAN_PRICES_USD, adminClient, userClient, configuredProviders,
  chargeCurrency, convertUsd, isAllowedReturnUrl, type BillingProvider,
} from "../_shared/billing.ts";

// Starts a Korapay or CinetPay subscription checkout.
//   { check: true }                         → which providers are configured (no auth needed beyond the anon key)
//   { provider, plan, org_id, billing_cycle, return_url } → { ok, checkout_url, reference }
// Secrets (Supabase Edge Function secrets, never in the browser):
//   KORAPAY_SECRET_KEY [, KORAPAY_CURRENCY=XAF, KORAPAY_BASE_URL]
//   CINETPAY_API_KEY, CINETPAY_SITE_ID [, CINETPAY_CURRENCY=XAF]
//   APP_ORIGINS (optional, extra allowed return origins, comma separated)

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const configured = configuredProviders();

    if (body?.check === true) return json({ ok: true, providers: configured });

    const provider = body.provider as BillingProvider;
    if (provider !== "korapay" && provider !== "cinetpay") return json({ ok: false, msg: "Unknown provider" }, 400);
    if (!configured[provider]) return json({ ok: false, msg: `${provider} is not configured on the server.` }, 501);

    const authHeader = req.headers.get("Authorization") || "";
    const sb = userClient(authHeader);
    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData?.user) return json({ ok: false, msg: "Not authenticated" }, 401);

    const { plan, org_id, return_url } = body;
    const cycle = body.billing_cycle === "annual" ? "annual" : "monthly";
    const prices = PLAN_PRICES_USD[plan];
    if (!prices) return json({ ok: false, msg: `Unknown plan: ${plan}` }, 400);
    if (!return_url || !isAllowedReturnUrl(return_url)) return json({ ok: false, msg: "Invalid return URL" }, 400);

    const { data: profile } = await sb.from("profiles").select("org_id, role, first_name, last_name, email").eq("id", userData.user.id).maybeSingle();
    if (!profile || profile.org_id !== org_id) return json({ ok: false, msg: "You do not belong to this organization" }, 403);
    if (!["owner", "admin"].includes(profile.role)) {
      return json({ ok: false, msg: "Only an organization owner or admin can change the subscription plan." }, 403);
    }

    const priceUsd = prices[cycle];
    const currency = chargeCurrency(provider);
    const amount = await convertUsd(priceUsd, currency);
    // Alphanumeric only: CinetPay and some mobile-money operators reject symbols.
    const reference = `atl${org_id.replace(/-/g, "").slice(0, 10)}${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const email = profile.email || userData.user.email || "";
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || email;
    const description = `Atlas CRM ${plan} (${cycle === "annual" ? "annual" : "monthly"})`;
    const fnBase = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;

    const admin = adminClient();
    const { error: intentErr } = await admin.from("billing_payment_intents").insert({
      org_id, created_by: userData.user.id, provider, reference, plan, billing_cycle: cycle,
      price_usd: priceUsd, charge_amount: amount, charge_currency: currency, return_url,
    });
    if (intentErr) return json({ ok: false, msg: intentErr.message }, 500);

    let checkoutUrl = "";
    if (provider === "korapay") {
      const base = Deno.env.get("KORAPAY_BASE_URL") || "https://api.korapay.com/merchant/api/v1";
      const back = new URL(return_url);
      back.searchParams.set("billing_provider", "korapay");
      back.searchParams.set("billing_ref", reference);
      const res = await fetch(`${base}/charges/initialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("KORAPAY_SECRET_KEY")}` },
        body: JSON.stringify({
          reference,
          amount,
          currency,
          narration: description,
          redirect_url: back.toString(),
          notification_url: `${fnBase}/billing-webhook?provider=korapay`,
          customer: { name, email },
          metadata: { org_id, plan, billing_cycle: cycle },
        }),
      });
      const data = await res.json().catch(() => null);
      checkoutUrl = data?.data?.checkout_url || "";
      if (!res.ok || !data?.status || !checkoutUrl) {
        await admin.from("billing_payment_intents").update({ status: "failed", provider_status: "init_failed" }).eq("reference", reference);
        return json({ ok: false, msg: data?.message || "Korapay could not start the checkout." }, 502);
      }
    } else {
      const res = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apikey: Deno.env.get("CINETPAY_API_KEY"),
          site_id: Deno.env.get("CINETPAY_SITE_ID"),
          transaction_id: reference,
          amount,
          currency,
          description,
          channels: "ALL",
          lang: "FR",
          customer_name: profile.last_name || name,
          customer_surname: profile.first_name || name,
          customer_email: email,
          // CinetPay sends the customer back with a POST, which a static
          // SPA host can't answer — so it returns through billing-webhook,
          // which looks up the intent and 303-redirects to Atlas.
          return_url: `${fnBase}/billing-webhook?provider=cinetpay&return=1&ref=${reference}`,
          notify_url: `${fnBase}/billing-webhook?provider=cinetpay`,
          metadata: JSON.stringify({ org_id, plan, billing_cycle: cycle }),
        }),
      });
      const data = await res.json().catch(() => null);
      checkoutUrl = data?.data?.payment_url || "";
      if (String(data?.code) !== "201" || !checkoutUrl) {
        await admin.from("billing_payment_intents").update({ status: "failed", provider_status: `init_failed:${data?.code ?? res.status}` }).eq("reference", reference);
        return json({ ok: false, msg: data?.description || data?.message || "CinetPay could not start the checkout." }, 502);
      }
    }

    await admin.from("billing_payment_intents").update({ checkout_url: checkoutUrl }).eq("reference", reference);
    return json({ ok: true, checkout_url: checkoutUrl, reference, amount, currency });
  } catch (e) {
    return json({ ok: false, msg: e instanceof Error ? e.message : String(e) }, 500);
  }
});
