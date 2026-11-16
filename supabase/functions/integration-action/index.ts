import { hmacHex } from "../_shared/sign.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Real calls to the org's own connected apps (messages, e-mail, payment
// links, calls, CRM/shop sync). Uses the caller's JWT, so the integrations
// read is scoped to their org by RLS; run-scheduled-workflows may call with
// the service role and an explicit org_id. See AGENTS.md "Marketplace".

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type ActionResult = { ok: boolean; msg: string; url?: string };

// Where a customer lands after paying a link (the org's own invoice page).
const RETURN_URL = "https://atlas.liafrik.com/app/invoices";
const FN_BASE = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;

// Currencies without minor units (amounts are sent as-is, not ×100).
const ZERO_DECIMAL = new Set(["BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"]);
const minorUnits = (amount: number, currency: string) => ZERO_DECIMAL.has(currency.toUpperCase()) ? Math.round(amount) : Math.round(amount * 100);

async function sendTelegram(config: Record<string, string>, params: Record<string, unknown>): Promise<ActionResult> {
  const chat_id = params.chat_id;
  const message = params.message;
  if (!chat_id || !message) return { ok: false, msg: "Missing chat_id or message" };
  const res = await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id, text: message }),
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok && Boolean(body?.ok), msg: body?.description || `Telegram HTTP ${res.status}` };
}

async function sendSms(config: Record<string, string>, params: Record<string, unknown>): Promise<ActionResult> {
  const to = params.to;
  const message = params.message;
  if (!to || !message) return { ok: false, msg: "Missing to or message" };
  const sid = config.account_sid;
  const body = new URLSearchParams({ To: String(to), From: config.from_number, Body: String(message) });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${config.auth_token}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const resBody = await res.json().catch(() => null);
  return { ok: res.ok, msg: resBody?.error_message || (res.ok ? `Sent (sid ${resBody?.sid})` : `Twilio HTTP ${res.status}`) };
}

async function mailchimpSubscribe(config: Record<string, string>, params: Record<string, unknown>): Promise<ActionResult> {
  const list_id = params.list_id;
  const email = params.email;
  if (!list_id || !email) return { ok: false, msg: "Missing list_id or email" };
  const key = config.api_key || "";
  const dc = key.split("-")[1];
  if (!dc) return { ok: false, msg: "Stored Mailchimp key is missing its datacenter suffix" };
  const res = await fetch(`https://${dc}.api.mailchimp.com/3.0/lists/${list_id}/members`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`anystring:${key}`)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email_address: email, status: "subscribed" }),
  });
  const resBody = await res.json().catch(() => null);
  const alreadyMember = resBody?.title === "Member Exists";
  return { ok: res.ok || alreadyMember, msg: alreadyMember ? "Already subscribed" : (res.ok ? "Subscribed" : (resBody?.detail || `Mailchimp HTTP ${res.status}`)) };
}

async function callCustomApp(config: Record<string, string>, params: Record<string, unknown>): Promise<ActionResult> {
  const baseUrl = (config.base_url || "").replace(/\/$/, "");
  const path = typeof params.path === "string" ? params.path : "";
  const method = typeof params.method === "string" ? params.method.toUpperCase() : "POST";
  const url = baseUrl + path;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.auth_type === "bearer") headers["Authorization"] = `Bearer ${config.credential}`;
  else if (config.auth_type === "api_key_header") headers[config.header_name || "X-API-Key"] = config.credential;
  else if (config.auth_type === "basic") headers["Authorization"] = `Basic ${btoa(`${config.username}:${config.credential}`)}`;
  const res = await fetch(url, {
    method,
    headers,
    body: params.body ? JSON.stringify(params.body) : undefined,
  });
  const text = await res.text().catch(() => "");
  return { ok: res.ok, msg: res.ok ? `${res.status} OK` : `HTTP ${res.status}: ${text.slice(0, 200)}` };
}

