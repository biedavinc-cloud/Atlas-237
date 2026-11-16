import type { ComponentType } from 'react';
import {
  LayoutDashboard, Users, Building2, UserPlus, Handshake,
  KanbanSquare, Calendar, Activity, Package, FileText, ShoppingCart,
  Receipt, CreditCard, Megaphone, LifeBuoy, Bot, ListTodo, Workflow,
  Brain, BookOpen, CheckSquare, BarChart3, LayoutGrid, Lightbulb,
  UserCog, UsersRound, ShieldCheck, Store, Plug, Webhook, Bell,
  ScrollText, Settings, Wallet, Gauge, Sparkles, Briefcase, ListChecks,
  KeyRound,
} from 'lucide-react';

/**
 * Single source of truth for the app's navigation. The sidebar, the
 * command palette (⌘K) and the quick-create actions all read from here, so
 * a page can never be reachable from one and missing from the other.
 * Every `to` must match a <Route> in src/App.tsx.
 */
export interface NavItem {
  to: string;
  labelKey: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
  /** Extra search terms (any language) for the command palette. */
  keywords?: string;
}

export interface NavSection {
  id: string;
  titleKey: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'home',
    titleKey: '',
    items: [
      { to: '/app', labelKey: 'nav.commandCenter', icon: LayoutDashboard, keywords: 'home accueil dashboard tableau inicio' },
      { to: '/app/ask-atlas', labelKey: 'nav.askAtlas', icon: Sparkles, keywords: 'ai ia chat assistant question' },
      { to: '/app/approvals', labelKey: 'nav.approvals', icon: CheckSquare, keywords: 'approval approbation validation' },
    ],
  },
  {
    id: 'crm',
    titleKey: 'nav.crm',
    items: [
      { to: '/app/contacts', labelKey: 'nav.contacts', icon: Users, keywords: 'client customer people personnes' },
      { to: '/app/companies', labelKey: 'nav.companies', icon: Building2, keywords: 'account compte entreprise société' },
      { to: '/app/leads', labelKey: 'nav.leads', icon: UserPlus, keywords: 'prospect piste' },
      { to: '/app/deals', labelKey: 'nav.deals', icon: Handshake, keywords: 'opportunity opportunité affaire vente sale' },
      { to: '/app/pipelines', labelKey: 'nav.pipelines', icon: KanbanSquare, keywords: 'kanban stages étapes' },
      { to: '/app/activities', labelKey: 'nav.activities', icon: Activity, keywords: 'task tâche call appel meeting' },
      { to: '/app/tasks', labelKey: 'nav.tasks', icon: ListChecks, keywords: 'todo to-do tâche task à faire overdue retard' },
      { to: '/app/calendar', labelKey: 'nav.calendar', icon: Calendar, keywords: 'agenda planning rendez-vous' },
    ],
  },
  {
    id: 'business',
    titleKey: 'nav.business',
    items: [
      { to: '/app/products', labelKey: 'nav.products', icon: Package, keywords: 'catalog catalogue produit' },
      { to: '/app/quotes', labelKey: 'nav.quotes', icon: FileText, keywords: 'devis quote proposal' },
      { to: '/app/orders', labelKey: 'nav.orders', icon: ShoppingCart, keywords: 'commande order' },
      { to: '/app/invoices', labelKey: 'nav.invoices', icon: Receipt, keywords: 'facture invoice billing' },
      { to: '/app/payments', labelKey: 'nav.payments', icon: CreditCard, keywords: 'paiement encaissement' },
      { to: '/app/marketing', labelKey: 'nav.marketing', icon: Megaphone, keywords: 'campaign campagne email' },
      { to: '/app/support', labelKey: 'nav.support', icon: LifeBuoy, keywords: 'ticket helpdesk service client' },
    ],
  },
  {
    id: 'ai',
    titleKey: 'nav.aiWorkforce',
    items: [
      { to: '/app/ai-employees', labelKey: 'nav.aiEmployees', icon: Bot, keywords: 'agent ia ai' },
      { to: '/app/ai-tasks', labelKey: 'nav.aiTasks', icon: ListTodo, keywords: 'agent task tâche' },
      { to: '/app/ai-workflows', labelKey: 'nav.aiWorkflows', icon: Workflow, keywords: 'automation automatisation workflow' },
      { to: '/app/ai-memory', labelKey: 'nav.aiMemory', icon: Brain, keywords: 'memory mémoire' },
      { to: '/app/knowledge-base', labelKey: 'nav.knowledgeBase', icon: BookOpen, keywords: 'documents docs knowledge connaissances' },
    ],
  },
  {
    id: 'analytics',
    titleKey: 'nav.analytics',
    items: [
      { to: '/app/reports', labelKey: 'nav.reports', icon: BarChart3, keywords: 'rapport report stats' },
      { to: '/app/dashboards', labelKey: 'nav.dashboards', icon: LayoutGrid, keywords: 'tableau widget' },
      { to: '/app/ai-insights', labelKey: 'nav.aiInsights', icon: Lightbulb, keywords: 'insight prédiction forecast' },
    ],
  },
  {
    id: 'team',
    titleKey: 'nav.team',
    items: [
      { to: '/app/employees', labelKey: 'nav.employees', icon: UserCog, keywords: 'staff employé collaborateur user utilisateur' },
      { to: '/app/teams', labelKey: 'nav.teams', icon: UsersRound, keywords: 'équipe group' },
      { to: '/app/permissions', labelKey: 'nav.permissions', icon: ShieldCheck, keywords: 'role rôle rbac access accès' },
    ],
  },
  {
    id: 'integrations',
    titleKey: 'nav.integrations',
    items: [
      { to: '/app/marketplace', labelKey: 'nav.appMarketplace', icon: Store, keywords: 'apps intégration connect' },
      { to: '/app/connected-apps', labelKey: 'nav.connectedApps', icon: Plug, keywords: 'integration intégration' },
      { to: '/app/api-webhooks', labelKey: 'nav.apiWebhooks', icon: Webhook, keywords: 'api key clé webhook developer' },
    ],
  },
  {
    id: 'system',
    titleKey: 'nav.system',
    items: [
      { to: '/app/notifications', labelKey: 'nav.notifications', icon: Bell, keywords: 'alert alerte' },
      { to: '/app/audit-log', labelKey: 'nav.auditLog', icon: ScrollText, keywords: 'audit journal log history historique' },
      { to: '/app/settings', labelKey: 'nav.settings', icon: Settings, keywords: 'paramètres preferences organisation profile profil branding' },
      { to: '/app/billing', labelKey: 'nav.billing', icon: CreditCard, keywords: 'plan subscription abonnement facturation upgrade' },
      { to: '/app/usage', labelKey: 'nav.usage', icon: Gauge, keywords: 'utilisation quota limits limites' },
    ],
  },
];

