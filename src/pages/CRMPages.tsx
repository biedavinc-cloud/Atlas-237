import { useEffect, useState } from 'react';
import { Users, Building2, UserPlus, Handshake, KanbanSquare, Activity, Calendar, ListChecks, Check, RotateCcw } from 'lucide-react';
import { ListPage, type FormField } from '@/components/ListPage';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { t, tStatus } from '@/lib/i18n';
import { Badge, PageHeader } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { Loading } from '@/components/Loading';
import type { Contact, Company, Lead, Deal } from '@/types';
import { CURRENCIES, formatMoney } from '@/lib/i18n-countries';
import { QuickMessageButton } from '@/components/QuickMessageButton';

function currencyField(language: string, orgCurrency: string): FormField {
  return {
    key: 'currency',
    label: language === 'fr' ? 'Devise' : 'Currency',
    type: 'select',
    required: true,
    defaultValue: orgCurrency,
    options: CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name} (${c.symbol})` })),
  };
}

export function ContactsPage() {
  const { language } = useAuth();
  const fields: FormField[] = [
    { key: 'first_name', label: t('auth.firstName', language), type: 'text', required: true },
    { key: 'last_name', label: t('auth.lastName', language), type: 'text', required: true },
    { key: 'email', label: t('common.email', language), type: 'email' },
    { key: 'country', label: t('list.country', language), type: 'country' },
    { key: 'phone', label: t('common.phone', language), type: 'phone', countryFieldKey: 'country' },
    { key: 'job_title', label: t('list.title', language), type: 'text' },
    { key: 'company', label: t('common.company', language), type: 'text' },
    { key: 'city', label: t('list.city', language), type: 'text' },
    { key: 'status', label: t('common.status', language), type: 'select', options: [
      { value: 'active', label: t('status.active', language) }, { value: 'inactive', label: t('status.inactive', language) }, { value: 'lead', label: t('status.lead', language) },
    ], defaultValue: 'active' },
    { key: 'lead_score', label: t('list.leadScore', language), type: 'number', defaultValue: 0 },
    { key: 'tags', label: t('list.tags', language), type: 'tags' },
    { key: 'notes', label: t('list.notes', language), type: 'textarea' },
  ];

  return (
    <ListPage<Contact>
      table="contacts"
      title={t('nav.contacts', language)}
      subtitle=""
      columns={[
        { key: 'first_name', label: t('common.name', language), render: (r) => <span className="font-medium text-ink-800">{r.first_name} {r.last_name}</span> },
        { key: 'email', label: t('common.email', language), render: (r) => r.email || '—' },
        { key: 'phone', label: t('common.phone', language), render: (r) => r.phone || '—' },
        { key: 'job_title', label: t('list.title', language), render: (r) => r.job_title || '—' },
        { key: 'status', label: t('common.status', language), render: (r) => <Badge variant={r.status === 'active' ? 'success' : 'neutral'}>{tStatus(r.status, language)}</Badge> },
        { key: 'lead_score', label: t('list.leadScore', language), render: (r) => <span className="font-semibold">{r.lead_score}</span> },
      ]}
      formFields={fields}
      emptyIcon={<Users size={28} />}
      emptyTitle={t('empty.noContacts', language)}
      emptyDescription={t('empty.noContactsDesc', language)}
      orderBy="created_at"
      importable
      rowActions={(row) => <QuickMessageButton phone={row.phone} name={`${row.first_name} ${row.last_name}`} />}
    />
  );
}

export function CompaniesPage() {
  const { language, organization } = useAuth();
  const orgCurrency = organization?.currency || 'USD';
  const fields: FormField[] = [
    { key: 'name', label: t('common.name', language), type: 'text', required: true },
    { key: 'industry', label: t('list.industry', language), type: 'text' },
    { key: 'website', label: t('list.website', language), type: 'text' },
    { key: 'size', label: t('list.size', language), type: 'select', options: [
      { value: '1-10', label: '1-10' }, { value: '11-50', label: '11-50' }, { value: '51-200', label: '51-200' }, { value: '201-500', label: '201-500' }, { value: '500+', label: '500+' },
    ]},
    { key: 'city', label: t('list.city', language), type: 'text' },
    { key: 'country', label: t('list.country', language), type: 'country' },
    { key: 'revenue', label: t('list.revenue', language), type: 'number' },
    currencyField(language, orgCurrency),
    { key: 'status', label: t('common.status', language), type: 'select', options: [
      { value: 'active', label: t('status.active', language) }, { value: 'inactive', label: t('status.inactive', language) },
    ], defaultValue: 'active' },
    { key: 'notes', label: t('list.notes', language), type: 'textarea' },
  ];

  return (
    <ListPage<Company>
      table="companies"
      title={t('nav.companies', language)}
      columns={[
        { key: 'name', label: t('common.name', language), render: (r) => <span className="font-medium text-ink-800">{r.name}</span> },
        { key: 'industry', label: t('list.industry', language), render: (r) => r.industry || '—' },
        { key: 'website', label: t('list.website', language), render: (r) => r.website ? <a href={r.website} target="_blank" rel="noopener" className="text-primary-600 hover:underline">{r.website}</a> : '—' },
        { key: 'size', label: t('list.size', language), render: (r) => r.size || '—' },
        { key: 'revenue', label: t('list.revenue', language), render: (r) => r.revenue ? formatMoney(r.revenue * 100, r.currency || orgCurrency, language) : '—' },
        { key: 'status', label: t('common.status', language), render: (r) => <Badge variant={r.status === 'active' ? 'success' : 'neutral'}>{tStatus(r.status, language)}</Badge> },
      ]}
      formFields={fields}
      emptyIcon={<Building2 size={28} />}
      emptyTitle={t('empty.noCompanies', language)}
      emptyDescription={t('empty.noCompaniesDesc', language)}
      orderBy="created_at"
    />
  );
}

export function LeadsPage() {
  const { language } = useAuth();
  const fields: FormField[] = [
    { key: 'first_name', label: t('auth.firstName', language), type: 'text', required: true },
    { key: 'last_name', label: t('auth.lastName', language), type: 'text', required: true },
    { key: 'email', label: t('common.email', language), type: 'email' },
    { key: 'phone', label: t('common.phone', language), type: 'phone' },
    { key: 'company_name', label: t('common.company', language), type: 'text' },
    { key: 'title', label: t('list.title', language), type: 'text' },
    { key: 'source', label: t('list.source', language), type: 'select', options: [
      { value: 'website', label: t('status.website2', language) }, { value: 'referral', label: t('status.referral', language) }, { value: 'cold_outreach', label: t('status.coldOutreach', language) }, { value: 'event', label: t('status.event', language) }, { value: 'social', label: t('status.social', language) },
    ]},
    { key: 'status', label: t('common.status', language), type: 'select', options: [
      { value: 'new', label: t('status.new', language) }, { value: 'contacted', label: t('status.contacted', language) }, { value: 'qualified', label: t('status.qualified', language) }, { value: 'converted', label: t('status.converted', language) }, { value: 'lost', label: t('status.lost', language) },
    ], defaultValue: 'new' },
    { key: 'temperature', label: t('list.temperature', language), type: 'select', options: [
      { value: 'hot', label: t('status.hot', language) }, { value: 'warm', label: t('status.warm', language) }, { value: 'cold', label: t('status.cold', language) },
    ], defaultValue: 'warm' },
    { key: 'potential_value', label: t('list.potentialValue', language), type: 'number', defaultValue: 0 },
    { key: 'notes', label: t('list.notes', language), type: 'textarea' },
  ];

  return (
    <ListPage<Lead>
      table="leads"
      title={t('nav.leads', language)}
      columns={[
        { key: 'first_name', label: t('common.name', language), render: (r) => <span className="font-medium text-ink-800">{r.first_name} {r.last_name}</span> },
        { key: 'company_name', label: t('common.company', language), render: (r) => r.company_name || '—' },
        { key: 'source', label: t('list.source', language), render: (r) => r.source || '—' },
        { key: 'temperature', label: t('list.temperature', language), render: (r) => <Badge variant={r.temperature === 'hot' ? 'error' : r.temperature === 'warm' ? 'warning' : 'neutral'}>{tStatus(r.temperature, language)}</Badge> },
        { key: 'status', label: t('common.status', language), render: (r) => <Badge variant={r.status === 'converted' ? 'success' : r.status === 'lost' ? 'error' : 'primary'}>{tStatus(r.status, language)}</Badge> },
        { key: 'potential_value', label: t('common.value', language), render: (r) => `$${(r.potential_value || 0).toLocaleString()}` },
      ]}
      formFields={fields}
      emptyIcon={<UserPlus size={28} />}
      emptyTitle={t('empty.noLeads', language)}
      emptyDescription={t('empty.noLeadsDesc', language)}
      orderBy="created_at"
      importable
      rowActions={(row) => <QuickMessageButton phone={row.phone} name={`${row.first_name} ${row.last_name}`} />}
    />
  );
}

export function DealsPage() {
  const { language, organization } = useAuth();
  const orgCurrency = organization?.currency || 'USD';
  const fields: FormField[] = [
    { key: 'name', label: t('list.dealName', language), type: 'text', required: true },
    { key: 'value', label: t('common.value', language), type: 'number', required: true, defaultValue: 0 },
    currencyField(language, orgCurrency),
    { key: 'closing_date', label: t('list.closingDate', language), type: 'date' },
    { key: 'status', label: t('common.status', language), type: 'select', options: [
      { value: 'open', label: t('status.open', language) }, { value: 'won', label: t('status.won', language) }, { value: 'lost', label: t('status.lost', language) },
    ], defaultValue: 'open' },
    { key: 'probability', label: t('list.probability', language), type: 'number', defaultValue: 0 },
    { key: 'notes', label: t('list.notes', language), type: 'textarea' },
  ];

  return (
    <ListPage<Deal>
      table="deals"
      title={t('nav.deals', language)}
      columns={[
        { key: 'name', label: t('nav.deals', language), render: (r) => <span className="font-medium text-ink-800">{r.name}</span> },
        { key: 'value', label: t('common.value', language), render: (r) => <span className="font-semibold">{formatMoney((r.value || 0) * 100, r.currency || orgCurrency, language)}</span> },
        { key: 'probability', label: t('list.probability', language), render: (r) => `${r.probability}%` },
        { key: 'closing_date', label: t('list.closeDate', language), render: (r) => r.closing_date ? new Date(r.closing_date).toLocaleDateString(language) : '—' },
        { key: 'status', label: t('common.status', language), render: (r) => <Badge variant={r.status === 'won' ? 'success' : r.status === 'lost' ? 'error' : 'primary'}>{tStatus(r.status, language)}</Badge> },
      ]}
      formFields={fields}
      emptyIcon={<Handshake size={28} />}
      emptyTitle={t('empty.noDeals', language)}
      emptyDescription={t('empty.noDealsDesc', language)}
      relations="*, stage:pipeline_stages(*), contact:contacts(*), company:companies(*)"
      orderBy="created_at"
    />
  );
}

export function PipelinesPage() {
  const { language } = useAuth();
  const fields: FormField[] = [
    { key: 'name', label: t('common.name', language), type: 'text', required: true },
    { key: 'description', label: t('list.description', language), type: 'textarea' },
    { key: 'sort_order', label: t('list.sortOrder', language), type: 'number', defaultValue: 0 },
  ];

  return (
    <ListPage<{ id: string; name: string; description: string | null; sort_order: number; [key: string]: unknown }>
      table="pipelines"
      title={t('nav.pipelines', language)}
      columns={[
        { key: 'name', label: t('common.name', language), render: (r) => <span className="font-medium text-ink-800">{r.name}</span> },
        { key: 'description', label: t('list.description', language), render: (r) => r.description || '—' },
      ]}
      formFields={fields}
      emptyIcon={<KanbanSquare size={28} />}
      emptyTitle={t('empty.noPipelines', language)}
      emptyDescription={t('empty.noPipelinesDesc', language)}
      orderBy="sort_order"
    />
  );
}

export function ActivitiesPage() {
  const { language } = useAuth();
  const fields: FormField[] = [
    { key: 'title', label: t('list.title', language), type: 'text', required: true },
    { key: 'type', label: t('list.type', language), type: 'select', options: [
      { value: 'call', label: t('status.call', language) }, { value: 'email', label: t('status.email', language) }, { value: 'meeting', label: t('status.meeting', language) }, { value: 'note', label: t('status.note', language) }, { value: 'task', label: t('status.task', language) },
    ], defaultValue: 'call' },
    { key: 'status', label: t('common.status', language), type: 'select', options: [
      { value: 'pending', label: t('status.pending', language) }, { value: 'completed', label: t('status.completed', language) },
    ], defaultValue: 'pending' },
    { key: 'scheduled_at', label: t('list.scheduled', language), type: 'date' },
    { key: 'description', label: t('list.description', language), type: 'textarea' },
  ];

  return (
    <ListPage<{ id: string; title: string; type: string; status: string; scheduled_at: string | null; description: string | null; [key: string]: unknown }>
      table="activities"
      title={t('nav.activities', language)}
      columns={[
        { key: 'title', label: t('list.title', language), render: (r) => <span className="font-medium text-ink-800">{r.title}</span> },
        { key: 'type', label: t('list.type', language), render: (r) => <Badge variant="primary">{tStatus(r.type, language)}</Badge> },
        { key: 'status', label: t('common.status', language), render: (r) => <Badge variant={r.status === 'completed' ? 'success' : 'warning'}>{tStatus(r.status, language)}</Badge> },
        { key: 'scheduled_at', label: t('list.scheduled', language), render: (r) => r.scheduled_at ? new Date(r.scheduled_at).toLocaleDateString(language) : '—' },
      ]}
      formFields={fields}
      emptyIcon={<Activity size={28} />}
      emptyTitle={t('empty.noActivities', language)}
      emptyDescription={t('empty.noActivitiesDesc', language)}
      orderBy="created_at"
    />
  );
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  status: string | null;
  due_date: string | null;
  related_type: string | null;
  [key: string]: unknown;
}

/**
 * Tasks — the `tasks` table. Workflows' "Create task" action (manual and
 * scheduled runs) writes here, and the Command Center counts overdue ones,
 * but until now no page ever listed them, so automated tasks were invisible.
 */
export function TasksPage() {
  const { language } = useAuth();
  const fr = language === 'fr';
  const priorityLabel: Record<string, string> = fr
    ? { low: 'Basse', medium: 'Moyenne', high: 'Haute', urgent: 'Urgente' }
    : { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
  const statusLabel: Record<string, string> = fr
    ? { pending: 'À faire', in_progress: 'En cours', completed: 'Terminée', cancelled: 'Annulée' }
    : { pending: 'To do', in_progress: 'In progress', completed: 'Done', cancelled: 'Cancelled' };

  const fields: FormField[] = [
    { key: 'title', label: t('list.title', language), type: 'text', required: true },
    { key: 'priority', label: fr ? 'Priorité' : 'Priority', type: 'select', defaultValue: 'medium', options: Object.entries(priorityLabel).map(([value, label]) => ({ value, label })) },
    { key: 'status', label: t('common.status', language), type: 'select', defaultValue: 'pending', options: Object.entries(statusLabel).map(([value, label]) => ({ value, label })) },
    { key: 'due_date', label: fr ? 'Échéance' : 'Due date', type: 'date' },
    { key: 'description', label: t('list.description', language), type: 'textarea' },
  ];

  async function toggleDone(row: TaskRow, reload: () => void) {
    const done = row.status === 'completed';
    const { error } = await supabase.from('tasks').update({
      status: done ? 'pending' : 'completed',
      completed_at: done ? null : new Date().toISOString(),
    }).eq('id', row.id);
    if (error) { alert(error.message); return; }
    reload();
  }

  const now = Date.now();
  return (
    <ListPage<TaskRow>
      table="tasks"
      title={t('nav.tasks', language)}
      subtitle={fr ? 'Vos tâches et celles créées par vos workflows.' : 'Your to-dos, including the ones your workflows create.'}
      columns={[
        { key: 'title', label: t('list.title', language), render: (r) => (
          <div className="min-w-0">
            <p className={`font-medium ${r.status === 'completed' ? 'text-ink-400 line-through' : 'text-ink-800'}`}>{r.title}</p>
            {r.related_type === 'workflow' && <p className="text-xs text-ink-400">{fr ? 'Créée par un workflow' : 'Created by a workflow'}</p>}
          </div>
        ) },
        { key: 'priority', label: fr ? 'Priorité' : 'Priority', render: (r) => {
          const p = r.priority || 'medium';
          return <Badge variant={p === 'urgent' || p === 'high' ? 'error' : p === 'low' ? 'neutral' : 'warning'}>{priorityLabel[p] || p}</Badge>;
        } },
        { key: 'status', label: t('common.status', language), render: (r) => {
          const st = r.status || 'pending';
          return <Badge variant={st === 'completed' ? 'success' : st === 'in_progress' ? 'primary' : st === 'cancelled' ? 'neutral' : 'warning'}>{statusLabel[st] || st}</Badge>;
        } },
        { key: 'due_date', label: fr ? 'Échéance' : 'Due', render: (r) => {
          if (!r.due_date) return <span className="text-ink-400">—</span>;
          const overdue = r.status !== 'completed' && new Date(r.due_date).getTime() < now;
          return <span className={overdue ? 'font-semibold text-error-600' : ''}>{new Date(r.due_date).toLocaleDateString(language)}{overdue ? (fr ? ' · en retard' : ' · overdue') : ''}</span>;
        } },
      ]}
      formFields={fields}
      emptyIcon={<ListChecks size={26} />}
      emptyTitle={fr ? 'Aucune tâche' : 'No tasks yet'}
      emptyDescription={fr ? 'Ajoutez une tâche, ou laissez un workflow en créer automatiquement.' : 'Add a task, or let a workflow create them for you.'}
      orderBy="created_at"
      rowActions={(row, reload) => (
        <button
          onClick={() => toggleDone(row, reload)}
          className={`btn-icon h-7 w-7 ${row.status === 'completed' ? '' : 'hover:bg-success-50 hover:text-success-600'}`}
          aria-label={row.status === 'completed' ? (fr ? 'Rouvrir' : 'Reopen') : (fr ? 'Marquer terminée' : 'Mark as done')}
          title={row.status === 'completed' ? (fr ? 'Rouvrir' : 'Reopen') : (fr ? 'Marquer terminée' : 'Mark as done')}
        >
          {row.status === 'completed' ? <RotateCcw size={14} /> : <Check size={14} />}
        </button>
      )}
    />
  );
}

export function CalendarPage() {
  const { language } = useAuth();
  const lang = language;
  const [activities, setActivities] = useState<{ id: string; title: string; type: string; status: string; scheduled_at: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('activities').select('id,title,type,status,scheduled_at').order('scheduled_at', { ascending: true, nullsFirst: false })
      .then(({ data }) => { setActivities((data || []) as typeof activities); setLoading(false); });
  }, []);

  const now = new Date();
  const upcoming = activities.filter(a => a.scheduled_at && new Date(a.scheduled_at) >= now);
  const past = activities.filter(a => a.scheduled_at && new Date(a.scheduled_at) < now);

  return (
    <div className="animate-fade-in">
      <PageHeader title={t('nav.calendar', lang)} subtitle="" />
      {loading ? (
        <Loading text={t('common.loading', lang)} />
      ) : activities.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Calendar size={28} />} title={lang === 'fr' ? 'Aucun événement' : 'No events'} description={lang === 'fr' ? 'Vos activités planifiées apparaîtront ici.' : 'Your scheduled activities and meetings appear here.'} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="font-bold text-ink-900 mb-4">{lang === 'fr' ? 'À venir' : 'Upcoming'}</h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-ink-400 py-4 text-center">{t('common.noData', lang)}</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map(a => (
                  <div key={a.id} className="flex items-start gap-3 py-2 border-b border-ink-50 last:border-0">
                    <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-primary-50 text-primary-600 flex-shrink-0">
                      <Calendar size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink-800">{a.title}</p>
                      <p className="text-xs text-ink-500">{a.scheduled_at ? new Date(a.scheduled_at).toLocaleString(lang) : '—'} · {a.type}</p>
                    </div>
                    <Badge variant={a.status === 'completed' ? 'success' : 'warning'}>{tStatus(a.status, language)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card p-5">
            <h3 className="font-bold text-ink-900 mb-4">{lang === 'fr' ? 'Passés' : 'Past'}</h3>
            {past.length === 0 ? (
              <p className="text-sm text-ink-400 py-4 text-center">{t('common.noData', lang)}</p>
            ) : (
              <div className="space-y-3">
                {past.map(a => (
                  <div key={a.id} className="flex items-start gap-3 py-2 border-b border-ink-50 last:border-0 opacity-70">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-100 text-ink-500 flex-shrink-0">
                      <Calendar size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink-800">{a.title}</p>
                      <p className="text-xs text-ink-500">{a.scheduled_at ? new Date(a.scheduled_at).toLocaleString(lang) : '—'} · {a.type}</p>
                    </div>
                    <Badge variant={a.status === 'completed' ? 'success' : 'warning'}>{tStatus(a.status, language)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
