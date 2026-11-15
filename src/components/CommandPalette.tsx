import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft, Sparkles, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/i18n';
import { NAV_SECTIONS, QUICK_CREATE, SUPER_ADMIN_ITEMS, normalize, type NavItem } from '@/lib/navigation';

interface Entry {
  id: string;
  label: string;
  group: string;
  to: string;
  icon: NavItem['icon'];
  haystack: string;
}

/**
 * ⌘K / Ctrl+K palette: jump to any page, start a record, or hand the
 * query to Ask Atlas. Built from src/lib/navigation.ts so it always lists
 * exactly what the sidebar does.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { language, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const entries = useMemo<Entry[]>(() => {
    const pages = t('shell.pages', language);
    const out: Entry[] = [];
    for (const section of NAV_SECTIONS) {
      const sectionLabel = section.titleKey ? t(section.titleKey, language) : pages;
      for (const item of section.items) {
        const label = t(item.labelKey, language);
        out.push({
          id: item.to, label, group: sectionLabel, to: item.to, icon: item.icon,
          haystack: normalize(`${label} ${sectionLabel} ${t(item.labelKey, 'en')} ${item.keywords || ''}`),
        });
      }
    }
    const create = t('shell.create', language);
    for (const item of QUICK_CREATE) {
      const label = t(item.labelKey, language);
      out.push({
        id: item.to, label, group: create, to: item.to, icon: item.icon,
        haystack: normalize(`${label} ${create} ${t(item.labelKey, 'en')} ${item.keywords || ''}`),
      });
    }
    if (isSuperAdmin) {
      const platform = t('shell.platform', language);
      for (const item of SUPER_ADMIN_ITEMS) {
        const label = t(item.labelKey, language);
        out.push({ id: item.to, label, group: platform, to: item.to, icon: item.icon, haystack: normalize(`${label} ${platform} super admin`) });
      }
    }
    return out;
  }, [language, isSuperAdmin]);

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) {
      const home = t('shell.pages', language);
      const crm = t('nav.crm', language);
      return entries.filter(e => e.group === home || e.group === crm || e.to.includes('?new=')).slice(0, 16);
    }
    const terms = q.split(/\s+/);
    return entries
      .map(e => {
        if (!terms.every(term => e.haystack.includes(term))) return null;
        const lbl = normalize(e.label);
        const score = lbl.startsWith(q) ? 0 : lbl.includes(q) ? 1 : 2;
        return { e, score };
      })
      .filter((x): x is { e: Entry; score: number } => x !== null)
      .sort((a, b) => a.score - b.score)
      .map(x => x.e)
      .slice(0, 20);
  }, [query, entries, language]);

  // The last row always offers to ask Atlas the typed question.
  const askRow = query.trim().length > 2;
  const total = results.length + (askRow ? 1 : 0);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function go(index: number) {
    if (index < results.length) {
      navigate(results[index].to);
    } else if (askRow) {
      navigate(`/app/ask-atlas?q=${encodeURIComponent(query.trim())}`);
    }
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => (total ? (a + 1) % total : 0)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => (total ? (a - 1 + total) % total : 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (total) go(active); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  }

  if (!open) return null;

  let lastGroup = '';
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-3 pt-[12vh] animate-fade-in" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label={t('shell.jumpTo', language)} className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-pop ring-1 ring-ink-200 animate-scale-in">
        <div className="flex items-center gap-3 border-b border-ink-100 px-4">
          <Search size={18} className="flex-none text-ink-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('shell.jumpTo', language)}
            className="h-14 w-full bg-transparent text-[15px] text-ink-900 placeholder-ink-400 focus:outline-none"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={total ? `cmdk-${active}` : undefined}
          />
          <kbd className="kbd">Esc</kbd>
        </div>

        <ul id="cmdk-list" ref={listRef} role="listbox" className="max-h-[52vh] overflow-y-auto scrollbar-thin p-2">
          {results.length === 0 && !askRow && (
            <li className="px-3 py-10 text-center text-sm text-ink-500">{t('shell.noResults', language)}</li>
          )}
          {results.map((r, i) => {
            const header = r.group !== lastGroup ? r.group : null;
            lastGroup = r.group;
            const Icon = r.icon;
            const isCreate = r.to.includes('?new=');
            return (
              <li key={r.id} role="presentation">
                {header && <div className="px-3 pt-3 pb-1 text-xs font-semibold text-ink-400">{header}</div>}
                <div
                  id={`cmdk-${i}`}
                  data-idx={i}
                  role="option"
                  aria-selected={active === i}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(i)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${active === i ? 'bg-primary-50 text-primary-800' : 'text-ink-700'}`}
                >
                  <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-md ${active === i ? 'bg-white text-primary-600 ring-1 ring-primary-100' : 'bg-ink-50 text-ink-500'}`}>
                    {isCreate ? <Plus size={15} /> : <Icon size={15} />}
                  </span>
                  <span className="flex-1 truncate font-medium">{r.label}</span>
                  {active === i && <CornerDownLeft size={14} className="text-primary-400" />}
                </div>
              </li>
            );
          })}
          {askRow && (
            <li role="presentation">
              <div className="px-3 pt-3 pb-1 text-xs font-semibold text-ink-400">{t('shell.askAtlasAbout', language)}</div>
              <div
                id={`cmdk-${results.length}`}
                data-idx={results.length}
                role="option"
                aria-selected={active === results.length}
                onMouseMove={() => setActive(results.length)}
                onClick={() => go(results.length)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${active === results.length ? 'bg-primary-50 text-primary-800' : 'text-ink-700'}`}
              >
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-md bg-navy-900 text-white"><Sparkles size={14} /></span>
                <span className="flex-1 truncate">“{query.trim()}”</span>
              </div>
            </li>
          )}
        </ul>

        <div className="flex items-center gap-4 border-t border-ink-100 bg-ink-50/60 px-4 py-2 text-xs text-ink-500">
          <span className="flex items-center gap-1.5"><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> {t('shell.toNavigate', language)}</span>
          <span className="flex items-center gap-1.5"><kbd className="kbd">↵</kbd> {t('shell.toOpen', language)}</span>
        </div>
      </div>
    </div>
  );
}
