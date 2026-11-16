/* In-memory stand-in for the Supabase client, used only in demo mode.
 *
 * It implements the subset of supabase-js that Atlas actually calls:
 * from().select/insert/update/upsert/delete with eq/neq/gt/gte/lt/lte/in/is/
 * like/ilike/or/not/contains/match/filter, order/range/limit/single/
 * maybeSingle, { count: 'exact', head }, PostgREST-style embeds
 * ("*, company:companies(id,name)"), rpc(), auth, storage and functions.
 * Writes persist in sessionStorage for the tab's lifetime.
 */
import { buildSeed, DEMO_ORG_ID, DEMO_USER_ID, DEMO_EMAIL } from './seed';
import { DEMO_DB_KEY, exitDemo } from './mode';

type Row = Record<string, unknown>;
type DB = Record<string, Row[]>;
type Result = { data: unknown; error: { message: string; code?: string } | null; count: number | null; status: number };

const db: DB = load();
function load(): DB {
  try {
    const raw = sessionStorage.getItem(DEMO_DB_KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch { /* ignore */ }
  const fresh = buildSeed();
  return fresh;
}
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function persist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { sessionStorage.setItem(DEMO_DB_KEY, JSON.stringify(db)); } catch { /* quota: keep in memory */ }
  }, 150);
}
// contacts_v / leads_v (masked views in production) read the base tables here.
const baseTable = (t: string) => (t === 'contacts_v' || t === 'leads_v' ? t.slice(0, -2) : t);
const tableRows = (t: string) => (db[baseTable(t)] ||= []);

