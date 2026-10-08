import { APP_SHELL_PATH, CACHE_NAME_PREFIX, UNCACHED_PATH_PREFIX } from '../../src/config/pwa.ts';

/** Generates an app-shell worker that never caches API or user data. */
export function serviceWorkerSource(assets: readonly string[], version: string): string {
  return `
const CACHE_PREFIX = ${JSON.stringify(CACHE_NAME_PREFIX)};
const CACHE_NAME = CACHE_PREFIX + ${JSON.stringify(version)};
const ASSETS = ${JSON.stringify(assets)};
const ALLOWED_PATHS = new Set(ASSETS);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { await cache.addAll(ASSETS); }
    catch (error) { await caches.delete(CACHE_NAME); throw error; }
  })());
});
// No skipWaiting: an update must not replace the running session's resources.
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin
      || url.pathname.startsWith(${JSON.stringify(UNCACHED_PATH_PREFIX)})) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try { return await fetch(request); }
      catch (error) {
        const shell = await (await caches.open(CACHE_NAME)).match(${JSON.stringify(APP_SHELL_PATH)});
        if (shell) return shell;
        throw error;
      }
    })());
  } else if (ALLOWED_PATHS.has(url.pathname)) {
    event.respondWith((async () => {
      const cached = await (await caches.open(CACHE_NAME)).match(url.pathname);
      return cached || fetch(request);
    })());
  }
});
`;
}
