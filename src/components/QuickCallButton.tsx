import { useState } from 'react';
import { Phone, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useConnectedProviders, callIntegrationAction } from '@/lib/integrations';
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/activityLog';

interface QuickCallButtonProps {
  phone?: string | null;
  name?: string | null;
  record: { table: 'contacts' | 'leads'; id: string };
}

/**
 * "Call" on a contact or lead record.
 * - Twilio connected: Atlas rings the agent's own phone (profile number) and
 *   then connects the customer, so the number never shows on the agent's
 *   screen; the call can be recorded and the recording lands on the timeline.
 * - Aircall connected: starts the call in the agent's Aircall app.
 * - Otherwise: a plain tel: link, only when the number is visible.
 */
export function QuickCallButton({ phone, name, record }: QuickCallButtonProps) {
  const { language } = useAuth();
  const fr = language === 'fr';
  const { connected } = useConnectedProviders();
  const [open, setOpen] = useState(false);
  const [via, setVia] = useState<'twilio' | 'aircall'>('twilio');
  const [recordCall, setRecordCall] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const masked = Boolean(phone && phone.includes('•'));
  const options = (['twilio', 'aircall'] as const).filter((p) => connected.has(p));
  if (!phone) return null;
  if (!options.length) {
    if (masked) return null;
    return <a href={`tel:${String(phone).replace(/\s/g, '')}`} className="btn-secondary btn-sm"><Phone size={14} /> {fr ? 'Appeler' : 'Call'}</a>;
  }
  const active = options.includes(via) ? via : options[0];

  async function call() {
    setBusy(true);
    setResult(null);
    const res = await callIntegrationAction(active === 'twilio' ? 'twilio_call' : 'aircall_call', {
      to: masked ? undefined : phone,
      record_call: active === 'twilio' ? recordCall : undefined,
      _record: record,
    });
    setResult(res);
    setBusy(false);
    if (res.ok) {
      await logActivity({ fk: record.table === 'contacts' ? 'contact_id' : 'lead_id', id: record.id }, 'call',
        fr ? `Appel sortant${name ? ` · ${name}` : ''}` : `Outbound call${name ? ` · ${name}` : ''}`,
        `${active === 'twilio' ? 'Twilio' : 'Aircall'}${active === 'twilio' && recordCall ? (fr ? ' · enregistré' : ' · recorded') : ''}`);
    }
  }

  return (
    <>
      <button onClick={() => { setResult(null); setOpen(true); }} className="btn-secondary btn-sm"><Phone size={14} /> {fr ? 'Appeler' : 'Call'}</button>
      <Modal open={open} onClose={() => setOpen(false)} title={fr ? `Appeler${name ? ` ${name}` : ''}` : `Call${name ? ` ${name}` : ''}`}>
        <div className="space-y-4">
          {options.length > 1 && (
            <div className="flex gap-2">
              {options.map((o) => (
                <button key={o} onClick={() => setVia(o)} className={`btn-sm flex-1 ${active === o ? 'btn-primary' : 'btn-secondary'}`}>{o === 'twilio' ? 'Twilio' : 'Aircall'}</button>
              ))}
            </div>
          )}
          <div>
            <label className="label">{fr ? 'Numéro' : 'Number'}</label>
            <input className="input bg-ink-50" value={phone} readOnly />
          </div>
          <p className="text-sm text-ink-600">
            {active === 'twilio'
              ? (fr ? 'Votre téléphone sonne d’abord (numéro de votre profil). Décrochez : Atlas appelle le client et vous met en relation.' : 'Your phone rings first (the number on your profile). Pick up: Atlas dials the customer and connects you.')
              : (fr ? 'L’appel démarre dans votre application Aircall (même e-mail que votre compte Atlas).' : 'The call starts in your Aircall app (same e-mail as your Atlas account).')}
          </p>
          {active === 'twilio' && (
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" checked={recordCall} onChange={(e) => setRecordCall(e.target.checked)} />
              {fr ? 'Enregistrer l’appel (prévenez le client)' : 'Record the call (tell the customer)'}
            </label>
          )}
          {result && (
            <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${result.ok ? 'border-success-200 bg-success-50 text-success-700' : 'border-error-200 bg-error-50 text-error-700'}`}>
              {result.ok ? <CheckCircle2 size={16} className="mt-0.5 flex-none" /> : <AlertCircle size={16} className="mt-0.5 flex-none" />}
              <span>{result.msg}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="btn-secondary btn-sm">{fr ? 'Fermer' : 'Close'}</button>
            <button onClick={call} disabled={busy} className="btn-primary btn-sm">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />} {fr ? 'Lancer l’appel' : 'Start the call'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