/** Platform-level pages, only shown to super admins. */
export const SUPER_ADMIN_ITEMS: NavItem[] = [
  { to: '/super-admin', labelKey: 'superAdmin.dashboard', icon: ShieldCheck },
  { to: '/super-admin/users', labelKey: 'superAdmin.usersTenants', icon: Users },
  { to: '/super-admin/subscriptions', labelKey: 'superAdmin.subscriptions', icon: CreditCard },
  { to: '/super-admin/analytics', labelKey: 'superAdmin.analytics', icon: BarChart3 },
  { to: '/super-admin/employees', labelKey: 'superAdmin.employeeKpis', icon: UserCog },
  { to: '/super-admin/sales-codes', labelKey: 'superAdmin.salesCodes', icon: Receipt },
  { to: '/super-admin/permissions', labelKey: 'superAdmin.permissions', icon: ShieldCheck },
  { to: '/super-admin/audit', labelKey: 'superAdmin.auditLog', icon: ScrollText },
  { to: '/super-admin/staff', labelKey: 'superAdmin.staff', icon: Briefcase },
  { to: '/super-admin/accounting', labelKey: 'superAdmin.accounting', icon: Wallet },
  { to: '/super-admin/keys', labelKey: 'superAdmin.platformKeys', icon: KeyRound, keywords: 'psp paiement payment api secret flutterwave paystack paddle payunit cinetpay korapay resend gemini oauth clé key' },
];

/**
 * Quick-create shortcuts. `?new=1` is read by ListPage, which opens its
 * create form as soon as the page loads.
 */
export const QUICK_CREATE: NavItem[] = [
  { to: '/app/contacts?new=1', labelKey: 'shell.newContact', icon: Users, keywords: 'add ajouter contact client' },
  { to: '/app/leads?new=1', labelKey: 'shell.newLead', icon: UserPlus, keywords: 'add ajouter prospect piste' },
  { to: '/app/deals?new=1', labelKey: 'shell.newDeal', icon: Handshake, keywords: 'add ajouter opportunité affaire' },
  { to: '/app/invoices?new=1', labelKey: 'shell.newInvoice', icon: Receipt, keywords: 'add ajouter facture' },
  { to: '/app/tasks?new=1', labelKey: 'shell.newTask', icon: ListChecks, keywords: 'add ajouter tâche task todo' },
  { to: '/app/support?new=1', labelKey: 'shell.newTicket', icon: LifeBuoy, keywords: 'add ajouter ticket support' },
];

/** Accent-insensitive, case-insensitive normalisation for matching. */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
