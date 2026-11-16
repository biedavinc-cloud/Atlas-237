import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getSecret } from "../_shared/secrets.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ---------------------------------------------------------------------------
// Speed: answers are streamed token by token (Server-Sent Events) when the
// client asks for { stream: true }, so the first words show up in well under
// a second instead of after the whole answer is generated. Gemini 3 models
// "think" at a high level by default; a CRM question doesn't need that, so
// they run with thinkingLevel "minimal" (2.5 models: thinkingBudget 0).
// ---------------------------------------------------------------------------

type TextStream = AsyncGenerator<string, void, unknown>;
class ProviderError extends Error {}

/** Parses an SSE body and yields each `data:` payload. */
async function* sseData(res: Response): AsyncGenerator<string, void, unknown> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).replace(/\r$/, "");
      buf = buf.slice(idx + 1);
      if (line.startsWith("data:")) yield line.slice(5).trim();
    }
  }
  if (buf.startsWith("data:")) yield buf.slice(5).trim();
}

async function anthropicStream(apiKey: string, system: string, question: string): Promise<TextStream> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 400, stream: true, system, messages: [{ role: "user", content: question }] }),
  });
  if (!res.ok) throw new ProviderError(`Anthropic error: ${(await res.text()).slice(0, 200)}`);
  return (async function* () {
    for await (const d of sseData(res)) {
      try { const e = JSON.parse(d); if (e.type === "content_block_delta" && e.delta?.text) yield e.delta.text; } catch { /* keep-alive */ }
    }
  })();
}

async function openaiStream(apiKey: string, system: string, question: string): Promise<TextStream> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: 400, stream: true, messages: [{ role: "system", content: system }, { role: "user", content: question }] }),
  });
  if (!res.ok) throw new ProviderError(`OpenAI error: ${(await res.text()).slice(0, 200)}`);
  return (async function* () {
    for await (const d of sseData(res)) {
      if (d === "[DONE]") return;
      try { const t = JSON.parse(d).choices?.[0]?.delta?.content; if (t) yield t; } catch { /* ignore */ }
    }
  })();
}

// Google periodically retires older Gemini model IDs (gemini-2.0-flash was
// shut down on 2026-06-01, which broke a hardcoded name with a hard 404).
// Candidates are tried in order and only a 404 / "not found" moves to the
// next one; any other failure (bad key, quota, policy) surfaces at once.
// The first model that works is remembered for the life of the instance, so
// the fallback costs a round trip once, not on every question.
const GEMINI_MODEL_CANDIDATES = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3-flash-preview", "gemini-2.5-flash", "gemini-flash-latest"];
let workingGeminiModel: string | null = null;

function thinkingFor(model: string): Record<string, unknown> | undefined {
  if (/^gemini-3/.test(model)) return { thinkingLevel: "minimal" };
  if (/^gemini-2\.5-flash/.test(model)) return { thinkingBudget: 0 };
  return undefined;
}

async function geminiStream(apiKey: string, system: string, question: string): Promise<TextStream> {
  const order = workingGeminiModel ? [workingGeminiModel, ...GEMINI_MODEL_CANDIDATES.filter((m) => m !== workingGeminiModel)] : GEMINI_MODEL_CANDIDATES;
  let lastErr = "";
  for (const model of order) {
    const thinkingConfig = thinkingFor(model);
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: question }] }],
        generationConfig: { maxOutputTokens: 400, ...(thinkingConfig ? { thinkingConfig } : {}) },
      }),
    });
    if (res.ok) {
      workingGeminiModel = model;
      return (async function* () {
        for await (const d of sseData(res)) {
          try {
            const parts = JSON.parse(d).candidates?.[0]?.content?.parts || [];
            for (const p of parts) if (p.text && !p.thought) yield p.text;
          } catch { /* ignore */ }
        }
      })();
    }
    const bodyText = await res.text();
    lastErr = `Gemini error: ${bodyText.slice(0, 200)}`;
    const retirable = res.status === 404 || /no longer available|not found/i.test(bodyText);
    if (!retirable) throw new ProviderError(lastErr);
    if (workingGeminiModel === model) workingGeminiModel = null;
  }
  throw new ProviderError(lastErr);
}

/** Reads the caller's user id from their JWT; the queries below run under
 *  that same JWT, so PostgREST verifies it (a forged token reads nothing). */
