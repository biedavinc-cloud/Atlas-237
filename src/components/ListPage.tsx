import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Upload, FileSpreadsheet, CheckCircle2, Loader2, AlertCircle, Download, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/i18n';
import { getErrorMessage } from '@/lib/errors';
import { PageHeader } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { Loading } from '@/components/Loading';
import { Modal } from '@/components/Modal';
import { COUNTRIES } from '@/lib/i18n-countries';
import { WEBHOOK_EVENTS, triggerWebhooks, type WebhookEvent } from '@/lib/webhooks';

/**
 * Maps a table this generic list editor manages to the entity name used in
 * webhook event strings (see src/lib/webhooks.ts WEBHOOK_EVENTS). Tables not
 * listed here (products, tickets, teams, etc.) simply never fire a webhook —
 * there's no subscribable event for them on the Webhooks page.
 */
const WEBHOOK_ENTITY: Record<string, string> = {
  contacts: 'contact',
  leads: 'lead',
  deals: 'deal',
  invoices: 'invoice',
  activities: 'activity',
};

/**
 * Real CRM-event → webhook-event mapping, used so that editing a record
 * through this generic list/modal (Contacts, Leads, Deals, Invoices,
 * Activities, Payments — every page built on ListPage) actually fires the
 * webhooks an org configured on the API & Webhooks page. Previously nothing
 * in the app ever triggered a real webhook outside the manual "Test" ping.
 */
function computeWebhookEvents(table: string, kind: 'created' | 'updated' | 'deleted', payload: Record<string, unknown>): WebhookEvent[] {
  const known = WEBHOOK_EVENTS as readonly string[];
  const events: WebhookEvent[] = [];
  if (table === 'payments') {
    // The matrix only defines 'payment.received', fired once when a payment row is created.
    if (kind === 'created' && known.includes('payment.received')) events.push('payment.received');
    return events;
  }
  const entity = WEBHOOK_ENTITY[table];
  if (!entity) return events;
  const generic = `${entity}.${kind}`;
  if (known.includes(generic)) events.push(generic as WebhookEvent);
  if (kind === 'updated') {
    if (table === 'leads' && payload.status === 'converted' && known.includes('lead.converted')) events.push('lead.converted');
    if (table === 'deals' && payload.status === 'won' && known.includes('deal.won')) events.push('deal.won');
    if (table === 'deals' && payload.status === 'lost' && known.includes('deal.lost')) events.push('deal.lost');
    if (table === 'invoices' && payload.payment_status === 'paid' && known.includes('invoice.paid')) events.push('invoice.paid');
  }
  return events;
}

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface ListPageProps<T extends { id: string }> {
  table: string;
  title: string;
  subtitle?: string;
  columns: Column<T>[];
  formFields: FormField[];
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  select?: string;
  relations?: string;
  orderBy?: string;
  importable?: boolean;
  /** Optional plan-based cap on total rows. When reached, "New" is disabled with an upgrade hint. */
  maxRows?: number | null;
  maxRowsMessage?: string;
  /** Extra per-row action buttons rendered before Edit/Delete (e.g. "Send WhatsApp", "Create payment link"). */
  rowActions?: (row: T, reload: () => void) => React.ReactNode;
  /** Clicking a row opens this route (the record's detail page). */
  rowLink?: (row: T) => string;
  /** Columns searched server-side (ilike). Defaults to the form's text/email/phone fields. */
  searchColumns?: string[];
  /** Extra controls rendered in the header next to "Add" (e.g. a view switch). */
  headerExtra?: React.ReactNode;
}

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea' | 'date' | 'country' | 'phone' | 'tags' | 'relation';
  required?: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: string | number;
  /** For type 'phone': the key of a 'country' field in the same form, used to auto-select the dial code. */
  countryFieldKey?: string;
  /**
   * For type 'relation': a foreign key picked from another table (e.g. a
   * deal's contact_id). Options are loaded from `table`, labelled with
   * `label(row)`; `select` can embed parents for the label.
   */
  relation?: {
    table: string;
    select?: string;
    label: (row: Record<string, unknown>) => string;
    orderBy?: string;
  };
}

