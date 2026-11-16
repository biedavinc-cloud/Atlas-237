import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Printer, Save, Loader2, Edit2, CheckCircle2, Receipt, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { t, tStatus } from '@/lib/i18n';
import { Badge } from '@/components/ui';
import { Loading } from '@/components/Loading';
import { RecordFormModal } from '@/components/ListPage';
import { QuickPaymentLinkButton } from '@/components/QuickPaymentLinkButton';
import { QuickEmailButton } from '@/components/QuickEmailButton';
import { UpgradeGate } from '@/components/UpgradeGate';
import { usePlanAccess } from '@/lib/plans';
import { getCountryName, formatAmount } from '@/lib/i18n-countries';
import { quoteFields, invoiceFields } from '@/lib/entityFields';
import { triggerWebhooks } from '@/lib/webhooks';
import { getErrorMessage } from '@/lib/errors';

type Kind = 'quote' | 'invoice';
interface Item { key: string; product_id: string | null; name: string; description: string; quantity: number; unit_price: number; discount: number }
interface Product { id: string; name: string; price: number | null; description: string | null; tax_rate: number | null }

const round2 = (n: number) => Math.round(n * 100) / 100;
const lineTotal = (i: Item) => round2(Math.max(0, i.quantity * i.unit_price - (i.discount || 0)));
let keySeq = 0;
const newKey = () => `k${++keySeq}`;

/**
 * Quote / invoice document: line items (quote_items / invoice_items),
 * totals (subtotal, discount, tax, total, and amount paid/due for invoices),
 * a printable A4 layout (browser "Save as PDF"), quote → invoice conversion,
 * and "mark as paid" which records a real payment row.
 */
