// PayUnit settlement shared by payunit-verify (customer comes back) and
// payunit-webhook (PayUnit's notification). The intent row written by
// payunit-initialize says which org/plan/cycle the transaction is for; the
// status always comes from PayUnit's API, never from the request.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { getSecrets } from "./secrets.ts";
import { claimReceipt, nextPeriod, releaseReceipt } from "./receipts.ts";

export const PAYUNIT_BASE_URL = "https://gateway.payunit.net";

export async function payunitStatus(transactionId: string): Promise<string> {
  const k = await getSecrets(["PAYUNIT_API_USER", "PAYUNIT_API_PASSWORD", "PAYUNIT_API_KEY", "PAYUNIT_MODE"]);
  if (!k.PAYUNIT_API_USER || !k.PAYUNIT_API_PASSWORD || !k.PAYUNIT_API_KEY) throw new Error("PayUnit not configured");
  const res = await fetch(`${PAYUNIT_BASE_URL}/api/gateway/paymentstatus/${encodeURIComponent(transactionId)}`, {
    headers: {
      "x-api-key": k.PAYUNIT_API_KEY,
      "mode": k.PAYUNIT_MODE || "test",
      "Authorization": `Basic ${btoa(`${k.PAYUNIT_API_USER}:${k.PAYUNIT_API_PASSWORD}`)}`,
    },
  });
  const data = await res.json().catch(() => null);
  return String(data?.data?.transaction_status || data?.transaction_status || "PENDING").toUpperCase();
}

interface PayunitIntent { id: string; org_id: string; plan: string; billing_cycle: string; price_usd: number; status: string; reference: string }

export async function settlePayunit(admin: SupabaseClient, intent: PayunitIntent): Promise<{ ok: boolean; status: string; msg?: string }> {
  if (intent.status === "succeeded") return { ok: true, status: "SUCCESS" };
  const txStatus = await payunitStatus(intent.reference);

  if (txStatus === "SUCCESS") {
    const claim = await claimReceipt(admin, "payunit", intent.reference, intent.org_id, intent.plan, intent.billing_cycle);
    if (claim === "other") return { ok: false, status: "FAILED", msg: "This payment was already used by another organization." };
    if (claim === "new") {
      const { now, end } = await nextPeriod(admin, intent.org_id, intent.billing_cycle);
      const { error } = await admin.from("subscriptions").upsert({
        org_id: intent.org_id,
        plan: intent.plan,
        status: "active",
        price_cents: Math.round(Number(intent.price_usd) * 100),
        currency: "USD",
        billing_cycle: intent.billing_cycle,
        payment_provider: "payunit",
        payunit_transaction_id: intent.reference,
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
      }, { onConflict: "org_id" });
      if (error) {
        await releaseReceipt(admin, "payunit", intent.reference);
        return { ok: false, status: "PENDING", msg: error.message };
      }
      await admin.from("organizations").update({ plan: intent.plan }).eq("id", intent.org_id);
    }
    await admin.from("billing_payment_intents")
      .update({ status: "succeeded", provider_status: txStatus, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", intent.id);
    return { ok: true, status: txStatus };
  }

  if (["FAILED", "CANCELLED"].includes(txStatus)) {
    // Only the attempt fails; the org's current subscription is untouched.
    await admin.from("billing_payment_intents")
      .update({ status: "failed", provider_status: txStatus, updated_at: new Date().toISOString() })
      .eq("id", intent.id).eq("status", "pending");
  }
  return { ok: true, status: txStatus };
}
