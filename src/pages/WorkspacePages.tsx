import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck, EyeOff, Users, Briefcase, Plus, Trash2, Save, Loader2, Globe, Mail, Radio, KeyRound, Copy, Check,
  Shuffle, Upload, BarChart3, PhoneCall, Star, Link2, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { usePlanAccess } from '@/lib/plans';
import { UpgradeGate } from '@/components/UpgradeGate';
import { PageHeader, Badge } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { ImportModal } from '@/components/ListPage';
import { QuickEmailButton } from '@/components/QuickEmailButton';
import { leadFields, contactFields } from '@/lib/entityFields';
import { readTable } from '@/lib/pii';
import { loadPublicConfig, publicKey } from '@/lib/platformConfig';
import { formatAmount } from '@/lib/i18n-countries';
import { Logo } from '@/components/Logo';
import {
  INDUSTRY_PRESETS, ROLE_LABELS, useWorkspaceSettings, useCustomFormFields, canManageTeam, canSupervise,
  type CustomField, type WorkspaceSettings, type Role,
} from '@/lib/workspace';

const SUPERVISABLE: Role[] = ['manager', 'qc', 'sales', 'support', 'finance', 'marketing', 'agent', 'member'];

function useTeam() {
  const [team, setTeam] = useState<{ id: string; first_name: string | null; last_name: string | null; email: string; role: string; active: boolean }[]>([]);
  useEffect(() => {
    supabase.from('profiles').select('id,first_name,last_name,email,role,active').order('first_name').then(({ data }) => setTeam((data || []) as typeof team));
  }, []);
  return team;
}
const personName = (p: { first_name: string | null; last_name: string | null; email: string }) => `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email;

function CopyText({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1800); }}
      className="btn-icon h-8 w-8" aria-label="Copy">{ok ? <Check size={14} /> : <Copy size={14} />}</button>
  );
}

function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-ink-800">
      <span className="relative inline-flex">
        <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-ink-200 transition peer-checked:bg-primary-600 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-400 peer-disabled:opacity-50" />
        <span className="absolute start-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5 rtl:peer-checked:-translate-x-5" />
      </span>
      {label}
    </label>
  );
}

/* ═════════════════ Workspace settings (Pro & Enterprise) ═════════════════ */

export function WorkspaceSettingsPage() {
  const { language, profile, organization, refreshOrg } = useAuth();
  const fr = language === 'fr';
  const { hasFeature } = usePlanAccess();
  const current = useWorkspaceSettings();
  const [ws, setWs] = useState<WorkspaceSettings>(current);
  const [slug, setSlug] = useState(String((organization as unknown as { slug?: string })?.slug || ''));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [domainState, setDomainState] = useState<{ ok: boolean; msg: string } | null>(null);
  const [cfgReady, setCfgReady] = useState(false);
  const canEdit = ['owner', 'admin'].includes(profile?.role || '');

  useEffect(() => { setWs(current); }, [current]);
  useEffect(() => { loadPublicConfig().then(() => setCfgReady(true)); }, []);

  if (!hasFeature('workspaceControls')) return <UpgradeGate language={language} feature={fr ? 'Espace de travail sur mesure' : 'Custom workspace'} minPlan="pro" />;

  const rootDomain = cfgReady ? publicKey('TENANT_ROOT_DOMAIN') : undefined;
  const inboundDomain = cfgReady ? publicKey('INBOUND_EMAIL_DOMAIN') : undefined;
  const savedSlug = String((organization as unknown as { slug?: string })?.slug || '');

  const set = (patch: Partial<WorkspaceSettings>) => setWs((w) => ({ ...w, ...patch }));
  const toggleRole = (key: 'pii_roles' | 'supervisor_roles', r: Role) => {
    const list = ws[key] || ['manager', 'qc'];
    set({ [key]: list.includes(r) ? list.filter((x) => x !== r) : [...list, r] } as Partial<WorkspaceSettings>);
  };

  function applyPreset(id: string) {
    const preset = INDUSTRY_PRESETS.find((p) => p.id === id);
    const existing = ws.custom_fields || [];
    const merged = [...existing, ...(preset?.fields || []).filter((f) => !existing.some((e) => e.key === f.key))];
    set({ industry: id, custom_fields: merged });
  }

  async function save() {
    setSaving(true); setMsg(null);
    const cleanFields = (ws.custom_fields || []).filter((f) => f.key && f.label).map((f) => ({ ...f, key: f.key.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40) }));
    const { error } = await supabase.rpc('update_workspace_settings', { p_settings: { ...ws, custom_fields: cleanFields } });
    if (!error && slug.trim().toLowerCase() !== savedSlug) {
      const { error: sErr } = await supabase.rpc('set_org_slug', { p_slug: slug.trim().toLowerCase() });
      if (sErr) { setMsg({ ok: false, text: sErr.message }); setSaving(false); return; }
    }
    await refreshOrg();
    setSaving(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: fr ? 'Réglages enregistrés. Ils s’appliquent tout de suite à toute l’équipe.' : 'Settings saved. They apply to the whole team right away.' });
  }

  async function activateAddress() {
    setDomainState(null);
    const { data: s } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tenant-domain`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.session?.access_token || ''}` }, body: JSON.stringify({ lang: language }),
    }).then((r) => r.json()).catch(() => null);
    setDomainState({ ok: Boolean(res?.ok), msg: res?.msg || (fr ? 'Activation impossible pour le moment.' : 'Could not activate right now.') });
  }

  const fields = ws.custom_fields || [];
  const updateField = (i: number, patch: Partial<CustomField>) => set({ custom_fields: fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) });

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title={fr ? 'Espace de travail' : 'Workspace'} subtitle={fr ? 'Adaptez Atlas à votre métier et décidez qui voit quoi. Les règles sont appliquées par la base de données, pas seulement à l’écran.' : 'Fit Atlas to your trade and decide who sees what. Rules are enforced by the database, not just on screen.'}
        actions={canEdit ? <button onClick={save} disabled={saving} className="btn-primary btn-sm">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {fr ? 'Enregistrer' : 'Save'}</button> : undefined} />
      {!canEdit && <p className="rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-600">{fr ? 'Seuls le propriétaire et les administrateurs peuvent modifier ces réglages.' : 'Only the owner and admins can change these settings.'}</p>}
      {msg && <p className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${msg.ok ? 'bg-success-50 text-success-700' : 'bg-error-50 text-error-700'}`}>{msg.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}{msg.text}</p>}

      <section className="card p-5">
        <h2 className="card-title flex items-center gap-2"><Briefcase size={16} /> {fr ? 'Votre secteur' : 'Your industry'}</h2>
        <p className="mt-1 text-sm text-ink-600">{fr ? 'Ajoute les champs utiles à votre métier sur les fiches contacts et leads. Vous pouvez ensuite les modifier.' : 'Adds the fields your trade needs to contact and lead records. You can edit them afterwards.'}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {INDUSTRY_PRESETS.map((p) => (
            <button key={p.id} type="button" disabled={!canEdit} onClick={() => applyPreset(p.id)}
              className={`rounded-lg border px-3 py-2.5 text-start text-sm transition ${ws.industry === p.id ? 'border-primary-500 bg-primary-50 font-semibold text-primary-800' : 'border-ink-200 hover:border-ink-300'}`}>
              {fr ? p.fr : p.en}
            </button>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="card-title flex items-center gap-2"><EyeOff size={16} /> {fr ? 'Masquer les coordonnées des clients' : 'Hide customer contact details'}</h2>
        <p className="mt-1 text-sm text-ink-600">{fr ? 'Les agents voient « j•••@g•••.com » et « +237 ••• ••56 », mais peuvent quand même appeler, écrire sur WhatsApp, envoyer un SMS ou un e-mail depuis la fiche : Atlas utilise le vrai numéro côté serveur sans le leur montrer. Les exports CSV sont masqués aussi.' : 'Agents see "j•••@g•••.com" and "+237 ••• ••56", yet can still call, WhatsApp, text or e-mail from the record: Atlas uses the real number server side without showing it. CSV exports are masked too.'}</p>
        <div className="mt-4"><Toggle disabled={!canEdit} checked={Boolean(ws.mask_pii)} onChange={(v) => set({ mask_pii: v })} label={fr ? 'Activer le masquage' : 'Turn masking on'} /></div>
        {ws.mask_pii && (
          <fieldset className="mt-4">
            <legend className="label">{fr ? 'Rôles qui voient les vraies coordonnées (propriétaire et admins : toujours)' : 'Roles that see real details (owner and admins: always)'}</legend>
            <div className="flex flex-wrap gap-2">
              {SUPERVISABLE.map((r) => (
                <label key={r} className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-1.5 text-sm">
                  <input type="checkbox" disabled={!canEdit} checked={(ws.pii_roles || ['manager', 'qc']).includes(r)} onChange={() => toggleRole('pii_roles', r)} />
                  {ROLE_LABELS[r][fr ? 'fr' : 'en']}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </section>

      <section className="card p-5">
        <h2 className="card-title flex items-center gap-2"><Users size={16} /> {fr ? 'Portefeuilles par agent' : 'Per-agent portfolios'}</h2>
        <p className="mt-1 text-sm text-ink-600">{fr ? 'Chaque agent ne voit que ses contacts, leads et affaires (ceux qui lui sont attribués), avec leur historique et leurs e-mails. Les rôles cochés ci-dessous voient tous les portefeuilles.' : 'Each agent only sees their own contacts, leads and deals (the ones assigned to them), with their history and e-mails. The roles ticked below see every portfolio.'}</p>
        <div className="mt-4"><Toggle disabled={!canEdit} checked={Boolean(ws.portfolio_mode)} onChange={(v) => set({ portfolio_mode: v })} label={fr ? 'Activer les portefeuilles' : 'Turn portfolios on'} /></div>
        {ws.portfolio_mode && (
          <fieldset className="mt-4">
            <legend className="label">{fr ? 'Rôles qui voient tous les portefeuilles (propriétaire et admins : toujours)' : 'Roles that see every portfolio (owner and admins: always)'}</legend>
            <div className="flex flex-wrap gap-2">
              {SUPERVISABLE.map((r) => (
                <label key={r} className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-1.5 text-sm">
                  <input type="checkbox" disabled={!canEdit} checked={(ws.supervisor_roles || ['manager', 'qc']).includes(r)} onChange={() => toggleRole('supervisor_roles', r)} />
                  {ROLE_LABELS[r][fr ? 'fr' : 'en']}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <p className="mt-4 text-xs text-ink-500">{fr ? 'Les rôles se donnent dans Équipe → Employés (Manager, QC, Agent…). Distribuez ensuite les leads dans ' : 'Roles are set in Team → Employees (Manager, QC, Agent…). Then hand out leads in '}<Link className="text-primary-700 hover:underline" to="/app/distribution">{fr ? 'Distribution' : 'Distribution'}</Link>.</p>
      </section>

      <section className="card p-5">
        <h2 className="card-title flex items-center gap-2"><ShieldCheck size={16} /> {fr ? 'Champs personnalisés' : 'Custom fields'}</h2>
        <p className="mt-1 text-sm text-ink-600">{fr ? 'Apparaissent dans les formulaires, les fiches et l’import de fichiers.' : 'Show up in forms, records and file imports.'}</p>
        <div className="mt-4 space-y-2">
          {fields.map((f, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-ink-100 p-3 sm:grid-cols-[1fr_9rem_1fr_auto] sm:items-center">
              <input className="input" disabled={!canEdit} value={f.label} placeholder={fr ? 'Nom du champ' : 'Field name'}
                onChange={(e) => updateField(i, { label: e.target.value, key: f.key || e.target.value.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') })} />
              <select className="input" disabled={!canEdit} value={f.type} onChange={(e) => updateField(i, { type: e.target.value as CustomField['type'] })}>
                <option value="text">{fr ? 'Texte' : 'Text'}</option><option value="number">{fr ? 'Nombre' : 'Number'}</option>
                <option value="date">Date</option><option value="select">{fr ? 'Liste' : 'List'}</option>
              </select>
              {f.type === 'select'
                ? <input className="input" disabled={!canEdit} value={(f.options || []).join(', ')} placeholder={fr ? 'Choix séparés par des virgules' : 'Choices, comma separated'} onChange={(e) => updateField(i, { options: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} />
                : <span className="flex gap-3 text-sm text-ink-600">
                    {(['contacts', 'leads'] as const).map((tb) => (
                      <label key={tb} className="inline-flex items-center gap-1.5"><input type="checkbox" disabled={!canEdit} checked={f.applies.includes(tb)}
                        onChange={() => updateField(i, { applies: f.applies.includes(tb) ? f.applies.filter((x) => x !== tb) : [...f.applies, tb] })} />{tb === 'contacts' ? 'Contacts' : 'Leads'}</label>
                    ))}
                  </span>}
              {canEdit && <button type="button" className="btn-icon hover:text-error-600" onClick={() => set({ custom_fields: fields.filter((_, j) => j !== i) })} aria-label={fr ? 'Supprimer' : 'Remove'}><Trash2 size={15} /></button>}
            </div>
          ))}
          {canEdit && <button type="button" className="btn-secondary btn-sm" onClick={() => set({ custom_fields: [...fields, { key: '', label: '', type: 'text', applies: ['contacts', 'leads'] }] })}><Plus size={14} /> {fr ? 'Ajouter un champ' : 'Add a field'}</button>}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="card-title flex items-center gap-2"><Globe size={16} /> {fr ? 'Adresse dédiée de votre entreprise' : 'Your company’s own address'}</h2>
        <p className="mt-1 text-sm text-ink-600">{fr ? 'Votre équipe se connecte sur une page à votre nom et à votre logo, puis arrive sur votre tableau de bord.' : 'Your team signs in on a page with your name and logo, then lands on your dashboard.'}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input className="input max-w-xs" disabled={!canEdit} value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="moncompany" maxLength={32} />
          <span className="text-sm font-semibold text-ink-700">.{rootDomain || 'liafrik.com'}</span>
        </div>
        {savedSlug && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <a className="font-semibold text-primary-700 hover:underline" href={`https://${savedSlug}.${rootDomain || 'liafrik.com'}`} target="_blank" rel="noreferrer">https://{savedSlug}.{rootDomain || 'liafrik.com'}</a>
            {canEdit && <button type="button" onClick={activateAddress} className="btn-secondary btn-sm">{fr ? 'Activer / vérifier l’adresse' : 'Activate / check the address'}</button>}
          </div>
        )}
        {domainState && <p className={`mt-2 text-sm ${domainState.ok ? 'text-success-700' : 'text-error-700'}`}>{domainState.msg}</p>}
      </section>

      {inboundDomain && savedSlug && (
        <section className="card p-5">
          <h2 className="card-title flex items-center gap-2"><Mail size={16} /> {fr ? 'E-mails de vos clients' : 'E-mails from your customers'}</h2>
          <p className="mt-1 text-sm text-ink-600">{fr ? 'Faites suivre la boîte de votre service client vers l’adresse ci-dessous (ou mettez-la en copie). Chaque e-mail arrive sur la fiche du client et chez l’agent qui a ce client dans son portefeuille ; son manager, le QC et le CRM manager le voient aussi, ses collègues non.' : 'Forward your customer-service mailbox to the address below (or cc it). Each e-mail lands on the customer record and with the agent who owns that customer; their manager, QC and the CRM manager see it too, their colleagues don’t.'}</p>
          <div className="mt-3 flex items-center gap-2 font-mono text-sm text-ink-800">{savedSlug}@{inboundDomain} <CopyText text={`${savedSlug}@${inboundDomain}`} /></div>
        </section>
      )}
    </div>
  );
}

/* ═════════════════ Live customer activity + event sources ═════════════════ */

interface EventSource { id: string; name: string; kind: string; key_prefix: string; active: boolean; auto_create_contacts: boolean; last_event_at: string | null; created_at: string }
interface CustomerEvent { id: string; event_type: string; title: string | null; amount: number | null; currency: string | null; occurred_at: string; contact_id: string | null; source_id: string | null; contact?: { first_name: string; last_name: string } | null }

const SOURCE_KINDS: { id: string; fr: string; en: string }[] = [
  { id: 'trading', fr: 'Plateforme de trading / back-office financier', en: 'Trading platform / financial back office' },
  { id: 'zanldo', fr: 'Zanldo (boutique en ligne)', en: 'Zanldo (online store)' },
  { id: 'aircall', fr: 'Aircall (appels + enregistrements)', en: 'Aircall (calls + recordings)' },
  { id: 'ringover', fr: 'Ringover (appels + enregistrements)', en: 'Ringover (calls + recordings)' },
  { id: 'custom', fr: 'Autre app / site (webhook)', en: 'Other app / site (webhook)' },
];

async function sha256(text: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function LiveActivityPage() {
  const { language, profile } = useAuth();
  const fr = language === 'fr';
  const { hasFeature } = usePlanAccess();
  const [params, setParams] = useSearchParams();
  const [events, setEvents] = useState<CustomerEvent[]>([]);
  const [sources, setSources] = useState<EventSource[]>([]);
  const [filter, setFilter] = useState('all');
  const [creating, setCreating] = useState<string | null>(params.get('source'));
  const [form, setForm] = useState({ name: '', auto: true });
  const [newKey, setNewKey] = useState<{ key: string; kind: string } | null>(null);
  const [error, setError] = useState('');
  const manage = canManageTeam(profile?.role);
  const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/events-ingest`;
  const live = hasFeature('liveEvents');

  const load = useCallback(async () => {
    const [{ data: ev }, { data: so }] = await Promise.all([
      supabase.from('customer_events').select('id,event_type,title,amount,currency,occurred_at,contact_id,source_id,contact:contacts(first_name,last_name)').order('occurred_at', { ascending: false }).limit(100),
      manage ? supabase.from('event_sources').select('id,name,kind,key_prefix,active,auto_create_contacts,last_event_at,created_at').order('created_at') : Promise.resolve({ data: [] }),
    ]);
    setEvents((ev || []) as unknown as CustomerEvent[]);
    setSources((so || []) as EventSource[]);
  }, [manage]);

  useEffect(() => { if (live) load(); }, [load, live]);
  useEffect(() => {
    if (!live) return;
    const ch = supabase.channel('live-activity').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'customer_events' }, () => load()).subscribe();
    return () => { supabase.removeChannel?.(ch); };
  }, [live, load]);

  if (!live) return <UpgradeGate language={language} feature={fr ? 'Activité client en direct' : 'Live customer activity'} minPlan="pro" />;

  async function createSource() {
    if (!creating) return;
    setError('');
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const key = `atlas_ek_${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
    const kind = SOURCE_KINDS.find((k) => k.id === creating)!;
    const { error: e } = await supabase.from('event_sources').insert({
      org_id: profile?.org_id, name: form.name.trim() || (fr ? kind.fr : kind.en), kind: creating,
      key_prefix: key.slice(0, 14), key_hash: await sha256(key), auto_create_contacts: form.auto, created_by: profile?.id,
    });
    if (e) { setError(e.message); return; }
    setNewKey({ key, kind: creating });
    setCreating(null); setParams({}, { replace: true });
    setForm({ name: '', auto: true });
    load();
  }

  const types = Array.from(new Set(events.map((e) => e.event_type)));
  const shown = filter === 'all' ? events : events.filter((e) => e.event_type === filter);
  const sourceName = (id: string | null) => sources.find((s) => s.id === id)?.name || '';
  const sample = JSON.stringify({ type: 'deposit', id: 'TX-1001', title: fr ? 'Dépôt' : 'Deposit', amount: 500, currency: 'USD', customer: { email: 'client@exemple.com', phone: '+237670000000', first_name: 'Awa', last_name: 'Ndiaye', external_id: 'MT5-88231' } }, null, 2);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title={fr ? 'Activité client en direct' : 'Live customer activity'} subtitle={fr ? 'Dépôts, retraits, ordres, commandes, appels… ce que vos clients font ailleurs arrive ici en temps réel, sur leur fiche.' : 'Deposits, withdrawals, trades, orders, calls… what your customers do elsewhere shows up here in real time, on their record.'}
        actions={manage ? <button className="btn-primary btn-sm" onClick={() => setCreating('trading')}><Plus size={14} /> {fr ? 'Connecter une source' : 'Connect a source'}</button> : undefined} />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="card">
          <div className="card-header flex flex-wrap items-center justify-between gap-2">
            <h2 className="card-title flex items-center gap-2"><Radio size={15} className="text-success-600" /> {fr ? 'Flux en direct' : 'Live feed'}</h2>
            <select className="input h-9 w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">{fr ? 'Tous les événements' : 'All events'}</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {shown.length === 0
            ? <p className="px-5 py-10 text-center text-sm text-ink-500">{fr ? 'Rien pour l’instant. Connectez une source à droite ; le premier événement envoyé apparaît ici aussitôt.' : 'Nothing yet. Connect a source on the right; the first event sent shows up here at once.'}</p>
            : <ul className="divide-y divide-ink-100">{shown.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink-800">{e.title || e.event_type}{e.contact ? <> · <Link className="text-primary-700 hover:underline" to={`/app/contacts/${e.contact_id}`}>{e.contact.first_name} {e.contact.last_name}</Link></> : null}</span>
                  <span className="text-xs text-ink-500"><Badge variant="neutral">{e.event_type}</Badge> {sourceName(e.source_id)} · {new Date(e.occurred_at).toLocaleString(language)}</span>
                </span>
                {e.amount != null && <span className="flex-none font-semibold tabular">{formatAmount(e.amount, e.currency || 'USD', language)}</span>}
              </li>))}</ul>}
        </section>

        {manage && (
          <section className="card self-start">
            <div className="card-header"><h2 className="card-title flex items-center gap-2"><KeyRound size={15} /> {fr ? 'Sources connectées' : 'Connected sources'}</h2></div>
            {sources.length === 0 && <p className="px-5 py-4 text-sm text-ink-500">{fr ? 'Aucune source.' : 'No source yet.'}</p>}
            <ul className="divide-y divide-ink-100">
              {sources.map((s) => (
                <li key={s.id} className="px-5 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink-800">{s.name}</span>
                    <Badge variant={s.active ? 'success' : 'neutral'}>{s.active ? (fr ? 'Active' : 'Active') : (fr ? 'Coupée' : 'Off')}</Badge>
                  </div>
                  <p className="text-xs text-ink-500">{s.key_prefix}… · {s.last_event_at ? `${fr ? 'dernier événement' : 'last event'} ${new Date(s.last_event_at).toLocaleString(language)}` : (fr ? 'aucun événement reçu' : 'no event received')}</p>
                  <div className="mt-2 flex gap-2">
                    <button className="btn-secondary btn-sm" onClick={async () => { await supabase.from('event_sources').update({ active: !s.active }).eq('id', s.id); load(); }}>{s.active ? (fr ? 'Couper' : 'Turn off') : (fr ? 'Réactiver' : 'Turn on')}</button>
                    <button className="btn-icon hover:text-error-600" aria-label={fr ? 'Supprimer' : 'Delete'} onClick={async () => { if (confirm(fr ? 'Supprimer cette source ? Sa clé cessera de fonctionner.' : 'Delete this source? Its key will stop working.')) { await supabase.from('event_sources').delete().eq('id', s.id); load(); } }}><Trash2 size={14} /></button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <Modal open={creating !== null} onClose={() => { setCreating(null); setParams({}, { replace: true }); }} title={fr ? 'Connecter une source' : 'Connect a source'}>
        <div className="space-y-4">
          <div>
            <label className="label">{fr ? 'Type' : 'Type'}</label>
            <select className="input" value={creating || 'custom'} onChange={(e) => setCreating(e.target.value)}>
              {SOURCE_KINDS.map((k) => <option key={k.id} value={k.id}>{fr ? k.fr : k.en}</option>)}
            </select>
          </div>
          <div><label className="label">{fr ? 'Nom' : 'Name'}</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={fr ? 'ex. MT5 Live, Boutique Zanldo' : 'e.g. MT5 Live, Zanldo store'} /></div>
          <Toggle checked={form.auto} onChange={(v) => setForm({ ...form, auto: v })} label={fr ? 'Créer le contact s’il n’existe pas encore' : 'Create the contact when it does not exist yet'} />
          {error && <p className="text-sm text-error-600">{error}</p>}
          <div className="flex justify-end gap-2"><button className="btn-secondary btn-sm" onClick={() => setCreating(null)}>{fr ? 'Annuler' : 'Cancel'}</button><button className="btn-primary btn-sm" onClick={createSource}>{fr ? 'Créer la clé' : 'Create the key'}</button></div>
        </div>
      </Modal>

      <Modal open={newKey !== null} onClose={() => setNewKey(null)} title={fr ? 'Votre clé (affichée une seule fois)' : 'Your key (shown once)'} size="lg">
        {newKey && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2 rounded-lg bg-ink-50 p-3 font-mono text-xs break-all">{newKey.key} <CopyText text={newKey.key} /></div>
            {(newKey.kind === 'aircall' || newKey.kind === 'ringover') ? (
              <>
                <p>{newKey.kind === 'aircall'
                  ? (fr ? 'Dans Aircall : Integrations → Webhook → collez cette URL et cochez au moins « call.ended ». Les enregistrements arrivent avec l’appel.' : 'In Aircall: Integrations → Webhook → paste this URL and tick at least "call.ended". Recordings come with the call.')
                  : (fr ? 'Dans Ringover : Dashboard → Developer → Webhooks → collez cette URL pour les événements d’appel (fin d’appel / enregistrement disponible).' : 'In Ringover: Dashboard → Developer → Webhooks → paste this URL for call events (call ended / recording available).')}</p>
                <div className="flex items-center gap-2 rounded-lg bg-ink-50 p-3 font-mono text-xs break-all">{endpoint}?key={newKey.key} <CopyText text={`${endpoint}?key=${newKey.key}`} /></div>
              </>
            ) : (
              <>
                <p>{fr ? 'Votre plateforme (ou votre développeur) envoie un POST à chaque événement client. Atlas retrouve le client par e-mail ou téléphone et l’affiche ici. Un même « id » n’est jamais compté deux fois.' : 'Your platform (or your developer) sends a POST for each customer event. Atlas finds the customer by e-mail or phone and shows it here. The same "id" is never counted twice.'}</p>
                <pre className="overflow-x-auto rounded-lg bg-navy-950 p-3 text-xs leading-5 text-ink-100"><code>{`curl -X POST ${endpoint} \\\n  -H "Authorization: Bearer ${newKey.key}" \\\n  -H "Content-Type: application/json" \\\n  -d '${sample}'`}</code></pre>
                <p className="text-xs text-ink-500">{fr ? 'Plusieurs à la fois : {"events": [ … ]} (100 max). Types libres : deposit, withdrawal, trade, order, refund, login, kyc… MT4/MT5/cTrader n’envoient pas de webhook eux-mêmes : branchez votre back-office ou votre pont (bridge) sur cette adresse.' : 'Several at once: {"events": [ … ]} (100 max). Free types: deposit, withdrawal, trade, order, refund, login, kyc… MT4/MT5/cTrader do not send webhooks themselves: plug your back office or bridge into this address.'}</p>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ═════════════════ Lead distribution ═════════════════ */

export function DistributionPage() {
  const { language, profile } = useAuth();
  const fr = language === 'fr';
  const { hasFeature } = usePlanAccess();
  const team = useTeam();
  const [table, setTable] = useState<'leads' | 'contacts'>('leads');
  const [onlyUnassigned, setOnlyUnassigned] = useState(true);
  const [rows, setRows] = useState<{ id: string; first_name: string; last_name: string; owner: string | null; created_at: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [agents, setAgents] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const cf = useCustomFormFields(table);
  const ownerCol = table === 'leads' ? 'assigned_to' : 'owner_id';

  const load = useCallback(async () => {
    let q = supabase.from(readTable(table)).select(`id,first_name,last_name,created_at,${ownerCol}`).order('created_at', { ascending: false }).limit(300);
    if (onlyUnassigned) q = q.is(ownerCol, null);
    if (table === 'leads') q = q.neq('status', 'converted');
    const { data } = await q;
    setRows(((data || []) as unknown as Record<string, string>[]).map((r) => ({ id: r.id, first_name: r.first_name, last_name: r.last_name, created_at: r.created_at, owner: r[ownerCol] || null })));
    setSelected(new Set());
  }, [table, onlyUnassigned, ownerCol]);
  useEffect(() => { if (hasFeature('workspaceControls')) load(); }, [load, hasFeature]);

  if (!hasFeature('workspaceControls')) return <UpgradeGate language={language} feature={fr ? 'Distribution des leads' : 'Lead distribution'} minPlan="pro" />;
  if (!canManageTeam(profile?.role)) return <p className="card p-6 text-sm text-ink-600">{fr ? 'Réservé au propriétaire, aux admins et aux managers.' : 'For the owner, admins and managers only.'}</p>;

  async function distribute(ids: string[]) {
    if (!ids.length || !agents.size) return;
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.rpc('distribute_records', { p_table: table, p_ids: ids, p_users: Array.from(agents) });
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: fr ? `${data} fiche(s) attribuée(s) à tour de rôle entre ${agents.size} personne(s).` : `${data} record(s) handed out in turn to ${agents.size} people.` });
    load();
  }

  const nameOf = (id: string | null) => { const p = team.find((t) => t.id === id); return p ? personName(p) : '—'; };
  const activeTeam = team.filter((t) => t.active !== false);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title={fr ? 'Distribution' : 'Distribution'} subtitle={fr ? 'Attribuez des leads ou des contacts à vos agents, à la main ou en important un fichier. Avec les portefeuilles activés, chaque agent ne voit que les siens.' : 'Hand leads or contacts to your agents, by hand or by importing a file. With portfolios on, each agent only sees their own.'}
        actions={<button className="btn-secondary btn-sm" onClick={() => setImporting(true)} disabled={!agents.size}><Upload size={14} /> {fr ? 'Importer un fichier et distribuer' : 'Import a file and distribute'}</button>} />
      {msg && <p className={`rounded-lg px-4 py-3 text-sm ${msg.ok ? 'bg-success-50 text-success-700' : 'bg-error-50 text-error-700'}`}>{msg.text}</p>}

      <section className="card p-5">
        <h2 className="card-title">{fr ? '1. Qui reçoit ?' : '1. Who receives?'}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {activeTeam.map((p) => (
            <label key={p.id} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${agents.has(p.id) ? 'border-primary-500 bg-primary-50' : 'border-ink-200'}`}>
              <input type="checkbox" checked={agents.has(p.id)} onChange={() => setAgents((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })} />
              {personName(p)} <span className="text-xs text-ink-500">{ROLE_LABELS[p.role as Role]?.[fr ? 'fr' : 'en'] || p.role}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-500">{fr ? 'Plusieurs personnes : les fiches sont réparties à tour de rôle (1, 2, 3, 1, 2…).' : 'Several people: records are dealt in turn (1, 2, 3, 1, 2…).'}</p>
      </section>

      <section className="card">
        <div className="card-header flex flex-wrap items-center justify-between gap-3">
          <h2 className="card-title">{fr ? '2. Quelles fiches ?' : '2. Which records?'}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <select className="input h-9 w-auto" value={table} onChange={(e) => setTable(e.target.value as 'leads' | 'contacts')}><option value="leads">Leads</option><option value="contacts">Contacts</option></select>
            <Toggle checked={onlyUnassigned} onChange={setOnlyUnassigned} label={fr ? 'Non attribuées seulement' : 'Unassigned only'} />
            <button className="btn-primary btn-sm" disabled={busy || !selected.size || !agents.size} onClick={() => distribute(Array.from(selected))}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Shuffle size={14} />} {fr ? `Distribuer (${selected.size})` : `Distribute (${selected.size})`}</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th className="th w-10"><input type="checkbox" aria-label={fr ? 'Tout sélectionner' : 'Select all'} checked={rows.length > 0 && selected.size === rows.length} onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} /></th><th className="th">{fr ? 'Nom' : 'Name'}</th><th className="th">{fr ? 'Attribué à' : 'Assigned to'}</th><th className="th">{fr ? 'Créé le' : 'Created'}</th></tr></thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-ink-50">
                  <td className="px-4 py-2"><input type="checkbox" checked={selected.has(r.id)} onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} /></td>
                  <td className="px-4 py-2"><Link className="font-medium text-ink-800 hover:text-primary-700" to={`/app/${table}/${r.id}`}>{r.first_name} {r.last_name}</Link></td>
                  <td className="px-4 py-2 text-ink-600">{nameOf(r.owner)}</td>
                  <td className="px-4 py-2 text-ink-500">{new Date(r.created_at).toLocaleDateString(language)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-500">{fr ? 'Aucune fiche à distribuer.' : 'Nothing to hand out.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {importing && (
        <ImportModal table={table} language={language} extra={{ org_id: profile?.org_id }}
          fields={[...(table === 'leads' ? leadFields(language) : contactFields(language)).filter((f) => f.type !== 'relation'), ...cf]}
          onClose={() => setImporting(false)}
          onDone={(_n, ids) => { setImporting(false); distribute(ids); }} />
      )}
    </div>
  );
}

/* ═════════════════ Team performance + call listening ═════════════════ */

interface Perf { user_id: string; leads_assigned: number; leads_converted: number; deals_won: number; won_value: number; activities: number; calls: number; emails: number; tickets_resolved: number; call_seconds: number }

export function PerformancePage() {
  const { language, profile, organization } = useAuth();
  const fr = language === 'fr';
  const { hasFeature } = usePlanAccess();
  const team = useTeam();
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<Perf[]>([]);
  const [calls, setCalls] = useState<{ id: string; title: string; created_at: string; user_id: string | null; contact_id: string | null; metadata: { recording_url?: string; duration?: number } | null }[]>([]);
  const [agent, setAgent] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasFeature('workspaceControls') || !canSupervise(profile?.role)) return;
    const from = new Date(Date.now() - days * 86400000).toISOString();
    supabase.rpc('team_performance', { p_from: from, p_to: new Date().toISOString() }).then(({ data, error: e }) => { setError(e?.message || ''); setRows((data || []) as Perf[]); });
    let q = supabase.from('activities').select('id,title,created_at,user_id,contact_id,metadata').eq('type', 'call').gte('created_at', from).order('created_at', { ascending: false }).limit(50);
    if (agent) q = q.eq('user_id', agent);
    q.then(({ data }) => setCalls(((data || []) as typeof calls).filter((c) => c.metadata?.recording_url)));
  }, [days, agent, hasFeature, profile?.role]);

  if (!hasFeature('workspaceControls')) return <UpgradeGate language={language} feature={fr ? 'Performance de l’équipe' : 'Team performance'} minPlan="pro" />;
  if (!canSupervise(profile?.role)) return <p className="card p-6 text-sm text-ink-600">{fr ? 'Réservé aux managers, au QC, aux admins et au propriétaire.' : 'For managers, QC, admins and the owner.'}</p>;

  const name = (id: string | null) => { const p = team.find((t) => t.id === id); return p ? personName(p) : '—'; };
  const mins = (s: number) => `${Math.round(s / 60)} min`;
  const cur = organization?.currency || 'USD';
  const sorted = [...rows].sort((a, b) => b.won_value - a.won_value || b.activities - a.activities);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title={fr ? 'Performance de l’équipe' : 'Team performance'} subtitle={fr ? 'Chiffres réels tirés de vos leads, affaires, activités et tickets.' : 'Real figures from your leads, deals, activities and tickets.'}
        actions={<select className="input h-9 w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))}>{[7, 30, 90, 365].map((d) => <option key={d} value={d}>{fr ? `${d} derniers jours` : `Last ${d} days`}</option>)}</select>} />
      {error && <p className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</p>}
      <section className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr>{[fr ? 'Personne' : 'Person', fr ? 'Leads reçus' : 'Leads received', fr ? 'Convertis' : 'Converted', fr ? 'Taux' : 'Rate', fr ? 'Affaires gagnées' : 'Deals won', fr ? 'Montant gagné' : 'Won value', fr ? 'Appels' : 'Calls', fr ? 'Temps d’appel' : 'Talk time', 'E-mails', fr ? 'Activités' : 'Activities', 'Tickets'].map((h) => <th key={h} className="th whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-ink-100 tabular">
            {sorted.map((r) => (
              <tr key={r.user_id} className="hover:bg-ink-50">
                <td className="whitespace-nowrap px-4 py-2 font-medium text-ink-800">{name(r.user_id)}</td>
                <td className="px-4 py-2">{r.leads_assigned}</td>
                <td className="px-4 py-2">{r.leads_converted}</td>
                <td className="px-4 py-2">{r.leads_assigned ? `${Math.round((r.leads_converted / r.leads_assigned) * 100)} %` : '—'}</td>
                <td className="px-4 py-2">{r.deals_won}</td>
                <td className="whitespace-nowrap px-4 py-2 font-semibold">{formatAmount(Number(r.won_value) || 0, cur, language)}</td>
                <td className="px-4 py-2">{r.calls}</td>
                <td className="px-4 py-2">{mins(Number(r.call_seconds) || 0)}</td>
                <td className="px-4 py-2">{r.emails}</td>
                <td className="px-4 py-2">{r.activities}</td>
                <td className="px-4 py-2">{r.tickets_resolved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <div className="card-header flex flex-wrap items-center justify-between gap-2">
          <h2 className="card-title flex items-center gap-2"><PhoneCall size={15} /> {fr ? 'Écouter les appels' : 'Listen to calls'}</h2>
          <select className="input h-9 w-auto" value={agent} onChange={(e) => setAgent(e.target.value)}><option value="">{fr ? 'Toute l’équipe' : 'Whole team'}</option>{team.map((p) => <option key={p.id} value={p.id}>{personName(p)}</option>)}</select>
        </div>
        {calls.length === 0
          ? <p className="px-5 py-8 text-sm text-ink-500">{fr ? 'Aucun enregistrement sur la période. Les appels lancés avec Twilio (case « Enregistrer ») et ceux d’Aircall / Ringover connectés dans Activité en direct arrivent ici.' : 'No recording in this period. Calls started with Twilio ("Record" ticked) and Aircall / Ringover calls connected in Live activity land here.'} <Link className="text-primary-700 hover:underline" to="/app/marketplace">Marketplace</Link></p>
          : <ul className="divide-y divide-ink-100">{calls.map((c) => (
            <li key={c.id} className="grid gap-2 px-5 py-3 text-sm sm:grid-cols-[1fr_20rem] sm:items-center">
              <span><span className="font-medium text-ink-800">{c.title}</span><span className="block text-xs text-ink-500">{name(c.user_id)} · {new Date(c.created_at).toLocaleString(language)}{c.metadata?.duration ? ` · ${mins(c.metadata.duration)}` : ''}{c.contact_id ? <> · <Link className="text-primary-700 hover:underline" to={`/app/contacts/${c.contact_id}`}>{fr ? 'fiche' : 'record'}</Link></> : null}</span></span>
              {c.metadata?.recording_url && /^https:\/\//.test(c.metadata.recording_url) && <audio controls preload="none" className="h-9 w-full" src={c.metadata.recording_url} />}
            </li>))}</ul>}
      </section>
      <p className="text-xs text-ink-500"><BarChart3 size={12} className="inline" /> {fr ? 'Enregistrer un appel peut demander d’en informer le client selon votre pays.' : 'Recording a call may require telling the customer, depending on your country.'}</p>
    </div>
  );
}

/* ═════════════════ Reviews ═════════════════ */

interface Review { id: string; contact_id: string | null; token: string; topic: string | null; channel: string | null; rating: number | null; comment: string | null; reviewer_name: string | null; source: string; status: string; requested_at: string; received_at: string | null; contact?: { first_name: string; last_name: string } | null }

function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return <span className="inline-flex text-warning-500" aria-label={`${n}/5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} className={i <= n ? 'fill-current' : 'text-ink-200'} />)}</span>;
}

export function ReviewsPage() {
  const { language, profile } = useAuth();
  const fr = language === 'fr';
  const { hasFeature } = usePlanAccess();
  const [rows, setRows] = useState<Review[]>([]);
  const [open, setOpen] = useState<null | 'request' | 'manual'>(null);
  const [contacts, setContacts] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [form, setForm] = useState({ contact_id: '', topic: '', rating: 5, comment: '', name: '', source: 'google' });
  const [created, setCreated] = useState<Review | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('reviews').select('*, contact:contacts(first_name,last_name)').order('created_at', { ascending: false }).limit(200);
    setRows((data || []) as Review[]);
  }, []);
  useEffect(() => { if (hasFeature('reviews')) load(); }, [load, hasFeature]);
  useEffect(() => { if (open) supabase.from('contacts_v').select('id,first_name,last_name').order('first_name').limit(500).then(({ data }) => setContacts((data || []) as typeof contacts)); }, [open]);

  const stats = useMemo(() => {
    const got = rows.filter((r) => r.status === 'received' && r.rating);
    const avg = got.length ? got.reduce((s, r) => s + (r.rating || 0), 0) / got.length : 0;
    return { got: got.length, avg, pending: rows.filter((r) => r.status === 'requested').length, dist: [5, 4, 3, 2, 1].map((n) => got.filter((r) => r.rating === n).length) };
  }, [rows]);

  if (!hasFeature('reviews')) return <UpgradeGate language={language} feature={fr ? 'Avis clients' : 'Customer reviews'} minPlan="growth" />;

  async function submit() {
    setError('');
    const base = { org_id: profile?.org_id, contact_id: form.contact_id || null, topic: form.topic.trim() || null, requested_by: profile?.id };
    const payload = open === 'manual'
      ? { ...base, status: 'received', rating: form.rating, comment: form.comment.trim() || null, reviewer_name: form.name.trim() || null, source: form.source, received_at: new Date().toISOString() }
      : { ...base, channel: 'link', source: 'link' };
    const { data, error: e } = await supabase.from('reviews').insert(payload).select('*').single();
    if (e) { setError(e.message); return; }
    setOpen(null);
    if (open === 'request') setCreated(data as Review);
    setForm({ contact_id: '', topic: '', rating: 5, comment: '', name: '', source: 'google' });
    load();
  }

  const link = (r: Review) => `${window.location.origin}/r/${r.token}`;
  const label = (r: Review) => r.contact ? `${r.contact.first_name} ${r.contact.last_name}` : (r.reviewer_name || (fr ? 'Client' : 'Customer'));

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title={fr ? 'Avis clients' : 'Customer reviews'} subtitle={fr ? 'Demandez un avis après une commande, une consultation, un séjour ou un appel, et suivez la satisfaction réelle.' : 'Ask for a review after an order, a consultation, a stay or a call, and track real satisfaction.'}
        actions={<div className="flex gap-2"><button className="btn-secondary btn-sm" onClick={() => setOpen('manual')}><Plus size={14} /> {fr ? 'Saisir un avis reçu' : 'Log a review'}</button><button className="btn-primary btn-sm" onClick={() => setOpen('request')}><Link2 size={14} /> {fr ? 'Demander un avis' : 'Request a review'}</button></div>} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><p className="text-sm text-ink-500">{fr ? 'Note moyenne' : 'Average rating'}</p><p className="mt-1 text-3xl font-bold tabular text-ink-900">{stats.got ? stats.avg.toFixed(1) : '—'}</p>{stats.got > 0 && <Stars n={Math.round(stats.avg)} />}</div>
        <div className="card p-5"><p className="text-sm text-ink-500">{fr ? 'Avis reçus' : 'Reviews received'}</p><p className="mt-1 text-3xl font-bold tabular text-ink-900">{stats.got}</p><p className="text-xs text-ink-500">{stats.pending} {fr ? 'en attente de réponse' : 'awaiting an answer'}</p></div>
        <div className="card p-5 text-xs text-ink-600">{[5, 4, 3, 2, 1].map((n, i) => (
          <div key={n} className="flex items-center gap-2"><span className="w-3">{n}</span><span className="h-2 flex-1 overflow-hidden rounded bg-ink-100"><span className="block h-full bg-warning-500" style={{ width: `${stats.got ? (stats.dist[i] / stats.got) * 100 : 0}%` }} /></span><span className="w-6 text-end tabular">{stats.dist[i]}</span></div>
        ))}</div>
      </div>

      <section className="card divide-y divide-ink-100">
        {rows.length === 0 && <p className="px-5 py-10 text-center text-sm text-ink-500">{fr ? 'Aucun avis pour l’instant.' : 'No review yet.'}</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex flex-col gap-2 px-5 py-4 text-sm sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-ink-800">{r.contact_id ? <Link className="hover:text-primary-700" to={`/app/contacts/${r.contact_id}`}>{label(r)}</Link> : label(r)} {r.topic && <span className="font-normal text-ink-500">· {r.topic}</span>}</p>
              {r.status === 'received' ? <><Stars n={r.rating || 0} />{r.comment && <p className="mt-1 whitespace-pre-wrap text-ink-700">{r.comment}</p>}</> : <p className="text-ink-500">{fr ? 'Demandé le' : 'Requested'} {new Date(r.requested_at).toLocaleDateString(language)}</p>}
            </div>
            <div className="flex flex-none items-center gap-2">
              <Badge variant={r.status === 'received' ? 'success' : 'warning'}>{r.status === 'received' ? (fr ? 'Reçu' : 'Received') : (fr ? 'En attente' : 'Pending')}</Badge>
              {r.source !== 'link' && <Badge variant="neutral">{r.source}</Badge>}
              {r.status === 'requested' && <CopyText text={link(r)} />}
            </div>
          </div>
        ))}
      </section>

      <Modal open={open !== null} onClose={() => setOpen(null)} title={open === 'manual' ? (fr ? 'Saisir un avis reçu' : 'Log a review') : (fr ? 'Demander un avis' : 'Request a review')}>
        <div className="space-y-4">
          <div><label className="label">{fr ? 'Client' : 'Customer'}</label><select className="input" value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })}><option value="">—</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}</select></div>
          <div><label className="label">{fr ? 'Sujet (commande, consultation, séjour…)' : 'About (order, visit, stay…)'}</label><input className="input" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></div>
          {open === 'manual' && (<>
            <div><label className="label">{fr ? 'Note' : 'Rating'}</label><div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setForm({ ...form, rating: n })} aria-label={`${n}/5`}><Star size={24} className={n <= form.rating ? 'fill-warning-500 text-warning-500' : 'text-ink-300'} /></button>)}</div></div>
            <div><label className="label">{fr ? 'Commentaire' : 'Comment'}</label><textarea className="input" rows={3} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">{fr ? 'Nom affiché' : 'Name'}</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className="label">{fr ? 'Reçu via' : 'Received via'}</label><select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>{['google', 'facebook', 'whatsapp', 'phone', 'in_person', 'email', 'shop', 'other'].map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
          </>)}
          {error && <p className="text-sm text-error-600">{error}</p>}
          <div className="flex justify-end gap-2"><button className="btn-secondary btn-sm" onClick={() => setOpen(null)}>{fr ? 'Annuler' : 'Cancel'}</button><button className="btn-primary btn-sm" onClick={submit}>{open === 'manual' ? (fr ? 'Enregistrer' : 'Save') : (fr ? 'Créer le lien' : 'Create the link')}</button></div>
        </div>
      </Modal>

      <Modal open={created !== null} onClose={() => setCreated(null)} title={fr ? 'Lien d’avis prêt' : 'Review link ready'}>
        {created && (
          <div className="space-y-4 text-sm">
            <p>{fr ? 'Envoyez ce lien au client. Il note de 1 à 5 et laisse un commentaire, sans compte. Vous êtes prévenu dès qu’il répond.' : 'Send this link to the customer. They rate 1 to 5 and leave a comment, no account needed. You are notified as soon as they answer.'}</p>
            <div className="flex items-center gap-2 rounded-lg bg-ink-50 p-3 font-mono text-xs break-all">{link(created)} <CopyText text={link(created)} /></div>
            {created.contact_id && <QuickEmailButton name="" record={{ table: 'contacts', id: created.contact_id }} target={{ fk: 'contact_id', id: created.contact_id }} to="•" label={fr ? 'Envoyer par e-mail' : 'Send by e-mail'}
              subject={fr ? 'Votre avis compte pour nous' : 'Your opinion matters to us'} message={`${fr ? 'Bonjour, pouvez-vous nous dire en 30 secondes comment cela s’est passé ?' : 'Hello, could you tell us in 30 seconds how it went?'}\n\n${link(created)}`} />}
          </div>
        )}
      </Modal>
    </div>
  );
}

/** Public page a customer opens from a review link (/r/:token). */
export function PublicReviewPage() {
  const { token = '' } = useParams();
  const fr = (navigator.language || 'fr').toLowerCase().startsWith('fr');
  const [info, setInfo] = useState<{ org: string; logo_url: string | null; first_name: string | null; topic: string | null; status: string } | null | undefined>(undefined);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [err, setErr] = useState('');

  useEffect(() => { supabase.rpc('get_review_request', { p_token: token }).then(({ data }) => setInfo((data as typeof info) || null)); }, [token]);

  async function send() {
    if (!rating) return;
    setState('sending');
    const { error } = await supabase.rpc('submit_review', { p_token: token, p_rating: rating, p_comment: comment, p_name: name });
    if (error) { setErr(error.message); setState('error'); } else setState('done');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="card w-full max-w-md p-6 text-center">
        {info === undefined ? <Loader2 className="mx-auto animate-spin text-ink-400" /> : info === null ? (
          <p className="text-ink-600">{fr ? 'Ce lien n’existe pas ou plus.' : 'This link does not exist (anymore).'}</p>
        ) : info.status === 'received' || state === 'done' ? (
          <><CheckCircle2 className="mx-auto text-success-600" size={40} /><h1 className="mt-3 text-xl font-bold text-ink-900">{fr ? 'Merci pour votre avis !' : 'Thank you for your review!'}</h1><p className="mt-1 text-sm text-ink-600">{info.org}</p></>
        ) : (
          <>
            {info.logo_url ? <img src={info.logo_url} alt="" className="mx-auto h-12 w-auto" /> : <p className="text-lg font-bold text-ink-900">{info.org}</p>}
            <h1 className="mt-4 text-xl font-bold text-ink-900">{fr ? `${info.first_name ? `${info.first_name}, c` : 'C'}omment cela s’est-il passé ?` : `${info.first_name ? `${info.first_name}, h` : 'H'}ow did it go?`}</h1>
            {info.topic && <p className="mt-1 text-sm text-ink-500">{info.topic}</p>}
            <div className="mt-5 flex justify-center gap-2">{[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n}/5`} className="rounded-full p-1 focus-visible:ring-2 focus-visible:ring-primary-400"><Star size={36} className={n <= rating ? 'fill-warning-500 text-warning-500' : 'text-ink-300'} /></button>
            ))}</div>
            <textarea className="input mt-5" rows={3} maxLength={2000} placeholder={fr ? 'Un mot sur votre expérience (facultatif)' : 'A word about your experience (optional)'} value={comment} onChange={(e) => setComment(e.target.value)} />
            <input className="input mt-3" maxLength={120} placeholder={fr ? 'Votre nom (facultatif)' : 'Your name (optional)'} value={name} onChange={(e) => setName(e.target.value)} />
            {state === 'error' && <p className="mt-3 text-sm text-error-600">{err}</p>}
            <button className="btn-primary mt-5 w-full" disabled={!rating || state === 'sending'} onClick={send}>{state === 'sending' ? <Loader2 size={16} className="animate-spin" /> : null} {fr ? 'Envoyer mon avis' : 'Send my review'}</button>
          </>
        )}
        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-ink-400"><Logo size={14} /> Atlas CRM</p>
      </div>
    </main>
  );
}
