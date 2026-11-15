import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, UserPlus, Handshake, AlertTriangle, Calendar, Receipt,
  LifeBuoy, Bot, Clock, Sparkles, X, Activity as ActivityIcon, ArrowRight,
  CheckCircle2, Loader2, ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { askAtlas } from '@/lib/askAtlas';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/i18n';
import { StatCard } from '@/components/ui';
import { Loading } from '@/components/Loading';
import type { AITask, Approval, Activity } from '@/types';

interface DashboardStats {
  revenue: number;
  newLeads: number;
  hotLeads: number;
  openDeals: number;
  openDealsValue: number;
  dealsAtRisk: number;
  upcomingMeetings: number;
  overdueTasks: number;
  unpaidInvoices: number;
  openTickets: number;
  aiCompleted: number;
  aiPending: number;
}

function greetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return 'dash.greetingMorning';
  if (h < 18) return 'dash.greetingAfternoon';
  return 'dash.greetingEvening';
}

export function DashboardPage() {
  const { language, profile, organization } = useAuth();
  const lang = language;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Approval[]>([]);
  const [aiTasks, setAiTasks] = useState<AITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [command, setCommand] = useState('');
  const [busyApproval, setBusyApproval] = useState<string | null>(null);
  const [aiReply, setAiReply] = useState<{ text: string; route?: string } | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const currency = organization?.currency || 'USD';

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDashboard() {
    try {
      const nowIso = new Date().toISOString();
      const [
        leadsRes, hotLeadsRes, dealsRes, dealsAtRiskRes,
        upcomingRes, overdueRes, unpaidRes, ticketsRes,
        aiCompletedRes, aiPendingRes, activitiesRes, approvalsRes, aiTasksRes,
        paymentsRes,
      ] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('temperature', 'hot'),
        supabase.from('deals').select('value, currency', { count: 'exact' }).eq('status', 'open'),
        supabase.from('deals').select('id', { count: 'exact', head: true }).eq('status', 'open').lt('closing_date', nowIso),
        supabase.from('activities').select('id', { count: 'exact', head: true }).eq('type', 'meeting').eq('status', 'pending').gte('scheduled_at', nowIso),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'pending').lt('due_date', nowIso),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).neq('payment_status', 'paid'),
        supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('ai_tasks').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('ai_tasks').select('id', { count: 'exact', head: true }).in('status', ['pending', 'in_progress']),
        supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(6),
        supabase.from('approvals').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
        supabase.from('ai_tasks').select('*, agent:ai_agents(*)').order('created_at', { ascending: false }).limit(5),
        supabase.from('payments').select('amount'),
      ]);

      const revenue = (paymentsRes.data || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      // Only add up deals already in the org's currency — summing USD and
      // XAF values together would produce a meaningless number.
      const openDealsValue = (dealsRes.data || [])
        .filter(d => !d.currency || d.currency === currency)
        .reduce((sum, d) => sum + (Number(d.value) || 0), 0);

      setStats({
        revenue,
        newLeads: leadsRes.count || 0,
        hotLeads: hotLeadsRes.count || 0,
        openDeals: dealsRes.count ?? (dealsRes.data || []).length,
        openDealsValue,
        dealsAtRisk: dealsAtRiskRes.count || 0,
        upcomingMeetings: upcomingRes.count || 0,
        overdueTasks: overdueRes.count || 0,
        unpaidInvoices: unpaidRes.count || 0,
        openTickets: ticketsRes.count || 0,
        aiCompleted: aiCompletedRes.count || 0,
        aiPending: aiPendingRes.count || 0,
      });
      setRecentActivities((activitiesRes.data as Activity[]) || []);
      setPendingApprovals((approvalsRes.data as Approval[]) || []);
      setAiTasks((aiTasksRes.data as AITask[]) || []);
    } catch {
      // A brand-new org can have empty tables; the page still renders with zeros.
    } finally {
      setLoading(false);
    }
  }

  async function decideApproval(id: string, decision: 'approved' | 'rejected') {
    setBusyApproval(id);
    const { error } = await supabase.from('approvals').update({
      status: decision,
      decided_at: new Date().toISOString(),
      decided_by: profile?.id || null,
    }).eq('id', id);
    setBusyApproval(null);
    if (error) { alert(error.message); return; }
    setPendingApprovals(prev => prev.filter(a => a.id !== id));
  }

  async function runCommand() {
    const q = command.trim();
    if (!q || aiThinking) return;
    setAiThinking(true);
    setAiReply(null);
    try {
      const answer = await askAtlas(q, lang);
      setAiReply({ text: answer.text, route: answer.route });
    } catch {
      setAiReply({ text: t('dash.askFailed', lang) });
    } finally {
      setAiThinking(false);
    }
  }

  if (loading) return <Loading text={t('common.loading', language)} />;

  const fmtMoney = (n: number) => {
    try {
      return new Intl.NumberFormat(lang, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
    } catch {
      return `${Math.round(n).toLocaleString(lang)} ${currency}`;
    }
  };
  const fmtDate = (d: string) => new Date(d).toLocaleDateString(lang, { day: 'numeric', month: 'short' });

  const attention = [
    { key: 'risk', count: stats?.dealsAtRisk || 0, label: t('dash.dealsAtRisk', lang), icon: AlertTriangle, to: '/app/deals', tone: 'warning' as const },
    { key: 'tasks', count: stats?.overdueTasks || 0, label: t('dash.overdueTasks', lang), icon: Clock, to: '/app/tasks', tone: 'error' as const },
    { key: 'inv', count: stats?.unpaidInvoices || 0, label: t('dash.unpaidInvoices', lang), icon: Receipt, to: '/app/invoices', tone: 'warning' as const },
    { key: 'tickets', count: stats?.openTickets || 0, label: t('dash.customerIssues', lang), icon: LifeBuoy, to: '/app/support', tone: 'error' as const },
    { key: 'meet', count: stats?.upcomingMeetings || 0, label: t('dash.upcomingMeetings', lang), icon: Calendar, to: '/app/calendar', tone: 'primary' as const },
  ];
  const needsAction = attention.filter(a => a.key !== 'meet' && a.count > 0).length;
  const toneClass = {
    warning: 'bg-warning-50 text-warning-700 ring-warning-200/70',
    error: 'bg-error-50 text-error-600 ring-error-200/70',
    primary: 'bg-primary-50 text-primary-600 ring-primary-200/70',
  };

  const suggestions = lang === 'fr'
    ? ['Affaires ouvertes ?', 'Leads chauds ?', 'Factures impayées ?']
    : ['Open deals?', 'Hot leads?', 'Unpaid invoices?'];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header: greeting + Ask Atlas. The contour texture is the shell's one signature. */}
      <section className="relative overflow-hidden rounded-2xl bg-navy-900 text-white">
        <div className="absolute inset-0 contour opacity-90" aria-hidden />
        <div className="absolute -end-24 -top-24 h-72 w-72 rounded-full bg-primary-500/25 blur-3xl" aria-hidden />
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-end">
          <div className="min-w-0">
            <p className="text-sm text-navy-200">
              {new Date().toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="mt-1 text-[28px] sm:text-[32px] font-bold leading-tight text-white">
              {t(greetingKey(), lang)}{profile?.first_name ? `, ${profile.first_name}` : ''}
            </h1>
            <p className="mt-1.5 text-navy-200 max-w-lg">{t('dash.todaySub', lang)}</p>
          </div>

          <div>
            <form
              onSubmit={e => { e.preventDefault(); runCommand(); }}
              className="flex items-center gap-2 rounded-xl bg-white/[0.08] p-1.5 ring-1 ring-inset ring-white/15 focus-within:ring-white/40 transition-shadow"
            >
              <Sparkles size={16} className="ms-2 flex-none text-primary-300" />
              <input
                className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm text-white placeholder-navy-300 focus:outline-none"
                placeholder={t('dash.askPlaceholder', lang)}
                aria-label={t('dash.askAtlas', lang)}
                value={command}
                onChange={e => setCommand(e.target.value)}
              />
              <button type="submit" disabled={aiThinking || !command.trim()} className="btn btn-sm bg-white text-navy-900 hover:bg-primary-50 disabled:opacity-60">
                {aiThinking ? <Loader2 size={14} className="animate-spin" /> : null}
                {t('dash.run', lang)}
              </button>
            </form>
            {!aiReply && !aiThinking && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {suggestions.map(s => (
                  <button key={s} onClick={() => setCommand(s)} className="rounded-full px-2.5 py-1 text-xs text-navy-200 ring-1 ring-inset ring-white/15 hover:bg-white/10 hover:text-white transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {aiThinking && <p className="mt-2.5 text-sm text-navy-200" aria-live="polite">{t('dash.thinking', lang)}</p>}
            {aiReply && !aiThinking && (
              <div className="mt-2.5 flex items-start gap-3 rounded-xl bg-white px-4 py-3 text-sm text-ink-800 shadow-pop animate-scale-in" aria-live="polite">
                <p className="flex-1 whitespace-pre-wrap">{aiReply.text}</p>
                <div className="flex flex-none items-center gap-1">
                  {aiReply.route && (
                    <Link to={aiReply.route} className="btn-ghost btn-sm text-primary-700">{t('common.view', lang)}</Link>
                  )}
                  <button onClick={() => setAiReply(null)} className="btn-icon h-7 w-7" aria-label={t('common.close', lang)}><X size={14} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Headline numbers — each tile opens the module it is counted from. */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label={t('dash.revenue', lang)} value={fmtMoney(stats?.revenue || 0)} hint={t('dash.allTime', lang)} icon={<DollarSign size={18} />} color="success" to="/app/payments" />
        <StatCard label={t('dash.openDeals', lang)} value={stats?.openDeals || 0} hint={stats?.openDealsValue ? fmtMoney(stats.openDealsValue) : undefined} icon={<Handshake size={18} />} color="primary" to="/app/deals" />
        <StatCard label={t('dash.newLeads', lang)} value={stats?.newLeads || 0} hint={`${t('dash.last7days', lang)} · ${stats?.hotLeads || 0} ${t('dash.ofWhichHot', lang)}`} icon={<UserPlus size={18} />} color="accent" to="/app/leads" />
        <StatCard label={t('dash.unpaidInvoices', lang)} value={stats?.unpaidInvoices || 0} icon={<Receipt size={18} />} color="warning" to="/app/invoices" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Needs attention */}
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">{t('dash.needsAttention', lang)}</h2>
              {needsAction > 0 && <span className="badge-error tabular">{needsAction}</span>}
            </div>
            {needsAction === 0 && (
              <div className="flex items-center gap-3 px-5 pt-4 text-sm text-success-700">
                <CheckCircle2 size={18} className="flex-none" /> {t('dash.allClear', lang)}
              </div>
            )}
            <ul className="divide-y divide-ink-100 px-2 py-2">
              {attention.map(a => (
                <li key={a.key}>
                  <Link to={a.to} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-ink-50 transition-colors">
                    <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg ring-1 ring-inset ${a.count > 0 ? toneClass[a.tone] : 'bg-ink-50 text-ink-400 ring-ink-200'}`}>
                      <a.icon size={17} />
                    </span>
                    <span className={`flex-1 text-sm ${a.count > 0 ? 'font-semibold text-ink-800' : 'text-ink-500'}`}>{a.label}</span>
                    <span className={`text-lg font-bold tabular ${a.count > 0 ? 'text-ink-900' : 'text-ink-300'}`}>{a.count}</span>
                    <ChevronRight size={16} className="text-ink-300 group-hover:text-ink-500 rtl:rotate-180" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Recent activity */}
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">{t('dash.recentActivity', lang)}</h2>
              <Link to="/app/activities" className="text-sm font-semibold text-primary-700 hover:underline">{t('common.viewAll', lang)}</Link>
            </div>
            {recentActivities.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-ink-500">{t('dash.noActivity', lang)}</p>
            ) : (
              <ol className="relative px-5 py-4">
                <span className="absolute start-[38px] top-6 bottom-6 w-px bg-ink-200" aria-hidden />
                {recentActivities.map((act) => (
                  <li key={act.id} className="relative flex items-start gap-3 py-2">
                    <span className={`relative z-[1] flex h-8 w-8 flex-none items-center justify-center rounded-full ring-4 ring-white ${act.performed_by === 'ai' ? 'bg-navy-900 text-white' : 'bg-ink-100 text-ink-600'}`}>
                      {act.performed_by === 'ai' ? <Bot size={15} /> : <ActivityIcon size={15} />}
                    </span>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="text-sm font-medium text-ink-800 truncate">{act.title}</p>
                      <p className="text-xs text-ink-500">{act.type} · {fmtDate(act.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {/* Approvals */}
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">{t('nav.approvals', lang)}</h2>
              {pendingApprovals.length > 0
                ? <span className="badge-warning tabular">{pendingApprovals.length}</span>
                : <Link to="/app/approvals" className="text-sm font-semibold text-primary-700 hover:underline">{t('common.viewAll', lang)}</Link>}
            </div>
            {pendingApprovals.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-500">{t('dash.noApprovals', lang)}</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {pendingApprovals.map((ap) => (
                  <li key={ap.id} className="px-5 py-3.5">
                    <p className="text-sm font-medium text-ink-800">{ap.description}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{[ap.agent_name, ap.action_type].filter(Boolean).join(' · ')}</p>
                    <div className="mt-2.5 flex gap-2">
                      <button onClick={() => decideApproval(ap.id, 'approved')} disabled={busyApproval === ap.id} className="btn-success btn-sm">
                        {t('common.approve', lang)}
                      </button>
                      <button onClick={() => decideApproval(ap.id, 'rejected')} disabled={busyApproval === ap.id} className="btn-secondary btn-sm">
                        {t('common.reject', lang)}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* AI workforce */}
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">{t('dash.aiWorkforce', lang)}</h2>
              <Link to="/app/ai-tasks" className="text-sm font-semibold text-primary-700 hover:underline">{t('common.viewAll', lang)}</Link>
            </div>
            <div className="grid grid-cols-2 divide-x divide-ink-100 rtl:divide-x-reverse border-b border-ink-100">
              <div className="px-5 py-4">
                <p className="text-2xl font-bold text-ink-900 tabular">{stats?.aiCompleted || 0}</p>
                <p className="text-xs text-ink-500">{t('dash.aiActionsCompleted', lang)}</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-2xl font-bold text-ink-900 tabular">{stats?.aiPending || 0}</p>
                <p className="text-xs text-ink-500">{t('dash.aiActionsPending', lang)}</p>
              </div>
            </div>
            {aiTasks.length === 0 ? (
              <Link to="/app/ai-employees" className="flex items-center justify-between gap-2 px-5 py-4 text-sm text-ink-600 hover:bg-ink-50">
                <span>{t('nav.aiEmployees', lang)}</span><ArrowRight size={15} className="rtl:rotate-180" />
              </Link>
            ) : (
              <ul className="divide-y divide-ink-100">
                {aiTasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-3 px-5 py-3">
                    <span className={`h-2 w-2 flex-none rounded-full ${
                      task.status === 'completed' ? 'bg-success-500' :
                      task.status === 'in_progress' ? 'bg-primary-500 animate-pulse' :
                      task.status === 'failed' ? 'bg-error-500' : 'bg-ink-300'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-800 truncate">{task.title}</p>
                      <p className="text-xs text-ink-500 truncate">{task.agent?.name || 'AI'} · {task.status}</p>
                    </div>
                    {task.progress > 0 && task.progress < 100 && (
                      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-ink-100">
                        <div className="h-full rounded-full bg-primary-500" style={{ width: `${task.progress}%` }} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