async function sendWhatsapp(config: Record<string, string>, params: Record<string, unknown>): Promise<ActionResult> {
  const to = params.to;
  const message = params.message;
  if (!to || !message) return { ok: false, msg: "Missing to or message" };
  const res = await fetch(`https://graph.facebook.com/v20.0/${config.phone_number_id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.api_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: String(message) } }),
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, msg: res.ok ? `Sent (id ${body?.messages?.[0]?.id || "?"})` : (body?.error?.message || `WhatsApp HTTP ${res.status}`) };
}

async function sendEmail(config: Record<string, string>, params: Record<string, unknown>): Promise<ActionResult> {
  const to = params.to;
  const subject = params.subject;
  const message = params.message;
  if (!to || !subject || !message) return { ok: false, msg: "Missing to, subject, or message" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.api_key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: config.from_email,
      to: [String(to)],
      subject: String(subject),
      text: String(message),
    }),
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, msg: res.ok ? `Sent (id ${body?.id || "?"})` : (body?.message || `Resend HTTP ${res.status}`) };
}

async function hubspotUpsertContact(config: Record<string, string>, params: Record<string, unknown>): Promise<ActionResult> {
  const email = params.email;
  if (!email) return { ok: false, msg: "Missing email" };
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.api_key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ properties: { email, firstname: params.firstname || "", lastname: params.lastname || "" } }),
  });
  const body = await res.json().catch(() => null);
  const alreadyExists = res.status === 409;
  return { ok: res.ok || alreadyExists, msg: alreadyExists ? "Contact already exists in HubSpot" : (res.ok ? "Contact created" : (body?.message || `HubSpot HTTP ${res.status}`)) };
}

async function freshdeskCreateTicket(config: Record<string, string>, params: Record<string, unknown>): Promise<ActionResult> {
  const subject = params.subject;
  const description = params.description;
  const email = params.email;
  if (!subject || !description || !email) return { ok: false, msg: "Missing subject, description or email" };
  const res = await fetch(`https://${config.domain}/api/v2/tickets`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${config.api_key}:X`)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ subject, description, email, priority: 1, status: 2 }),
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, msg: res.ok ? `Ticket #${body?.id} created` : (body?.description || body?.message || `Freshdesk HTTP ${res.status}`) };
}

async function mollieCreatePayment(config: Record<string, string>, params: Record<string, unknown>): Promise<ActionResult> {
  const amount = params.amount;
  const description = params.description;
  if (!amount || !description) return { ok: false, msg: "Missing amount or description" };
  const res = await fetch("https://api.mollie.com/v2/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.api_key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: { currency: String(params.currency || "EUR"), value: Number(amount).toFixed(2) },
      description,
      redirectUrl: params.redirect_url || RETURN_URL,
    }),
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, msg: res.ok ? `Payment link: ${body?._links?.checkout?.href}` : (body?.detail || `Mollie HTTP ${res.status}`) };
}

async function cinetpayCreatePayment(config: Record<string, string>, params: Record<string, unknown>): Promise<ActionResult> {
  const amount = params.amount;
  if (!amount) return { ok: false, msg: "Missing amount" };
  const res = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: config.api_key,
      site_id: config.site_id,
      transaction_id: `wf-${Date.now()}`,
      amount: Number(amount),
      currency: params.currency || "XOF",
      description: params.description || "Atlas payment",
      notify_url: params.notify_url || RETURN_URL,
      return_url: params.return_url || RETURN_URL,
      channels: "ALL",
    }),
  });
  const body = await res.json().catch(() => null);
  return { ok: body?.code === "201", msg: body?.code === "201" ? `Payment link: ${body?.data?.payment_url}` : (body?.message || `CinetPay HTTP ${res.status}`) };
}

async function waveCreateCheckout(config: Record<string, string>, params: Record<string, unknown>): Promise<ActionResult> {
  const amount = params.amount;
  if (!amount) return { ok: false, msg: "Missing amount" };
  const res = await fetch("https://api.wave.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.api_key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: String(amount),
      currency: params.currency || "XOF",
      client_reference: params.client_reference || `wf-${Date.now()}`,
      error_url: params.error_url || RETURN_URL,
      success_url: params.success_url || RETURN_URL,
    }),
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, msg: res.ok ? `Checkout link: ${body?.wave_launch_url}` : (body?.message || `Wave HTTP ${res.status}`) };
}

