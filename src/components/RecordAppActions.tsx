import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, Plug, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useConnectedProviders, callIntegrationAction } from '@/lib/integrations';
import { logActivity, type ActivityTarget } from '@/lib/activityLog';
import { BrandLogo } from '@/components/BrandLogos';

interface Person {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

type ActionKey = 'hubspot' | 'mailchimp' | 'shopify' | 'woocommerce';

const ACTIONS: { key: ActionKey; action: string; name: string; fr: string; en: string }[] = [
  { key: 'hubspot', action: 'hubspot_upsert_contact', name: 'HubSpot', fr: 'Envoyer vers HubSpot', en: 'Push to HubSpot' },
  { key: 'mailchimp', action: 'mailchimp_subscribe', name: 'Mailchimp', fr: 'Ajouter à l’audience Mailchimp', en: 'Add to Mailchimp audience' },
  { key: 'shopify', action: 'shopify_create_customer', name: 'Shopify', fr: 'Créer le client Shopify', en: 'Create Shopify customer' },
  { key: 'woocommerce', action: 'woocommerce_create_customer', name: 'WooCommerce', fr: 'Créer le client WooCommerce', en: 'Create WooCommerce customer' },
];

const MAILCHIMP_LIST_KEY = 'atlas.mailchimp.list_id';

function readList(): string {
  try { return localStorage.getItem(MAILCHIMP_LIST_KEY) || ''; } catch { return ''; }
}

/**
 * The connected apps that can act on this person, right on their record:
 * push to HubSpot, subscribe to Mailchimp, create the customer in Shopify or
 * WooCommerce. Each one is a real call through integration-action and is
 * logged on the timeline when it succeeds. Shows only connected apps; with
 * none, it says which apps would add actions here.
 */
export function RecordAppActions({ person, target }: { person: Person; target: ActivityTarget }) {
  const { language } = useAuth();
  const fr = language === 'fr';
  const { connected, loading } = useConnectedProviders();
  const [busy, setBusy] = useState<ActionKey | null>(null);
  const [results, setResults] = useState<Partial<Record<ActionKey, { ok: boolean; msg: string }>>>({});
  const [listId, setListId] = useState(readList);

  const available = ACTIONS.filter(a => connected.has(a.key));
  const email = (person.email || '').trim();

  async function run(a: (typeof ACTIONS)[number]) {
    if (!email) return;
    setBusy(a.key);
    const first = person.first_name || '';
    const last = person.last_name || '';
    const params: Record<string, string> =
      a.key === 'hubspot' ? { email, firstname: first, lastname: last }
      : a.key === 'mailchimp' ? { email, list_id: listId.trim() }
      : { email, first_name: first, last_name: last };
    if (a.key === 'mailchimp') { try { localStorage.setItem(MAILCHIMP_LIST_KEY, listId.trim()); } catch { /* private mode */ } }
    const res = await callIntegrationAction(a.action, params);
    setResults(r => ({ ...r, [a.key]: res }));
    if (res.ok) await logActivity(target, 'note', fr ? `${a.fr} — fait` : `${a.en} — done`, `${a.name}: ${res.msg}`, { integration: a.key });
    setBusy(null);
  }

  if (loading) return null;

  return (
    <section className="card p-5">
      <h2 className="card-title mb-1">{fr ? 'Apps connectées' : 'Connected apps'}</h2>
      {available.length === 0 ? (
        <p className="text-sm text-ink-500">
          {fr
            ? 'Connectez HubSpot, Mailchimp, Shopify ou WooCommerce pour agir sur cette fiche en un clic. WhatsApp, SMS et email apparaissent dans les boutons du haut.'
            : 'Connect HubSpot, Mailchimp, Shopify or WooCommerce to act on this record in one click. WhatsApp, SMS and email show up in the buttons above.'}
          {' '}
          <Link to="/app/marketplace" className="inline-flex items-center gap-0.5 font-semibold text-primary-700 hover:underline">
            {fr ? 'Voir les apps' : 'Browse apps'} <ArrowUpRight size={13} />
          </Link>
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {!email && <p className="text-xs text-warning-700">{fr ? 'Ajoutez un email à cette fiche pour utiliser ces actions.' : 'Add an email to this record to use these actions.'}</p>}
          {available.map(a => {
            const r = results[a.key];
            return (
              <div key={a.key} className="rounded-lg border border-ink-100 p-3">
                <div className="flex items-center gap-2">
                  <BrandLogo provider={a.key} size={18} />
                  <span className="flex-1 text-sm font-semibold text-ink-800">{fr ? a.fr : a.en}</span>
                </div>
                {a.key === 'mailchimp' && (
                  <input className="input mt-2 text-sm" value={listId} onChange={e => setListId(e.target.value)} placeholder={fr ? 'ID de l’audience (ex. a1b2c3d4e5)' : 'Audience ID (e.g. a1b2c3d4e5)'} />
                )}
                <button
                  onClick={() => run(a)}
                  disabled={!email || busy !== null || (a.key === 'mailchimp' && !listId.trim())}
                  className="btn-secondary btn-sm mt-2 w-full"
                >
                  {busy === a.key ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />} {fr ? 'Lancer' : 'Run'}
                </button>
                {r && (
                  <p className={`mt-2 flex items-start gap-1.5 text-xs ${r.ok ? 'text-success-700' : 'text-error-700'}`}>
                    {r.ok ? <CheckCircle2 size={13} className="mt-0.5 flex-none" /> : <AlertCircle size={13} className="mt-0.5 flex-none" />}
                    <span>{r.msg}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
