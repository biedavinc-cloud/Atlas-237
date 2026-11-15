import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, Edit2, Trash2, Building2, User, Handshake, Plus, FileText, Receipt,
  LifeBuoy, ListChecks, MessageSquare, PhoneCall, CalendarClock, StickyNote, Loader2, Trophy, XCircle,
  Globe, MapPin, Shuffle, Check, ExternalLink, UserPlus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { tStatus, t } from '@/lib/i18n';
import { Badge } from '@/components/ui';
import { Loading } from '@/components/Loading';
import { RecordFormModal, type FormField } from '@/components/ListPage';
import { QuickMessageButton } from '@/components/QuickMessageButton';
import { QuickEmailButton } from '@/components/QuickEmailButton';
import { RecordAppActions } from '@/components/RecordAppActions';
import { ACTIVITY_EVENT } from '@/lib/activityLog';
import { ConvertLeadModal } from '@/components/ConvertLeadModal';
import { getCountryName, formatAmount } from '@/lib/i18n-countries';
import { triggerWebhooks } from '@/lib/webhooks';
import { contactFields, companyFields, dealFields, leadFields, quoteFields, invoiceFields } from '@/lib/entityFields';
import type { Lead } from '@/types';

type Row = Record<string, unknown> & { id: string };

/* ───────────────────────── shared building blocks ───────────────────────── */

function useRecord(table: string, id: string | undefined, select = '*') {
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const load = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase.from(table).select(select).eq('id', id).maybeSingle();
    if (error || !data) setMissing(true);
    else setRow(data as unknown as Row);
    setLoading(false);
  }, [table, id, select]);
  useEffect(() => { load(); }, [load]);
  return { row, loading, missing, reload: load };
}

