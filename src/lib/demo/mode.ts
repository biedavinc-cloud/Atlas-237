/**
 * Demo mode: a complete, self-contained Atlas workspace with realistic
 * sample data, running entirely in the visitor's browser (no account, no
 * network calls to Supabase). Entered from /demo, left with exitDemo().
 *
 * The flag lives in sessionStorage so it survives reloads inside the tab
 * but never leaks into a real session in another tab. It is read once at
 * module load, before src/lib/supabase.ts picks which client to export.
 */
const FLAG = 'atlas-demo';
export const DEMO_DB_KEY = 'atlas-demo-db-v1';

function detect(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    if (window.location.pathname === '/demo' || window.location.pathname.startsWith('/demo/') || window.location.pathname === '/en/demo') {
      sessionStorage.setItem(FLAG, '1');
    }
    return sessionStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
}

export const IS_DEMO = detect();

/** Full reload so the demo client replaces the real one. */
export function enterDemo(lang?: string) {
  try {
    sessionStorage.setItem(FLAG, '1');
    if (lang) localStorage.setItem('atlas-lang', lang);
  } catch { /* ignore */ }
  window.location.href = '/app';
}

/** Leaves the demo, wipes its data, and goes to sign-up (or home). */
export function exitDemo(to: string = '/auth?mode=signup') {
  try {
    sessionStorage.removeItem(FLAG);
    sessionStorage.removeItem(DEMO_DB_KEY);
  } catch { /* ignore */ }
  window.location.href = to;
}

/** Restores the original sample data without leaving the demo. */
export function resetDemo() {
  try { sessionStorage.removeItem(DEMO_DB_KEY); } catch { /* ignore */ }
  window.location.reload();
}
