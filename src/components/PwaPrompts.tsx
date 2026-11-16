import { Download, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useInstallPrompt, useUpdateReady } from '@/lib/pwa';

/** Shown once a new deploy has been downloaded: one click activates it. */
export function PwaUpdateToast() {
  const { language } = useAuth();
  const fr = language !== 'en';
  const { updateReady, applyUpdate } = useUpdateReady();
  if (!updateReady) return null;
  return (
    <div role="status" className="fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-xl bg-navy-900 px-4 py-3 text-sm text-white shadow-pop animate-scale-in sm:inset-x-auto sm:end-4 sm:bottom-4">
      <RefreshCw size={16} className="flex-none text-primary-200" />
      <span className="flex-1">{fr ? 'Une nouvelle version d’Atlas est prête.' : 'A new version of Atlas is ready.'}</span>
      <button onClick={applyUpdate} className="rounded-lg bg-white px-3 py-1.5 font-semibold text-navy-900 transition hover:bg-primary-50">
        {fr ? 'Mettre à jour' : 'Update'}
      </button>
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