function Shell({ back, backLabel, icon, title, subtitle, badges, actions, children, aside }: {
  back: string; backLabel: string; icon: ReactNode; title: string; subtitle?: ReactNode; badges?: ReactNode;
  actions?: ReactNode; children: ReactNode; aside: ReactNode;
}) {
  return (
    <div className="animate-fade-in">
      <Link to={back} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-800">
        <ArrowLeft size={15} className="rtl:rotate-180" /> {backLabel}
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-navy-900 text-lg font-bold text-white">{icon}</div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight text-ink-900 break-words">{title}</h1>
            {subtitle && <div className="mt-1 text-sm text-ink-500">{subtitle}</div>}
            {badges && <div className="mt-2 flex flex-wrap gap-1.5">{badges}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">{children}</div>
        <aside className="space-y-6">{aside}</aside>
      </div>
    </div>
  );
}

function FieldsCard({ title, items }: { title: string; items: { label: string; value: ReactNode }[] }) {
  return (
    <section className="card">
      <div className="card-header"><h2 className="card-title">{title}</h2></div>
      <dl className="divide-y divide-ink-100">
        {items.map(it => (
          <div key={it.label} className="flex items-start justify-between gap-4 px-5 py-2.5">
            <dt className="text-sm text-ink-500">{it.label}</dt>
            <dd className="text-sm font-medium text-ink-800 text-end break-words min-w-0">{it.value ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Related({ title, icon, count, onAdd, addLabel, children, empty }: {
  title: string; icon: ReactNode; count: number; onAdd?: () => void; addLabel?: string; children: ReactNode; empty: string;
}) {
  return (
    <section className="card">
      <div className="card-header">
        <h2 className="card-title flex items-center gap-2"><span className="text-ink-400">{icon}</span>{title}<span className="text-sm font-semibold text-ink-400 tabular">{count}</span></h2>
        {onAdd && <button onClick={onAdd} className="btn-ghost btn-sm"><Plus size={14} /> {addLabel}</button>}
      </div>
      {count === 0 ? <p className="px-5 py-6 text-sm text-ink-500">{empty}</p> : <ul className="divide-y divide-ink-100">{children}</ul>}
    </section>
  );
}

function RelatedRow({ to, title, meta, right }: { to: string; title: ReactNode; meta?: ReactNode; right?: ReactNode }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 px-5 py-3 hover:bg-ink-50">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-800">{title}</p>
          {meta && <p className="truncate text-xs text-ink-500">{meta}</p>}
        </div>
        {right}
      </Link>
    </li>
  );
}

function useRelated(table: string, column: string, id: string | undefined, select = '*', extra?: { col: string; val: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const extraCol = extra?.col;
  const extraVal = extra?.val;
  const load = useCallback(async () => {
    if (!id) return;
    let q = supabase.from(table).select(select).eq(column, id);
    if (extraCol && extraVal) q = q.eq(extraCol, extraVal);
    const { data } = await q.order('created_at', { ascending: false }).limit(50);
    setRows((data || []) as unknown as Row[]);
  }, [table, column, id, select, extraCol, extraVal]);
  useEffect(() => { load(); }, [load]);
  return { rows, reload: load };
}

const ACTIVITY_TYPES = [
  { value: 'note', icon: StickyNote },
  { value: 'call', icon: PhoneCall },
  { value: 'email', icon: Mail },
  { value: 'meeting', icon: CalendarClock },
] as const;

/** Activity timeline + composer bound to one record (contact_id, deal_id…). */
function Timeline({ fk, id }: { fk: 'contact_id' | 'company_id' | 'deal_id' | 'lead_id'; id: string }) {
  const { language, profile } = useAuth();
  const fr = language === 'fr';
  const { rows, reload } = useRelated('activities', fk, id);
  const [type, setType] = useState<string>('note');
  const [text, setText] = useState('');
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!text.trim()) return;
    setBusy(true);
    const firstLine = text.trim().split('\n')[0].slice(0, 120);
    const planned = Boolean(when) && new Date(when) > new Date();
    const { error } = await supabase.from('activities').insert({
      type, title: firstLine, description: text.trim(), [fk]: id,
      status: planned ? 'pending' : 'completed', scheduled_at: when ? new Date(when).toISOString() : null,
      completed_at: planned ? null : new Date().toISOString(), performed_by: 'user', user_id: profile?.id || null,
    });
    setBusy(false);
    if (error) { alert(error.message); return; }
    triggerWebhooks('activity.created', { [fk]: id, type, title: firstLine });
    setText(''); setWhen('');
    reload();
  }

  useEffect(() => {
    const onLogged = (e: Event) => { const d = (e as CustomEvent).detail; if (d?.fk === fk && d?.id === id) reload(); };
    window.addEventListener(ACTIVITY_EVENT, onLogged);
    return () => window.removeEventListener(ACTIVITY_EVENT, onLogged);
  }, [fk, id, reload]);

  async function complete(a: Row) {
    await supabase.from('activities').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', a.id);
    reload();
  }

  return (
    <section className="card">
      <div className="card-header"><h2 className="card-title">{fr ? 'Activité' : 'Activity'}</h2></div>
      <div className="border-b border-ink-100 p-4">
        <div className="mb-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label={fr ? 'Type' : 'Type'}>
          {ACTIVITY_TYPES.map(a => (
            <button key={a.value} role="radio" aria-checked={type === a.value} onClick={() => setType(a.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${type === a.value ? 'bg-primary-50 text-primary-700 ring-primary-200' : 'text-ink-600 ring-ink-200 hover:bg-ink-50'}`}>
              <a.icon size={13} /> {tStatus(a.value, language)}
            </button>
          ))}
        </div>
        <textarea className="input min-h-[72px]" value={text} onChange={e => setText(e.target.value)}
          placeholder={fr ? 'Résumé de l’appel, note, compte rendu de réunion…' : 'Call summary, note, meeting minutes…'} aria-label={fr ? 'Nouvelle activité' : 'New activity'} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-ink-500">
            {fr ? 'Date (pour planifier)' : 'Date (to schedule)'}
            <input type="datetime-local" className="input w-auto py-1 text-xs" value={when} onChange={e => setWhen(e.target.value)} />
          </label>
          <button onClick={add} disabled={busy || !text.trim()} className="btn-primary btn-sm">{busy && <Loader2 size={13} className="animate-spin" />}{fr ? 'Enregistrer' : 'Log it'}</button>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-500">{fr ? 'Aucune activité. Notez ici vos appels, emails et réunions.' : 'No activity yet. Log calls, emails and meetings here.'}</p>
      ) : (
        <ol className="relative px-5 py-4">
          <span className="absolute start-[38px] top-6 bottom-6 w-px bg-ink-200" aria-hidden />
          {rows.map(a => {
            const Icon = ACTIVITY_TYPES.find(x => x.value === a.type)?.icon || MessageSquare;
            const pending = a.status === 'pending';
            const date = (a.scheduled_at || a.created_at) as string;
            return (
              <li key={a.id} className="relative flex gap-3 py-2.5">
                <span className={`relative z-[1] flex h-8 w-8 flex-none items-center justify-center rounded-full ring-4 ring-white ${a.performed_by === 'ai' ? 'bg-navy-900 text-white' : pending ? 'bg-warning-50 text-warning-700' : 'bg-ink-100 text-ink-600'}`}><Icon size={14} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-800">{String(a.title || '')}</p>
                    {pending && <button onClick={() => complete(a)} className="btn-icon h-6 w-6 hover:bg-success-50 hover:text-success-600" title={fr ? 'Marquer fait' : 'Mark done'} aria-label={fr ? 'Marquer fait' : 'Mark done'}><Check size={13} /></button>}
                  </div>
                  {a.description && a.description !== a.title ? <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-600">{String(a.description)}</p> : null}
                  <p className="mt-0.5 text-xs text-ink-400">{tStatus(String(a.type), language)} · {new Date(date).toLocaleString(language, { dateStyle: 'medium', timeStyle: 'short' })}{pending ? ` · ${fr ? 'planifié' : 'scheduled'}` : ''}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/** Tasks linked through tasks.related_type/related_id. */
function TasksCard({ relatedType, id }: { relatedType: string; id: string }) {
  const { language, profile } = useAuth();
  const fr = language === 'fr';
  const { rows, reload } = useRelated('tasks', 'related_id', id, '*', { col: 'related_type', val: relatedType });
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');

  async function add() {
    if (!title.trim()) return;
    const { error } = await supabase.from('tasks').insert({ title: title.trim(), due_date: due ? new Date(due).toISOString() : null, related_type: relatedType, related_id: id, status: 'pending', priority: 'medium', created_by: profile?.id || null, assignee_id: profile?.id || null });
    if (error) { alert(error.message); return; }
    setTitle(''); setDue('');
    reload();
  }
  async function toggle(r: Row) {
    const done = r.status === 'completed';
    await supabase.from('tasks').update({ status: done ? 'pending' : 'completed', completed_at: done ? null : new Date().toISOString() }).eq('id', r.id);
    reload();
  }

  return (
    <section className="card">
      <div className="card-header"><h2 className="card-title flex items-center gap-2"><ListChecks size={16} className="text-ink-400" />{t('nav.tasks', language)}<span className="text-sm text-ink-400 tabular">{rows.filter(r => r.status !== 'completed').length}</span></h2></div>
      <ul className="divide-y divide-ink-100">
        {rows.map(r => {
          const done = r.status === 'completed';
          const overdue = !done && r.due_date && new Date(String(r.due_date)) < new Date();
          return (
            <li key={r.id} className="flex items-center gap-3 px-5 py-2.5">
              <button onClick={() => toggle(r)} aria-label={done ? (fr ? 'Rouvrir' : 'Reopen') : (fr ? 'Terminer' : 'Complete')}
                className={`flex h-5 w-5 flex-none items-center justify-center rounded-md border ${done ? 'border-success-500 bg-success-500 text-white' : 'border-ink-300 hover:border-success-500'}`}>
                {done && <Check size={12} />}
              </button>
              <span className={`flex-1 text-sm ${done ? 'text-ink-400 line-through' : 'text-ink-800'}`}>{String(r.title)}</span>
              {r.due_date ? <span className={`text-xs tabular ${overdue ? 'font-semibold text-error-600' : 'text-ink-400'}`}>{new Date(String(r.due_date)).toLocaleDateString(language, { day: 'numeric', month: 'short' })}</span> : null}
            </li>
          );
        })}
      </ul>
      <form onSubmit={e => { e.preventDefault(); add(); }} className="flex gap-2 border-t border-ink-100 p-3">
        <input className="input flex-1" value={title} onChange={e => setTitle(e.target.value)} placeholder={fr ? 'Nouvelle tâche…' : 'New task…'} aria-label={fr ? 'Nouvelle tâche' : 'New task'} />
        <input type="date" className="input w-[140px]" value={due} onChange={e => setDue(e.target.value)} aria-label={fr ? 'Échéance' : 'Due date'} />
        <button type="submit" className="btn-secondary btn-sm" disabled={!title.trim()} aria-label={fr ? 'Ajouter' : 'Add'}><Plus size={14} /></button>
      </form>
    </section>
  );
}

function NotFound({ back, label }: { back: string; label: string }) {
  const { language } = useAuth();
  return (
    <div className="card p-10 text-center">
      <p className="text-base font-bold text-ink-900">{language === 'fr' ? 'Fiche introuvable' : 'Record not found'}</p>
      <p className="mt-1 text-sm text-ink-500">{language === 'fr' ? 'Elle a peut-être été supprimée.' : 'It may have been deleted.'}</p>
      <Link to={back} className="btn-secondary btn-sm mt-4">{label}</Link>
    </div>
  );
}

function useDelete(table: string, back: string) {
  const navigate = useNavigate();
  const { language } = useAuth();
  return async (id: string) => {
    if (!confirm(t('list.deleteConfirm', language))) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) { alert(error.message); return; }
    navigate(back);
  };
}

type AddState = { table: string; title: string; fields: FormField[]; defaults: Record<string, unknown>; reload: () => void } | null;

function useMoney() {
  const { organization, language } = useAuth();
  const orgCurrency = organization?.currency || 'USD';
  return (n: unknown, c?: unknown) => formatAmount((Number(n) || 0), String(c || orgCurrency), language);
}

const statusTone = (s: unknown): 'success' | 'error' | 'warning' | 'primary' | 'neutral' => {
  const v = String(s || '');
  if (['won', 'paid', 'accepted', 'active', 'completed', 'resolved', 'closed', 'converted'].includes(v)) return 'success';
  if (['lost', 'overdue', 'rejected', 'unpaid', 'failed'].includes(v)) return 'error';
  if (['draft', 'pending', 'partial', 'sent', 'contacted', 'warm'].includes(v)) return 'warning';
  if (['inactive', 'cancelled', 'cold'].includes(v)) return 'neutral';
  return 'primary';
};

/* ───────────────────────── Contact ───────────────────────── */

export function ContactDetailPage() {
  const { id } = useParams();
  const { language, organization } = useAuth();
  const fr = language === 'fr';
  const money = useMoney();
  const orgCurrency = organization?.currency || 'USD';
  const { row, loading, missing, reload } = useRecord('contacts', id, '*, company_rel:companies(id,name)');
  const deals = useRelated('deals', 'contact_id', id, 'id,name,value,currency,status,stage:pipeline_stages(name)');
  const invoices = useRelated('invoices', 'contact_id', id, 'id,invoice_number,total,currency,payment_status');
  const quotes = useRelated('quotes', 'contact_id', id, 'id,quote_number,total,currency,status');
  const tickets = useRelated('tickets', 'contact_id', id, 'id,ticket_number,subject,status');
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState<AddState>(null);
  const remove = useDelete('contacts', '/app/contacts');

  if (loading) return <Loading />;
  if (missing || !row) return <NotFound back="/app/contacts" label={t('nav.contacts', language)} />;

  const name = `${row.first_name || ''} ${row.last_name || ''}`.trim();
  const company = row.company_rel as { id: string; name: string } | null;
  const tags = (row.tags as string[] | null) || [];

  return (
    <Shell
      back="/app/contacts" backLabel={t('nav.contacts', language)}
      icon={(name[0] || '?').toUpperCase()}
      title={name}
      subtitle={<>{row.job_title ? `${row.job_title}` : ''}{row.job_title && (company || row.company) ? ' · ' : ''}{company ? <Link className="text-primary-700 hover:underline" to={`/app/companies/${company.id}`}>{company.name}</Link> : (row.company as string) || ''}</>}
      badges={<><Badge variant={statusTone(row.status)}>{tStatus(String(row.status), language)}</Badge>{tags.map(tg => <Badge key={tg} variant="neutral">{tg}</Badge>)}</>}
      actions={<>
        <QuickEmailButton to={row.email as string} name={name} target={{ fk: 'contact_id', id: row.id }} />
        {row.phone ? <a href={`tel:${String(row.phone).replace(/\s/g, '')}`} className="btn-secondary btn-sm"><Phone size={14} /> {fr ? 'Appeler' : 'Call'}</a> : null}
        <QuickMessageButton phone={row.phone as string} name={name} />
        <button onClick={() => setEditing(true)} className="btn-secondary btn-sm"><Edit2 size={14} /> {t('common.edit', language)}</button>
        <button onClick={() => remove(row.id)} className="btn-icon hover:bg-error-50 hover:text-error-600" aria-label={t('common.delete', language)}><Trash2 size={15} /></button>
      </>}
      aside={<>
        <FieldsCard title={fr ? 'Coordonnées' : 'Details'} items={[
          { label: t('common.email', language), value: row.email ? <a className="text-primary-700 hover:underline" href={`mailto:${row.email}`}>{String(row.email)}</a> : '—' },
          { label: t('common.phone', language), value: (row.phone as string) || '—' },
          { label: t('list.city', language), value: [row.city, row.country ? getCountryName(String(row.country), language) : ''].filter(Boolean).join(', ') || '—' },
          { label: t('list.leadScore', language), value: <span className="tabular">{String(row.lead_score ?? 0)}/100</span> },
          { label: fr ? 'Source' : 'Source', value: row.lead_source ? tStatus(String(row.lead_source), language) : '—' },
          { label: fr ? 'Créé le' : 'Created', value: new Date(String(row.created_at)).toLocaleDateString(language) },
        ]} />
        {row.notes ? <section className="card p-5"><h2 className="card-title mb-2">{t('list.notes', language)}</h2><p className="whitespace-pre-wrap text-sm text-ink-700">{String(row.notes)}</p></section> : null}
        <RecordAppActions person={row as { email?: string; first_name?: string; last_name?: string }} target={{ fk: 'contact_id', id: row.id }} />
        <TasksCard relatedType="contact" id={row.id} />
      </>}
    >
      <Related title={t('nav.deals', language)} icon={<Handshake size={16} />} count={deals.rows.length} addLabel={fr ? 'Affaire' : 'Deal'}
        empty={fr ? 'Aucune affaire pour ce contact.' : 'No deals for this contact.'}
        onAdd={() => setAdding({ table: 'deals', title: t('nav.deals', language), fields: dealFields(language, orgCurrency), defaults: { contact_id: row.id, company_id: company?.id || '', name: `${company?.name || name} — ${fr ? 'opportunité' : 'opportunity'}` }, reload: deals.reload })}>
        {deals.rows.map(d => <RelatedRow key={d.id} to={`/app/deals/${d.id}`} title={String(d.name)} meta={(d.stage as { name?: string } | null)?.name || tStatus(String(d.status), language)} right={<span className="text-sm font-bold text-ink-900 tabular">{money(d.value, d.currency)}</span>} />)}
      </Related>
      <Timeline fk="contact_id" id={row.id} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Related title={t('nav.quotes', language)} icon={<FileText size={16} />} count={quotes.rows.length} addLabel={fr ? 'Devis' : 'Quote'} empty={fr ? 'Aucun devis.' : 'No quotes.'}
          onAdd={() => setAdding({ table: 'quotes', title: t('nav.quotes', language), fields: quoteFields(language, orgCurrency), defaults: { contact_id: row.id, company_id: company?.id || '' }, reload: quotes.reload })}>
          {quotes.rows.map(q => <RelatedRow key={q.id} to={`/app/quotes/${q.id}`} title={String(q.quote_number)} right={<><Badge variant={statusTone(q.status)}>{tStatus(String(q.status), language)}</Badge><span className="text-sm font-semibold tabular">{money(q.total, q.currency)}</span></>} />)}
        </Related>
        <Related title={t('nav.invoices', language)} icon={<Receipt size={16} />} count={invoices.rows.length} addLabel={fr ? 'Facture' : 'Invoice'} empty={fr ? 'Aucune facture.' : 'No invoices.'}
          onAdd={() => setAdding({ table: 'invoices', title: t('nav.invoices', language), fields: invoiceFields(language, orgCurrency), defaults: { contact_id: row.id, company_id: company?.id || '' }, reload: invoices.reload })}>
          {invoices.rows.map(q => <RelatedRow key={q.id} to={`/app/invoices/${q.id}`} title={String(q.invoice_number)} right={<><Badge variant={statusTone(q.payment_status)}>{tStatus(String(q.payment_status), language)}</Badge><span className="text-sm font-semibold tabular">{money(q.total, q.currency)}</span></>} />)}
        </Related>
      </div>
      {tickets.rows.length > 0 && (
        <Related title={t('nav.support', language)} icon={<LifeBuoy size={16} />} count={tickets.rows.length} empty="">
          {tickets.rows.map(tk => <RelatedRow key={tk.id} to="/app/support" title={String(tk.subject)} meta={String(tk.ticket_number)} right={<Badge variant={statusTone(tk.status)}>{tStatus(String(tk.status), language)}</Badge>} />)}
        </Related>
      )}

      <RecordFormModal open={editing} onClose={() => setEditing(false)} onSaved={() => reload()} table="contacts" title={name} fields={contactFields(language)} record={row} />
      <RecordFormModal open={adding !== null} onClose={() => setAdding(null)} onSaved={() => adding?.reload()} table={adding?.table || 'deals'} title={adding?.title || ''} fields={adding?.fields || []} defaults={adding?.defaults} />
    </Shell>
  );
}

/* ───────────────────────── Company ───────────────────────── */

export function CompanyDetailPage() {
  const { id } = useParams();
  const { language, organization } = useAuth();
  const fr = language === 'fr';
  const money = useMoney();
  const orgCurrency = organization?.currency || 'USD';
  const { row, loading, missing, reload } = useRecord('companies', id);
  const contacts = useRelated('contacts', 'company_id', id, 'id,first_name,last_name,job_title,email');
  const deals = useRelated('deals', 'company_id', id, 'id,name,value,currency,status,stage:pipeline_stages(name)');
  const invoices = useRelated('invoices', 'company_id', id, 'id,invoice_number,total,currency,payment_status');
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState<AddState>(null);
  const remove = useDelete('companies', '/app/companies');

  if (loading) return <Loading />;
  if (missing || !row) return <NotFound back="/app/companies" label={t('nav.companies', language)} />;

  const name = String(row.name || '');
  const openValue = deals.rows.filter(d => d.status === 'open' && (!d.currency || d.currency === orgCurrency)).reduce((s, d) => s + (Number(d.value) || 0), 0);
  const website = row.website ? (String(row.website).startsWith('http') ? String(row.website) : `https://${row.website}`) : '';

  return (
    <Shell
      back="/app/companies" backLabel={t('nav.companies', language)}
      icon={<Building2 size={24} />}
      title={name}
      subtitle={[row.industry, row.city].filter(Boolean).join(' · ')}
      badges={<Badge variant={statusTone(row.status)}>{tStatus(String(row.status), language)}</Badge>}
      actions={<>
        {website && <a href={website} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm"><Globe size={14} /> {fr ? 'Site web' : 'Website'}</a>}
        <button onClick={() => setEditing(true)} className="btn-secondary btn-sm"><Edit2 size={14} /> {t('common.edit', language)}</button>
        <button onClick={() => remove(row.id)} className="btn-icon hover:bg-error-50 hover:text-error-600" aria-label={t('common.delete', language)}><Trash2 size={15} /></button>
      </>}
      aside={<>
        <FieldsCard title={fr ? 'Informations' : 'Details'} items={[
          { label: t('list.industry', language), value: (row.industry as string) || '—' },
          { label: t('list.size', language), value: (row.size as string) || '—' },
          { label: fr ? 'Localisation' : 'Location', value: <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-ink-400" />{[row.city, row.country ? getCountryName(String(row.country), language) : ''].filter(Boolean).join(', ') || '—'}</span> },
          { label: t('list.revenue', language), value: row.revenue ? money(row.revenue, row.currency) : '—' },
          { label: fr ? 'Affaires ouvertes' : 'Open pipeline', value: <span className="tabular">{money(openValue)}</span> },
        ]} />
        {row.notes ? <section className="card p-5"><h2 className="card-title mb-2">{t('list.notes', language)}</h2><p className="whitespace-pre-wrap text-sm text-ink-700">{String(row.notes)}</p></section> : null}
        <TasksCard relatedType="company" id={row.id} />
      </>}
    >
      <Related title={t('nav.contacts', language)} icon={<User size={16} />} count={contacts.rows.length} addLabel={fr ? 'Contact' : 'Contact'} empty={fr ? 'Aucun contact rattaché.' : 'No linked contacts.'}
        onAdd={() => setAdding({ table: 'contacts', title: t('nav.contacts', language), fields: contactFields(language), defaults: { company_id: row.id, company: name }, reload: contacts.reload })}>
        {contacts.rows.map(c => <RelatedRow key={c.id} to={`/app/contacts/${c.id}`} title={`${c.first_name} ${c.last_name}`} meta={[c.job_title, c.email].filter(Boolean).join(' · ')} />)}
      </Related>
      <Related title={t('nav.deals', language)} icon={<Handshake size={16} />} count={deals.rows.length} addLabel={fr ? 'Affaire' : 'Deal'} empty={fr ? 'Aucune affaire.' : 'No deals.'}
        onAdd={() => setAdding({ table: 'deals', title: t('nav.deals', language), fields: dealFields(language, orgCurrency), defaults: { company_id: row.id, name: `${name} — ${fr ? 'opportunité' : 'opportunity'}` }, reload: deals.reload })}>
        {deals.rows.map(d => <RelatedRow key={d.id} to={`/app/deals/${d.id}`} title={String(d.name)} meta={(d.stage as { name?: string } | null)?.name || tStatus(String(d.status), language)} right={<span className="text-sm font-bold tabular">{money(d.value, d.currency)}</span>} />)}
      </Related>
      <Timeline fk="company_id" id={row.id} />
      <Related title={t('nav.invoices', language)} icon={<Receipt size={16} />} count={invoices.rows.length} empty={fr ? 'Aucune facture.' : 'No invoices.'}>
        {invoices.rows.map(q => <RelatedRow key={q.id} to={`/app/invoices/${q.id}`} title={String(q.invoice_number)} right={<><Badge variant={statusTone(q.payment_status)}>{tStatus(String(q.payment_status), language)}</Badge><span className="text-sm font-semibold tabular">{money(q.total, q.currency)}</span></>} />)}
      </Related>

      <RecordFormModal open={editing} onClose={() => setEditing(false)} onSaved={() => reload()} table="companies" title={name} fields={companyFields(language, orgCurrency)} record={row} />
      <RecordFormModal open={adding !== null} onClose={() => setAdding(null)} onSaved={() => adding?.reload()} table={adding?.table || 'contacts'} title={adding?.title || ''} fields={adding?.fields || []} defaults={adding?.defaults} />
    </Shell>
  );
}

/* ───────────────────────── Deal ───────────────────────── */

export function DealDetailPage() {
  const { id } = useParams();
  const { language, organization } = useAuth();
  const fr = language === 'fr';
  const money = useMoney();
  const orgCurrency = organization?.currency || 'USD';
  const { row, loading, missing, reload } = useRecord('deals', id, '*, stage:pipeline_stages(id,name,pipeline_id), contact:contacts(id,first_name,last_name,email,phone), company:companies(id,name)');
  const quotes = useRelated('quotes', 'deal_id', id, 'id,quote_number,total,currency,status');
  const invoices = useRelated('invoices', 'deal_id', id, 'id,invoice_number,total,currency,payment_status');
  const [stages, setStages] = useState<{ id: string; name: string; probability: number | null }[]>([]);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState<AddState>(null);
  const remove = useDelete('deals', '/app/deals');
  const pipelineId = (row?.stage as { pipeline_id?: string } | null)?.pipeline_id;

  useEffect(() => {
    if (!pipelineId) { setStages([]); return; }
    supabase.from('pipeline_stages').select('id,name,probability').eq('pipeline_id', pipelineId).order('sort_order', { ascending: true })
      .then(({ data }) => setStages((data || []) as typeof stages));
  }, [pipelineId]);

  async function update(patch: Record<string, unknown>, event?: 'deal.won' | 'deal.lost' | 'deal.updated') {
    if (!row) return;
    const { error } = await supabase.from('deals').update(patch).eq('id', row.id);
    if (error) { alert(error.message); return; }
    if (event) triggerWebhooks(event, { id: row.id, ...patch });
    reload();
  }

  if (loading) return <Loading />;
  if (missing || !row) return <NotFound back="/app/deals" label={t('nav.deals', language)} />;

  const contact = row.contact as { id: string; first_name: string; last_name: string; email?: string; phone?: string } | null;
  const company = row.company as { id: string; name: string } | null;
  const stage = row.stage as { id: string; name: string } | null;
  const currentIdx = stages.findIndex(s => s.id === stage?.id);
  const closed = row.status !== 'open';

  return (
    <Shell
      back="/app/deals" backLabel={t('nav.deals', language)}
      icon={<Handshake size={24} />}
      title={String(row.name)}
      subtitle={<>{company ? <Link className="text-primary-700 hover:underline" to={`/app/companies/${company.id}`}>{company.name}</Link> : null}{company && contact ? ' · ' : ''}{contact ? <Link className="text-primary-700 hover:underline" to={`/app/contacts/${contact.id}`}>{contact.first_name} {contact.last_name}</Link> : null}</>}
      badges={<><Badge variant={statusTone(row.status)}>{tStatus(String(row.status), language)}</Badge>{stage && <Badge variant="neutral">{stage.name}</Badge>}</>}
      actions={<>
        {!closed && <button onClick={() => update({ status: 'won', probability: 100 }, 'deal.won')} className="btn-success btn-sm"><Trophy size={14} /> {fr ? 'Gagnée' : 'Won'}</button>}
        {!closed && <button onClick={() => update({ status: 'lost', probability: 0 }, 'deal.lost')} className="btn-secondary btn-sm"><XCircle size={14} /> {fr ? 'Perdue' : 'Lost'}</button>}
        {closed && <button onClick={() => update({ status: 'open' }, 'deal.updated')} className="btn-secondary btn-sm">{fr ? 'Rouvrir' : 'Reopen'}</button>}
        <button onClick={() => setEditing(true)} className="btn-secondary btn-sm"><Edit2 size={14} /> {t('common.edit', language)}</button>
        <button onClick={() => remove(row.id)} className="btn-icon hover:bg-error-50 hover:text-error-600" aria-label={t('common.delete', language)}><Trash2 size={15} /></button>
      </>}
      aside={<>
        <FieldsCard title={fr ? 'Affaire' : 'Deal'} items={[
          { label: t('common.value', language), value: <span className="text-base font-bold tabular">{money(row.value, row.currency)}</span> },
          { label: t('list.probability', language), value: <span className="tabular">{String(row.probability ?? 0)} %</span> },
          { label: fr ? 'Valeur pondérée' : 'Weighted value', value: <span className="tabular">{money((Number(row.value) || 0) * ((Number(row.probability) || 0) / 100), row.currency)}</span> },
          { label: t('list.closingDate', language), value: row.closing_date ? new Date(String(row.closing_date)).toLocaleDateString(language) : '—' },
          { label: fr ? 'Créée le' : 'Created', value: new Date(String(row.created_at)).toLocaleDateString(language) },
        ]} />
        {contact && (
          <section className="card p-5">
            <h2 className="card-title mb-3">{fr ? 'Contact principal' : 'Primary contact'}</h2>
            <Link to={`/app/contacts/${contact.id}`} className="flex items-center gap-3 rounded-lg p-2 -m-2 hover:bg-ink-50">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-sm font-bold text-ink-700">{contact.first_name?.[0]}</span>
              <span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink-800">{contact.first_name} {contact.last_name}</span><span className="block truncate text-xs text-ink-500">{contact.email || contact.phone}</span></span>
            </Link>
          </section>
        )}
        {row.notes ? <section className="card p-5"><h2 className="card-title mb-2">{t('list.notes', language)}</h2><p className="whitespace-pre-wrap text-sm text-ink-700">{String(row.notes)}</p></section> : null}
        <TasksCard relatedType="deal" id={row.id} />
      </>}
    >
      {stages.length > 0 && (
        <section className="card p-4">
          <p className="mb-2 text-xs font-semibold text-ink-500">{fr ? 'Avancement dans le pipeline' : 'Pipeline progress'}</p>
          <ol className="flex gap-1 overflow-x-auto scrollbar-thin">
            {stages.map((s, i) => {
              const reached = currentIdx >= i;
              return (
                <li key={s.id} className="min-w-[110px] flex-1">
                  <button disabled={closed} onClick={() => update({ stage_id: s.id, probability: s.probability ?? row.probability }, 'deal.updated')}
                    className={`w-full rounded-md px-2 py-2 text-xs font-semibold transition-colors ${i === currentIdx ? 'bg-primary-600 text-white' : reached ? 'bg-primary-100 text-primary-800 hover:bg-primary-200' : 'bg-ink-100 text-ink-500 hover:bg-ink-200'} disabled:cursor-default`}>
                    <span className="block truncate">{s.name}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      )}
      <Timeline fk="deal_id" id={row.id} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Related title={t('nav.quotes', language)} icon={<FileText size={16} />} count={quotes.rows.length} addLabel={fr ? 'Devis' : 'Quote'} empty={fr ? 'Aucun devis.' : 'No quotes.'}
          onAdd={() => setAdding({ table: 'quotes', title: t('nav.quotes', language), fields: quoteFields(language, orgCurrency), defaults: { deal_id: row.id, contact_id: contact?.id || '', company_id: company?.id || '', currency: row.currency || orgCurrency }, reload: quotes.reload })}>
          {quotes.rows.map(q => <RelatedRow key={q.id} to={`/app/quotes/${q.id}`} title={String(q.quote_number)} right={<><Badge variant={statusTone(q.status)}>{tStatus(String(q.status), language)}</Badge><span className="text-sm font-semibold tabular">{money(q.total, q.currency)}</span></>} />)}
        </Related>
        <Related title={t('nav.invoices', language)} icon={<Receipt size={16} />} count={invoices.rows.length} addLabel={fr ? 'Facture' : 'Invoice'} empty={fr ? 'Aucune facture.' : 'No invoices.'}
          onAdd={() => setAdding({ table: 'invoices', title: t('nav.invoices', language), fields: invoiceFields(language, orgCurrency), defaults: { deal_id: row.id, contact_id: contact?.id || '', company_id: company?.id || '', currency: row.currency || orgCurrency }, reload: invoices.reload })}>
          {invoices.rows.map(q => <RelatedRow key={q.id} to={`/app/invoices/${q.id}`} title={String(q.invoice_number)} right={<><Badge variant={statusTone(q.payment_status)}>{tStatus(String(q.payment_status), language)}</Badge><span className="text-sm font-semibold tabular">{money(q.total, q.currency)}</span></>} />)}
        </Related>
      </div>

      <RecordFormModal open={editing} onClose={() => setEditing(false)} onSaved={() => reload()} table="deals" title={String(row.name)} fields={dealFields(language, orgCurrency)} record={row} />
      <RecordFormModal open={adding !== null} onClose={() => setAdding(null)} onSaved={() => adding?.reload()} table={adding?.table || 'quotes'} title={adding?.title || ''} fields={adding?.fields || []} defaults={adding?.defaults} />
    </Shell>
  );
}

/* ───────────────────────── Lead ───────────────────────── */

export function LeadDetailPage() {
  const { id } = useParams();
  const { language } = useAuth();
  const fr = language === 'fr';
  const money = useMoney();
  const { row, loading, missing, reload } = useRecord('leads', id);
  const [editing, setEditing] = useState(false);
  const [converting, setConverting] = useState(false);
  const remove = useDelete('leads', '/app/leads');

  if (loading) return <Loading />;
  if (missing || !row) return <NotFound back="/app/leads" label={t('nav.leads', language)} />;

  const name = `${row.first_name || ''} ${row.last_name || ''}`.trim();
  const converted = row.status === 'converted';

  return (
    <Shell
      back="/app/leads" backLabel={t('nav.leads', language)}
      icon={<UserPlus size={22} />}
      title={name}
      subtitle={[row.title, row.company_name].filter(Boolean).join(' · ')}
      badges={<><Badge variant={statusTone(row.status)}>{tStatus(String(row.status), language)}</Badge><Badge variant={row.temperature === 'hot' ? 'error' : row.temperature === 'warm' ? 'warning' : 'neutral'}>{tStatus(String(row.temperature), language)}</Badge></>}
      actions={<>
        {converted && row.converted_contact_id
          ? <Link to={`/app/contacts/${row.converted_contact_id}`} className="btn-secondary btn-sm"><ExternalLink size={14} /> {fr ? 'Voir le contact' : 'Open contact'}</Link>
          : <button onClick={() => setConverting(true)} className="btn-primary btn-sm"><Shuffle size={14} /> {fr ? 'Convertir' : 'Convert'}</button>}
        <QuickEmailButton to={row.email as string} name={name} target={{ fk: 'lead_id', id: row.id }} />
        <QuickMessageButton phone={row.phone as string} name={name} />
        <button onClick={() => setEditing(true)} className="btn-secondary btn-sm"><Edit2 size={14} /> {t('common.edit', language)}</button>
        <button onClick={() => remove(row.id)} className="btn-icon hover:bg-error-50 hover:text-error-600" aria-label={t('common.delete', language)}><Trash2 size={15} /></button>
      </>}
      aside={<>
        <FieldsCard title={fr ? 'Qualification' : 'Qualification'} items={[
          { label: t('list.potentialValue', language), value: <span className="font-bold tabular">{money(row.potential_value)}</span> },
          { label: t('list.source', language), value: row.source ? tStatus(String(row.source), language) : '—' },
          { label: t('list.leadScore', language), value: <span className="tabular">{String(row.lead_score ?? 0)}/100</span> },
          { label: t('common.email', language), value: (row.email as string) || '—' },
          { label: t('common.phone', language), value: (row.phone as string) || '—' },
          { label: fr ? 'Créée le' : 'Created', value: new Date(String(row.created_at)).toLocaleDateString(language) },
          ...(row.converted_at ? [{ label: fr ? 'Convertie le' : 'Converted', value: new Date(String(row.converted_at)).toLocaleDateString(language) }] : []),
        ]} />
        <RecordAppActions person={row as { email?: string; first_name?: string; last_name?: string }} target={{ fk: 'lead_id', id: row.id }} />
        <TasksCard relatedType="lead" id={row.id} />
      </>}
    >
      {!converted && (
        <section className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-sm font-bold text-ink-900">{fr ? 'Cette piste est prête ?' : 'Is this lead ready?'}</p>
            <p className="text-sm text-ink-500">{fr ? 'La conversion crée le contact, l’entreprise et l’affaire en une fois.' : 'Converting creates the contact, company and deal in one go.'}</p>
          </div>
          <button onClick={() => setConverting(true)} className="btn-primary btn-sm"><Shuffle size={14} /> {fr ? 'Convertir la piste' : 'Convert lead'}</button>
        </section>
      )}
      {row.notes ? <section className="card p-5"><h2 className="card-title mb-2">{t('list.notes', language)}</h2><p className="whitespace-pre-wrap text-sm text-ink-700">{String(row.notes)}</p></section> : null}
      <Timeline fk="lead_id" id={row.id} />

      <RecordFormModal open={editing} onClose={() => setEditing(false)} onSaved={() => reload()} table="leads" title={name} fields={leadFields(language)} record={row} />
      {converting && <ConvertLeadModal lead={row as unknown as Lead} onClose={() => setConverting(false)} />}
    </Shell>
  );
}
