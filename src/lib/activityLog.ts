import { supabase } from '@/lib/supabase';

/** A record whose activity timeline an action should be written to. */
export type ActivityTarget = { fk: 'contact_id' | 'company_id' | 'deal_id' | 'lead_id'; id: string };

export const ACTIVITY_EVENT = 'atlas:activity-logged';

/**
 * Writes a completed activity on a record (an email really sent, a contact
 * really pushed to HubSpot…) so the timeline shows what was done through
 * connected apps, then tells any open timeline to reload.
 */
export async function logActivity(target: ActivityTarget, type: string, title: string, description: string, metadata: Record<string, unknown> = {}) {
  const { data: auth } = await supabase.auth.getUser();
  await supabase.from('activities').insert({
    type,
    title: title.slice(0, 200),
    description,
    [target.fk]: target.id,
    status: 'completed',
    completed_at: new Date().toISOString(),
    performed_by: 'user',
    user_id: auth?.user?.id || null,
    metadata,
  });
  window.dispatchEvent(new CustomEvent(ACTIVITY_EVENT, { detail: target }));
}
