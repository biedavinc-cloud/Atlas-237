// One provider payment = one subscription period (migration 049).
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type Claim = "new" | "same" | "other";

/** Records the payment reference. Only "new" may extend a subscription. */
export async function claimReceipt(admin: SupabaseClient, provider: string, reference: string, orgId: string, plan: string, cycle: string): Promise<Claim> {
  const { data, error } = await admin.rpc("claim_payment_receipt", { p_provider: provider, p_reference: reference, p_org: orgId, p_plan: plan, p_cycle: cycle });
  if (error) throw new Error(`Could not record the payment: ${error.message}`);
  return data as Claim;
}

/** Undo a claim when activation failed, so a retry can apply it. */
export async function releaseReceipt(admin: SupabaseClient, provider: string, reference: string) {
  await admin.from("payment_receipts").delete().eq("provider", provider).eq("reference", reference);
}

/** New period: a renewal while still active starts at the current end (no lost days). */
export async function nextPeriod(admin: SupabaseClient, orgId: string, cycle: string): Promise<{ now: Date; start: Date; end: Date }> {
  const now = new Date();
  const { data } = await admin.from("subscriptions").select("status, current_period_end").eq("org_id", orgId).maybeSingle();
  const currentEnd = data?.status === "active" && data.current_period_end ? new Date(data.current_period_end) : null;
  const start = currentEnd && currentEnd > now ? currentEnd : now;
  const end = new Date(start);
  if (cycle === "annual") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return { now, start, end };
}
