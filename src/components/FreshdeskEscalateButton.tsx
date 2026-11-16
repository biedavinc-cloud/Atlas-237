import { useState } from 'react';
import { ArrowUpRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { useConnectedProviders, callIntegrationAction } from '@/lib/integrations';
import { supabase } from '@/lib/supabase';

interface Props {
  ticketId: string;
  ticketNumber?: string | null;
  subject?: string | null;
  description?: string | null;
  email?: string | null;
  /** Ticket's contact: the server fills in the e-mail when left empty. */
  contactId?: string | null;
  internalNotes?: string | null;
  onDone?: () => void;
}

/**
 * Escalates one Atlas ticket to the org's Freshdesk helpdesk (real API call
 * via integration-action). The Freshdesk reply is saved in the ticket's
 * internal notes so the team can see where it went. Only shown when
 * Freshdesk is connected.
 */
export function FreshdeskEscalateButton({ ticketId, ticketNumber, subject, description, email, contactId, internalNotes, onDone }: Props) {
  const { language } = useAuth();
  const fr = language === 'fr';
  const { connected } = useConnectedProviders();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: email || '', subject: subject || '', description: description || '' });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  if (!connected.has('freshdesk')) return null;

  async function send() {
    setBusy(true);
    setResult(null);
    const res = await callIntegrationAction('freshdesk_create_ticket', {
      email: form.email.trim() || undefined,
      ...(contactId ? { _record: { table: 'contacts', id: contactId } } : {}),
      subject: `${ticketNumber ? `[${ticketNumber}] ` : ''}${form.subject.trim()}`,
      description: form.description.trim() || form.subject.trim(),
    });
    if (res.ok) {
      const note = `${new Date().toISOString().slice(0, 10)} — ${fr ? 'Escaladé vers Freshdesk' : 'Escalated to Freshdesk'}: ${res.msg}`;
      await supabase.from('tickets').update({ status: 'in_progress', internal_notes: [internalNotes, note].filter(Boolean).join('\n') }).eq('id', ticketId);
      onDone?.();
    }
    setResult(res);
    setBusy(false);
  }

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setResult(null); setOpen(true); }}
        className="p-1.5 rounded text-ink-400 hover:bg-primary-50 hover:text-primary-600 transition-colors"
        title={fr ? 'Escalader vers Freshdesk' : 'Escalate to Freshdesk'}
      >
        <ArrowUpRight size={14} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={fr ? 'Escalader vers Freshdesk' : 'Escalate to Freshdesk'}>
        <div className="space-y-4">
          <div>
            <label className="label">{fr ? 'Email du client' : 'Customer email'}</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder={contactId ? (fr ? 'Celui du contact du ticket' : "The ticket contact's") : ''} />
          </div>
          <div>
            <label className="label">{fr ? 'Objet' : 'Subject'}</label>
            <input className="input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={5} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          {result && (
            <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${result.ok ? 'border-success-200 bg-success-50 text-success-700' : 'border-error-200 bg-error-50 text-error-700'}`}>
              {result.ok ? <CheckCircle2 size={16} className="mt-0.5 flex-none" /> : <AlertCircle size={16} className="mt-0.5 flex-none" />}
              <span>{result.msg}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="btn-secondary btn-sm">{fr ? 'Fermer' : 'Close'}</button>
            <button onClick={send} disabled={busy || (!form.email.trim() && !contactId) || !form.subject.trim()} className="btn-primary btn-sm">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />} {fr ? 'Escalader' : 'Escalate'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