async function chapaInitialize(config: Record<string, string>, params: Record<string, unknown>): Promise<ActionResult> {
  const amount = params.amount;
  const email = params.email;
  if (!amount || !email) return { ok: false, msg: "Missing amount or email" };
  const tx_ref = `wf-${Date.now()}`;
  const res = await fetch("https://api.chapa.co/v1/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.secret_key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: String(amount),
      currency: params.currency || "ETB",
      email,
      first_name: params.first_name || "",
      last_name: params.last_name || "",
      tx_ref,
      return_url: params.return_url || RETURN_URL,
    }),
  });
  const body = await res.json().catch(() => null);
  return { ok: body?.status === "success", msg: body?.status === "success" ? `Checkout link: ${body?.data?.checkout_url}` : (body?.message || `Chapa HTTP ${res.status}`) };
}

async function campayCollect(config: Record<string, string>, params: Record<string, unknown>): Promise<ActionResult> {
  const amount = params.amount;
  const phone = params.phone_number;
  if (!amount || !phone) return { ok: false, msg: "Missing amount or phone_number" };
  const tokenRes = await fetch("https://www.campay.net/api/token/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: config.app_username, password: config.app_password }),
  });
  const tokenBody = await tokenRes.json().catch(() => null);
  if (!tokenRes.ok || !tokenBody?.token) return { ok: false, msg: tokenBody?.detail || "CamPay authentication failed" };
  const res = await fetch("https://www.campay.net/api/collect/", {
    method: "POST",
    headers: { Authorization: `Token ${tokenBody.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: String(amount), from: phone, description: params.description || "Atlas payment", external_reference: `wf-${Date.now()}` }),
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, msg: res.ok ? `Collection initiated (ref ${body?.reference})` : (body?.message || `CamPay HTTP ${res.status}`) };
}

async function shopifyCreateCustomer(config: Record<string, string>, params: Record<string, unknown>): Promise<ActionResult> {
  const email = params.email;
  if (!email) return { ok: false, msg: "Missing email" };
  const res = await fetch(`https://${config.shop_domain}/admin/api/2025-10/customers.json`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": config.access_token, "Content-Type": "application/json" },
    body: JSON.stringify({ customer: { email, first_name: params.first_name || "", last_name: params.last_name || "" } }),
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, msg: res.ok ? `Customer #${body?.customer?.id} created` : (JSON.stringify(body?.errors) || `Shopify HTTP ${res.status}`) };
}

async function woocommerceCreateCustomer(config: Record<string, string>, params: Record<string, unknown>): Promise<ActionResult> {
  const email = params.email;
  if (!email) return { ok: false, msg: "Missing email" };
  const baseUrl = (config.shop_url || "").replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/wp-json/wc/v3/customers`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${config.consumer_key}:${config.consumer_secret}`)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, first_name: params.first_name || "", last_name: params.last_name || "" }),
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, msg: res.ok ? `Customer #${body?.id} created` : (body?.message || `WooCommerce HTTP ${res.status}`) };
}

// ── Payment links on the org's own PSP accounts (invoice "payment link") ──

