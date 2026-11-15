import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Settings2, KanbanSquare, Trash2, ArrowUp, ArrowDown, Loader2, Trophy, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { Loading } from '@/components/Loading';
import { Modal } from '@/components/Modal';
import { RecordFormModal } from '@/components/ListPage';
import { formatAmount } from '@/lib/i18n-countries';
import { dealFields } from '@/lib/entityFields';
import { triggerWebhooks } from '@/lib/webhooks';
import { getErrorMessage } from '@/lib/errors';
import { DealsViewSwitch } from '@/pages/CRMPages';

interface Pipeline { id: string; name: string; sort_order: number | null }
interface Stage { id: string; pipeline_id: string; name: string; probability: number | null; sort_order: number | null; color: string | null }
interface BoardDeal {
  id: string; name: string; value: number | null; currency: string | null; status: string; stage_id: string | null;
  probability: number | null; closing_date: string | null;
  company?: { name: string } | null; contact?: { first_name: string; last_name: string } | null;
}

const DEFAULT_STAGES = (fr: boolean) => [
  { name: fr ? 'Prospection' : 'Prospecting', probability: 10 },
  { name: fr ? 'Qualification' : 'Qualification', probability: 25 },
  { name: fr ? 'Proposition' : 'Proposal', probability: 50 },
  { name: fr ? 'Négociation' : 'Negotiation', probability: 75 },
  { name: fr ? 'Signature' : 'Closing', probability: 90 },
];

const STAGE_ACCENTS = ['bg-ink-300', 'bg-primary-300', 'bg-primary-500', 'bg-accent-400', 'bg-success-500', 'bg-secondary-400', 'bg-warning-400'];

/**
 * Pipeline board: open deals as cards in pipeline_stages columns. Dragging a
 * card (or using its move buttons on touch screens) updates deals.stage_id
 * and the probability to the stage's own. Won/lost drop zones close a deal.
 */
