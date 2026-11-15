import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell, ChevronDown, ChevronsLeft, ChevronsRight, LogOut, Search, Menu, X,
  Settings, CreditCard, User, Globe, Check, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { t, type Language } from '@/lib/i18n';
import { NAV_SECTIONS, SUPER_ADMIN_ITEMS, type NavItem } from '@/lib/navigation';
import { CommandPalette } from '@/components/CommandPalette';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية' },
];

function readPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writePref(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, organization, language, setLanguage, signOut, isSuperAdmin, brandingLogoUrl } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<boolean>(() => readPref('atlas-sidebar-collapsed', false));
  const [closedSections, setClosedSections] = useState<string[]>(() => readPref('atlas-sidebar-closed', []));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const rtl = language === 'ar';

  useEffect(() => writePref('atlas-sidebar-collapsed', collapsed), [collapsed]);
  useEffect(() => writePref('atlas-sidebar-closed', closedSections), [closedSections]);

  // Close the mobile drawer and the account menu on every navigation.
  useEffect(() => { setMobileOpen(false); setMenuOpen(false); }, [location.pathname]);

  // ⌘K / Ctrl+K opens the command palette from anywhere in the app.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Account menu: close on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setMenuOpen(false); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

  // Real unread count (the bell used to show a red dot unconditionally).
  // Same filter as NotificationsPage, so the badge and the list agree.
  const loadUnread = useCallback(async () => {
    if (!isSupabaseConfigured || !profile?.id) return;
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('read', false)
      .eq('user_id', profile.id);
    setUnread(count || 0);
  }, [profile?.id]);
  useEffect(() => { loadUnread(); }, [loadUnread, location.pathname]);
  useEffect(() => {
    window.addEventListener('atlas:notifications-changed', loadUnread);
    return () => window.removeEventListener('atlas:notifications-changed', loadUnread);
  }, [loadUnread]);

  function toggleSection(id: string) {
    setClosedSections(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  const showLabels = !collapsed || mobileOpen;
  const initial = (profile?.first_name?.[0] || profile?.email?.[0] || 'U').toUpperCase();
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.email || '';

  function renderItem(item: NavItem, end = false) {
    const label = t(item.labelKey, language);
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={end}
        className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item-active' : ''} ${showLabels ? '' : 'justify-center px-0'}`}
        title={showLabels ? undefined : label}
        aria-label={showLabels ? undefined : label}
      >
        <item.icon size={17} className="flex-none opacity-90" />
        {showLabels && <span className="truncate">{label}</span>}
        {showLabels && item.to === '/app/notifications' && unread > 0 && (
          <span className="ms-auto rounded-full bg-primary-500 px-1.5 text-[11px] font-bold leading-5 text-white tabular">{unread > 99 ? '99+' : unread}</span>
        )}
      </NavLink>
    );
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="flex h-[100dvh] overflow-hidden bg-canvas">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-navy-950/50 lg:hidden animate-fade-in" onClick={() => setMobileOpen(false)} aria-hidden />
      )}

      {/* Sidebar */}
      <aside
        className={`${collapsed && !mobileOpen ? 'lg:w-[68px]' : 'lg:w-[252px]'} w-[272px] fixed lg:static inset-y-0 start-0 z-50 flex-shrink-0 bg-navy-900 text-white flex flex-col transition-[width,transform] duration-200 sidebar-shadow
          ${mobileOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full lg:!translate-x-0'}`}
        aria-label="Navigation"
      >
        {/* Brand strip: org logo for paid branding, neutral monogram otherwise (never the Atlas logo inside the app). */}
        <div className="relative flex items-center gap-2.5 px-4 h-16 flex-shrink-0 border-b border-white/[0.07] contour overflow-hidden">
          {brandingLogoUrl ? (
            <img src={brandingLogoUrl} alt={organization?.name || 'Logo'} className="h-8 w-auto max-w-[150px] object-contain flex-shrink-0" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-700 ring-1 ring-white/20 flex-shrink-0 shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]">
              <span className="text-[15px] font-bold text-white">{(organization?.name || 'A').charAt(0).toUpperCase()}</span>
            </div>
          )}
          {showLabels && !brandingLogoUrl && (
            <div className="min-w-0">
              <p className="font-bold text-[15px] leading-tight truncate">{organization?.name || 'Atlas'}</p>
              {organization?.plan && <p className="text-[11px] text-navy-300 capitalize leading-tight">{organization.plan}</p>}
            </div>
          )}
          <button onClick={() => setMobileOpen(false)} className="lg:hidden ms-auto rounded-md p-1.5 text-navy-200 hover:bg-white/10 hover:text-white" aria-label={t('shell.closeMenu', language)}>
            <X size={18} />
          </button>
        </div>

        {/* Search trigger */}
        <div className="px-3 pt-3">
          <button
            onClick={() => setPaletteOpen(true)}
            className={`flex w-full items-center gap-2.5 rounded-lg bg-white/[0.06] ring-1 ring-inset ring-white/[0.08] text-navy-200 hover:bg-white/[0.09] hover:text-white transition-colors ${showLabels ? 'px-3 py-2' : 'justify-center py-2'}`}
            aria-label={t('shell.jumpTo', language)}
          >
            <Search size={15} className="flex-none" />
            {showLabels && (
              <>
                <span className="flex-1 text-start text-[13px] truncate">{t('shell.jumpTo', language)}</span>
                <span className="hidden lg:inline rounded border border-white/15 px-1.5 text-[10px] font-semibold text-navy-300">{isMac ? '⌘K' : 'Ctrl K'}</span>
              </>
            )}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-dark px-3 pb-4 pt-1">
          {NAV_SECTIONS.map((section) => {
            const isClosed = showLabels && section.titleKey && closedSections.includes(section.id);
            return (
              <div key={section.id} className={section.titleKey ? '' : 'mt-3 space-y-0.5'}>
                {section.titleKey && showLabels && (
                  <button className="sidebar-section" onClick={() => toggleSection(section.id)} aria-expanded={!isClosed}>
                    <span>{t(section.titleKey, language)}</span>
                    <ChevronDown size={13} className={`transition-transform ${isClosed ? 'ltr:-rotate-90 rtl:rotate-90' : ''}`} />
                  </button>
                )}
                {section.titleKey && !showLabels && <div className="mx-3 my-3 h-px bg-white/[0.07]" />}
                {!isClosed && (
                  <div className="space-y-0.5">
                    {section.items.map(item => renderItem(item, item.to === '/app'))}
                  </div>
                )}
              </div>
            );
          })}

          {isSuperAdmin && (
            <div className="mt-5 rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/[0.06] p-1.5">
              {showLabels && (
                <button className="sidebar-section !mt-1 !px-2" onClick={() => toggleSection('super')} aria-expanded={!closedSections.includes('super')}>
                  <span className="flex items-center gap-1.5 text-primary-300"><ShieldCheck size={12} /> {t('superAdmin.title', language)}</span>
                  <ChevronDown size={13} className={`transition-transform ${closedSections.includes('super') ? 'ltr:-rotate-90 rtl:rotate-90' : ''}`} />
                </button>
              )}
              {!(showLabels && closedSections.includes('super')) && (
                <div className="space-y-0.5">{SUPER_ADMIN_ITEMS.map(item => renderItem(item, item.to === '/super-admin'))}</div>
              )}
            </div>
          )}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center gap-2 px-5 h-11 text-[13px] text-navy-300 hover:text-white hover:bg-white/[0.05] transition-colors border-t border-white/[0.07]"
          aria-label={collapsed ? t('shell.expand', language) : t('shell.collapse', language)}
          title={collapsed ? t('shell.expand', language) : t('shell.collapse', language)}
        >
          {collapsed
            ? <ChevronsRight size={16} className="mx-auto rtl:rotate-180" />
            : <><ChevronsLeft size={16} className="rtl:rotate-180" /><span>{t('shell.collapse', language)}</span></>}
        </button>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex-shrink-0 h-16 bg-white/85 backdrop-blur border-b border-ink-200/70 flex items-center justify-between gap-3 px-4 sm:px-6 relative z-30">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden btn-icon -ms-2"
              aria-label={t('shell.openMenu', language)}
            >
              <Menu size={20} />
            </button>
            <button
              onClick={() => setPaletteOpen(true)}
              className="group flex w-full max-w-md items-center gap-2.5 rounded-lg border border-ink-200 bg-ink-50/70 px-3 py-2 text-sm text-ink-400 hover:border-ink-300 hover:bg-white transition-colors"
            >
              <Search size={16} className="flex-none" />
              <span className="flex-1 truncate text-start">{t('shell.jumpTo', language)}</span>
              <span className="hidden sm:inline-flex gap-1"><kbd className="kbd">{isMac ? '⌘' : 'Ctrl'}</kbd><kbd className="kbd">K</kbd></span>
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => navigate('/app/notifications')}
              className="relative btn-icon h-9 w-9"
              aria-label={`${t('nav.notifications', language)}${unread ? ` (${unread} ${t('shell.unread', language)})` : ''}`}
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute top-1 end-1 min-w-[16px] h-4 rounded-full bg-error-500 px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-white tabular">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            <div className="h-6 w-px bg-ink-200 mx-1 hidden sm:block" />

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="flex items-center gap-2.5 rounded-lg p-1 sm:pe-2 hover:bg-ink-100 transition-colors"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-800 text-white text-sm font-bold">
                  {initial}
                </div>
                <div className="text-start hidden sm:block max-w-[160px]">
                  <p className="text-sm font-semibold text-ink-800 leading-tight truncate">{fullName}</p>
                  <p className="text-xs text-ink-500 leading-tight truncate">{organization?.name}</p>
                </div>
                <ChevronDown size={14} className={`hidden sm:block text-ink-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuOpen && (
                <div role="menu" className="absolute end-0 mt-2 w-64 origin-top-right rounded-xl bg-white p-1.5 shadow-pop ring-1 ring-ink-200 animate-scale-in">
                  <div className="px-3 py-2.5 border-b border-ink-100 mb-1">
                    <p className="text-sm font-semibold text-ink-900 truncate">{fullName}</p>
                    <p className="text-xs text-ink-500 truncate">{profile?.email}</p>
                  </div>
                  <MenuLink icon={<User size={15} />} label={t('shell.profile', language)} onClick={() => navigate('/app/settings?tab=profile')} />
                  <MenuLink icon={<Settings size={15} />} label={t('nav.settings', language)} onClick={() => navigate('/app/settings')} />
                  <MenuLink icon={<CreditCard size={15} />} label={t('nav.billing', language)} onClick={() => navigate('/app/billing')} />
                  <div className="my-1 border-t border-ink-100" />
                  <p className="flex items-center gap-2 px-3 pt-1.5 pb-1 text-xs font-semibold text-ink-400"><Globe size={12} /> {t('shell.language', language)}</p>
                  <div className="grid grid-cols-1">
                    {LANGUAGES.map(l => (
                      <button
                        key={l.code}
                        role="menuitemradio"
                        aria-checked={language === l.code}
                        onClick={() => setLanguage(l.code)}
                        className={`flex items-center justify-between rounded-md px-3 py-1.5 text-sm ${language === l.code ? 'text-primary-700 font-semibold' : 'text-ink-700 hover:bg-ink-50'}`}
                      >
                        <span>{l.label}</span>
                        {language === l.code && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                  <div className="my-1 border-t border-ink-100" />
                  <MenuLink icon={<LogOut size={15} />} label={t('shell.signOut', language)} onClick={handleSignOut} danger />
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin" id="main">
          <div className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

function MenuLink({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${danger ? 'text-error-600 hover:bg-error-50' : 'text-ink-700 hover:bg-ink-50 hover:text-ink-900'}`}
    >
      <span className={danger ? '' : 'text-ink-400'}>{icon}</span>
      {label}
    </button>
  );
}
