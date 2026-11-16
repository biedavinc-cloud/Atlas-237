import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Building2, UserPlus, Handshake, Activity, Calendar, ListChecks, Check, RotateCcw, KanbanSquare, List, Shuffle } from 'lucide-react';
import { ListPage, type FormField } from '@/components/ListPage';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { t, tStatus } from '@/lib/i18n';
import { Badge, PageHeader } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { Loading } from '@/components/Loading';
import type { Contact, Company, Lead, Deal } from '@/types';
import { formatAmount } from '@/lib/i18n-countries';
import { QuickMessageButton } from '@/components/QuickMessageButton';
import { useCustomFormFields } from '@/lib/workspace';
import { ConvertLeadModal } from '@/components/ConvertLeadModal';
import { contactFields, companyFields, leadFields, dealFields, contactRelation, dealRelation, companyRelation } from '@/lib/entityFields';

type WithCompany = { company_rel?: { id: string; name: string } | null };

export function ContactsPage() {
  const { language } = useAuth();
  const customFields = useCustomFormFields('contacts');
  return (
    <ListPage<Contact & WithCompany>
      table="contacts"
      title={t('nav.contacts', language)}
      columns={[
        { key: 'first_name', label: t('common.name', language), render: (r) => <span className="font-medium text-ink-800">{r.first_name} {r.last_name}</span> },
        { key: 'company', label: t('common.company', language), render: (r) => r.company_rel?.name || (typeof r.company === 'string' ? r.company : '') || '—' },
        { key: 'email', label: t('common.email', language), render: (r) => r.email || '—' },
        { key: 'phone', label: t('common.phone', language), render: (r) => r.phone || '—' },
        { key: 'status', label: t('common.status', language), render: (r) => <Badge variant={r.status === 'active' ? 'success' : 'neutral'}>{tStatus(r.status, language)}</Badge> },
        { key: 'lead_score', label: t('list.leadScore', language), render: (r) => <span className="font-semibold tabular">{r.lead_score}</span> },
      ]}
      formFields={[...contactFields(language), ...customFields]}
      relations="*, company_rel:companies(id,name)"
      searchColumns={['first_name', 'last_name', 'email', 'phone', 'company', 'job_title']}
      emptyIcon={<Users size={26} />}
      emptyTitle={t('empty.noContacts', language)}
      emptyDescription={t('empty.noContactsDesc', language)}
      orderBy="created_at"
      importable
      rowLink={(r) => `/app/contacts/${r.id}`}
      rowActions={(row) => <QuickMessageButton phone={row.phone} name={`${row.first_name} ${row.last_name}`} record={{ table: 'contacts', id: row.id }} />}
    />
  );
}

export function CompaniesPage() {
  const { language, organization } = useAuth();
  const orgCurrency = organization?.currency || 'USD';
  return (
    <ListPage<Company>
      table="companies"
      title={t('nav.companies', language)}
      columns={[
        { key: 'name', label: t('common.name', language), render: (r) => <span className="font-medium text-ink-800">{r.name}</span> },
        { key: 'industry', label: t('list.industry', language), render: (r) => r.industry || '—' },
        { key: 'city', label: t('list.city', language), render: (r) => r.city || '—' },
        { key: 'size', label: t('list.size', language), render: (r) => r.size || '—' },
        { key: 'revenue', label: t('list.revenue', language), render: (r) => r.revenue ? formatAmount(r.revenue, r.currency || orgCurrency, language) : '—' },
        { key: 'status', label: t('common.status', language), render: (r) => <Badge variant={r.status === 'active' ? 'success' : 'neutral'}>{tStatus(r.status, language)}</Badge> },
      ]}
      formFields={companyFields(language, orgCurrency)}
      searchColumns={['name', 'industry', 'city', 'website']}
      emptyIcon={<Building2 size={26} />}
      emptyTitle={t('empty.noCompanies', language)}
      emptyDescription={t('empty.noCompaniesDesc', language)}
      orderBy="created_at"
      importable
      rowLink={(r) => `/app/companies/${r.id}`}
    />
  );
}

