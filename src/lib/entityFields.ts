import type { FormField } from '@/components/ListPage';
import { t, type Language } from '@/lib/i18n';
import { CURRENCIES } from '@/lib/i18n-countries';

/**
 * Form definitions for the core CRM records, shared by the list pages and
 * the record detail pages so both create/edit with exactly the same fields.
 * Every key must be a real column (see supabase/migrations/), and every
 * 'relation' field is a real foreign key on that table.
 */

const fr = (lang: Language) => lang === 'fr';

export function currencyField(lang: Language, orgCurrency: string): FormField {
  return {
    key: 'currency',
    label: fr(lang) ? 'Devise' : 'Currency',
    type: 'select',
    required: true,
    defaultValue: orgCurrency,
    options: CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name} (${c.symbol})` })),
  };
}

const personLabel = (r: Record<string, unknown>) =>
  [r.first_name, r.last_name].filter(Boolean).join(' ') || String(r.email || '');

export function companyRelation(lang: Language): FormField {
  return {
    key: 'company_id',
    label: fr(lang) ? 'Entreprise (fiche)' : 'Company (record)',
    type: 'relation',
    relation: { table: 'companies', select: 'id,name', label: (r) => String(r.name || '') },
  };
}

export function contactRelation(lang: Language): FormField {
  return {
    key: 'contact_id',
    label: fr(lang) ? 'Contact' : 'Contact',
    type: 'relation',
    relation: { table: 'contacts', select: 'id,first_name,last_name,email', label: personLabel },
  };
}

export function dealRelation(lang: Language): FormField {
  return {
    key: 'deal_id',
    label: fr(lang) ? 'Affaire' : 'Deal',
    type: 'relation',
    relation: { table: 'deals', select: 'id,name', label: (r) => String(r.name || '') },
  };
}

export function stageRelation(lang: Language): FormField {
  return {
    key: 'stage_id',
    label: fr(lang) ? 'Étape du pipeline' : 'Pipeline stage',
    type: 'relation',
    relation: {
      table: 'pipeline_stages',
      select: 'id,name,sort_order,pipeline:pipelines(name)',
      orderBy: 'sort_order',
      label: (r) => {
        const p = r.pipeline as { name?: string } | null;
        return p?.name ? `${p.name} › ${r.name}` : String(r.name || '');
      },
    },
  };
}

export function contactFields(lang: Language): FormField[] {
  return [
    { key: 'first_name', label: t('auth.firstName', lang), type: 'text', required: true },
    { key: 'last_name', label: t('auth.lastName', lang), type: 'text', required: true },
    { key: 'email', label: t('common.email', lang), type: 'email' },
    { key: 'country', label: t('list.country', lang), type: 'country' },
    { key: 'phone', label: t('common.phone', lang), type: 'phone', countryFieldKey: 'country' },
    { key: 'job_title', label: t('list.title', lang), type: 'text' },
    companyRelation(lang),
    { key: 'company', label: fr(lang) ? 'Entreprise (texte libre)' : 'Company (free text)', type: 'text' },
    { key: 'city', label: t('list.city', lang), type: 'text' },
    { key: 'status', label: t('common.status', lang), type: 'select', options: [
      { value: 'active', label: t('status.active', lang) }, { value: 'inactive', label: t('status.inactive', lang) }, { value: 'lead', label: t('status.lead', lang) },
    ], defaultValue: 'active' },
    { key: 'lead_score', label: t('list.leadScore', lang), type: 'number', defaultValue: 0 },
    { key: 'tags', label: t('list.tags', lang), type: 'tags' },
    { key: 'notes', label: t('list.notes', lang), type: 'textarea' },
  ];
}

export function companyFields(lang: Language, orgCurrency: string): FormField[] {
  return [
    { key: 'name', label: t('common.name', lang), type: 'text', required: true },
    { key: 'industry', label: t('list.industry', lang), type: 'text' },
    { key: 'website', label: t('list.website', lang), type: 'text' },
    { key: 'size', label: t('list.size', lang), type: 'select', options: [
      { value: '1-10', label: '1–10' }, { value: '11-50', label: '11–50' }, { value: '51-200', label: '51–200' }, { value: '201-1000', label: '201–1000' }, { value: '1000+', label: '1000+' },
    ] },
    { key: 'country', label: t('list.country', lang), type: 'country' },
    { key: 'city', label: t('list.city', lang), type: 'text' },
    { key: 'revenue', label: t('list.revenue', lang), type: 'number' },
    currencyField(lang, orgCurrency),
    { key: 'status', label: t('common.status', lang), type: 'select', options: [
      { value: 'active', label: t('status.active', lang) }, { value: 'inactive', label: t('status.inactive', lang) },
    ], defaultValue: 'active' },
    { key: 'notes', label: t('list.notes', lang), type: 'textarea' },
  ];
}

export function leadFields(lang: Language): FormField[] {
  return [
    { key: 'first_name', label: t('auth.firstName', lang), type: 'text', required: true },
    { key: 'last_name', label: t('auth.lastName', lang), type: 'text', required: true },
    { key: 'email', label: t('common.email', lang), type: 'email' },
    { key: 'phone', label: t('common.phone', lang), type: 'phone' },
    { key: 'company_name', label: t('common.company', lang), type: 'text' },
    { key: 'title', label: t('list.title', lang), type: 'text' },
    { key: 'source', label: t('list.source', lang), type: 'select', options: [
      { value: 'website', label: t('status.website2', lang) }, { value: 'referral', label: t('status.referral', lang) }, { value: 'cold_outreach', label: t('status.coldOutreach', lang) }, { value: 'event', label: t('status.event', lang) }, { value: 'social', label: t('status.social', lang) },
    ] },
    { key: 'status', label: t('common.status', lang), type: 'select', options: [
      { value: 'new', label: t('status.new', lang) }, { value: 'contacted', label: t('status.contacted', lang) }, { value: 'qualified', label: t('status.qualified', lang) }, { value: 'converted', label: t('status.converted', lang) }, { value: 'lost', label: t('status.lost', lang) },
    ], defaultValue: 'new' },
    { key: 'temperature', label: t('list.temperature', lang), type: 'select', options: [
      { value: 'hot', label: t('status.hot', lang) }, { value: 'warm', label: t('status.warm', lang) }, { value: 'cold', label: t('status.cold', lang) },
    ], defaultValue: 'warm' },
    { key: 'potential_value', label: t('list.potentialValue', lang), type: 'number', defaultValue: 0 },
    { key: 'notes', label: t('list.notes', lang), type: 'textarea' },
  ];
}

export function dealFields(lang: Language, orgCurrency: string): FormField[] {
  return [
    { key: 'name', label: t('list.dealName', lang), type: 'text', required: true },
    { key: 'value', label: t('common.value', lang), type: 'number', required: true, defaultValue: 0 },
    currencyField(lang, orgCurrency),
    contactRelation(lang),
    companyRelation(lang),
    stageRelation(lang),
    { key: 'closing_date', label: t('list.closingDate', lang), type: 'date' },
    { key: 'status', label: t('common.status', lang), type: 'select', options: [
      { value: 'open', label: t('status.open', lang) }, { value: 'won', label: t('status.won', lang) }, { value: 'lost', label: t('status.lost', lang) },
    ], defaultValue: 'open' },
    { key: 'probability', label: t('list.probability', lang), type: 'number', defaultValue: 10 },
    { key: 'notes', label: t('list.notes', lang), type: 'textarea' },
  ];
}

export function quoteFields(lang: Language, orgCurrency: string): FormField[] {
  return [
    { key: 'quote_number', label: t('list.quoteNumber', lang), type: 'text', required: true, defaultValue: `DEV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}` },
    contactRelation(lang),
    companyRelation(lang),
    dealRelation(lang),
    { key: 'status', label: t('common.status', lang), type: 'select', options: [
      { value: 'draft', label: t('status.draft', lang) }, { value: 'sent', label: t('status.sent', lang) }, { value: 'accepted', label: t('status.accepted', lang) }, { value: 'rejected', label: t('status.rejected', lang) },
    ], defaultValue: 'draft' },
    currencyField(lang, orgCurrency),
    { key: 'expiration_date', label: t('list.expirationDate', lang), type: 'date' },
    { key: 'notes', label: t('list.notes', lang), type: 'textarea' },
  ];
}

export function invoiceFields(lang: Language, orgCurrency: string): FormField[] {
  return [
    { key: 'invoice_number', label: t('list.invoiceNumber', lang), type: 'text', required: true, defaultValue: `FAC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}` },
    contactRelation(lang),
    companyRelation(lang),
    dealRelation(lang),
    { key: 'status', label: t('common.status', lang), type: 'select', options: [
      { value: 'draft', label: t('status.draft', lang) }, { value: 'sent', label: t('status.sent', lang) }, { value: 'paid', label: t('status.paid', lang) }, { value: 'overdue', label: t('status.overdue', lang) },
    ], defaultValue: 'draft' },
    { key: 'payment_status', label: t('list.payment', lang), type: 'select', options: [
      { value: 'unpaid', label: t('status.unpaid', lang) }, { value: 'partial', label: t('status.partial', lang) }, { value: 'paid', label: t('status.paid', lang) },
    ], defaultValue: 'unpaid' },
    currencyField(lang, orgCurrency),
    { key: 'issue_date', label: t('list.issueDate', lang), type: 'date', defaultValue: new Date().toISOString().slice(0, 10) },
    { key: 'due_date', label: t('list.dueDate', lang), type: 'date' },
    { key: 'notes', label: t('list.notes', lang), type: 'textarea' },
  ];
}
