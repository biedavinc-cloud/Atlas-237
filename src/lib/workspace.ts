import type { Role } from '@/types';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { FormField } from '@/components/ListPage';

/**
 * Workspace controls (Pro & Enterprise): stored in
 * organizations.workspace_settings and enforced in SQL by my_workspace()
 * (migration 052) — masking, portfolios and roles are NOT decided here, this
 * file only reads/writes the settings and builds form fields from them.
 */
export type { Role };

export interface CustomField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  applies: ('contacts' | 'leads')[];
}

export interface WorkspaceSettings {
  industry?: string;
  mask_pii?: boolean;
  pii_roles?: Role[];
  portfolio_mode?: boolean;
  supervisor_roles?: Role[];
  custom_fields?: CustomField[];
  inbound_email?: boolean;
}

export const ROLE_LABELS: Record<Role, { fr: string; en: string }> = {
  owner: { fr: 'Propriétaire', en: 'Owner' },
  admin: { fr: 'Administrateur', en: 'Admin' },
  manager: { fr: 'Manager', en: 'Manager' },
  qc: { fr: 'Contrôle qualité (QC)', en: 'Quality control (QC)' },
  agent: { fr: 'Agent', en: 'Agent' },
  sales: { fr: 'Ventes', en: 'Sales' },
  marketing: { fr: 'Marketing', en: 'Marketing' },
  finance: { fr: 'Finance', en: 'Finance' },
  support: { fr: 'Support', en: 'Support' },
  member: { fr: 'Membre', en: 'Member' },
};

const f = (key: string, label: string, type: CustomField['type'] = 'text', options?: string[], applies: CustomField['applies'] = ['contacts', 'leads']): CustomField => ({ key, label, type, options, applies });

/** Ready-made setups per industry: extra fields only, the CRM stays the same. */
export const INDUSTRY_PRESETS: { id: string; fr: string; en: string; fields: CustomField[] }[] = [
  { id: 'general', fr: 'Généraliste', en: 'General', fields: [] },
  { id: 'trading', fr: 'Trading, courtage, finance', en: 'Trading, brokerage, finance', fields: [
    f('account_number', 'N° de compte / Account #'), f('platform', 'Plateforme / Platform', 'select', ['MT4', 'MT5', 'cTrader', 'Web', 'App']),
    f('kyc_status', 'KYC', 'select', ['pending', 'approved', 'rejected']), f('account_type', 'Type de compte / Account type', 'select', ['demo', 'standard', 'pro', 'vip']),
    f('ftd_date', 'Premier dépôt / First deposit', 'date'), f('balance', 'Solde / Balance', 'number'),
  ] },
  { id: 'callcenter', fr: 'Centre d’appels', en: 'Call center', fields: [
    f('campaign', 'Campagne / Campaign'), f('call_outcome', 'Résultat d’appel / Call outcome', 'select', ['reached', 'no_answer', 'callback', 'not_interested', 'sale']),
    f('callback_at', 'Rappel le / Call back on', 'date'),
  ] },
  { id: 'ecommerce', fr: 'E-commerce', en: 'E-commerce', fields: [
    f('customer_number', 'N° client / Customer #', 'text', undefined, ['contacts']), f('orders_count', 'Commandes / Orders', 'number', undefined, ['contacts']),
    f('last_order_at', 'Dernière commande / Last order', 'date', undefined, ['contacts']), f('store', 'Boutique / Store'),
  ] },
  { id: 'health', fr: 'Hôpital, clinique', en: 'Hospital, clinic', fields: [
    f('patient_number', 'N° patient / Patient #', 'text', undefined, ['contacts']), f('date_of_birth', 'Date de naissance / Date of birth', 'date'),
    f('insurance', 'Assurance / Insurance'), f('department', 'Service / Department'), f('next_appointment', 'Prochain RDV / Next appointment', 'date'),
  ] },
  { id: 'realestate', fr: 'Immobilier', en: 'Real estate', fields: [
    f('budget', 'Budget', 'number'), f('area', 'Quartier / Area'), f('property_type', 'Type de bien / Property type', 'select', ['apartment', 'house', 'land', 'office', 'shop']),
  ] },
  { id: 'education', fr: 'École, formation', en: 'School, training', fields: [
    f('student_number', 'Matricule / Student #'), f('program', 'Filière / Program'), f('level', 'Niveau / Level'),
  ] },
  { id: 'hospitality', fr: 'Hôtellerie, restauration', en: 'Hospitality', fields: [
    f('stay_dates', 'Séjour / Stay'), f('loyalty_tier', 'Fidélité / Loyalty', 'select', ['bronze', 'silver', 'gold']),
  ] },
  { id: 'insurance', fr: 'Assurance, microfinance', en: 'Insurance, microfinance', fields: [
    f('policy_number', 'N° police / Policy #'), f('product', 'Produit / Product'), f('renewal_date', 'Renouvellement / Renewal', 'date'),
  ] },
];

export function useWorkspaceSettings(): WorkspaceSettings {
  const { organization } = useAuth();
  return ((organization as unknown as { workspace_settings?: WorkspaceSettings } | null)?.workspace_settings) || {};
}

/** Form fields for the org's custom fields ("cf:<key>" → custom_fields jsonb). */
export function useCustomFormFields(table: 'contacts' | 'leads'): FormField[] {
  const ws = useWorkspaceSettings();
  return (ws.custom_fields || []).filter((c) => c.applies.includes(table)).map((c) => ({
    key: `cf:${c.key}`,
    label: c.label,
    type: c.type === 'select' ? 'select' : c.type,
    options: c.type === 'select' ? [{ value: '', label: '—' }, ...(c.options || []).map((o) => ({ value: o, label: o }))] : undefined,
  }));
}

/** What the signed-in user may see (server truth from my_workspace()). */
export function useMyWorkspace() {
  const [state, setState] = useState<{ role: Role; pii: boolean; see_all: boolean } | null>(null);
  useEffect(() => {
    supabase.rpc('my_workspace').then(({ data }) => {
      const r = Array.isArray(data) ? data[0] : data;
      if (r) setState({ role: r.role, pii: r.pii, see_all: r.see_all });
    });
  }, []);
  return state;
}

export const canManageTeam = (role?: string | null) => ['owner', 'admin', 'manager'].includes(role || '');
export const canSupervise = (role?: string | null) => ['owner', 'admin', 'manager', 'qc'].includes(role || '');
