import { useCallback, useEffect, useState } from 'react';
import { Radio, PhoneCall } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { usePlanAccess } from '@/lib/plans';
import { formatAmount } from '@/lib/i18n-countries';

interface LiveEvent { id: string; event_type: string; title: string | null; amount: number | null; currency: string | null; occurred_at: string }
interface CallRow { id: string; title: string; created_at: string; metadata: { recording_url?: string | null; duration?: number | null; direction?: string | null } | null }

/**
 * Contact aside: what the customer just did on outside platforms (trading
 * back office, shop, app — customer_events) and recorded calls with an
 * audio player. Updates live through Supabase Realtime.
 */
export function CustomerLiveCard({ contactId }: { contactId: string }) {
  const { language } = useAuth();
  const fr = language === 'fr';
  const { hasFeature } = usePlanAccess();
  const live = hasFeature('liveEvents');
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [calls, setCalls] = useState<CallRow[]>([]);

  const load = useCallback(async () => {
    const [ev, ca] = await Promise.all([
      live ? supabase.from('customer_events').select('id,event_type,title,amount,currency,occurred_at').eq('contact_id', contactId).order('occurred_at', { ascending: false }).limit(15) : Promise.resolve({ data: [] }),
      supabase.from('activities').select('id,title,created_at,metadata').eq('contact_id', contactId).eq('type', 'call').order('created_at', { ascending: false }).limit(10),
    ]);
    setEvents((ev.data || []) as LiveEvent[]);
    setCalls(((ca.data || []) as CallRow[]).filter(c => c.metadata?.recording_url || c.metadata?.duration));
  }, [contactId, live]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!live) return;
    const ch = supabase.channel(`contact-events-${contactId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'customer_events', filter: `contact_id=eq.${contactId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel?.(ch); };
  }, [contactId, live, load]);

  if (!events.length && !calls.length) return null;
  const when = (d: string) => new Date(d).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' });
  const secs = (n?: number | null) => (n ? `${Math.floor(n / 60)} min ${String(Math.round(n % 60)).padStart(2, '0')} s` : '');

  return (
    <section className="card">
      <div className="card-header"><h2 className="card-title flex items-center gap-2"><Radio size={15} className="text-primary-600" /> {fr ? 'Activité en direct & appels' : 'Live activity & calls'}</h2></div>
      <ul className="divide-y divide-ink-100">
        {events.map(e => (
          <li key={e.id} className="flex items-start justify-between gap-3 px-5 py-2.5 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium text-ink-800">{e.title || e.event_type}</span>
              <span className="text-xs text-ink-500">{e.event_type} · {when(e.occurred_at)}</span>
            </span>
            {e.amount != null && <span className="flex-none font-semibold tabular text-ink-800">{formatAmount(e.amount, e.currency || 'USD', language)}</span>}
          </li>
        ))}
        {calls.map(c => (
          <li key={c.id} className="px-5 py-2.5 text-sm">
            <span className="flex items-center gap-2 font-medium text-ink-800"><PhoneCall size={13} className="text-ink-400" /> {c.title}</span>
            <span className="text-xs text-ink-500">{when(c.created_at)}{c.metadata?.duration ? ` · ${secs(c.metadata.duration)}` : ''}</span>
            {c.metadata?.recording_url && /^https:\/\//.test(c.metadata.recording_url) && (
              <audio controls preload="none" className="mt-2 h-9 w-full" src={c.metadata.recording_url}>
                <a href={c.metadata.recording_url}>{fr ? 'Écouter' : 'Listen'}</a>
              </audio>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
