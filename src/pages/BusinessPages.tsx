import { Package, FileText, ShoppingCart, Receipt, CreditCard, Megaphone, LifeBuoy } from 'lucide-react';
import { ListPage, type FormField } from '@/components/ListPage';
import { useAuth } from '@/context/AuthContext';
import { t, tStatus } from '@/lib/i18n';
import { Badge } from '@/components/ui';
import { CURRENCIES, formatAmount } from '@/lib/i18n-countries';
import { usePlanAccess } from '@/lib/plans';
import { UpgradeGate } from '@/components/UpgradeGate';
import { QuickPaymentLinkButton } from '@/components/QuickPaymentLinkButton';
import { FreshdeskEscalateButton } from '@/components/FreshdeskEscalateButton';
import type { Product, Invoice, Ticket, Campaign } from '@/types';
import { contactRelation, companyRelation, quoteFields, invoiceFields } from '@/lib/entityFields';

/**
 * Currency field for forms that record a monetary amount. Defaults to the
 * organization's onboarding currency, but the user can pick a different one
 * per record (e.g. an invoice billed to a foreign client in their currency).
 */
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

export function ProductsPage() {
  const { language, organization } = useAuth();
  const orgCurrency = organization?.currency || 'USD';
  const fields: FormField[] = [
    { key: 'name', label: t('common.name', language), type: 'text', required: true },
    { key: 'sku', label: t('list.sku', language), type: 'text' },
    { key: 'category', label: t('list.category', language), type: 'text' },
    { key: 'price', label: t('list.price', language), type: 'number', required: true, defaultValue: 0 },
    currencyField(language, orgCurrency),
    { key: 'stock', label: t('list.stock', language), type: 'number' },
    { key: 'status', label: t('common.status', language), type: 'select', options: [
      { value: 'active', label: t('status.active', language) }, { value: 'inactive', label: t('status.inactive', language) },
    ], defaultValue: 'active' },
    { key: 'description', label: t('list.description', language), type: 'textarea' },
  ];

  return (
    <ListPage<Product>
      table="products"
      title={t('nav.products', language)}
      columns={[
        { key: 'name', label: t('common.name', language), render: (r) => <span className="font-medium text-ink-800">{r.name}</span> },
        { key: 'sku', label: t('list.sku', language), render: (r) => r.sku || '—' },
        { key: 'category', label: t('list.category', language), render: (r) => r.category || '—' },
        { key: 'price', label: t('list.price', language), render: (r) => <span className="font-semibold">{formatAmount((r.price || 0), r.currency || orgCurrency, language)}</span> },
        { key: 'stock', label: t('list.stock', language), render: (r) => r.stock ?? '—' },
        { key: 'status', label: t('common.status', language), render: (r) => <Badge variant={r.status === 'active' ? 'success' : 'neutral'}>{tStatus(r.status, language)}</Badge> },
      ]}
      formFields={fields}
      emptyIcon={<Package size={28} />}
      emptyTitle={t('empty.noProducts', language)}
      emptyDescription={t('empty.noProductsDesc', language)}
      orderBy="created_at"
      importable
    />
  );
}

export function QuotesPage() {
  const { language, organization } = useAuth();
  const orgCurrency = organization?.currency || 'USD';
  const { hasFeature: hasPlanFeature } = usePlanAccess();
  const allowed = hasPlanFeature('quotesInvoicing');
  type QuoteRow = { id: string; quote_number: string; status: string; total: number; currency?: string; expiration_date: string | null; contact?: { first_name: string; last_name: string } | null; company?: { name: string } | null; [key: string]: unknown };

  return !allowed ? (
    <UpgradeGate language={language} feature={t('nav.quotes', language)} minPlan="growth" />
  ) : (
    <ListPage<QuoteRow>
      table="quotes"
      title={t('nav.quotes', language)}
      subtitle={language === 'fr' ? 'Ouvrez un devis pour y ajouter des lignes, l’imprimer en PDF ou le convertir en facture.' : 'Open a quote to add line items, print it to PDF or convert it to an invoice.'}
      columns={[
        { key: 'quote_number', label: t('list.quoteNumber', language), render: (r) => <span className="font-medium text-ink-800">{r.quote_number}</span> },
        { key: 'company_id', label: language === 'fr' ? 'Client' : 'Customer', render: (r) => r.company?.name || (r.contact ? `${r.contact.first_name} ${r.contact.last_name}` : '—') },
        { key: 'status', label: t('common.status', language), render: (r) => <Badge variant={r.status === 'accepted' ? 'success' : r.status === 'rejected' ? 'error' : 'warning'}>{tStatus(r.status, language)}</Badge> },
        { key: 'total', label: t('common.total', language), render: (r) => <span className="font-semibold tabular">{formatAmount((r.total || 0), (r.currency as string) || orgCurrency, language)}</span> },
        { key: 'expiration_date', label: t('list.expires', language), render: (r) => r.expiration_date ? new Date(r.expiration_date).toLocaleDateString(language) : '—' },
      ]}
      formFields={quoteFields(language, orgCurrency)}
      searchColumns={['quote_number']}
      relations="*, contact:contacts(first_name,last_name), company:companies(name)"
      emptyIcon={<FileText size={26} />}
      emptyTitle={t('empty.noQuotes', language)}
      emptyDescription={t('empty.noQuotesDesc', language)}
      orderBy="created_at"
      rowLink={(r) => `/app/quotes/${r.id}`}
    />
  );
}

