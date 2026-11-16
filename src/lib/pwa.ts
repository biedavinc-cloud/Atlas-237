import { useEffect, useState } from 'react';

/**
 * PWA plumbing: service worker registration, "new version" detection and
 * the browser install prompt, exposed as tiny hooks.
 *
 * The service worker (public/sw.js) never caches Supabase or any other
 * cross-origin request — see the rules at the top of that file.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let waitingWorker: ServiceWorker | null = null;
let installed = typeof window !== 'undefined'
  && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installed = true;
    emit();
  });
}

function trackWaiting(reg: ServiceWorkerRegistration) {
  const setWaiting = (w: ServiceWorker | null) => {
    // Only an update (a page already controlled by an older worker) is worth announcing.
    if (w && navigator.serviceWorker.controller) { waitingWorker = w; emit(); }
  };
  if (reg.waiting) setWaiting(reg.waiting);
  reg.addEventListener('updatefound', () => {
    const nw = reg.installing;
    if (!nw) return;
    nw.addEventListener('statechange', () => { if (nw.state === 'installed') setWaiting(nw); });
  });
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
      trackWaiting(reg);
      // Look for a new deploy when the app comes back to the foreground, at most hourly.
      let last = Date.now();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && Date.now() - last > 60 * 60 * 1000) { last = Date.now(); reg.update().catch(() => undefined); }
      });
    }).catch(() => undefined);
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading || !waitingWorker) return;
      reloading = true;
      location.reload();
    });
  });
}

function useStore<T>(read: () => T): T {
  const [value, setValue] = useState(read);
  useEffect(() => {
    const l = () => setValue(read());
    listeners.add(l);
    l();
    return () => { listeners.delete(l); };
  }, [read]);
  return value;
}

const readInstall = () => ({ canInstall: Boolean(deferredPrompt) && !installed, installed });
let lastInstall = readInstall();
const readInstallStable = () => {
  const next = readInstall();
  if (next.canInstall !== lastInstall.canInstall || next.installed !== lastInstall.installed) lastInstall = next;
  return lastInstall;
};

/** { canInstall, installed, install() } — install() opens the browser's own install dialog. */
export function useInstallPrompt() {
  const state = useStore(readInstallStable);
  const install = async () => {
    if (!deferredPrompt) return false;
    const prompt = deferredPrompt;
    deferredPrompt = null;
    emit();
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    return outcome === 'accepted';
  };
  return { ...state, install };
}

const readUpdate = () => Boolean(waitingWorker);

/** { updateReady, applyUpdate() } — applyUpdate() activates the new version and reloads once. */
export function useUpdateReady() {
  const updateReady = useStore(readUpdate);
  const applyUpdate = () => waitingWorker?.postMessage('SKIP_WAITING');
  return { updateReady, applyUpdate };
}