export function DocumentPage({ kind }: { kind: Kind }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language, organization, profile } = useAuth();
  const { hasFeature } = usePlanAccess();
  const fr = language === 'fr';
  const orgCurrency = organization?.currency || 'USD';
  const table = kind === 'quote' ? 'quotes' : 'invoices';
  const itemsTable = kind === 'quote' ? 'quote_items' : 'invoice_items';
  const fk = kind === 'quote' ? 'quote_id' : 'invoice_id';
  const back = kind === 'quote' ? '/app/quotes' : '/app/invoices';

  const [doc, setDoc] = useState<Record<string, unknown> | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    const [{ data: d }, { data: it }, { data: pr }] = await Promise.all([
      supabase.from(table).select('*, contact:contacts_v(id,first_name,last_name,email,phone,city,country), company:companies(id,name,city,country,website), deal:deals(id,name)').eq('id', id).maybeSingle(),
      supabase.from(itemsTable).select('*').eq(fk, id).order('created_at', { ascending: true }),
      supabase.from('products').select('id,name,price,description,tax_rate').order('name', { ascending: true }).limit(500),
    ]);
    setDoc(d as Record<string, unknown> | null);
    setItems(((it || []) as Record<string, unknown>[]).map(r => ({
      key: newKey(), product_id: (r.product_id as string) || null, name: String(r.name || ''), description: String(r.description || ''),
      quantity: Number(r.quantity) || 1, unit_price: Number(r.unit_price) || 0, discount: Number(r.discount) || 0,
    })));
    setProducts((pr || []) as Product[]);
    if (d) {
      const sub = Number((d as Record<string, unknown>).subtotal) || 0;
      const disc = Number((d as Record<string, unknown>).discount) || 0;
      const tax = Number((d as Record<string, unknown>).tax) || 0;
      setDiscount(disc);
      setTaxRate(sub - disc > 0 ? round2((tax / (sub - disc)) * 100) : 0);
      setAmountPaid(Number((d as Record<string, unknown>).amount_paid) || 0);
    }
    setDirty(false);
    setLoading(false);
  }, [id, table, itemsTable, fk]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => {
    const subtotal = round2(items.reduce((s, i) => s + lineTotal(i), 0));
    const base = Math.max(0, subtotal - (discount || 0));
    const tax = round2(base * ((taxRate || 0) / 100));
    const total = round2(base + tax);
    return { subtotal, tax, total, due: round2(Math.max(0, total - (amountPaid || 0))) };
  }, [items, discount, taxRate, amountPaid]);

  if (!hasFeature('quotesInvoicing')) {
    return <UpgradeGate language={language} feature={t(kind === 'quote' ? 'nav.quotes' : 'nav.invoices', language)} minPlan="growth" />;
  }
  if (loading) return <Loading />;
  if (!doc) {
    return <div className="card p-10 text-center"><p className="font-bold text-ink-900">{fr ? 'Document introuvable' : 'Document not found'}</p><Link to={back} className="btn-secondary btn-sm mt-4">{fr ? 'Retour' : 'Back'}</Link></div>;
  }

  const currency = String(doc.currency || orgCurrency);
  const money = (n: number) => formatAmount(n, currency, language);
  const number = String(kind === 'quote' ? doc.quote_number : doc.invoice_number);
  const contact = doc.contact as { id: string; first_name: string; last_name: string; email?: string; phone?: string; city?: string; country?: string } | null;
  const company = doc.company as { id: string; name: string; city?: string; country?: string } | null;
  const deal = doc.deal as { id: string; name: string } | null;

  function patchItem(key: string, patch: Partial<Item>) {
    setItems(prev => prev.map(i => (i.key === key ? { ...i, ...patch } : i)));
    setDirty(true);
  }
  function addItem(p?: Product) {
    setItems(prev => [...prev, { key: newKey(), product_id: p?.id || null, name: p?.name || '', description: p?.description || '', quantity: 1, unit_price: Number(p?.price) || 0, discount: 0 }]);
    if (p?.tax_rate && !taxRate) setTaxRate(Number(p.tax_rate));
    setDirty(true);
  }

  async function save(): Promise<boolean> {
    setSaving(true);
    setError('');
    try {
      const { error: delErr } = await supabase.from(itemsTable).delete().eq(fk, id!);
      if (delErr) throw delErr;
      const rows = items.filter(i => i.name.trim()).map(i => ({
        [fk]: id, product_id: i.product_id, name: i.name.trim(), description: i.description || null,
        quantity: Math.max(1, Math.round(i.quantity)), unit_price: i.unit_price, discount: i.discount || 0, total: lineTotal(i),
      }));
      if (rows.length) {
        const { error: insErr } = await supabase.from(itemsTable).insert(rows);
        if (insErr) throw insErr;
      }
      const patch: Record<string, unknown> = { subtotal: totals.subtotal, discount: discount || 0, tax: totals.tax, total: totals.total };
      if (kind === 'invoice') {
        patch.amount_paid = amountPaid || 0;
        patch.amount_due = totals.due;
        patch.payment_status = totals.total > 0 && totals.due === 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid';
      }
      const { error: upErr } = await supabase.from(table).update(patch).eq('id', id!);
      if (upErr) throw upErr;
      if (kind === 'invoice' && patch.payment_status === 'paid' && doc?.payment_status !== 'paid') triggerWebhooks('invoice.paid', { id, total: totals.total, currency });
      setNotice(fr ? 'Enregistré.' : 'Saved.');
      setTimeout(() => setNotice(''), 2500);
      await load();
      return true;
    } catch (e) {
      setError(getErrorMessage(e));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function markPaid() {
    if (dirty && !(await save())) return;
    const remaining = totals.due;
    if (remaining <= 0) return;
    setSaving(true);
    try {
      const { error: pErr } = await supabase.from('payments').insert({ invoice_id: id, amount: remaining, currency, method: 'bank_transfer', status: 'completed', reference: number });
      if (pErr) throw pErr;
      const { error: iErr } = await supabase.from('invoices').update({ amount_paid: totals.total, amount_due: 0, payment_status: 'paid', status: 'paid' }).eq('id', id!);
      if (iErr) throw iErr;
      triggerWebhooks('payment.received', { invoice_id: id, amount: remaining, currency });
      triggerWebhooks('invoice.paid', { id, total: totals.total, currency });
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function convertToInvoice() {
    if (dirty && !(await save())) return;
    setSaving(true);
    try {
      const { data: inv, error: invErr } = await supabase.from('invoices').insert({
        invoice_number: `FAC-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
        contact_id: contact?.id || null, company_id: company?.id || null, deal_id: deal?.id || null,
        status: 'draft', payment_status: 'unpaid', subtotal: totals.subtotal, discount: discount || 0, tax: totals.tax,
        total: totals.total, amount_paid: 0, amount_due: totals.total, currency, issue_date: new Date().toISOString().slice(0, 10),
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), notes: doc?.notes || null, terms: doc?.terms || null, owner_id: profile?.id || null,
      }).select('id').single();
      if (invErr) throw invErr;
      const rows = items.filter(i => i.name.trim()).map(i => ({ invoice_id: inv.id, product_id: i.product_id, name: i.name.trim(), description: i.description || null, quantity: Math.max(1, Math.round(i.quantity)), unit_price: i.unit_price, discount: i.discount || 0, total: lineTotal(i) }));
      if (rows.length) {
        const { error: itErr } = await supabase.from('invoice_items').insert(rows);
        if (itErr) throw itErr;
      }
      await supabase.from('quotes').update({ status: 'accepted' }).eq('id', id!);
      triggerWebhooks('invoice.created', { id: inv.id, from_quote: id });
      navigate(`/app/invoices/${inv.id}`);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function printDoc() {
    if (dirty && !(await save())) return;
    window.print();
  }

  const docEmailBody = [
    `${fr ? 'Bonjour' : 'Hello'} ${contact?.first_name || ''},`.trim(),
    '',
    kind === 'quote'
      ? (fr ? `Veuillez trouver ci-dessous notre devis ${number}.` : `Please find our quote ${number} below.`)
      : (fr ? `Voici la facture ${number}.` : `Here is invoice ${number}.`),
    '',
    ...items.filter(i => i.name.trim()).map(i => `• ${i.name} × ${i.quantity} — ${money(lineTotal(i))}`),
    '',
    `${fr ? 'Total' : 'Total'} : ${money(totals.total)}`,
    kind === 'invoice' && totals.due > 0 ? `${fr ? 'Reste à payer' : 'Amount due'} : ${money(totals.due)}` : '',
    kind === 'invoice' && doc.due_date ? `${fr ? 'Échéance' : 'Due date'} : ${new Date(String(doc.due_date)).toLocaleDateString(language)}` : '',
    '',
    fr ? 'Cordialement,' : 'Best regards,',
    organization?.name || '',
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');

  const statusKey = kind === 'invoice' ? String(doc.payment_status || 'unpaid') : String(doc.status || 'draft');
  const tone = ['paid', 'accepted'].includes(statusKey) ? 'success' : ['rejected', 'overdue', 'unpaid'].includes(statusKey) ? 'error' : 'warning';
  const billTo = company?.name || (contact ? `${contact.first_name} ${contact.last_name}` : '');
  const billToLines = [
    company && contact ? `${contact.first_name} ${contact.last_name}` : '',
    contact?.email || '',
    [company?.city || contact?.city, (company?.country || contact?.country) ? getCountryName(String(company?.country || contact?.country), language) : ''].filter(Boolean).join(', '),
  ].filter(Boolean);

  return (
    <div className="animate-fade-in">
      <div className="no-print">
        <Link to={back} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-800">
          <ArrowLeft size={15} className="rtl:rotate-180" /> {t(kind === 'quote' ? 'nav.quotes' : 'nav.invoices', language)}
        </Link>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">{kind === 'quote' ? (fr ? 'Devis' : 'Quote') : (fr ? 'Facture' : 'Invoice')} {number}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-ink-500">
              <Badge variant={tone}>{tStatus(statusKey, language)}</Badge>
              {billTo && <span>{billTo}</span>}
              {deal && <Link to={`/app/deals/${deal.id}`} className="text-primary-700 hover:underline">{deal.name}</Link>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {notice && <span className="text-sm font-semibold text-success-700">{notice}</span>}
            <button onClick={() => setEditing(true)} className="btn-secondary btn-sm"><Edit2 size={14} /> {fr ? 'En-tête' : 'Details'}</button>
            <button onClick={printDoc} className="btn-secondary btn-sm"><Printer size={14} /> {fr ? 'Imprimer / PDF' : 'Print / PDF'}</button>
            {kind === 'quote' && <button onClick={convertToInvoice} disabled={saving} className="btn-secondary btn-sm"><Receipt size={14} /> {fr ? 'Convertir en facture' : 'Convert to invoice'}</button>}
            {contact?.email && <QuickEmailButton
              to={contact.email}
              name={`${contact.first_name} ${contact.last_name}`}
              label={fr ? 'Envoyer' : 'Send'}
              subject={`${kind === 'quote' ? (fr ? 'Devis' : 'Quote') : (fr ? 'Facture' : 'Invoice')} ${number} — ${organization?.name || ''}`}
              message={docEmailBody}
              target={deal ? { fk: 'deal_id', id: deal.id } : { fk: 'contact_id', id: contact.id }}
              record={{ table: 'contacts', id: contact.id }}
            />}
            {kind === 'invoice' && totals.due > 0 && <QuickPaymentLinkButton amount={totals.due} currency={currency} email={contact?.email?.includes('•') ? null : contact?.email} contactId={contact?.id} label={number} />}
            {kind === 'invoice' && totals.due > 0 && totals.total > 0 && <button onClick={markPaid} disabled={saving} className="btn-success btn-sm"><CheckCircle2 size={14} /> {fr ? 'Marquer payée' : 'Mark as paid'}</button>}
            <button onClick={save} disabled={saving || !dirty} className="btn-primary btn-sm">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {fr ? 'Enregistrer' : 'Save'}</button>
          </div>
        </div>
        {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg bg-error-50 border border-error-200 px-4 py-2.5 text-sm text-error-700"><AlertCircle size={16} className="mt-0.5 flex-none" />{error}</div>}
      </div>

      {/* The paper: editable on screen, printed as-is (inputs render as plain text in print). */}
      <article className="doc-paper mx-auto max-w-4xl rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70">
        <div className="flex flex-col gap-6 border-b border-ink-100 p-6 sm:flex-row sm:justify-between sm:p-10">
          <div className="min-w-0">
            {organization?.logo_url && organization.branding_enabled
              ? <img src={organization.logo_url} alt={organization.name} className="mb-3 h-10 w-auto object-contain" />
              : <p className="mb-1 text-lg font-bold text-ink-900">{organization?.name}</p>}
            <p className="text-sm text-ink-500 whitespace-pre-line">{[organization?.address, organization?.country ? getCountryName(organization.country, language) : ''].filter(Boolean).join('\n')}</p>
          </div>
          <div className="sm:text-end">
            <p className="text-2xl font-bold tracking-tight text-navy-900">{kind === 'quote' ? (fr ? 'DEVIS' : 'QUOTE') : (fr ? 'FACTURE' : 'INVOICE')}</p>
            <p className="text-sm font-semibold text-ink-700">{number}</p>
            <dl className="mt-2 space-y-0.5 text-sm text-ink-500">
              {kind === 'invoice' && doc.issue_date ? <div><dt className="inline">{fr ? 'Émise le' : 'Issued'} </dt><dd className="inline font-medium text-ink-700">{new Date(String(doc.issue_date)).toLocaleDateString(language)}</dd></div> : null}
              {kind === 'invoice' && doc.due_date ? <div><dt className="inline">{fr ? 'Échéance' : 'Due'} </dt><dd className="inline font-medium text-ink-700">{new Date(String(doc.due_date)).toLocaleDateString(language)}</dd></div> : null}
              {kind === 'quote' && doc.expiration_date ? <div><dt className="inline">{fr ? 'Valable jusqu’au' : 'Valid until'} </dt><dd className="inline font-medium text-ink-700">{new Date(String(doc.expiration_date)).toLocaleDateString(language)}</dd></div> : null}
              {kind === 'quote' && !doc.expiration_date ? <div><dd className="inline">{new Date(String(doc.created_at)).toLocaleDateString(language)}</dd></div> : null}
            </dl>
          </div>
        </div>

        <div className="px-6 pt-6 sm:px-10">
          <p className="text-xs font-semibold text-ink-400">{fr ? 'Adressé à' : 'Bill to'}</p>
          {billTo ? (
            <>
              <p className="mt-1 text-base font-bold text-ink-900">{billTo}</p>
              {billToLines.map(l => <p key={l} className="text-sm text-ink-600">{l}</p>)}
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="no-print mt-1 text-sm font-semibold text-primary-700 hover:underline">{fr ? '+ Choisir un client' : '+ Choose a customer'}</button>
          )}
        </div>

        <div className="overflow-x-auto px-2 py-6 sm:px-6">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-ink-200 text-xs font-semibold text-ink-500">
                <th className="px-3 py-2 text-start">{fr ? 'Désignation' : 'Item'}</th>
                <th className="w-20 px-3 py-2 text-end">{fr ? 'Qté' : 'Qty'}</th>
                <th className="w-32 px-3 py-2 text-end">{fr ? 'Prix unitaire' : 'Unit price'}</th>
                <th className="w-28 px-3 py-2 text-end">{fr ? 'Remise' : 'Discount'}</th>
                <th className="w-32 px-3 py-2 text-end">{fr ? 'Total' : 'Total'}</th>
                <th className="no-print w-10" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-ink-500">{fr ? 'Ajoutez des lignes depuis votre catalogue ou en saisie libre.' : 'Add lines from your catalogue or as free text.'}</td></tr>
              )}
              {items.map(i => (
                <tr key={i.key} className="border-b border-ink-100 align-top">
                  <td className="px-3 py-2">
                    <input className="doc-input font-semibold" value={i.name} onChange={e => patchItem(i.key, { name: e.target.value })} placeholder={fr ? 'Produit ou service' : 'Product or service'} aria-label={fr ? 'Désignation' : 'Item'} />
                    <input className="doc-input text-xs text-ink-500" value={i.description} onChange={e => patchItem(i.key, { description: e.target.value })} placeholder={fr ? 'Description (optionnel)' : 'Description (optional)'} aria-label="Description" />
                  </td>
                  <td className="px-3 py-2"><input type="number" min={1} className="doc-input text-end tabular" value={i.quantity} onChange={e => patchItem(i.key, { quantity: Number(e.target.value) })} aria-label={fr ? 'Quantité' : 'Quantity'} /></td>
                  <td className="px-3 py-2"><input type="number" min={0} step="0.01" className="doc-input text-end tabular" value={i.unit_price} onChange={e => patchItem(i.key, { unit_price: Number(e.target.value) })} aria-label={fr ? 'Prix unitaire' : 'Unit price'} /></td>
                  <td className="px-3 py-2"><input type="number" min={0} step="0.01" className="doc-input text-end tabular" value={i.discount} onChange={e => patchItem(i.key, { discount: Number(e.target.value) })} aria-label={fr ? 'Remise' : 'Discount'} /></td>
                  <td className="px-3 py-2 pt-3 text-end text-sm font-semibold text-ink-900 tabular">{money(lineTotal(i))}</td>
                  <td className="no-print px-1 py-2"><button onClick={() => { setItems(prev => prev.filter(x => x.key !== i.key)); setDirty(true); }} className="btn-icon h-7 w-7 hover:bg-error-50 hover:text-error-600" aria-label={t('common.delete', language)}><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="no-print mt-3 flex flex-wrap items-center gap-2 px-3">
            <button onClick={() => addItem()} className="btn-secondary btn-sm"><Plus size={14} /> {fr ? 'Ligne libre' : 'Free line'}</button>
            {products.length > 0 && (
              <select className="input w-auto text-sm" value="" onChange={e => { const p = products.find(x => x.id === e.target.value); if (p) addItem(p); }} aria-label={fr ? 'Ajouter un produit' : 'Add a product'}>
                <option value="">{fr ? '+ Depuis le catalogue…' : '+ From catalogue…'}</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} — {formatAmount((Number(p.price) || 0), currency, language)}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 border-t border-ink-100 p-6 sm:flex-row sm:justify-between sm:p-10">
          <div className="max-w-sm text-sm text-ink-600 whitespace-pre-wrap">{doc.notes ? String(doc.notes) : ''}{doc.terms ? `\n\n${String(doc.terms)}` : ''}</div>
          <dl className="w-full space-y-2 text-sm sm:w-72">
            <div className="flex justify-between"><dt className="text-ink-500">{fr ? 'Sous-total' : 'Subtotal'}</dt><dd className="font-medium tabular">{money(totals.subtotal)}</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-ink-500">{fr ? 'Remise globale' : 'Discount'}</dt><dd><input type="number" min={0} step="0.01" className="doc-input w-28 text-end tabular" value={discount} onChange={e => { setDiscount(Number(e.target.value)); setDirty(true); }} aria-label={fr ? 'Remise globale' : 'Discount'} /></dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-ink-500 flex items-center gap-1">{fr ? 'TVA / taxe' : 'Tax'} <input type="number" min={0} step="0.01" className="doc-input w-16 text-end tabular" value={taxRate} onChange={e => { setTaxRate(Number(e.target.value)); setDirty(true); }} aria-label={fr ? 'Taux de taxe %' : 'Tax rate %'} />%</dt><dd className="font-medium tabular">{money(totals.tax)}</dd></div>
            <div className="flex justify-between border-t border-ink-200 pt-2 text-base"><dt className="font-bold text-ink-900">{fr ? 'Total' : 'Total'}</dt><dd className="font-bold text-ink-900 tabular">{money(totals.total)}</dd></div>
            {kind === 'invoice' && (
              <>
                <div className="flex items-center justify-between gap-3"><dt className="text-ink-500">{fr ? 'Déjà payé' : 'Paid'}</dt><dd><input type="number" min={0} step="0.01" className="doc-input w-28 text-end tabular" value={amountPaid} onChange={e => { setAmountPaid(Number(e.target.value)); setDirty(true); }} aria-label={fr ? 'Montant payé' : 'Amount paid'} /></dd></div>
                <div className="flex justify-between rounded-lg bg-navy-900 px-3 py-2 text-white"><dt className="font-semibold">{fr ? 'Reste à payer' : 'Amount due'}</dt><dd className="font-bold tabular">{money(totals.due)}</dd></div>
              </>
            )}
          </dl>
        </div>
        <p className="border-t border-ink-100 px-6 py-4 text-center text-xs text-ink-400 sm:px-10">{organization?.name}{organization?.country ? ` · ${getCountryName(organization.country, language)}` : ''}</p>
      </article>

      <RecordFormModal
        open={editing}
        onClose={() => setEditing(false)}
        onSaved={() => load()}
        table={table}
        title={number}
        fields={kind === 'quote' ? quoteFields(language, orgCurrency) : invoiceFields(language, orgCurrency)}
        record={doc}
      />
    </div>
  );
}
