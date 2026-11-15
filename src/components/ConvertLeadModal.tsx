import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/errors';
import { triggerWebhooks } from '@/lib/webhooks';
import { Modal } from '@/components/Modal';
import type { Lead } from '@/types';

/**
 * Lead conversion: turns a qualified lead into real records — a contact
 * (always), optionally a company (from company_name) and a deal placed on
 * the first stage of a pipeline — then marks the lead converted with
 * converted_contact_id / converted_at and fires the lead.converted webhook.
 * Before this, "converted" was only a status value and created nothing.
 */
export function ConvertLeadModal({ lead, onClose, onDone }: { lead: Lead; onClose: () => void; onDone?: (contactId: string) => void }) {
  const { language, organization, profile } = useAuth();
  const navigate = useNavigate();
  const fr = language === 'fr';
  const [withCompany, setWithCompany] = useState(Boolean(lead.company_name));
  const [companyName, setCompanyName] = useState(lead.company_name || '');
  const [existingCompanyId, setExistingCompanyId] = useState<string | null>(null);
  const [withDeal, setWithDeal] = useState(true);
  const [dealName, setDealName] = useState(`${lead.company_name || `${lead.first_name} ${lead.last_name}`} — ${fr ? 'opportunité' : 'opportunity'}`);
  const [dealValue, setDealValue] = useState<number>(Number(lead.potential_value) || 0);
  const [stages, setStages] = useState<{ id: string; name: string; probability: number | null; pipeline: { name: string } | null }[]>([]);
  const [stageId, setStageId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('pipeline_stages').select('id,name,probability,sort_order,pipeline:pipelines(name)').order('sort_order', { ascending: true })
      .then(({ data }) => {
        const rows = (data || []) as unknown as typeof stages;
        setStages(rows);
        if (rows[0]) setStageId(rows[0].id);
      });
    // Reuse an existing company with the same name instead of duplicating it.
    if (lead.company_name) {
      supabase.from('companies').select('id').ilike('name', lead.company_name).limit(1)
        .then(({ data }) => setExistingCompanyId((data && data[0]?.id) || null));
    }
  }, [lead.company_name]);

  async function convert() {
    setBusy(true);
    setError('');
    try {
      let companyId: string | null = null;
      if (withCompany && companyName.trim()) {
        if (existingCompanyId && companyName.trim().toLowerCase() === (lead.company_name || '').toLowerCase()) {
          companyId = existingCompanyId;
        } else {
          const { data, error } = await supabase.from('companies').insert({ name: companyName.trim(), status: 'active', currency: organization?.currency || 'USD' }).select('id').single();
          if (error) throw error;
          companyId = data.id;
        }
      }

      const { data: contact, error: cErr } = await supabase.from('contacts').insert({
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        job_title: lead.title,
        company_id: companyId,
        company: withCompany ? companyName.trim() || null : lead.company_name,
        lead_source: lead.source,
        lead_score: lead.lead_score || 0,
        status: 'active',
        notes: lead.notes,
        owner_id: profile?.id || null,
      }).select('id').single();
      if (cErr) throw cErr;

      if (withDeal && dealName.trim()) {
        const stage = stages.find(s => s.id === stageId);
        const { error: dErr } = await supabase.from('deals').insert({
          name: dealName.trim(),
          value: dealValue || 0,
          currency: organization?.currency || 'USD',
          contact_id: contact.id,
          company_id: companyId,
          stage_id: stage?.id || null,
          probability: stage?.probability ?? 10,
          status: 'open',
          owner_id: profile?.id || null,
        });
        if (dErr) throw dErr;
      }

      const { error: lErr } = await supabase.from('leads').update({
        status: 'converted',
        converted_contact_id: contact.id,
        converted_at: new Date().toISOString(),
      }).eq('id', lead.id);
      if (lErr) throw lErr;

      triggerWebhooks('lead.converted', { id: lead.id, contact_id: contact.id, company_id: companyId });
      onDone?.(contact.id);
      navigate(`/app/contacts/${contact.id}`);
    } catch (e) {
      setError(getErrorMessage(e, fr ? 'Conversion impossible' : 'Conversion failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={fr ? 'Convertir la piste' : 'Convert lead'} description={`${lead.first_name} ${lead.last_name}`}>
      {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg bg-error-50 border border-error-200 px-4 py-2.5 text-sm text-error-700"><AlertCircle size={16} className="mt-0.5 flex-none" />{error}</div>}
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-success-50 p-3 text-sm text-success-800">
          <CheckCircle2 size={18} className="mt-0.5 flex-none" />
          <span>{fr ? 'Un contact sera créé avec ses coordonnées et ses notes.' : 'A contact will be created with their details and notes.'}</span>
        </div>

        <fieldset className="rounded-lg border border-ink-200 p-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-800">
            <input type="checkbox" checked={withCompany} onChange={e => setWithCompany(e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-primary-600" />
            {fr ? 'Créer ou lier une entreprise' : 'Create or link a company'}
          </label>
          {withCompany && (
            <div className="mt-3">
              <input className="input" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder={fr ? 'Nom de l’entreprise' : 'Company name'} />
              {existingCompanyId && companyName.trim().toLowerCase() === (lead.company_name || '').toLowerCase() && (
                <p className="mt-1.5 text-xs text-ink-500">{fr ? 'Cette entreprise existe déjà, le contact y sera rattaché.' : 'This company already exists; the contact will be linked to it.'}</p>
              )}
            </div>
          )}
        </fieldset>

        <fieldset className="rounded-lg border border-ink-200 p-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-800">
            <input type="checkbox" checked={withDeal} onChange={e => setWithDeal(e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-primary-600" />
            {fr ? 'Créer une affaire' : 'Create a deal'}
          </label>
          {withDeal && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="cv-deal">{fr ? 'Nom de l’affaire' : 'Deal name'}</label>
                <input id="cv-deal" className="input" value={dealName} onChange={e => setDealName(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="cv-val">{fr ? 'Montant' : 'Amount'} ({organization?.currency || 'USD'})</label>
                <input id="cv-val" type="number" className="input" value={dealValue} onChange={e => setDealValue(Number(e.target.value))} />
              </div>
              <div>
                <label className="label" htmlFor="cv-stage">{fr ? 'Étape' : 'Stage'}</label>
                <select id="cv-stage" className="input" value={stageId} onChange={e => setStageId(e.target.value)}>
                  <option value="">—</option>
                  {stages.map(s => <option key={s.id} value={s.id}>{s.pipeline?.name ? `${s.pipeline.name} › ` : ''}{s.name}</option>)}
                </select>
              </div>
            </div>
          )}
        </fieldset>
      </div>
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-ink-100">
        <button onClick={onClose} className="btn-secondary btn-sm">{fr ? 'Annuler' : 'Cancel'}</button>
        <button onClick={convert} disabled={busy} className="btn-primary btn-sm">
          {busy && <Loader2 size={14} className="animate-spin" />} {fr ? 'Convertir' : 'Convert'}
        </button>
      </div>
    </Modal>
  );
}