function jwtSub(authHeader: string): string | null {
  try {
    const payload = authHeader.replace(/^Bearer\s+/i, "").split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.sub === "string" ? json.sub : null;
  } catch { return null; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const userId = jwtSub(authHeader);
    if (!userId) return json({ ok: false, msg: "Not authenticated" }, 401);
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { question, language, stream } = await req.json();
    if (!question || typeof question !== "string") return json({ ok: false, msg: "Missing question" }, 400);

    // RLS checks the JWT here: an invalid or forged token gets no profile.
    const { data: profile } = await supabaseClient.from("profiles").select("org_id").eq("id", userId).maybeSingle();
    if (!profile?.org_id) return json({ ok: false, msg: "Not authenticated" }, 401);

    // Org settings, CRM snapshot and the platform key load in parallel. The
    // snapshot RPC runs under the caller's RLS (SECURITY INVOKER), so it
    // only ever sees this org's own data.
    const [{ data: org }, { data: snapshot }, freeKey] = await Promise.all([
      supabaseClient.from("organizations").select("ai_provider").eq("id", profile.org_id).maybeSingle(),
      supabaseClient.rpc("get_ai_context_snapshot", { target_org_id: profile.org_id }),
      getSecret("GEMINI_API_KEY"),
    ]);
    const provider = org?.ai_provider || "platform_free";

    const totalRevenue = Number(snapshot?.total_revenue) || 0;
    const docs = (snapshot?.knowledge_docs || []) as { title: string; category: string | null; description: string | null }[];
    const knowledgeSection = docs.length
      ? `\n\nKnowledge Base entries on file (titles/descriptions only — no full file text is available, so don't claim to quote or fully summarize their contents):\n${docs.map(d => `- "${d.title}"${d.category ? ` [${d.category}]` : ''}${d.description ? `: ${d.description}` : ''}`).join('\n')}`
      : '';
    const context = `Live CRM snapshot for this user's organization (use these real numbers, do not invent data):
- Contacts: ${snapshot?.contacts_count ?? 0}
- Leads: ${snapshot?.leads_count ?? 0} total, ${snapshot?.hot_leads_count ?? 0} hot/unconverted
- Deals: ${snapshot?.deals_count ?? 0} total, ${snapshot?.open_deals_count ?? 0} open
- Invoices: ${snapshot?.invoices_count ?? 0} total, ${snapshot?.unpaid_invoices_count ?? 0} unpaid
- Tickets: ${snapshot?.tickets_count ?? 0} total, ${snapshot?.open_tickets_count ?? 0} open
- Collected revenue: ${totalRevenue}${knowledgeSection}`;

    const langName = language === "fr" ? "French" : language === "es" ? "Spanish" : language === "pt" ? "Portuguese" : language === "ar" ? "Arabic" : "English";
    const system = `You are Atlas, the AI assistant embedded in Atlas CRM. Answer the user's question about their business concisely (2-4 sentences), grounded strictly in the CRM snapshot and Knowledge Base entries provided — never invent numbers or claim to know document contents beyond what's given. Reply in ${langName}. If the question is unrelated to the CRM data available, answer helpfully and briefly as a general CRM assistant.\n\n${context}`;

    let tokens: TextStream;
    try {
      if (provider === "platform_free") {
        if (!freeKey) return json({ ok: false, msg: "AI assistant not configured (missing GEMINI_API_KEY)" }, 501);
        tokens = await geminiStream(freeKey, system, question);
      } else if (["openai", "anthropic", "gemini"].includes(provider)) {
        const { data: integration } = await supabaseClient
          .from("integrations").select("config").eq("org_id", profile.org_id).eq("provider", provider).eq("status", "connected").maybeSingle();
        const byokKey = (integration?.config as { api_key?: string } | null)?.api_key;
        if (!byokKey) return json({ ok: false, msg: `No ${provider} API key connected. Connect one in Integrations, or switch back to the free plan.` }, 400);
        tokens = provider === "openai" ? await openaiStream(byokKey, system, question)
          : provider === "anthropic" ? await anthropicStream(byokKey, system, question)
          : await geminiStream(byokKey, system, question);
      } else {
        return json({ ok: false, msg: `Unknown AI provider: ${provider}` }, 400);
      }
    } catch (e) {
      if (e instanceof ProviderError) return json({ ok: false, msg: e.message }, 502);
      throw e;
    }

    if (stream) {
      const enc = new TextEncoder();
      const body = new ReadableStream({
        async start(controller) {
          try {
            for await (const t of tokens) controller.enqueue(enc.encode(`data: ${JSON.stringify({ t })}\n\n`));
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          } catch (e) {
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: e instanceof Error ? e.message : String(e) })}\n\n`));
          } finally {
            controller.close();
          }
        },
      });
      return new Response(body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" } });
    }

    let text = "";
    for await (const t of tokens) text += t;
    return json({ ok: true, text });
  } catch (e) {
    return json({ ok: false, msg: e instanceof Error ? e.message : String(e) }, 500);
  }
});
