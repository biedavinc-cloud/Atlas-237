import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// This is what makes the "schedule" trigger_type on a Workflow genuinely
// real instead of a stored-but-never-executed value. A pg_cron job
// (see migration 040) calls this function every 5 minutes via pg_net,
// authenticated with the real service role key (never exposed to a
// browser). No user session exists in this context, so every DB query
// below uses the service-role admin client and is explicitly scoped by
// each workflow's own org_id — never inferred from a session, since
// there isn't one.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WorkflowAction {
  type: string;
  title?: string;
  description?: string;
  due_in_days?: number;
  message?: string;
  event?: string;
  integration_id?: string;
  params?: Record<string, unknown>;
}

interface RunStep {
  action: string;
  ok: boolean;
  detail: string;
}

// Same small, real action vocabulary as src/lib/workflows.ts — kept in
// sync deliberately; adding an action type to one without the other means
// "Run now" and scheduled runs would disagree on what a workflow can do.
const INTEGRATION_ACTION_TYPES = new Set([
  "send_telegram", "send_sms", "mailchimp_subscribe", "send_whatsapp",
  "hubspot_upsert_contact", "freshdesk_create_ticket", "mollie_create_payment",
  "cinetpay_create_payment", "wave_create_checkout", "chapa_initialize",
  "campay_collect", "shopify_create_customer", "woocommerce_create_customer",
]);

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function triggerWebhooksForOrg(admin: ReturnType<typeof createClient>, orgId: string, event: string, data: Record<string, unknown>): Promise<{ ok: boolean; detail: string }> {
  const { data: hooks } = await admin.from("webhooks").select("id, url, secret").eq("org_id", orgId).eq("active", true).contains("events", [event]);
  if (!hooks || hooks.length === 0) return { ok: false, detail: `No active webhook subscribed to "${event}"` };
  let delivered = 0;
  for (const wh of hooks as { id: string; url: string; secret: string | null }[]) {
    try {
      const payload = { event, timestamp: new Date().toISOString(), data };
      const body = JSON.stringify(payload);
      const signature = wh.secret ? await hmacSha256Hex(wh.secret, body) : "";
      const res = await fetch(wh.url, { method: "POST", headers: { "Content-Type": "application/json", "X-Atlas-Signature": signature }, body });
      await admin.from("webhooks").update({ last_triggered_at: new Date().toISOString(), last_response_code: res.status }).eq("id", wh.id);
      if (res.ok) delivered++;
    } catch {
      // one endpoint failing must never block delivery to the others
    }
  }
  return { ok: delivered > 0, detail: `Delivered to ${delivered}/${hooks.length} subscribed webhook(s)` };
}

async function callIntegrationActionInternal(orgId: string, action: string, params: Record<string, unknown>, integrationId?: string): Promise<{ ok: boolean; msg: string }> {
  try {
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/integration-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({ action, params, integration_id: integrationId, org_id: orgId }),
    });
    const result = await res.json().catch(() => null);
    return { ok: Boolean(result?.ok), msg: result?.msg || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : "Request failed" };
  }
}