export function OrdersPage() {
  const { language, organization } = useAuth();
  const orgCurrency = organization?.currency || 'USD';
  const fields: FormField[] = [
    { key: 'order_number', label: t('list.orderNumber', language), type: 'text', required: true },
    { key: 'status', label: t('common.status', language), type: 'select', options: [
      { value: 'pending', label: t('status.pending', language) }, { value: 'processing', label: t('status.processing', language) }, { value: 'shipped', label: t('status.shipped', language) }, { value: 'delivered', label: t('status.delivered', language) }, { value: 'cancelled', label: t('status.cancelled', language) },
    ], defaultValue: 'pending' },
    { key: 'payment_status', label: t('list.payment', language), type: 'select', options: [
      { value: 'unpaid', label: t('status.unpaid', language) }, { value: 'partial', label: t('status.partial', language) }, { value: 'paid', label: t('status.paid', language) },
    ], defaultValue: 'unpaid' },
    { key: 'total', label: t('common.total', language), type: 'number', defaultValue: 0 },
    currencyField(language, orgCurrency),
    { key: 'notes', label: t('list.notes', language), type: 'textarea' },
  ];

  return (
    <ListPage<{ id: string; order_number: string; status: string; payment_status: string; total: number; currency?: string; [key: string]: unknown }>
      table="orders"
      title={t('nav.orders', language)}
      columns={[
        { key: 'order_number', label: t('list.orderNumber', language), render: (r) => <span className="font-medium text-ink-800">{r.order_number}</span> },
        { key: 'status', label: t('common.status', language), render: (r) => <Badge variant="primary">{tStatus(r.status, language)}</Badge> },
        { key: 'payment_status', label: t('list.payment', language), render: (r) => <Badge variant={r.payment_status === 'paid' ? 'success' : r.payment_status === 'partial' ? 'warning' : 'error'}>{tStatus(r.payment_status, language)}</Badge> },
        { key: 'total', label: t('common.total', language), render: (r) => formatAmount((r.total || 0), (r.currency as string) || orgCurrency, language) },
      ]}
      formFields={fields}
      emptyIcon={<ShoppingCart size={28} />}
      emptyTitle={t('empty.noOrders', language)}
      emptyDescription={t('empty.noOrdersDesc', language)}
      orderBy="created_at"
    />
  );
}

export function InvoicesPage() {
  const { language, organization } = useAuth();
  const orgCurrency = organization?.currency || 'USD';
  const { hasFeature: hasPlanFeature } = usePlanAccess();
  const allowed = hasPlanFeature('quotesInvoicing');
  type InvoiceRow = Invoice & { contact?: { first_name: string; last_name: string } | null; company?: { name: string } | null };

  return !allowed ? (
    <UpgradeGate language={language} feature={t('nav.invoices', language)} minPlan="growth" />
  ) : (
    <ListPage<InvoiceRow>
      table="invoices"
      title={t('nav.invoices', language)}
      subtitle={language === 'fr' ? 'Ouvrez une facture pour gérer ses lignes, l’imprimer en PDF ou enregistrer un paiement.' : 'Open an invoice to manage its lines, print it to PDF or record a payment.'}
      columns={[
        { key: 'invoice_number', label: t('list.invoiceNumber', language), render: (r) => <span className="font-medium text-ink-800">{r.invoice_number}</span> },
        { key: 'company_id', label: language === 'fr' ? 'Client' : 'Customer', render: (r) => r.company?.name || (r.contact ? `${r.contact.first_name} ${r.contact.last_name}` : '—') },
        { key: 'payment_status', label: t('list.payment', language), render: (r) => <Badge variant={r.payment_status === 'paid' ? 'success' : r.payment_status === 'partial' ? 'warning' : 'error'}>{tStatus(r.payment_status, language)}</Badge> },
        { key: 'total', label: t('common.total', language), render: (r) => <span className="font-semibold tabular">{formatAmount((r.total || 0), r.currency || orgCurrency, language)}</span> },
        { key: 'due_date', label: t('list.due', language), render: (r) => {
          if (!r.due_date) return '—';
          const late = r.payment_status !== 'paid' && new Date(r.due_date) < new Date();
          return <span className={late ? 'font-semibold text-error-600' : ''}>{new Date(r.due_date).toLocaleDateString(language)}</span>;
        } },
      ]}
      formFields={invoiceFields(language, orgCurrency)}
      searchColumns={['invoice_number']}
      emptyIcon={<Receipt size={26} />}
      emptyTitle={t('empty.noInvoices', language)}
      emptyDescription={t('empty.noInvoicesDesc', language)}
      relations="*, contact:contacts(first_name,last_name), company:companies(name)"
      orderBy="created_at"
      rowLink={(r) => `/app/invoices/${r.id}`}
      rowActions={(row) => row.payment_status === 'paid' ? null : (
        <QuickPaymentLinkButton amount={Number(row.amount_due ?? row.total) || 0} currency={row.currency || orgCurrency} contactId={row.contact_id} label={row.invoice_number} />
      )}
    />
  );
}