function ImportModal({ table, fields, onClose, onDone, language }: {
  table: string;
  fields: FormField[];
  onClose: () => void;
  onDone: (imported: number) => void;
  language: string;
}) {
  const lang = language;
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'done'>('upload');
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  function handleFile(f: File) {
    setError('');
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      Papa.parse(f, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as Record<string, unknown>[];
          const cols = results.meta.fields || [];
          setRows(data);
          setHeaders(cols);
          autoMap(cols);
          setStep('map');
        },
        error: (err) => setError(err.message),
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
          const cols = data.length > 0 ? Object.keys(data[0]) : [];
          setRows(data);
          setHeaders(cols);
          autoMap(cols);
          setStep('map');
        } catch (err) { setError(getErrorMessage(err)); }
      };
      reader.readAsArrayBuffer(f);
    } else {
      setError(lang === 'fr' ? 'Format non supporté. Utilisez CSV ou XLSX.' : 'Unsupported format. Use CSV or XLSX.');
    }
  }

  function autoMap(cols: string[]) {
    const map: Record<string, string> = {};
    fields.forEach(f => {
      const match = cols.find(c => c.toLowerCase().trim() === f.key.toLowerCase() || c.toLowerCase().trim() === f.label.toLowerCase());
      if (match) map[f.key] = match;
    });
    setFieldMap(map);
  }

  function downloadTemplate() {
    const header = fields.map(f => f.label).join(',');
    const sample = fields.map(f => f.defaultValue ?? '').join(',');
    const blob = new Blob([header + '\n' + sample + '\n'], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${table}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function mappedRows(): Record<string, unknown>[] {
    return rows.map(r => {
      const obj: Record<string, unknown> = {};
      fields.forEach(f => {
        const csvCol = fieldMap[f.key];
        if (csvCol && r[csvCol] !== undefined) {
          obj[f.key] = f.type === 'number' ? Number(r[csvCol]) || 0 : String(r[csvCol]);
        }
      });
      return obj;
    }).filter(obj => Object.keys(obj).length > 0);
  }

  async function doImport() {
    setImporting(true);
    setError('');
    const data = mappedRows();
    try {
      const { error: insErr } = await supabase.from(table).insert(data);
      if (insErr) throw insErr;
      setImportedCount(data.length);
      setStep('done');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setImporting(false);
    }
  }

  const mapped = mappedRows();

  return (
    <Modal open onClose={onClose} title={lang === 'fr' ? 'Importer des données' : 'Import Data'} size="lg">
      <div className="flex items-center gap-2 mb-4 text-sm">
        {['upload', 'map', 'preview', 'done'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step === s ? 'bg-primary-600 text-white' : i < ['upload', 'map', 'preview', 'done'].indexOf(step) ? 'bg-success-500 text-white' : 'bg-ink-200 text-ink-500'}`}>
              {i < ['upload', 'map', 'preview', 'done'].indexOf(step) ? <CheckCircle2 size={12} /> : i + 1}
            </span>
            <span className="capitalize text-ink-600 hidden sm:inline">{s}</span>
            {i < 3 && <span className="text-ink-300 mx-1">→</span>}
          </div>
        ))}
      </div>

      {error && <div className="mb-4 rounded-lg bg-error-50 border border-error-200 px-4 py-2 text-sm text-error-700 flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}

      {step === 'upload' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragOver ? 'border-primary-500 bg-primary-50' : 'border-ink-200 hover:border-ink-300'}`}
          >
            <FileSpreadsheet size={40} className="mx-auto text-ink-400 mb-3" />
            <p className="text-sm font-medium text-ink-700 mb-1">{lang === 'fr' ? 'Glissez votre fichier ici' : 'Drop your file here'}</p>
            <p className="text-xs text-ink-400 mb-3">{lang === 'fr' ? 'ou' : 'or'}</p>
            <label className="btn-primary btn-sm cursor-pointer inline-flex">
              <Upload size={14} /> {lang === 'fr' ? 'Choisir un fichier' : 'Choose file'}
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
            <p className="text-xs text-ink-400 mt-3">CSV, XLSX, XLS {lang === 'fr' ? '(max 1000 lignes recommandé)' : '(max 1000 rows recommended)'}</p>
          </div>
          <button onClick={downloadTemplate} className="text-sm text-primary-600 hover:underline flex items-center gap-1">
            <Download size={14} /> {lang === 'fr' ? 'Télécharger le modèle CSV' : 'Download CSV template'}
          </button>
        </div>
      )}

      {step === 'map' && (
        <div className="space-y-4">
          <p className="text-sm text-ink-600">{lang === 'fr' ? `Associez les colonnes de votre fichier aux champs de ${table}.` : `Map your file columns to ${table} fields.`}</p>
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {fields.map(f => (
              <div key={f.key} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <label className="text-xs font-medium text-ink-600">{f.label}{f.required && <span className="text-error-500"> *</span>}</label>
                  <p className="text-[10px] text-ink-400 font-mono">{f.key}</p>
                </div>
                <span className="text-ink-300">→</span>
                <select className="input flex-1" value={fieldMap[f.key] || ''} onChange={e => setFieldMap(prev => ({ ...prev, [f.key]: e.target.value }))}>
                  <option value="">{lang === 'fr' ? '— Ignorer —' : '— Skip —'}</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep('upload')} className="btn-secondary btn-sm">← {lang === 'fr' ? 'Retour' : 'Back'}</button>
            <button onClick={() => setStep('preview')} disabled={Object.keys(fieldMap).length === 0} className="btn-primary btn-sm">{lang === 'fr' ? 'Aperçu' : 'Preview'} →</button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <p className="text-sm text-ink-600">{lang === 'fr' ? `${mapped.length} ligne(s) seront importées dans ${table}.` : `${mapped.length} row(s) will be imported into ${table}.`}</p>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin max-h-64">
              <table className="w-full text-xs">
                <thead className="bg-ink-50 sticky top-0">
                  <tr>{fields.filter(f => fieldMap[f.key]).map(f => <th key={f.key} className="px-3 py-2 text-start font-semibold text-ink-600">{f.label}</th>)}</tr>
                </thead>
                <tbody>
                  {mapped.slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-t border-ink-50">
                      {fields.filter(f => fieldMap[f.key]).map(f => <td key={f.key} className="px-3 py-2 text-ink-700 truncate max-w-[120px]">{String(row[f.key] ?? '—')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {mapped.length > 50 && <p className="text-xs text-ink-400">{lang === 'fr' ? `Affichage des 50 premières sur ${mapped.length}.` : `Showing first 50 of ${mapped.length}.`}</p>}
          <div className="flex justify-between">
            <button onClick={() => setStep('map')} className="btn-secondary btn-sm">← {lang === 'fr' ? 'Retour' : 'Back'}</button>
            <button onClick={doImport} disabled={importing || mapped.length === 0} className="btn-primary btn-sm">
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {lang === 'fr' ? `Importer ${mapped.length} ligne(s)` : `Import ${mapped.length} row(s)`}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center py-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-50 mx-auto mb-4">
            <CheckCircle2 size={32} className="text-success-600" />
          </div>
          <h3 className="font-bold text-ink-800 text-lg mb-1">{importedCount} {lang === 'fr' ? 'ligne(s) importée(s) avec succès !' : 'row(s) imported successfully!'}</h3>
          <p className="text-sm text-ink-500 mb-4">{lang === 'fr' ? 'Vos données sont maintenant disponibles.' : 'Your data is now available.'}</p>
          <button onClick={() => onDone(importedCount)} className="btn-primary btn-sm">{lang === 'fr' ? 'Terminer' : 'Done'}</button>
        </div>
      )}
    </Modal>
  );
}

const PAGE_SIZE = 25;

/** Postgres-safe value for a PostgREST `or=(col.ilike.*x*)` filter. */
function escapeIlike(q: string): string {
  return q.replace(/[%,()*\\]/g, ' ').trim();
}

async function notifyNewTicket(ticket: Record<string, unknown>) {
  // Fire-and-forget: notification failures must never block ticket
  // creation itself. Silently no-ops if RESEND_API_KEY isn't configured.
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-ticket-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session?.access_token || ''}`,
      },
      body: JSON.stringify({
        ticket_number: ticket.ticket_number || ticket.id,
        subject: ticket.subject,
        priority: ticket.priority,
        description: ticket.description,
      }),
    });
  } catch {
    // ignore — best-effort notification only
  }
}

/** Loads the options of a 'relation' field once per modal opening. */
function RelationSelect({ field, value, onChange, id }: { field: FormField; value: string; onChange: (v: string) => void; id: string }) {
  const [options, setOptions] = useState<{ value: string; label: string }[] | null>(null);
  useEffect(() => {
    const rel = field.relation;
    if (!rel) return;
    let q = supabase.from(rel.table).select(rel.select || '*').limit(1000);
    if (rel.orderBy) q = q.order(rel.orderBy, { ascending: true });
    q.then(({ data }) => {
      const rows = (data || []) as unknown as Record<string, unknown>[];
      setOptions(rows.map(r => ({ value: String(r.id), label: rel.label(r) || '—' })).sort((a, b) => a.label.localeCompare(b.label)));
    });
  }, [field.relation]);
  return (
    <select id={id} className="input" value={value} onChange={e => onChange(e.target.value)} disabled={options === null}>
      <option value="">{options === null ? '…' : '—'}</option>
      {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/**
 * Create/edit form for one record of `table`. Used by ListPage and by the
 * record detail pages, so both write exactly the same way (tags arrays,
 * blank stripping, webhooks, ticket notifications).
 */
export function RecordFormModal({ open, onClose, onSaved, table, title, fields, record, defaults }: {
  open: boolean;
  onClose: () => void;
  onSaved: (row: Record<string, unknown>) => void;
  table: string;
  title: string;
  fields: FormField[];
  /** Existing row to edit; omit to create. */
  record?: Record<string, unknown> | null;
  /** Prefilled values for a new record (e.g. contact_id from a detail page). */
  defaults?: Record<string, unknown>;
}) {
  const { language } = useAuth();
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const editing = Boolean(record?.id);

  useEffect(() => {
    if (!open) return;
    setError('');
    const data: Record<string, unknown> = {};
    if (record) {
      fields.forEach(f => {
        const v = record[f.key];
        // 'tags' columns are real Postgres arrays (text[]); the input works
        // with a comma-separated string, converted back on save.
        data[f.key] = f.type === 'tags' && Array.isArray(v) ? v.join(', ') : v;
      });
    } else {
      fields.forEach(f => { if (f.defaultValue !== undefined) data[f.key] = f.defaultValue; });
      Object.assign(data, defaults || {});
    }
    setFormData(data);
  }, [open, record, fields, defaults]);

  async function handleSave() {
    const missing = fields.filter(f => {
      if (!f.required) return false;
      const v = formData[f.key];
      return v === undefined || v === null || String(v).trim() === '';
    });
    if (missing.length) {
      setError(`${language === 'fr' ? 'Champs obligatoires' : 'Required fields'}: ${missing.map(f => f.label).join(', ')}`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      // Strip UI-only companion keys ("country__mode") and, on create,
      // blanks so column defaults apply.
      const payload = Object.fromEntries(
        Object.entries(formData).filter(([k, v]) =>
          !k.includes('__mode') && !k.endsWith('__other') &&
          (editing || (v !== null && v !== '' && v !== undefined))
        )
      );
      fields.forEach(f => {
        if (f.type === 'tags' && f.key in payload) {
          const raw = payload[f.key];
          payload[f.key] = typeof raw === 'string'
            ? raw.split(',').map(s => s.trim()).filter(Boolean)
            : (Array.isArray(raw) ? raw : []);
        }
        // An emptied relation means "no link", not an invalid uuid "".
        if (f.type === 'relation' && payload[f.key] === '') payload[f.key] = null;
      });
      if (editing && record?.id) {
        const { data: updated, error } = await supabase.from(table).update(payload).eq('id', record.id as string).select().single();
        if (error) throw error;
        for (const ev of computeWebhookEvents(table, 'updated', payload)) {
          triggerWebhooks(ev, { id: record.id, table, ...payload });
        }
        onSaved((updated as Record<string, unknown>) || { ...record, ...payload });
      } else {
        const { data: inserted, error } = await supabase.from(table).insert(payload).select().single();
        if (error) throw error;
        if (table === 'tickets' && inserted) notifyNewTicket(inserted as Record<string, unknown>);
        for (const ev of computeWebhookEvents(table, 'created', payload)) {
          triggerWebhooks(ev, { id: (inserted as Record<string, unknown> | null)?.id, table, ...payload });
        }
        onSaved((inserted as Record<string, unknown>) || payload);
      }
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  const set = (key: string, value: unknown) => setFormData(prev => ({ ...prev, [key]: value }));

  return (
    <Modal open={open} onClose={onClose} title={editing ? t('common.edit', language) : t('common.add', language)} description={title} size="lg">
      {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg bg-error-50 border border-error-200 px-4 py-2.5 text-sm text-error-700"><AlertCircle size={16} className="mt-0.5 flex-none" />{error}</div>}
      <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(field => {
            const id = `f-${table}-${field.key}`;
            return (
              <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label className="label" htmlFor={id}>
                  {field.label}{field.required && <span className="text-error-600 ms-0.5" aria-hidden>*</span>}
                </label>
                {field.type === 'relation' ? (
                  <RelationSelect id={id} field={field} value={String(formData[field.key] ?? '')} onChange={v => set(field.key, v)} />
                ) : field.type === 'select' ? (
                  <select id={id} className="input" value={String(formData[field.key] ?? '')} onChange={e => set(field.key, e.target.value)}>
                    <option value="">—</option>
                    {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                ) : field.type === 'country' ? (() => {
                  const val = String(formData[field.key] ?? '');
                  const explicitOther = formData[`${field.key}__mode`] === 'other';
                  const isKnown = !explicitOther && (!val || COUNTRIES.some(c => c.code === val));
                  return (
                    <div className="space-y-2">
                      <select
                        id={id}
                        className="input"
                        value={isKnown ? val : '__other__'}
                        onChange={e => {
                          if (e.target.value === '__other__') setFormData(prev => ({ ...prev, [field.key]: '', [`${field.key}__mode`]: 'other' }));
                          else setFormData(prev => ({ ...prev, [field.key]: e.target.value, [`${field.key}__mode`]: 'known' }));
                        }}
                      >
                        <option value="">—</option>
                        {COUNTRIES.map(c => <option key={c.code} value={c.code}>{language === 'fr' ? c.nameFr : c.name}</option>)}
                        <option value="__other__">{language === 'fr' ? 'Autre (préciser)…' : 'Other (specify)…'}</option>
                      </select>
                      {!isKnown && (
                        <input type="text" className="input" placeholder={language === 'fr' ? 'Nom du pays' : 'Country name'} value={val}
                          onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value, [`${field.key}__mode`]: 'other' }))} autoFocus />
                      )}
                    </div>
                  );
                })() : field.type === 'phone' ? (() => {
                  const raw = String(formData[field.key] ?? '');
                  const sortedByDialLength = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
                  const matched = sortedByDialLength.find(c => raw === c.dialCode || raw.startsWith(c.dialCode + ' '));
                  let dial = matched?.dialCode || '';
                  const rest = matched ? raw.slice(matched.dialCode.length).trim() : raw;
                  if (!dial && field.countryFieldKey) {
                    const c = COUNTRIES.find(c => c.code === String(formData[field.countryFieldKey!] ?? ''));
                    if (c) dial = c.dialCode;
                  }
                  return (
                    <div className="flex gap-2">
                      <select className="input w-28 flex-shrink-0" aria-label="Dial code" value={dial} onChange={e => set(field.key, `${e.target.value} ${rest}`.trim())}>
                        <option value="">—</option>
                        {COUNTRIES.map(c => <option key={c.code} value={c.dialCode}>{c.code} {c.dialCode}</option>)}
                      </select>
                      <input id={id} type="tel" className="input flex-1" value={rest} onChange={e => set(field.key, dial ? `${dial} ${e.target.value}`.trim() : e.target.value)} />
                    </div>
                  );
                })() : field.type === 'tags' ? (
                  <input id={id} type="text" className="input" placeholder={language === 'fr' ? 'ex : vip, prospect, tech' : 'e.g. vip, prospect, tech'}
                    value={String(formData[field.key] ?? '')} onChange={e => set(field.key, e.target.value)} />
                ) : field.type === 'textarea' ? (
                  <textarea id={id} className="input min-h-[96px]" value={String(formData[field.key] ?? '')} onChange={e => set(field.key, e.target.value)} />
                ) : (
                  <input
                    id={id}
                    type={field.type}
                    className="input"
                    value={field.type === 'date' ? String(formData[field.key] ?? '').slice(0, 10) : String(formData[field.key] ?? '')}
                    // An emptied number field is "no value", not 0.
                    onChange={e => set(field.key, field.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-ink-100">
          <button type="button" onClick={onClose} className="btn-secondary btn-sm">{t('common.cancel', language)}</button>
          <button type="submit" disabled={saving} className="btn-primary btn-sm">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {editing ? t('common.save', language) : t('common.create', language)}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function csvCell(v: unknown): unknown {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') return '';
  return v;
}

export function ListPage<T extends { id: string }>({
  table, title, subtitle, columns, formFields, emptyIcon, emptyTitle, emptyDescription, select, relations, orderBy,
  importable, maxRows, maxRowsMessage, rowActions, rowLink, searchColumns, headerExtra,
}: ListPageProps<T>) {
  const { language } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState<{ key: string; asc: boolean }>({ key: orderBy || 'created_at', asc: false });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [createDefaults, setCreateDefaults] = useState<Record<string, unknown> | undefined>(undefined);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const statusField = formFields.find(f => f.key === 'status' && f.type === 'select' && f.options?.length);
  const searchable = searchColumns ?? formFields.filter(f => ['text', 'email', 'tel', 'phone'].includes(f.type)).map(f => f.key).slice(0, 6);
  const sortable = new Set([...formFields.filter(f => f.type !== 'relation').map(f => f.key), 'created_at']);

  useEffect(() => {
    const id = setTimeout(() => { setDebounced(search.trim()); setPage(0); }, 250);
    return () => clearTimeout(id);
  }, [search]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyFilters = useCallback((query: any) => {
    let q = query;
    const term = escapeIlike(debounced);
    if (term && searchable.length) q = q.or(searchable.map(c => `${c}.ilike.*${term}*`).join(','));
    if (statusFilter) q = q.eq('status', statusFilter);
    return q;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, statusFilter, searchable.join(',')]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const from = page * PAGE_SIZE;
    let query = supabase.from(table).select(relations || select || '*', { count: 'exact' });
    query = applyFilters(query).order(sort.key, { ascending: sort.asc }).range(from, from + PAGE_SIZE - 1);
    const { data, error, count } = await query;
    if (error) setLoadError(error.message);
    else {
      setRows((data || []) as unknown as T[]);
      setTotal(count ?? (data || []).length);
    }
    setLoading(false);
  }, [table, select, relations, page, sort, applyFilters]);

  useEffect(() => { load(); }, [load]);

  // Quick-create deep link (/app/contacts?new=1&company_id=…): opens the
  // form once, prefilled with any params that match a form field, then
  // cleans the URL so a refresh doesn't reopen it.
  const [searchParams, setSearchParams] = useSearchParams();
  const handledNewParam = useRef(false);
  useEffect(() => {
    if (handledNewParam.current || searchParams.get('new') !== '1') return;
    handledNewParam.current = true;
    const defaults: Record<string, unknown> = {};
    formFields.forEach(f => { const v = searchParams.get(f.key); if (v) defaults[f.key] = v; });
    openCreate(defaults);
    setSearchParams(new URLSearchParams(), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const atCap = maxRows != null && total >= maxRows;

  function openCreate(defaults?: Record<string, unknown>) {
    if (atCap) return;
    setEditing(null);
    setCreateDefaults(defaults);
    setModalOpen(true);
  }

  function openEdit(row: T) {
    setEditing(row);
    setModalOpen(true);
  }

  async function handleDelete(row: T) {
    if (!confirm(t('list.deleteConfirm', language))) return;
    const { error } = await supabase.from(table).delete().eq('id', row.id);
    if (error) { alert(error.message); return; }
    for (const ev of computeWebhookEvents(table, 'deleted', row as unknown as Record<string, unknown>)) {
      triggerWebhooks(ev, { id: row.id, table });
    }
    load();
  }

  // Exports every row matching the current search/filter (not just this page).
  async function exportCsv() {
    setExporting(true);
    try {
      const all: Record<string, unknown>[] = [];
      for (let from = 0; ; from += 1000) {
        const q = applyFilters(supabase.from(table).select(select || '*')).order(sort.key, { ascending: sort.asc }).range(from, from + 999);
        const { data, error } = await q;
        if (error) throw error;
        all.push(...((data || []) as unknown as Record<string, unknown>[]));
        if (!data || data.length < 1000) break;
      }
      const keys = ['id', ...formFields.filter(f => f.type !== 'relation').map(f => f.key), 'created_at'];
      const csv = Papa.unparse({
        fields: ['id', ...formFields.filter(f => f.type !== 'relation').map(f => f.label), 'created_at'],
        data: all.map(r => keys.map(k => csvCell(r[k]))),
      });
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${table}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(getErrorMessage(err, 'Export failed'));
    } finally {
      setExporting(false);
    }
  }

  function toggleSort(key: string) {
    if (!sortable.has(key)) return;
    setPage(0);
    setSort(prev => prev.key === key ? { key, asc: !prev.asc } : { key, asc: true });
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const fr = language === 'fr';
  const filtersActive = Boolean(debounced || statusFilter);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {headerExtra}
            <button onClick={exportCsv} disabled={exporting || total === 0} className="btn-secondary btn-sm" title={fr ? 'Exporter en CSV' : 'Export to CSV'}>
              {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} <span className="hidden sm:inline">{fr ? 'Exporter' : 'Export'}</span>
            </button>
            {importable && (
              <button onClick={() => setImportOpen(true)} className="btn-secondary btn-sm">
                <Upload size={15} /> <span className="hidden sm:inline">{t('common.import', language)}</span>
              </button>
            )}
            <button onClick={() => openCreate()} disabled={atCap} title={atCap ? maxRowsMessage : undefined} className="btn-primary btn-sm">
              <Plus size={16} /> {t('common.add', language)}
            </button>
          </div>
        }
      />

      {atCap && maxRowsMessage && (
        <p className="mb-4 text-xs text-warning-700 bg-warning-50 rounded-lg px-3 py-2">{maxRowsMessage}</p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input ps-9" type="search" aria-label={t('common.search', language)} placeholder={t('common.search', language)} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {statusField && (
          <select className="input w-auto min-w-[150px]" aria-label={statusField.label} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
            <option value="">{fr ? 'Tous les statuts' : 'All statuses'}</option>
            {statusField.options!.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        {!loading && (
          <p className="ms-auto text-xs text-ink-500 tabular">{total} {t('common.results', language)}</p>
        )}
      </div>

      {loading && rows.length === 0 ? (
        <Loading text={t('common.loading', language)} />
      ) : loadError ? (
        <div className="card p-6 text-sm text-error-700 flex items-start gap-2"><AlertCircle size={16} className="mt-0.5" />{loadError}</div>
      ) : rows.length === 0 ? (
        <div className="card">
          {filtersActive ? (
            <EmptyState icon={<Search size={24} />} title={fr ? 'Aucun résultat' : 'No results'} description={fr ? 'Aucune fiche ne correspond à cette recherche ou à ce filtre.' : 'No record matches this search or filter.'}
              action={<button onClick={() => { setSearch(''); setStatusFilter(''); }} className="btn-secondary btn-sm">{fr ? 'Effacer les filtres' : 'Clear filters'}</button>} />
          ) : (
            <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription}
              action={<button onClick={() => openCreate()} className="btn-primary btn-sm"><Plus size={16} /> {t('common.add', language)}</button>} />
          )}
        </div>
      ) : (
        <div className={`card overflow-hidden transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink-200/70 bg-ink-50/70">
                  {columns.map(col => {
                    const canSort = sortable.has(col.key);
                    const active = sort.key === col.key;
                    return (
                      <th key={col.key} scope="col" className={`th text-start ${col.className || ''}`} aria-sort={active ? (sort.asc ? 'ascending' : 'descending') : undefined}>
                        {canSort ? (
                          <button onClick={() => toggleSort(col.key)} className={`inline-flex items-center gap-1 hover:text-ink-800 ${active ? 'text-ink-800' : ''}`}>
                            {col.label}
                            {active && (sort.asc ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                          </button>
                        ) : col.label}
                      </th>
                    );
                  })}
                  <th scope="col" className="w-20 px-4 py-2.5"><span className="sr-only">{t('common.actions', language)}</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr
                    key={row.id}
                    className={`group border-b border-ink-100 last:border-0 table-row-hover ${rowLink ? 'cursor-pointer' : ''}`}
                    onClick={rowLink ? (e) => {
                      if ((e.target as HTMLElement).closest('button, a, input, select')) return;
                      navigate(rowLink(row));
                    } : undefined}
                  >
                    {columns.map((col, ci) => (
                      <td key={col.key} className={`px-4 py-3 text-sm text-ink-700 ${col.className || ''}`}>
                        {ci === 0 && rowLink ? (
                          <a href={rowLink(row)} onClick={e => { e.preventDefault(); navigate(rowLink(row)); }} className="hover:text-primary-700 hover:underline underline-offset-2">
                            {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                          </a>
                        ) : (col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—'))}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                        {rowActions?.(row, load)}
                        <button onClick={() => openEdit(row)} aria-label={t('common.edit', language)} title={t('common.edit', language)} className="btn-icon h-7 w-7">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(row)} aria-label={t('common.delete', language)} title={t('common.delete', language)} className="btn-icon h-7 w-7 hover:bg-error-50 hover:text-error-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-ink-100 px-4 py-2.5 text-sm text-ink-600">
              <span className="tabular">{page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} / {total}</span>
              <div className="flex items-center gap-1">
                <button className="btn-icon" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} aria-label={fr ? 'Page précédente' : 'Previous page'}><ChevronLeft size={16} className="rtl:rotate-180" /></button>
                <span className="px-2 tabular">{page + 1} / {pages}</span>
                <button className="btn-icon" disabled={page + 1 >= pages} onClick={() => setPage(p => p + 1)} aria-label={fr ? 'Page suivante' : 'Next page'}><ChevronRight size={16} className="rtl:rotate-180" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      <RecordFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => load()}
        table={table}
        title={title}
        fields={formFields}
        record={editing as unknown as Record<string, unknown> | null}
        defaults={createDefaults}
      />

      {importOpen && (
        <ImportModal
          table={table}
          fields={formFields.filter(f => f.type !== 'relation')}
          language={language}
          onClose={() => setImportOpen(false)}
          onDone={() => { setImportOpen(false); load(); }}
        />
      )}
    </div>
  );
}