function computeNextRun(interval: string, from: Date): Date {
  const next = new Date(from);
  if (interval === "hourly") next.setHours(next.getHours() + 1);
  else if (interval === "weekly") next.setDate(next.getDate() + 7);
  else if (interval === "monthly") next.setMonth(next.getMonth() + 1);
  else next.setDate(next.getDate() + 1); // "daily" default
  return next;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") || "";
  if (!serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ ok: false, msg: "Forbidden — internal function" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);
  const now = new Date();

  const { data: due, error: dueErr } = await admin
    .from("workflows")
    .select("*")
    .eq("trigger_type", "schedule")
    .eq("enabled", true)
    .or(`next_run_at.is.null,next_run_at.lte.${now.toISOString()}`);

  if (dueErr) {
    return new Response(JSON.stringify({ ok: false, msg: dueErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: { workflow_id: string; status: string }[] = [];

  for (const wf of (due || []) as Record<string, unknown>[]) {
    const startedAt = new Date();
    const actions = (Array.isArray(wf.actions) ? wf.actions : []) as WorkflowAction[];
    const steps: RunStep[] = [];
    const orgId = wf.org_id as string;

    if (actions.length === 0) {
      steps.push({ action: "none", ok: false, detail: "No actions configured" });
    }

    for (const action of actions) {
      try {
        if (action.type === "create_task") {
          const dueDate = action.due_in_days ? new Date(Date.now() + action.due_in_days * 86400000).toISOString() : null;
          const { error } = await admin.from("tasks").insert({
            org_id: orgId,
            title: action.title || (wf.name as string),
            description: action.description || `Created by scheduled workflow "${wf.name}"`,
            due_date: dueDate,
            related_type: "workflow",
            related_id: wf.id,
            created_by: wf.created_by,
          });
          if (error) throw error;
          steps.push({ action: action.type, ok: true, detail: `Task "${action.title || wf.name}" created` });
        } else if (action.type === "create_notification") {
          const { error } = await admin.from("notifications").insert({
            org_id: orgId,
            user_id: wf.created_by,
            type: "workflow",
            title: action.title || (wf.name as string),
            message: action.message || null,
            link: "/app/ai-workflows",
          });
          if (error) throw error;
          steps.push({ action: action.type, ok: true, detail: `Notification "${action.title || wf.name}" sent` });
        } else if (action.type === "trigger_webhook") {
          if (!action.event) throw new Error("No event selected for this webhook action");
          const result = await triggerWebhooksForOrg(admin, orgId, action.event, { workflow_id: wf.id, workflow_name: wf.name, triggered_by: "schedule" });
          steps.push({ action: action.type, ok: result.ok, detail: result.detail });
        } else if (action.type === "call_custom_app") {
          if (!action.integration_id) throw new Error("No Custom App selected for this action");
          const result = await callIntegrationActionInternal(orgId, "call_custom_app", action.params || {}, action.integration_id);
          steps.push({ action: action.type, ok: result.ok, detail: result.msg });
        } else if (INTEGRATION_ACTION_TYPES.has(action.type)) {
          const result = await callIntegrationActionInternal(orgId, action.type, action.params || {});
          steps.push({ action: action.type, ok: result.ok, detail: result.msg });
        } else {
          steps.push({ action: action.type, ok: false, detail: `Unknown action type: ${action.type}` });
        }
      } catch (e) {
        steps.push({ action: action.type, ok: false, detail: e instanceof Error ? e.message : "Action failed" });
      }
    }

    const successCount = steps.filter((s) => s.ok).length;
    const status = successCount === steps.length && steps.length > 0 ? "success" : successCount === 0 ? "error" : "partial";
    const completedAt = new Date();

    await admin.from("workflow_runs").insert({
      org_id: orgId,
      workflow_id: wf.id,
      status: status === "error" ? "failed" : "completed",
      trigger_data: { scheduled: true, ran_at: startedAt.toISOString() },
      steps,
      error: status === "error" ? (steps.find((s) => !s.ok)?.detail ?? "All actions failed") : null,
      started_at: startedAt.toISOString(),
      completed_at: completedAt.toISOString(),
    });

    await admin.from("workflows").update({
      run_count: ((wf.run_count as number) || 0) + 1,
      next_run_at: computeNextRun(((wf.trigger_config as Record<string, unknown> | null)?.schedule_interval as string) || "daily", now).toISOString(),
    }).eq("id", wf.id as string);

    if (wf.agent_id && status !== "error") {
      const { data: agent } = await admin.from("ai_agents").select("usage_count").eq("id", wf.agent_id as string).maybeSingle();
      await admin.from("ai_agents").update({ usage_count: ((agent?.usage_count as number) || 0) + 1, last_active_at: completedAt.toISOString() }).eq("id", wf.agent_id as string);
    }

    results.push({ workflow_id: wf.id as string, status });
  }

  return new Response(JSON.stringify({ ok: true, checked: (due || []).length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
