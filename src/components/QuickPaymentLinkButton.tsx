import { useState } from 'react';
import { CreditCard, Loader2, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useConnectedProviders, callIntegrationAction } from '@/lib/integrations';
import { useAuth } from '@/context/AuthContext';

interface QuickPaymentLinkButtonProps {
  amount?: number | null;
  currency?: string | null;
  /** Customer email — required by Mollie/Chapa, optional for the others. */
  email?: string | null;
  label?: string | null;
  /** The invoice's contact: lets the server fill in the e-mail/phone itself
   *  (works when contact details are hidden from the agent). */
  contactId?: string | null;
}

const GATEWAYS: { provider: string; action: string; needsEmail?: boolean; defaultCurrency: string; name?: string }[] = [
  { provider: 'stripe', name: 'Stripe', action: 'stripe_payment_link', defaultCurrency: 'USD' },
  { provider: 'paystack', name: 'Paystack', action: 'paystack_payment_link', needsEmail: true, defaultCurrency: 'NGN' },
  { provider: 'flutterwave', name: 'Flutterwave', action: 'flutterwave_payment_link', needsEmail: true, defaultCurrency: 'USD' },
  { provider: 'mollie', action: 'mollie_create_payment', needsEmail: false, defaultCurrency: 'EUR' },
  { provider: 'cinetpay', action: 'cinetpay_create_payment', defaultCurrency: 'XOF' },
  { provider: 'wave', action: 'wave_create_checkout', defaultCurrency: 'XOF' },
  { provider: 'chapa', action: 'chapa_initialize', needsEmail: true, defaultCurrency: 'ETB' },
  { provider: 'campay', action: 'campay_collect', defaultCurrency: 'XAF' },
];

/**
 * Quick action to generate a real payment link/checkout session for an
 * invoice or deal, using whichever payment-gateway marketplace app is
 * connected — the actual place someone uses Mollie/CinetPay/Wave/Chapa/
 * CamPay day-to-day, instead of having to build a Workflow for one invoice.
 * Only renders if at least one of these gateways is connected.
 */
export function QuickPaymentLinkButton({ amount, currency, email, label, contactId }: QuickPaymentLinkButtonProps) {
  const { language } = useAuth();
  const lang = language;
  const { connected } = useConnectedProviders();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState('');
  const [customerEmail, setCustomerEmail] = useState(email || '');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const available = GATEWAYS.filter(g => connected.has(g.provider));
  if (!amount || available.length === 0) return null;

  const active = GATEWAYS.find(g => g.provider === provider) || available[0];
  const link = result?.ok ? result.msg.match(/https?:\/\/\S+/)?.[0] : null;

  async function create() {
    setSending(true);
    setResult(null);
    const params: Record<string, unknown> = {
      amount,
      currency: currency || active.defaultCurrency,
      description: label || 'Atlas invoice',
    };
    if (customerEmail.trim()) params.email = customerEmail.trim();
    if (active.provider === 'chapa') { params.first_name = ''; params.last_name = ''; }
    if (active.provider === 'campay' && phone.trim()) { params.phone_number = phone.trim(); }
    if (contactId) params._record = { table: 'contacts', id: contactId };
    const res = await callIntegrationAction(active.action, params);
    setResult(res);
    setSending(false);
  }

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); setResult(null); setProvider(available[0].provider); }}
        className="p-1.5 rounded text-ink-400 hover:bg-success-50 hover:text-success-600 transition-colors"
        title={lang === 'fr' ? 'Créer un lien de paiement' : 'Create a payment link'}
      >
        <CreditCard size={14} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={lang === 'fr' ? 'Créer un lien de paiement' : 'Create a payment link'}>
        <div className="space-y-4">
          <div>
            <label className="label">{lang === 'fr' ? 'Fournisseur' : 'Gateway'}</label>
            <select className="input" value={active.provider} onChange={e => setProvider(e.target.value)}>
              {available.map(g => <option key={g.provider} value={g.provider}>{g.name || g.provider}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-ink-600">
            <div>{lang === 'fr' ? 'Montant' : 'Amount'}: <span className="font-semibold text-ink-800">{amount} {currency || active.defaultCurrency}</span></div>
          </div>
          {(active.needsEmail || active.provider === 'stripe') && (
            <div>
              <label className="label">{lang === 'fr' ? 'Email du client' : 'Customer email'}</label>
              <input className="input" type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                placeholder={contactId ? (lang === 'fr' ? 'Celui du contact de la facture' : "The invoice contact's") : ''} />
            </div>
          )}
          {active.provider === 'campay' && (
            <div>
              <label className="label">{lang === 'fr' ? 'Numéro de téléphone' : 'Phone number'}</label>
              <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder={contactId ? (lang === 'fr' ? 'Celui du contact de la facture' : "The invoice contact's") : '2376xxxxxxxx'} />
            </div>
          )}
          {result && (
            <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${result.ok ? 'border-success-200 bg-success-50 text-success-700' : 'border-error-200 bg-error-50 text-error-700'}`}>
              {result.ok ? <CheckCircle2 size={16} className="mt-0.5 flex-none" /> : <AlertCircle size={16} className="mt-0.5 flex-none" />}
              <span className="break-all">{result.msg}</span>
              {link && (
                <button onClick={copyLink} className="ml-auto flex-none text-primary-600 hover:text-primary-700">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="btn-secondary btn-sm">{lang === 'fr' ? 'Fermer' : 'Close'}</button>
            <button onClick={create} disabled={sending} className="btn-primary btn-sm">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />} {lang === 'fr' ? 'Créer le lien' : 'Create link'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
