// ============================================================
// sw.js — Grasse Meal Planner service worker
//
// Network-first for the app page: every load tries the network first, so
// users always get the newest deployed version. Falls back to the cached
// copy only when offline. Fonts are cache-first (they rarely change).
// Worker (API) calls are never cached.
//
// BUMP CACHE_NAME ON EVERY DEPLOY (and the build label in MealPlanner.html),
// or iPhone/iPad home-screen apps can keep showing the old version.
//
// HISTORY:
//   mealplanner-v2 — Nov 7, 2026: first service worker for this app; app moved
//                    to its own Worker (mealplanner-proxy).
// ============================================================

const CACHE_NAME = 'mealplanner-v2';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept API calls (Cloudflare Workers) or anything else cross-origin
  // except Google Fonts.
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !isFont) return;

  // Fonts: cache-first
  if (isFont) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  // App page and other same-origin files: network-first, cache fallback offline
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});