const uuid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`);
const singular = (t: string) => (t.endsWith('ies') ? `${t.slice(0, -3)}y` : t.endsWith('s') ? t.slice(0, -1) : t);

/* ───────────── select-string parsing & embeds ───────────── */

function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function project(table: string, row: Row, select: string): Row {
  const tokens = splitTop(select || '*');
  const out: Row = {};
  for (const tok of tokens) {
    if (tok === '*') { Object.assign(out, row); continue; }
    const m = tok.match(/^(?:(\w+):)?(\w+)(?:!\w+)?\((.*)\)$/s);
    if (!m) { const col = tok.split(':').pop()!.trim(); out[col] = row[col] ?? null; continue; }
    const alias = m[1] || m[2];
    const target = m[2];
    const inner = m[3];
    const candidates = [`${alias}_id`, `${singular(target)}_id`];
    const fkCol = candidates.find(c => c in row);
    if (fkCol) {
      const ref = tableRows(target).find(r => r.id === row[fkCol]);
      out[alias] = ref ? project(target, ref, inner) : null;
    } else {
      const childFk = `${singular(table)}_id`;
      out[alias] = tableRows(target).filter(r => r[childFk] === row.id).map(r => project(target, r, inner));
    }
  }
  return out;
}

/* ───────────── filters ───────────── */

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));
function likeToRegex(pattern: string, insensitive: boolean) {
  const esc = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/[%*]/g, '.*');
  return new RegExp(`^${esc}$`, insensitive ? 'is' : 's');
}
function cmp(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  const na = Number(a), nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && typeof a !== 'boolean' && str(a).trim() !== '' && str(b).trim() !== '') return na - nb;
  return str(a).localeCompare(str(b));
}
function parseValue(v: string): unknown {
  if (v === 'null') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}

type Pred = (r: Row) => boolean;
function opPred(col: string, op: string, value: unknown): Pred {
  switch (op) {
    case 'eq': return r => (typeof r[col] === 'boolean' || typeof value === 'boolean' ? r[col] === value : str(r[col]) === str(value));
    case 'neq': return r => str(r[col]) !== str(value);
    case 'gt': return r => r[col] !== null && r[col] !== undefined && cmp(r[col], value) > 0;
    case 'gte': return r => r[col] !== null && r[col] !== undefined && cmp(r[col], value) >= 0;
    case 'lt': return r => r[col] !== null && r[col] !== undefined && cmp(r[col], value) < 0;
    case 'lte': return r => r[col] !== null && r[col] !== undefined && cmp(r[col], value) <= 0;
    case 'like': return r => likeToRegex(str(value), false).test(str(r[col]));
    case 'ilike': return r => likeToRegex(str(value), true).test(str(r[col]));
    case 'is': return r => (value === null ? r[col] === null || r[col] === undefined : r[col] === value);
    case 'in': {
      const list = (Array.isArray(value) ? value : str(value).replace(/^\(|\)$/g, '').split(',')).map(str);
      return r => list.includes(str(r[col]));
    }
    case 'cs': case 'contains': {
      const needle = Array.isArray(value) ? value : [value];
      return r => Array.isArray(r[col]) && needle.every(n => (r[col] as unknown[]).map(str).includes(str(n)));
    }
    default: return () => true;
  }
}
function parseOr(expr: string): Pred {
  const preds = splitTop(expr).map(part => {
    const m = part.match(/^([\w.]+)\.(not\.)?(\w+)\.(.*)$/s);
    if (!m) return () => false;
    const p = opPred(m[1], m[3], m[3] === 'in' ? m[4] : parseValue(m[4]));
    return m[2] ? (r: Row) => !p(r) : p;
  });
  return r => preds.some(p => p(r));
}

/* ───────────── query builder ───────────── */

class Query implements PromiseLike<Result> {
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private selectStr = '*';
  private returning = false;
  private countMode: string | null = null;
  private head = false;
  private preds: Pred[] = [];
  private orders: { col: string; asc: boolean; nullsFirst?: boolean }[] = [];
  private from_: number | null = null;
  private to_: number | null = null;
  private limitN: number | null = null;
  private singleMode: 'single' | 'maybe' | null = null;
  private payload: Row | Row[] | null = null;
  private onConflict = 'id';

  constructor(private table: string) { this.table = baseTable(table); }

  select(cols = '*', opts?: { count?: string; head?: boolean }) {
    this.selectStr = cols || '*';
    if (this.op === 'select') {
      this.countMode = opts?.count || null;
      this.head = Boolean(opts?.head);
    } else this.returning = true;
    return this;
  }
  insert(p: Row | Row[]) { this.op = 'insert'; this.payload = p; return this; }
  update(p: Row) { this.op = 'update'; this.payload = p; return this; }
  upsert(p: Row | Row[], o?: { onConflict?: string }) { this.op = 'upsert'; this.payload = p; this.onConflict = o?.onConflict || 'id'; return this; }
  delete() { this.op = 'delete'; return this; }

  eq(c: string, v: unknown) { this.preds.push(opPred(c, 'eq', v)); return this; }
  neq(c: string, v: unknown) { this.preds.push(opPred(c, 'neq', v)); return this; }
  gt(c: string, v: unknown) { this.preds.push(opPred(c, 'gt', v)); return this; }
  gte(c: string, v: unknown) { this.preds.push(opPred(c, 'gte', v)); return this; }
  lt(c: string, v: unknown) { this.preds.push(opPred(c, 'lt', v)); return this; }
  lte(c: string, v: unknown) { this.preds.push(opPred(c, 'lte', v)); return this; }
  like(c: string, v: string) { this.preds.push(opPred(c, 'like', v)); return this; }
  ilike(c: string, v: string) { this.preds.push(opPred(c, 'ilike', v)); return this; }
  is(c: string, v: unknown) { this.preds.push(opPred(c, 'is', v)); return this; }
  in(c: string, v: unknown[]) { this.preds.push(opPred(c, 'in', v)); return this; }
  contains(c: string, v: unknown) { this.preds.push(opPred(c, 'contains', v)); return this; }
  match(o: Row) { Object.entries(o).forEach(([c, v]) => this.preds.push(opPred(c, 'eq', v))); return this; }
  filter(c: string, op: string, v: unknown) { this.preds.push(opPred(c, op, v)); return this; }
  not(c: string, op: string, v: unknown) { const p = opPred(c, op, v); this.preds.push(r => !p(r)); return this; }
  or(expr: string) { this.preds.push(parseOr(expr)); return this; }
  order(col: string, o?: { ascending?: boolean; nullsFirst?: boolean }) { this.orders.push({ col, asc: o?.ascending !== false, nullsFirst: o?.nullsFirst }); return this; }
  range(a: number, b: number) { this.from_ = a; this.to_ = b; return this; }
  limit(n: number) { this.limitN = n; return this; }
  single() { this.singleMode = 'single'; return this; }
  maybeSingle() { this.singleMode = 'maybe'; return this; }
  abortSignal() { return this; }

  then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, err?: ((e: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    return Promise.resolve().then(() => this.exec()).then(ok, err);
  }

  private matches(r: Row) { return this.preds.every(p => p(r)); }

  private finish(rows: Row[], count: number | null): Result {
    const projected = rows.map(r => project(this.table, r, this.selectStr));
    if (this.singleMode) {
      if (projected.length === 1) return { data: projected[0], error: null, count, status: 200 };
      if (this.singleMode === 'maybe' && projected.length === 0) return { data: null, error: null, count, status: 200 };
      return { data: null, error: { message: projected.length ? 'Multiple rows returned' : 'No rows found', code: 'PGRST116' }, count, status: 406 };
    }
    return { data: projected, error: null, count, status: 200 };
  }

  private exec(): Result {
    const rows = tableRows(this.table);
    const now = new Date().toISOString();

    if (this.op === 'select') {
      let list = rows.filter(r => this.matches(r));
      for (const o of [...this.orders].reverse()) {
        list = [...list].sort((a, b) => {
          const av = a[o.col], bv = b[o.col];
          const an = av === null || av === undefined, bn = bv === null || bv === undefined;
          // Postgres default: ASC → nulls last, DESC → nulls first.
          const nullsFirst = o.nullsFirst ?? !o.asc;
          if (an && bn) return 0;
          if (an) return nullsFirst ? -1 : 1;
          if (bn) return nullsFirst ? 1 : -1;
          return o.asc ? cmp(av, bv) : cmp(bv, av);
        });
      }
      const count = this.countMode ? list.length : null;
      if (this.head) return { data: null, error: null, count, status: 200 };
      if (this.from_ !== null && this.to_ !== null) list = list.slice(this.from_, this.to_ + 1);
      if (this.limitN !== null) list = list.slice(0, this.limitN);
      return this.finish(list, count);
    }

    if (this.op === 'insert' || this.op === 'upsert') {
      const input = Array.isArray(this.payload) ? this.payload : [this.payload || {}];
      const written: Row[] = [];
      for (const p of input) {
        if (this.op === 'upsert') {
          const keys = this.onConflict.split(',').map(s => s.trim());
          const existing = rows.find(r => keys.every(k => p[k] !== undefined && str(r[k]) === str(p[k])));
          if (existing) { Object.assign(existing, p, { updated_at: now }); written.push(existing); continue; }
        }
        const row: Row = { id: uuid(), org_id: DEMO_ORG_ID, created_at: now, updated_at: now, ...defaultsFor(this.table), ...p };
        rows.unshift(row);
        written.push(row);
      }
      persist();
      return this.returning || this.singleMode ? this.finish(written, null) : { data: null, error: null, count: null, status: 201 };
    }

    if (this.op === 'update') {
      const hit = rows.filter(r => this.matches(r));
      hit.forEach(r => Object.assign(r, this.payload, { updated_at: now }));
      persist();
      return this.returning || this.singleMode ? this.finish(hit, null) : { data: null, error: null, count: null, status: 204 };
    }

    // delete
    const keep = rows.filter(r => !this.matches(r));
    const removed = rows.filter(r => this.matches(r));
    db[this.table] = keep;
    persist();
    return this.returning ? this.finish(removed, null) : { data: null, error: null, count: null, status: 204 };
  }
}

function defaultsFor(table: string): Row {
  switch (table) {
    case 'deals': return { status: 'open', probability: 10, currency: 'XAF', value: 0 };
    case 'contacts': return { status: 'active', lead_score: 0 };
    case 'leads': return { status: 'new', temperature: 'warm', potential_value: 0, lead_score: 0 };
    case 'tasks': return { status: 'pending', priority: 'medium' };
    case 'activities': return { status: 'pending', performed_by: 'user' };
    case 'invoices': return { status: 'draft', payment_status: 'unpaid', subtotal: 0, total: 0, amount_paid: 0, amount_due: 0, currency: 'XAF' };
    case 'quotes': return { status: 'draft', subtotal: 0, total: 0, currency: 'XAF' };
    case 'notifications': return { read: false };
    case 'workflows': return { enabled: true, run_count: 0, actions: [] };
    default: return {};
  }
}

/* ───────────── auth, rpc, storage, functions ───────────── */

const DEMO_SESSION = {
  access_token: 'demo-access-token',
  refresh_token: 'demo',
  token_type: 'bearer',
  expires_in: 3600 * 24,
  expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
  user: { id: DEMO_USER_ID, email: DEMO_EMAIL, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
};

const DEMO_ONLY = { message: 'Indisponible en mode démo — créez votre compte gratuit pour activer cette fonction.' };

function rpc(name: string): Promise<{ data: unknown; error: null }> {
  const trialEnd = new Date(Date.now() + 14 * 86400000).toISOString();
  const answers: Record<string, unknown> = {
    is_super_admin: false,          // Super Admin never exists in the demo
    is_platform_exempt: false,
    link_super_admin: null,
    rbac_check: true,
    my_workspace: [{ org_id: null, role: 'owner', pii: true, see_all: true }],
    org_subscription_status: [{ status: 'trialing', plan: 'pro', trial_ends_at: trialEnd, current_period_end: null }],
  };
  return Promise.resolve({ data: name in answers ? answers[name] : null, error: null });
}

const auth = {
  getSession: async () => ({ data: { session: DEMO_SESSION }, error: null }),
  getUser: async () => ({ data: { user: DEMO_SESSION.user }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe() { /* noop */ } } } }),
  signOut: async () => { exitDemo('/'); return { error: null }; },
  signInWithPassword: async () => ({ data: { session: null, user: null }, error: DEMO_ONLY }),
  signUp: async () => ({ data: { session: null, user: null }, error: DEMO_ONLY }),
  signInWithOAuth: async () => ({ data: null, error: DEMO_ONLY }),
  resetPasswordForEmail: async () => ({ data: null, error: DEMO_ONLY }),
  updateUser: async () => ({ data: null, error: DEMO_ONLY }),
  refreshSession: async () => ({ data: { session: DEMO_SESSION }, error: null }),
  mfa: {
    listFactors: async () => ({ data: { all: [], totp: [], phone: [] }, error: null }),
    enroll: async () => ({ data: null, error: DEMO_ONLY }),
    challenge: async () => ({ data: null, error: DEMO_ONLY }),
    verify: async () => ({ data: null, error: DEMO_ONLY }),
    unenroll: async () => ({ data: null, error: DEMO_ONLY }),
    getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null }),
  },
  admin: { inviteUserByEmail: async () => ({ data: null, error: DEMO_ONLY }) },
};

const storage = {
  from: () => ({
    upload: async () => ({ data: null, error: DEMO_ONLY }),
    getPublicUrl: () => ({ data: { publicUrl: '' } }),
    remove: async () => ({ data: null, error: null }),
    list: async () => ({ data: [], error: null }),
  }),
};

/**
 * Edge functions are reached with fetch() across the app. In the demo they
 * answer locally: Ask Atlas falls back to its built-in engine (which reads
 * the demo data), and every external action explains it needs an account.
 */
function patchFetch() {
  if (typeof window === 'undefined' || (window as unknown as { __atlasDemoFetch?: boolean }).__atlasDemoFetch) return;
  (window as unknown as { __atlasDemoFetch?: boolean }).__atlasDemoFetch = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const fn = url.match(/\/functions\/v1\/([\w-]+)/)?.[1];
    if (!fn && !/supabase\.co|placeholder\.supabase/.test(url)) return original(input, init);
    if (fn === 'ai-assistant') throw new TypeError('demo: use built-in assistant');
    const body = (() => { try { return JSON.parse(String(init?.body || '{}')); } catch { return {}; } })();
    let payload: unknown = { ok: false, msg: DEMO_ONLY.message };
    if (fn === 'billing-initialize' && body.check) payload = { ok: true, providers: { korapay: false, cinetpay: false } };
    if (fn === 'payunit-initialize' && body.check) payload = { ok: false, configured: false };
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
}

export function createDemoClient() {
  patchFetch();
  return {
    from: (table: string) => new Query(table),
    rpc: (name: string) => rpc(name),
    auth,
    storage,
    functions: { invoke: async () => ({ data: null, error: DEMO_ONLY }) },
    channel: () => ({ on() { return this; }, subscribe() { return this; }, unsubscribe() { /* noop */ } }),
    removeChannel: () => undefined,
  };
}