export function PaymentsPage() {
  const { language, organization } = useAuth();
  const orgCurrency = organization?.currency || 'USD';
  const fields: FormField[] = [
    { key: 'amount', label: t('superAdmin.amount', language), type: 'number', required: true },
    currencyField(language, orgCurrency),
    { key: 'method', label: t('list.method', language), type: 'select', options: [
      { value: 'card', label: t('status.card', language) }, { value: 'bank_transfer', label: t('status.bankTransfer', language) }, { value: 'cash', label: t('status.cash', language) }, { value: 'check', label: t('status.check', language) }, { value: 'stripe', label: t('status.stripe', language) },
    ]},
    { key: 'status', label: t('common.status', language), type: 'select', options: [
      { value: 'completed', label: t('status.completed', language) }, { value: 'pending', label: t('status.pending', language) }, { value: 'failed', label: t('status.failed', language) },
    ], defaultValue: 'completed' },
    { key: 'reference', label: t('list.reference', language), type: 'text' },
  ];

  return (
    <ListPage<{ id: string; amount: number; currency?: string; method: string; status: string; reference: string | null; [key: string]: unknown }>
      table="payments"
      title={t('nav.payments', language)}
      columns={[
        { key: 'amount', label: t('superAdmin.amount', language), render: (r) => <span className="font-semibold">{formatAmount((r.amount || 0), (r.currency as string) || orgCurrency, language)}</span> },
        { key: 'method', label: t('list.method', language), render: (r) => r.method || '—' },
        { key: 'status', label: t('common.status', language), render: (r) => <Badge variant={r.status === 'completed' ? 'success' : r.status === 'failed' ? 'error' : 'warning'}>{tStatus(r.status, language)}</Badge> },
        { key: 'reference', label: t('list.reference', language), render: (r) => r.reference || '—' },
      ]}
      formFields={fields}
      emptyIcon={<CreditCard size={28} />}
      emptyTitle={t('empty.noPayments', language)}
      emptyDescription={t('empty.noPaymentsDesc', language)}
      orderBy="created_at"
    />
  );
}

export function MarketingPage() {
  const { language, organization } = useAuth();
  const orgCurrency = organization?.currency || 'USD';
  const fields: FormField[] = [
    { key: 'name', label: t('common.name', language), type: 'text', required: true },
    { key: 'type', label: t('list.type', language), type: 'select', options: [
      { value: 'email', label: t('status.email', language) }, { value: 'sms', label: t('status.sms', language) }, { value: 'social', label: t('status.social', language) }, { value: 'ads', label: t('status.ads', language) },
    ], defaultValue: 'email' },
    { key: 'status', label: t('common.status', language), type: 'select', options: [
      { value: 'draft', label: t('status.draft', language) }, { value: 'active', label: t('status.active2', language) }, { value: 'paused', label: t('status.paused', language) }, { value: 'completed', label: t('status.completed', language) },
    ], defaultValue: 'draft' },
    { key: 'budget', label: t('list.budget', language), type: 'number', defaultValue: 0 },
    currencyField(language, orgCurrency),
    { key: 'subject', label: t('list.subject', language), type: 'text' },
    { key: 'content', label: t('list.content', language), type: 'textarea' },
  ];

  return (
    <ListPage<Campaign>
      table="campaigns"
      title={t('nav.marketing', language)}
      columns={[
        { key: 'name', label: t('common.name', language), render: (r) => <span className="font-medium text-ink-800">{r.name}</span> },
        { key: 'type', label: t('list.type', language), render: (r) => <Badge variant="primary">{tStatus(r.type, language)}</Badge> },
        { key: 'status', label: t('common.status', language), render: (r) => <Badge variant={r.status === 'active' ? 'success' : r.status === 'completed' ? 'neutral' : 'warning'}>{tStatus(r.status, language)}</Badge> },
        { key: 'budget', label: t('list.budget', language), render: (r) => formatAmount((r.budget || 0), r.currency || orgCurrency, language) },
      ]}
      formFields={fields}
      emptyIcon={<Megaphone size={28} />}
      emptyTitle={t('empty.noCampaigns', language)}
      emptyDescription={t('empty.noCampaignsDesc', language)}
      orderBy="created_at"
    />
  );
}

