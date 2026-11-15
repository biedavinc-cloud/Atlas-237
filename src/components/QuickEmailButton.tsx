import { useState } from 'react';
import { Mail, Loader2, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useConnectedProviders, callIntegrationAction } from '@/lib/integrations';
import { useAuth } from '@/context/AuthContext';
import { logActivity, type ActivityTarget } from '@/lib/activityLog';

interface QuickEmailButtonProps {
  to?: string | null;
  name?: string | null;
  subject?: string;
  message?: string;
  /** Logs the sent email on this record's timeline. */
  target?: ActivityTarget;
  label?: string;
}

/**
 * Sends a real email through the org's connected Resend account (their own
 * domain), from the record it concerns. Without Resend connected it falls
 * back to a mailto: link, so the button is always useful and never lies
 * about having sent anything.
 */
export function QuickEmailButton({ to, name, subject = '', message = '', target, label }: QuickEmailButtonProps) {
  const { language } = useAuth();
  const fr = language === 'fr';
  const { connected } = useConnectedProviders();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ to: to || '', subject, message });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const text = label || 'Email';

  if (!connected.has('resend')) {
    if (!to) return null;
    const href = `mailto:${to}${subject ? `?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}` : ''}`;
    return <a href={href} className="btn-secondary btn-sm"><Mail size={14} /> {text}</a>;
  }

  async function send() {
    setSending(true);
    setResult(null);
    const res = await callIntegrationAction('send_email', { to: form.to.trim(), subject: form.subject.trim(), message: form.message });
    if (res.ok && target) {
      await logActivity(target, 'email', form.subject.trim(), `${fr ? 'Envoyé à' : 'Sent to'} ${form.to.trim()} (Resend)\n\n${form.message}`);
    }
    setResult(res.ok ? { ok: true, msg: fr ? 'Email envoyé.' : 'Email sent.' } : res);
    setSending(false);
  }

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setForm({ to: to || '', subject, message }); setResult(null); setOpen(true); }}
        className="btn-secondary btn-sm"
      >
        <Mail size={14} /> {text}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={fr ? `Envoyer un email${name ? ` à ${name}` : ''}` : `Send an email${name ? ` to ${name}` : ''}`}>
        <div className="space-y-4">
          <div>
            <label className="label">{fr ? 'Destinataire' : 'To'}</label>
            <input className="input" type="email" value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} />
          </div>
          <div>
            <label className="label">{fr ? 'Objet' : 'Subject'}</label>
            <input className="input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea className="input" rows={7} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
          </div>
          <p className="text-xs text-ink-500">{fr ? 'Envoyé depuis votre domaine via Resend, et ajouté au fil d’activité.' : 'Sent from your domain via Resend, and added to the activity timeline.'}</p>
          {result && (
            <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${result.ok ? 'border-success-200 bg-success-50 text-success-700' : 'border-error-200 bg-error-50 text-error-700'}`}>
              {result.ok ? <CheckCircle2 size={16} className="mt-0.5 flex-none" /> : <AlertCircle size={16} className="mt-0.5 flex-none" />}
              <span>{result.msg}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="btn-secondary btn-sm">{fr ? 'Fermer' : 'Close'}</button>
            <button onClick={send} disabled={sending || !form.to.trim() || !form.subject.trim() || !form.message.trim()} className="btn-primary btn-sm">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} {fr ? 'Envoyer' : 'Send'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
