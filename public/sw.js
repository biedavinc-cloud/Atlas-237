/*
 * Atlas CRM service worker.
 *
 * Hard rules (multi-tenant data must never sit in a shared cache):
 *  - Only GET requests to Atlas's OWN origin are ever cached. Supabase
 *    (*.supabase.co: REST, Auth, Storage, Edge Functions), payment providers
 *    and every other third party are cross-origin and are never touched —
 *    the browser handles them exactly as without a service worker.
 *  - Nothing carrying an Authorization header is cached.
 *  - Page navigations are network-first: the HTML is always fresh when
 *    online; offline, the app shell or /offline.html is served.
 *  - Hashed build files (/assets/*), fonts, icons and logos are
 *    cache-first (their URLs change when their content changes).
 *
 * __BUILD_ID__ is replaced at build time (vite.config.ts) so each deploy
 * gets its own cache and old ones are deleted on activation.
 */
const BUILD_ID = '__BUILD_ID__';
const SHELL_CACHE = `atlas-shell-${BUILD_ID}`;
const STATIC_CACHE = `atlas-static-${BUILD_ID}`;
const STATIC_MAX_ENTRIES = 150;

const SHELL_URLS = [
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/branding/atlas-logo.png',
  '/fonts/GlacialIndifference-Regular.woff2',
  '/fonts/GlacialIndifference-Bold.woff2',
];

const STATIC_PREFIXES = ['/assets/', '/fonts/', '/icons/', '/branding/', '/brand-logos/', '/screenshots/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // One missing optional file must not block installation.
      Promise.all(SHELL_URLS.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined))),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, STATIC_CACHE]);
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('atlas-') && !keep.has(n)).map((n) => caches.delete(n)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch { /* not supported */ }
    }
    await self.clients.claim();
  })());
});

// The page asks the waiting worker to take over after the user accepts the update.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

async function handleNavigation(event) {
  try {
    const preload = await event.preloadResponse;
    const response = preload || await fetch(event.request);
    // Keep the latest app shell so the installed app can still open offline.
    if (response && response.ok && response.type === 'basic') {
      const copy = response.clone();
      caches.open(SHELL_CACHE).then((c) => c.put('/index.html', copy)).catch(() => undefined);
    }
    return response;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    const url = new URL(event.request.url);
    // The demo runs fully in the browser: its shell works offline.
    // Real workspaces need the network for data, so show the offline page.
    const shell = await cache.match('/index.html');
    const offline = await cache.match('/offline.html');
    if (shell && (url.pathname === '/' || url.pathname === '/en' || url.pathname.startsWith('/demo') || url.pathname.startsWith('/en/demo'))) return shell;
    return offline || shell || Response.error();
  }
}

async function handleStatic(request) {
  // Look in every Atlas cache (the shell precaches icons, logo and fonts).
  const cached = await caches.match(request);
  if (cached) return cached;
  const cache = await caches.open(STATIC_CACHE);
  const response = await fetch(request);
  if (response && response.ok && response.type === 'basic') {
    cache.put(request, response.clone()).then(() => trimCache(STATIC_CACHE, STATIC_MAX_ENTRIES)).catch(() => undefined);
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase, PSPs, analytics: never intercepted
  if (request.headers.has('authorization')) return;
  if (url.pathname === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
    return;
  }
  if (STATIC_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(handleStatic(request));
  }
  // Anything else on our origin (manifest, robots, sitemap…) goes to the network as usual.
});