async function paystackPaymentLink(config: Record<string, string>, params: Record<string, unknown>): Promise<ActionResult> {
  const amount = Number(params.amount);
  const email = params.email;
  const currency = String(params.currency || "NGN").toUpperCase();
  if (!amount || !email) return { ok: false, msg: "Missing amount or customer email" };
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.secret_key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email, currency,
      amount: Math.round(amount * 100), // Paystack: always the subunit (kobo, pesewas, cents)
      reference: `atl-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
      callback_url: params.return_url || RETURN_URL,
      metadata: { label: params.description || null, source: "atlas-crm" },
    }),
  });
  const body = await res.json().catch(() => null);
  const url = body?.data?.authorization_url;
  return { ok: res.ok && body?.status === true && Boolean(url), url, msg: url ? `Payment link: ${url}` : (body?.message || `Paystack HTTP ${res.status}`) };
}

async function flutterwavePaymentLink(config: Record<string, string>, params: Record<string, unknown>): Promise<ActionResult> {
  const amount = Number(params.amount);
  const email = params.email;
  if (!amount || !email) return { ok: false, msg: "Missing amount or customer email" };
  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.secret_key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: `atl-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
      amount, currency: String(params.currency || "USD").toUpperCase(),
      redirect_url: params.return_url || RETURN_URL,
      customer: { email, name: params.name || undefined },
      customizations: { title: String(params.description || "Payment") },
    }),
  });
  const body = await res.json().catch(() => null);
  const url = body?.data?.link;
  return { ok: res.ok && body?.status === "success" && Boolean(url), url, msg: url ? `Payment link: ${url}` : (body?.message || `Flutterwave HTTP ${res.status}`) };
}

async function stripePaymentLink(config: Record<string, string>, params: Record<string, unknown>): Promise<ActionResult> {
  const amount = Number(params.amount);
  const currency = String(params.currency || "USD").toUpperCase();
  if (!amount) return { ok: false, msg: "Missing amount" };
  const form = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(minorUnits(amount, currency)),
    "line_items[0][price_data][product_data][name]": String(params.description || "Invoice"),
    success_url: String(params.return_url || RETURN_URL),
    cancel_url: String(params.return_url || RETURN_URL),
  });
  if (params.email && !String(params.email).includes("•")) form.set("customer_email", String(params.email));
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.secret_key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok && Boolean(body?.url), url: body?.url, msg: body?.url ? `Payment link: ${body.url}` : (body?.error?.message || `Stripe HTTP ${res.status}`) };
}

// ── Calls ──

/** Twilio bridge: rings the agent's phone, then dials the customer. The
 *  agent never sees the customer's number; the call can be recorded and the
 *  recording comes back to the contact's timeline through call-webhook. */
async function twilioCall(config: Record<string, string>, params: Record<string, unknown>): Promise<ActionResult> {
  const to = String(params.to || "");
  const agent = String(params.agent_phone || "");
  if (!to || !agent) return { ok: false, msg: !agent ? "Add your own phone number to your profile first (Settings → Profile)." : "This record has no phone number" };
  const esc = (v: string) => v.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c] as string));
  const cb = params.callback_url ? ` record="record-from-answer-dual" recordingStatusCallback="${esc(String(params.callback_url))}" recordingStatusCallbackEvent="completed"` : "";
  const twiml = `<Response><Dial callerId="${esc(config.from_number)}"${cb}><Number>${esc(to)}</Number></Dial></Response>`;
  const sid = config.account_sid;
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${sid}:${config.auth_token}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: agent, From: config.from_number, Twiml: twiml }),
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, msg: res.ok ? "Your phone is ringing: pick up and Atlas connects the customer." : (body?.message || `Twilio HTTP ${res.status}`) };
}