export function LeadsPage() {
  const { language, organization } = useAuth();
  const orgCurrency = organization?.currency || 'USD';
  const [converting, setConverting] = useState<{ lead: Lead; reload: () => void } | null>(null);
  const leadCustomFields = useCustomFormFields('leads');
  const fr = language === 'fr';
  return (
    <>
      <ListPage<Lead>
        table="leads"
        title={t('nav.leads', language)}
        columns={[
          { key: 'first_name', label: t('common.name', language), render: (r) => <span className="font-medium text-ink-800">{r.first_name} {r.last_name}</span> },
          { key: 'company_name', label: t('common.company', language), render: (r) => r.company_name || '—' },
          { key: 'source', label: t('list.source', language), render: (r) => r.source ? tStatus(r.source, language) : '—' },
          { key: 'temperature', label: t('list.temperature', language), render: (r) => <Badge variant={r.temperature === 'hot' ? 'error' : r.temperature === 'warm' ? 'warning' : 'neutral'}>{tStatus(r.temperature, language)}</Badge> },
          { key: 'status', label: t('common.status', language), render: (r) => <Badge variant={r.status === 'converted' ? 'success' : r.status === 'lost' ? 'error' : 'primary'}>{tStatus(r.status, language)}</Badge> },
          { key: 'potential_value', label: t('common.value', language), render: (r) => <span className="tabular">{formatAmount((r.potential_value || 0), orgCurrency, language)}</span> },
        ]}
        formFields={[...leadFields(language), ...leadCustomFields]}
        searchColumns={['first_name', 'last_name', 'email', 'phone', 'company_name']}
        emptyIcon={<UserPlus size={26} />}
        emptyTitle={t('empty.noLeads', language)}
        emptyDescription={t('empty.noLeadsDesc', language)}
        orderBy="created_at"
        importable
        rowLink={(r) => `/app/leads/${r.id}`}
        rowActions={(row, reload) => (
          <>
            {row.status !== 'converted' && (
              <button onClick={() => setConverting({ lead: row, reload })} className="btn-icon h-7 w-7 hover:bg-success-50 hover:text-success-600" title={fr ? 'Convertir' : 'Convert'} aria-label={fr ? 'Convertir' : 'Convert'}>
                <Shuffle size={14} />
              </button>
            )}
            <QuickMessageButton phone={row.phone} name={`${row.first_name} ${row.last_name}`} record={{ table: 'leads', id: row.id }} />
          </>
        )}
      />
      {converting && (
        <ConvertLeadModal lead={converting.lead} onClose={() => setConverting(null)} onDone={() => { converting.reload(); setConverting(null); }} />
      )}
    </>
  );
}

type DealRow = Deal & { stage?: { name: string } | null; contact?: { first_name: string; last_name: string } | null; company?: { name: string } | null };

export function DealsViewSwitch({ active }: { active: 'list' | 'board' }) {
  const { language } = useAuth();
  const fr = language === 'fr';
  return (
    <div className="inline-flex rounded-lg border border-ink-200 bg-white p-0.5" role="tablist">
      <Link to="/app/deals" role="tab" aria-selected={active === 'list'} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${active === 'list' ? 'bg-ink-100 text-ink-900' : 'text-ink-500 hover:text-ink-800'}`}>
        <List size={14} /> {fr ? 'Liste' : 'List'}
      </Link>
      <Link to="/app/pipelines" role="tab" aria-selected={active === 'board'} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${active === 'board' ? 'bg-ink-100 text-ink-900' : 'text-ink-500 hover:text-ink-800'}`}>
        <KanbanSquare size={14} /> {fr ? 'Pipeline' : 'Board'}
      </Link>
    </div>
  );
}

export function DealsPage() {
  const { language, organization } = useAuth();
  const orgCurrency = organization?.currency || 'USD';
  return (
    <ListPage<DealRow>
      table="deals"
      title={t('nav.deals', language)}
      headerExtra={<DealsViewSwitch active="list" />}
      columns={[
        { key: 'name', label: t('nav.deals', language), render: (r) => <span className="font-medium text-ink-800">{r.name}</span> },
        { key: 'company_id', label: t('common.company', language), render: (r) => r.company?.name || (r.contact ? `${r.contact.first_name} ${r.contact.last_name}` : '—') },
        { key: 'stage_id', label: language === 'fr' ? 'Étape' : 'Stage', render: (r) => r.stage?.name || '—' },
        { key: 'value', label: t('common.value', language), render: (r) => <span className="font-semibold tabular">{formatAmount((r.value || 0), r.currency || orgCurrency, language)}</span> },
        { key: 'closing_date', label: t('list.closeDate', language), render: (r) => r.closing_date ? new Date(r.closing_date).toLocaleDateString(language) : '—' },
        { key: 'status', label: t('common.status', language), render: (r) => <Badge variant={r.status === 'won' ? 'success' : r.status === 'lost' ? 'error' : 'primary'}>{tStatus(r.status, language)}</Badge> },
      ]}
      formFields={dealFields(language, orgCurrency)}
      searchColumns={['name']}
      emptyIcon={<Handshake size={26} />}
      emptyTitle={t('empty.noDeals', language)}
      emptyDescription={t('empty.noDealsDesc', language)}
      relations="*, stage:pipeline_stages(name), contact:contacts(first_name,last_name), company:companies(name)"
      orderBy="created_at"
      rowLink={(r) => `/app/deals/${r.id}`}
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
    contactRelation(language),
    companyRelation(language),
    dealRelation(language),
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