export function SupportPage() {
  const { language } = useAuth();
  const { hasFeature: hasPlanFeature } = usePlanAccess();
  const allowed = hasPlanFeature('tickets');
  const hasSla = hasPlanFeature('sla');
  const fr = language === 'fr';
  const slaCell = (r: Ticket) => {
    if (!r.sla_due_at) return <span className="text-ink-400">—</span>;
    const due = new Date(r.sla_due_at).getTime();
    if (r.status === 'resolved' || r.status === 'closed') {
      const met = r.resolved_at ? new Date(r.resolved_at).getTime() <= due : true;
      return <Badge variant={met ? 'success' : 'error'}>{met ? (fr ? 'Respecté' : 'Met') : (fr ? 'Dépassé' : 'Breached')}</Badge>;
    }
    const left = due - Date.now();
    if (left <= 0) return <Badge variant="error">{fr ? 'Dépassé' : 'Breached'}</Badge>;
    const h = Math.floor(left / 3600e3);
    const label = h >= 24 ? `${Math.floor(h / 24)} ${fr ? 'j' : 'd'} ${h % 24} h` : h >= 1 ? `${h} h` : `${Math.max(1, Math.round(left / 60e3))} min`;
    return <Badge variant={h < 4 ? 'warning' : 'neutral'}>{label}</Badge>;
  };
  const fields: FormField[] = [
    { key: 'ticket_number', label: t('list.ticketNumber', language), type: 'text', required: true },
    { key: 'subject', label: t('list.subject', language), type: 'text', required: true },
    { key: 'priority', label: t('list.priority', language), type: 'select', options: [
      { value: 'low', label: t('status.low', language) }, { value: 'medium', label: t('status.medium', language) }, { value: 'high', label: t('status.high', language) }, { value: 'urgent', label: t('status.urgent', language) },
    ], defaultValue: 'medium' },
    { key: 'status', label: t('common.status', language), type: 'select', options: [
      { value: 'open', label: t('status.open', language) }, { value: 'in_progress', label: t('status.inProgress', language) }, { value: 'resolved', label: t('status.resolved', language) }, { value: 'closed', label: t('status.closed', language) },
    ], defaultValue: 'open' },
    contactRelation(language),
    companyRelation(language),
    { key: 'category', label: t('list.category', language), type: 'text' },
    { key: 'description', label: t('list.description', language), type: 'textarea' },
  ];

  return !allowed ? (
    <UpgradeGate language={language} feature={t('nav.support', language)} minPlan="growth" />
  ) : (
    <ListPage<Ticket>
      table="tickets"
      title={t('nav.support', language)}
      columns={[
        { key: 'ticket_number', label: t('list.ticketNumber', language), render: (r) => <span className="font-medium text-ink-800">{r.ticket_number}</span> },
        { key: 'subject', label: t('list.subject', language), render: (r) => r.subject },
        { key: 'priority', label: t('list.priority', language), render: (r) => <Badge variant={r.priority === 'urgent' ? 'error' : r.priority === 'high' ? 'warning' : 'neutral'}>{tStatus(r.priority, language)}</Badge> },
        { key: 'status', label: t('common.status', language), render: (r) => <Badge variant={r.status === 'resolved' || r.status === 'closed' ? 'success' : 'primary'}>{tStatus(r.status, language)}</Badge> },
        ...(hasSla ? [{ key: 'sla_due_at', label: 'SLA', render: slaCell }] : []),
      ]}
      formFields={fields}
      emptyIcon={<LifeBuoy size={28} />}
      emptyTitle={t('empty.noTickets', language)}
      emptyDescription={t('empty.noTicketsDesc', language)}
      relations="*, contact:contacts(id,first_name,last_name), company:companies(*)"
      orderBy="created_at"
      rowActions={(row, reload) => (
        <FreshdeskEscalateButton
          ticketId={row.id} ticketNumber={row.ticket_number} subject={row.subject} description={row.description}
          contactId={row.contact_id} internalNotes={row.internal_notes} onDone={reload}
        />
      )}
    />
  );
}