/** Aircall: starts the call from the agent's Aircall app (agent matched by e-mail). */
async function aircallCall(config: Record<string, string>, params: Record<string, unknown>): Promise<ActionResult> {
  const to = String(params.to || "");
  const agentEmail = String(params.agent_email || "").toLowerCase();
  if (!to) return { ok: false, msg: "This record has no phone number" };
  const auth = `Basic ${btoa(`${config.api_id || config.app_id}:${config.api_token}`)}`;
  let user: { id: number; email: string } | undefined;
  for (let page = 1; page <= 10 && !user; page++) {
    const r = await fetch(`https://api.aircall.io/v1/users?per_page=50&page=${page}`, { headers: { Authorization: auth } });
    if (!r.ok) return { ok: false, msg: `Aircall HTTP ${r.status}` };
    const b = await r.json();
    user = (b.users || []).find((u: { email: string }) => (u.email || "").toLowerCase() === agentEmail);
    if (!b.meta?.next_page_link) break;
  }
  if (!user) return { ok: false, msg: `No Aircall user with the e-mail ${agentEmail}` };
  const ur = await fetch(`https://api.aircall.io/v1/users/${user.id}`, { headers: { Authorization: auth } });
  const ub = await ur.json().catch(() => null);
  const numberId = ub?.user?.numbers?.[0]?.id;
  if (!numberId) return { ok: false, msg: "Your Aircall user has no number assigned" };
  const res = await fetch(`https://api.aircall.io/v1/users/${user.id}/calls`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ number_id: numberId, to }),
  });
  return { ok: res.ok, msg: res.ok ? "Call started in your Aircall app." : `Aircall HTTP ${res.status}: ${(await res.text()).slice(0, 160)}` };
}

