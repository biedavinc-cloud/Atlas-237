import { useEffect, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useInstallPrompt, useUpdateReady } from '@/lib/pwa';

/** Shown once a new deploy has been downloaded: one click activates it. */
export function PwaUpdateToast() {
  const { language } = useAuth();
  const fr = language !== 'en';
  const { updateReady, applyUpdate } = useUpdateReady();
  const [hidden, setHidden] = useState(false);
  const [compact, setCompact] = useState(false);
  // A small pill that shrinks to a round button after a few seconds, so it
  // never covers the page; the user can also dismiss it until the next load.
  useEffect(() => {
    if (!updateReady) return;
    const t = window.setTimeout(() => setCompact(true), 6000);
    return () => window.clearTimeout(t);
  }, [updateReady]);
  if (!updateReady || hidden) return null;
  const label = fr ? 'Nouvelle version : mettre à jour' : 'New version: update';
  if (compact) {
    return (
      <button onClick={applyUpdate} title={label} aria-label={label}
        className="fixed bottom-3 end-3 z-[60] flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-white shadow-pop transition hover:bg-navy-800 sm:bottom-4 sm:end-4">
        <RefreshCw size={16} />
        <span className="absolute end-1 top-1 h-2 w-2 rounded-full bg-success-400" aria-hidden="true" />
      </button>
    );
  }
  return (
    <div role="status" className="fixed bottom-3 end-3 z-[60] flex items-center gap-1 rounded-full bg-navy-900 py-1 pe-1 ps-3 text-xs text-white shadow-pop animate-scale-in sm:bottom-4 sm:end-4">
      <RefreshCw size={13} className="flex-none text-primary-200" />
      <button onClick={applyUpdate} className="rounded-full px-2 py-1 font-semibold hover:bg-white/10">{fr ? 'Mettre à jour' : 'Update'}</button>
      <button onClick={() => setHidden(true)} aria-label={fr ? 'Plus tard' : 'Later'} className="rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white"><X size={13} /></button>
    </div>
  );
}

/**
 * "Install the app" — rendered only when the browser offers installation
 * (Chrome, Edge, Android…). Renders nothing once installed or when the
 * browser does not support it, so it never shows a dead button.
 */
export function InstallAppButton({ variant = 'ghost', className = '' }: { variant?: 'ghost' | 'menu' | 'solid'; className?: string }) {
  const { language } = useAuth();
  const fr = language !== 'en';
  const { canInstall, install } = useInstallPrompt();
  if (!canInstall) return null;
  const label = fr ? 'Installer l’app' : 'Install the app';
  if (variant === 'menu') {
    return (
      <button role="menuitem" onClick={install} className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-ink-700 transition-colors hover:bg-ink-50 hover:text-ink-900 ${className}`}>
        <span className="text-ink-400"><Download size={15} /></span>
        {label}
      </button>
    );
  }
  if (variant === 'solid') {
    return (
      <button onClick={install} className={`inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 ${className}`}>
        <Download size={16} /> {label}
      </button>
    );
  }
  return (
    <button onClick={install} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 transition hover:bg-ink-100 ${className}`}>
      <Download size={15} /> {label}
    </button>
  );
}