export function PipelinesPage() {
  const { language, organization } = useAuth();
  const fr = language === 'fr';
  const orgCurrency = organization?.currency || 'USD';
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineId, setPipelineId] = useState<string>(() => { try { return localStorage.getItem('atlas-pipeline') || ''; } catch { return ''; } });
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<BoardDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [newDealStage, setNewDealStage] = useState<string | null>(null);
  const [creatingDefault, setCreatingDefault] = useState(false);
  const [error, setError] = useState('');

  const loadPipelines = useCallback(async () => {
    const { data } = await supabase.from('pipelines').select('id,name,sort_order').order('sort_order', { ascending: true });
    const list = (data || []) as Pipeline[];
    setPipelines(list);
    setPipelineId(prev => (list.some(p => p.id === prev) ? prev : list[0]?.id || ''));
    if (!list.length) setLoading(false);
  }, []);

  const loadBoard = useCallback(async () => {
    if (!pipelineId) return;
    setLoading(true);
    const { data: st } = await supabase.from('pipeline_stages').select('*').eq('pipeline_id', pipelineId).order('sort_order', { ascending: true });
    const stageList = (st || []) as Stage[];
    setStages(stageList);
    const ids = stageList.map(s => s.id);
    if (ids.length) {
      // Open deals with no stage yet are shown in a leading column of the
      // first pipeline, so nothing created from the list view goes missing.
      const isFirst = pipelines[0]?.id === pipelineId;
      const { data: d } = await supabase.from('deals')
        .select('id,name,value,currency,status,stage_id,probability,closing_date,company:companies(name),contact:contacts(first_name,last_name)')
        .or(isFirst ? `stage_id.in.(${ids.join(',')}),stage_id.is.null` : `stage_id.in.(${ids.join(',')})`)
        .eq('status', 'open').order('value', { ascending: false }).limit(500);
      setDeals((d || []) as unknown as BoardDeal[]);
    } else setDeals([]);
    setLoading(false);
  }, [pipelineId, pipelines]);

  useEffect(() => { loadPipelines(); }, [loadPipelines]);
  useEffect(() => {
    try { if (pipelineId) localStorage.setItem('atlas-pipeline', pipelineId); } catch { /* ignore */ }
    loadBoard();
  }, [pipelineId, loadBoard]);

  async function createDefaultPipeline() {
    setCreatingDefault(true);
    setError('');
    try {
      const { data: p, error: pErr } = await supabase.from('pipelines').insert({ name: fr ? 'Ventes' : 'Sales', sort_order: 0 }).select('id').single();
      if (pErr) throw pErr;
      const { error: sErr } = await supabase.from('pipeline_stages').insert(
        DEFAULT_STAGES(fr).map((s, i) => ({ pipeline_id: p.id, name: s.name, probability: s.probability, sort_order: i })),
      );
      if (sErr) throw sErr;
      setPipelineId(p.id);
      await loadPipelines();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setCreatingDefault(false);
    }
  }

  async function moveDeal(dealId: string, target: string) {
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;
    if (target === 'won' || target === 'lost') {
      setDeals(prev => prev.filter(d => d.id !== dealId));
      const { error } = await supabase.from('deals').update({ status: target, probability: target === 'won' ? 100 : 0 }).eq('id', dealId);
      if (error) { setError(error.message); loadBoard(); return; }
      triggerWebhooks(target === 'won' ? 'deal.won' : 'deal.lost', { id: dealId, name: deal.name, value: deal.value });
      return;
    }
    if (deal.stage_id === target) return;
    const stage = stages.find(s => s.id === target);
    const probability = stage?.probability ?? deal.probability;
    setDeals(prev => prev.map(d => (d.id === dealId ? { ...d, stage_id: target, probability } : d)));
    const { error } = await supabase.from('deals').update({ stage_id: target, probability }).eq('id', dealId);
    if (error) { setError(error.message); loadBoard(); return; }
    triggerWebhooks('deal.updated', { id: dealId, stage_id: target, stage: stage?.name });
  }

  const byStage = useMemo(() => {
    const map: Record<string, BoardDeal[]> = { __none: [] };
    stages.forEach(s => { map[s.id] = []; });
    deals.forEach(d => { if (d.stage_id && map[d.stage_id]) map[d.stage_id].push(d); else if (!d.stage_id) map.__none.push(d); });
    return map;
  }, [stages, deals]);
  const columns: Stage[] = useMemo(() => (
    byStage.__none.length
      ? [{ id: '__none', pipeline_id: pipelineId, name: fr ? 'Sans étape' : 'No stage', probability: null, sort_order: -1, color: null }, ...stages]
      : stages
  ), [byStage, stages, pipelineId, fr]);

  const money = (n: number, c?: string | null) => formatAmount(n, c || orgCurrency, language);
  const sumIn = (list: BoardDeal[]) => list.filter(d => !d.currency || d.currency === orgCurrency).reduce((s, d) => s + (Number(d.value) || 0), 0);
  const totalOpen = sumIn(deals);
  const weighted = deals.filter(d => !d.currency || d.currency === orgCurrency).reduce((s, d) => s + (Number(d.value) || 0) * ((d.probability ?? 0) / 100), 0);

  const header = (
    <PageHeader
      title={fr ? 'Pipeline des ventes' : 'Sales pipeline'}
      subtitle={pipelines.length ? (fr ? `${deals.length} affaires ouvertes · ${money(totalOpen)} · pondéré ${money(weighted)}` : `${deals.length} open deals · ${money(totalOpen)} · weighted ${money(weighted)}`) : undefined}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <DealsViewSwitch active="board" />
          {pipelines.length > 1 && (
            <select className="input w-auto" aria-label="Pipeline" value={pipelineId} onChange={e => setPipelineId(e.target.value)}>
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          {pipelines.length > 0 && (
            <button onClick={() => setManageOpen(true)} className="btn-secondary btn-sm"><Settings2 size={15} /> {fr ? 'Étapes' : 'Stages'}</button>
          )}
          {stages.length > 0 && (
            <button onClick={() => setNewDealStage(stages[0].id)} className="btn-primary btn-sm"><Plus size={16} /> {fr ? 'Affaire' : 'Deal'}</button>
          )}
        </div>
      }
    />
  );

  if (loading && !pipelines.length && !stages.length) return <div>{header}<Loading /></div>;

  if (!pipelines.length) {
    return (
      <div className="animate-fade-in">
        {header}
        <div className="card">
          <EmptyState
            icon={<KanbanSquare size={26} />}
            title={fr ? 'Aucun pipeline pour l’instant' : 'No pipeline yet'}
            description={fr ? 'Créez un pipeline avec les étapes classiques (prospection → signature). Vous pourrez les renommer ensuite.' : 'Create a pipeline with standard stages (prospecting → closing). You can rename them afterwards.'}
            action={<button onClick={createDefaultPipeline} disabled={creatingDefault} className="btn-primary btn-sm">{creatingDefault && <Loader2 size={14} className="animate-spin" />}{fr ? 'Créer mon pipeline' : 'Create my pipeline'}</button>}
          />
          {error && <p className="pb-6 text-center text-sm text-error-600">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {header}
      {error && <div role="alert" className="mb-4 rounded-lg bg-error-50 border border-error-200 px-4 py-2.5 text-sm text-error-700">{error}</div>}

      {stages.length === 0 ? (
        <div className="card"><EmptyState icon={<KanbanSquare size={26} />} title={fr ? 'Ce pipeline n’a pas d’étapes' : 'This pipeline has no stages'} description={fr ? 'Ajoutez des étapes pour commencer à y placer vos affaires.' : 'Add stages to start placing deals on it.'} action={<button onClick={() => setManageOpen(true)} className="btn-primary btn-sm">{fr ? 'Ajouter des étapes' : 'Add stages'}</button>} /></div>
      ) : (
        <>
          <div className="-mx-4 sm:-mx-6 lg:-mx-8 overflow-x-auto scrollbar-thin pb-3">
            <div className="flex gap-3 px-4 sm:px-6 lg:px-8 min-w-max">
              {columns.map((stage, si) => {
                const list = byStage[stage.id] || [];
                const isNone = stage.id === '__none';
                return (
                  <section
                    key={stage.id}
                    onDragOver={e => { e.preventDefault(); setOverStage(stage.id); }}
                    onDragLeave={() => setOverStage(s => (s === stage.id ? null : s))}
                    onDrop={e => { e.preventDefault(); setOverStage(null); if (dragId && !isNone) moveDeal(dragId, stage.id); setDragId(null); }}
                    className={`flex w-[272px] flex-none flex-col rounded-xl border transition-colors ${overStage === stage.id ? 'border-primary-300 bg-primary-50/60' : 'border-ink-200/70 bg-ink-100/50'}`}
                    aria-label={stage.name}
                  >
                    <header className="px-3 pt-3 pb-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${STAGE_ACCENTS[si % STAGE_ACCENTS.length]}`} />
                        <h2 className="flex-1 truncate text-sm font-bold text-ink-800">{stage.name}</h2>
                        <span className="rounded-md bg-white px-1.5 text-xs font-semibold text-ink-500 ring-1 ring-ink-200 tabular">{list.length}</span>
                      </div>
                      <p className="mt-1 text-xs text-ink-500 tabular">{money(sumIn(list))}{stage.probability != null ? ` · ${stage.probability}%` : ''}</p>
                    </header>
                    <div className="flex-1 space-y-2 px-2 pb-2 min-h-[120px]">
                      {list.map(d => (
                        <article
                          key={d.id}
                          draggable
                          onDragStart={e => { setDragId(d.id); e.dataTransfer.effectAllowed = 'move'; }}
                          onDragEnd={() => { setDragId(null); setOverStage(null); }}
                          className={`group rounded-lg bg-white p-3 shadow-card ring-1 ring-ink-200/70 cursor-grab active:cursor-grabbing hover:ring-primary-300 transition-shadow ${dragId === d.id ? 'opacity-50' : ''}`}
                        >
                          <Link to={`/app/deals/${d.id}`} className="block text-sm font-semibold text-ink-900 hover:text-primary-700 leading-snug">{d.name}</Link>
                          <p className="mt-0.5 truncate text-xs text-ink-500">{d.company?.name || (d.contact ? `${d.contact.first_name} ${d.contact.last_name}` : '—')}</p>
                          <div className="mt-2.5 flex items-center justify-between">
                            <span className="text-sm font-bold text-ink-900 tabular">{money(Number(d.value) || 0, d.currency)}</span>
                            {d.closing_date && <span className={`text-xs tabular ${new Date(d.closing_date) < new Date() ? 'font-semibold text-error-600' : 'text-ink-400'}`}>{new Date(d.closing_date).toLocaleDateString(language, { day: 'numeric', month: 'short' })}</span>}
                          </div>
                          {/* Keyboard / touch alternative to drag-and-drop */}
                          <div className="mt-2 flex gap-1 border-t border-ink-100 pt-2 lg:hidden lg:group-hover:flex group-focus-within:flex">
                            <button className="btn-icon h-6 w-6" disabled={si === 0 || isNone || columns[si - 1].id === '__none'} onClick={() => moveDeal(d.id, columns[si - 1].id)} aria-label={fr ? 'Étape précédente' : 'Previous stage'}><ArrowUp size={13} className="-rotate-90 rtl:rotate-90" /></button>
                            <button className="btn-icon h-6 w-6" disabled={si === columns.length - 1} onClick={() => moveDeal(d.id, columns[si + 1].id)} aria-label={fr ? 'Étape suivante' : 'Next stage'}><ArrowDown size={13} className="-rotate-90 rtl:rotate-90" /></button>
                            <span className="flex-1" />
                            <button className="btn-icon h-6 w-6 hover:bg-success-50 hover:text-success-600" onClick={() => moveDeal(d.id, 'won')} aria-label={fr ? 'Gagnée' : 'Won'} title={fr ? 'Gagnée' : 'Won'}><Trophy size={13} /></button>
                            <button className="btn-icon h-6 w-6 hover:bg-error-50 hover:text-error-600" onClick={() => moveDeal(d.id, 'lost')} aria-label={fr ? 'Perdue' : 'Lost'} title={fr ? 'Perdue' : 'Lost'}><XCircle size={13} /></button>
                          </div>
                        </article>
                      ))}
                      {!isNone && <button onClick={() => setNewDealStage(stage.id)} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-ink-300 py-2 text-xs font-semibold text-ink-500 hover:border-primary-300 hover:bg-white hover:text-primary-700">
                        <Plus size={13} /> {fr ? 'Ajouter' : 'Add'}
                      </button>}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          {/* Won / lost drop zones appear while dragging */}
          <div className={`grid grid-cols-2 gap-3 transition-opacity ${dragId ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
            {(['won', 'lost'] as const).map(z => (
              <div
                key={z}
                onDragOver={e => { e.preventDefault(); setOverStage(z); }}
                onDragLeave={() => setOverStage(null)}
                onDrop={e => { e.preventDefault(); setOverStage(null); if (dragId) moveDeal(dragId, z); setDragId(null); }}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-5 text-sm font-semibold ${z === 'won' ? 'border-success-300 text-success-700' : 'border-error-300 text-error-700'} ${overStage === z ? (z === 'won' ? 'bg-success-50' : 'bg-error-50') : 'bg-white'}`}
              >
                {z === 'won' ? <Trophy size={16} /> : <XCircle size={16} />}
                {z === 'won' ? (fr ? 'Déposer ici : gagnée' : 'Drop here: won') : (fr ? 'Déposer ici : perdue' : 'Drop here: lost')}
              </div>
            ))}
          </div>
        </>
      )}

      <RecordFormModal
        open={newDealStage !== null}
        onClose={() => setNewDealStage(null)}
        onSaved={() => loadBoard()}
        table="deals"
        title={fr ? 'Nouvelle affaire' : 'New deal'}
        fields={dealFields(language, orgCurrency)}
        defaults={newDealStage ? { stage_id: newDealStage, probability: stages.find(s => s.id === newDealStage)?.probability ?? 10 } : undefined}
      />

      {manageOpen && pipelineId && (
        <ManageStagesModal
          pipeline={pipelines.find(p => p.id === pipelineId)!}
          stages={stages}
          onClose={() => setManageOpen(false)}
          onChanged={() => { loadPipelines(); loadBoard(); }}
          onPipelineCreated={(id) => setPipelineId(id)}
        />
      )}
    </div>
  );
}

function ManageStagesModal({ pipeline, stages, onClose, onChanged, onPipelineCreated }: {
  pipeline: Pipeline; stages: Stage[]; onClose: () => void; onChanged: () => void; onPipelineCreated: (id: string) => void;
}) {
  const { language } = useAuth();
  const fr = language === 'fr';
  const [rows, setRows] = useState(stages.map(s => ({ ...s })));
  const [name, setName] = useState(pipeline.name);
  const [newStage, setNewStage] = useState('');
  const [newPipeline, setNewPipeline] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      if (name.trim() && name.trim() !== pipeline.name) {
        const { error } = await supabase.from('pipelines').update({ name: name.trim() }).eq('id', pipeline.id);
        if (error) throw error;
      }
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const { error } = await supabase.from('pipeline_stages').update({ name: r.name, probability: r.probability, sort_order: i }).eq('id', r.id);
        if (error) throw error;
      }
      if (newStage.trim()) {
        const { error } = await supabase.from('pipeline_stages').insert({ pipeline_id: pipeline.id, name: newStage.trim(), probability: 50, sort_order: rows.length });
        if (error) throw error;
      }
      if (newPipeline.trim()) {
        const { data, error } = await supabase.from('pipelines').insert({ name: newPipeline.trim(), sort_order: 99 }).select('id').single();
        if (error) throw error;
        const { error: sErr } = await supabase.from('pipeline_stages').insert(DEFAULT_STAGES(fr).map((s, i) => ({ pipeline_id: data.id, name: s.name, probability: s.probability, sort_order: i })));
        if (sErr) throw sErr;
        onPipelineCreated(data.id);
      }
      onChanged();
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(stage: Stage) {
    if (!confirm(fr ? `Supprimer l’étape « ${stage.name} » ? Les affaires de cette étape resteront dans la liste des affaires, sans étape.` : `Delete stage "${stage.name}"? Its deals stay in the deals list without a stage.`)) return;
    const { error: uErr } = await supabase.from('deals').update({ stage_id: null }).eq('stage_id', stage.id);
    if (uErr) { setError(uErr.message); return; }
    const { error } = await supabase.from('pipeline_stages').delete().eq('id', stage.id);
    if (error) { setError(error.message); return; }
    setRows(prev => prev.filter(r => r.id !== stage.id));
    onChanged();
  }

  return (
    <Modal open onClose={onClose} title={fr ? 'Étapes du pipeline' : 'Pipeline stages'} size="lg">
      {error && <div role="alert" className="mb-4 rounded-lg bg-error-50 border border-error-200 px-4 py-2.5 text-sm text-error-700">{error}</div>}
      <label className="label" htmlFor="pl-name">{fr ? 'Nom du pipeline' : 'Pipeline name'}</label>
      <input id="pl-name" className="input mb-5" value={name} onChange={e => setName(e.target.value)} />

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_96px_auto] gap-2 px-1 text-xs font-semibold text-ink-500">
          <span>{fr ? 'Étape' : 'Stage'}</span><span>{fr ? 'Probabilité %' : 'Probability %'}</span><span className="w-[100px]" />
        </div>
        {rows.map((r, i) => (
          <div key={r.id} className="grid grid-cols-[1fr_96px_auto] items-center gap-2">
            <input className="input" value={r.name} aria-label={fr ? 'Nom de l’étape' : 'Stage name'} onChange={e => setRows(prev => prev.map(x => (x.id === r.id ? { ...x, name: e.target.value } : x)))} />
            <input className="input" type="number" min={0} max={100} value={r.probability ?? 0} aria-label={fr ? 'Probabilité' : 'Probability'} onChange={e => setRows(prev => prev.map(x => (x.id === r.id ? { ...x, probability: Number(e.target.value) } : x)))} />
            <div className="flex w-[100px] justify-end gap-1">
              <button className="btn-icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label={fr ? 'Monter' : 'Move up'}><ArrowUp size={14} /></button>
              <button className="btn-icon" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={fr ? 'Descendre' : 'Move down'}><ArrowDown size={14} /></button>
              <button className="btn-icon hover:bg-error-50 hover:text-error-600" onClick={() => remove(r)} aria-label={fr ? 'Supprimer' : 'Delete'}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        <input className="input" placeholder={fr ? '+ Nouvelle étape (optionnel)' : '+ New stage (optional)'} value={newStage} onChange={e => setNewStage(e.target.value)} />
      </div>

      <div className="mt-6 rounded-lg bg-ink-50 p-3">
        <label className="label" htmlFor="pl-new">{fr ? 'Créer un autre pipeline (optionnel)' : 'Create another pipeline (optional)'}</label>
        <input id="pl-new" className="input" placeholder={fr ? 'ex : Partenariats' : 'e.g. Partnerships'} value={newPipeline} onChange={e => setNewPipeline(e.target.value)} />
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-ink-100">
        <button onClick={onClose} className="btn-secondary btn-sm">{fr ? 'Annuler' : 'Cancel'}</button>
        <button onClick={save} disabled={busy} className="btn-primary btn-sm">{busy && <Loader2 size={14} className="animate-spin" />}{fr ? 'Enregistrer' : 'Save'}</button>
      </div>
    </Modal>
  );
}