const ACTIONS: Record<string, { provider: string; run: (config: Record<string, string>, params: Record<string, unknown>) => Promise<ActionResult> }> = {
  send_telegram: { provider: "telegram", run: sendTelegram },
  send_sms: { provider: "twilio", run: sendSms },
  mailchimp_subscribe: { provider: "mailchimp", run: mailchimpSubscribe },
  send_whatsapp: { provider: "whatsapp", run: sendWhatsapp },
  send_email: { provider: "resend", run: sendEmail },
  hubspot_upsert_contact: { provider: "hubspot", run: hubspotUpsertContact },
  freshdesk_create_ticket: { provider: "freshdesk", run: freshdeskCreateTicket },
  mollie_create_payment: { provider: "mollie", run: mollieCreatePayment },
  cinetpay_create_payment: { provider: "cinetpay", run: cinetpayCreatePayment },
  wave_create_checkout: { provider: "wave", run: waveCreateCheckout },
  chapa_initialize: { provider: "chapa", run: chapaInitialize },
  campay_collect: { provider: "campay", run: campayCollect },
  shopify_create_customer: { provider: "shopify", run: shopifyCreateCustomer },
  woocommerce_create_customer: { provider: "woocommerce", run: woocommerceCreateCustomer },
  paystack_payment_link: { provider: "paystack", run: paystackPaymentLink },
  flutterwave_payment_link: { provider: "flutterwave", run: flutterwavePaymentLink },
  stripe_payment_link: { provider: "stripe", run: stripePaymentLink },
  twilio_call: { provider: "twilio", run: twilioCall },
  aircall_call: { provider: "aircall", run: aircallCall },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    // Two ways to call this function:
    // 1. Normal: a signed-in user's own JWT — org is derived from RLS via
    //    that user's session, exactly as before.
    // 2. Internal only: the real service role key as the Bearer token,
    //    used exclusively by run-scheduled-workflows (never exposed to a
    //    browser) — since there's no signed-in user in a cron context,
    //    the caller must explicitly pass org_id, and RLS is bypassed
    //    deliberately (service role), scoped by that explicit org_id on
    //    every query below rather than inferred from a session.
    const isInternalCall = serviceRoleKey.length > 0 && authHeader === `Bearer ${serviceRoleKey}`;

    let supabaseClient;
    let callerOrgId: string | null = null;
    let callerId: string | null = null;
    let callerEmail: string | null = null;
    if (isInternalCall) {
      supabaseClient = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);
    } else {
      supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userData, error: userErr } = await supabaseClient.auth.getUser();
      if (userErr || !userData.user) {
        return new Response(JSON.stringify({ ok: false, msg: "Not authenticated" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerId = userData.user.id;
      callerEmail = userData.user.email ?? null;
    }

    const { action, params, integration_id, org_id } = await req.json();
    if (isInternalCall) {
      if (!org_id) {
        return new Response(JSON.stringify({ ok: false, msg: "Missing org_id for internal call" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerOrgId = org_id;
    }
    if (!action) {
      return new Response(JSON.stringify({ ok: false, msg: "Missing action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // call_custom_app targets one specific saved Custom App by id (an org
    // can have several); the other actions target the single connected
    // integration row for that fixed provider.
    if (action === "call_custom_app") {
      if (!integration_id) {
        return new Response(JSON.stringify({ ok: false, msg: "Missing integration_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      let integQuery = supabaseClient.from("integrations").select("config").eq("id", integration_id).eq("status", "connected");
      if (isInternalCall) integQuery = integQuery.eq("org_id", callerOrgId);
      const { data: integ } = await integQuery.maybeSingle();
      if (!integ) {
        return new Response(JSON.stringify({ ok: false, msg: "That custom app is not connected for this organization." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await callCustomApp(integ.config as Record<string, string>, params || {});
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const handler = ACTIONS[action];
    if (!handler) {
      return new Response(JSON.stringify({ ok: false, msg: `Unknown action: ${action}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let integQuery = supabaseClient.from("integrations").select("config").eq("provider", handler.provider).eq("status", "connected");
    if (isInternalCall) integQuery = integQuery.eq("org_id", callerOrgId);
    const { data: integ } = await integQuery.maybeSingle();
    if (!integ) {
      return new Response(JSON.stringify({ ok: false, msg: `${handler.provider} is not connected for this organization.` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const p: Record<string, unknown> = { ...(params || {}) };
    const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Masked contact details (workspace setting): the browser only sends the
    // record id; the real e-mail/phone is read here, after checking the caller
    // can see that record, and never sent back.
    const rec = p._record as { table?: string; id?: string } | undefined;
    delete p._record;
    const scrub: string[] = [];
    if (rec && !isInternalCall) {
      if (rec.table !== "contacts" && rec.table !== "leads") return json({ ok: false, msg: "Unknown record type" }, 400);
      const { data: visible } = await supabaseClient.from(rec.table === "contacts" ? "contacts_v" : "leads_v").select("id, org_id").eq("id", rec.id).maybeSingle();
      if (!visible) return json({ ok: false, msg: "You do not have access to this record." }, 403);
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);
      const { data: real } = await admin.from(rec.table).select(rec.table === "contacts" ? "email, phone, whatsapp" : "email, phone").eq("id", rec.id).eq("org_id", visible.org_id).maybeSingle();
      const r = (real || {}) as { email?: string; phone?: string; whatsapp?: string };
      const masked = (v: unknown) => !v || String(v).includes("•");
      [r.email, r.phone, r.whatsapp].forEach((v) => { if (v) scrub.push(String(v)); });
      if (masked(p.email)) p.email = r.email;
      if (action === "send_email" && masked(p.to)) p.to = r.email;
      if (["send_sms", "twilio_call", "aircall_call"].includes(action) && masked(p.to)) p.to = r.phone;
      if (action === "send_whatsapp" && masked(p.to)) p.to = r.whatsapp || r.phone;
      if (masked(p.phone_number)) p.phone_number = r.phone;
      if (action === "twilio_call" && p.record_call) {
        const kind = rec.table === "contacts" ? "contact" : "lead";
        const sig = await hmacHex(serviceRoleKey, `twilio|${visible.org_id}|${callerId}|${kind}|${rec.id}`);
        p.callback_url = `${FN_BASE}/events-ingest?provider=twilio&org=${visible.org_id}&user=${callerId}&${kind}=${rec.id}&sig=${sig}`;
      }
    }
    if (!isInternalCall && (action === "twilio_call" || action === "aircall_call")) {
      const { data: me } = await supabaseClient.from("profiles").select("phone, email").eq("id", callerId).maybeSingle();
      p.agent_phone = me?.phone || "";
      p.agent_email = me?.email || callerEmail || "";
    }

    const result = await handler.run(integ.config as Record<string, string>, p);
    // Never echo a resolved e-mail/phone back to a browser that may not see it.
    for (const v of scrub) if (v.length > 3) result.msg = result.msg.split(v).join("•••");
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, msg: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
