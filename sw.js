/**
 * Cloky PWA Service Worker
 * Caches app shell for offline use and installability.
 */
const CACHE_NAME = 'cloky-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/js/app.js',
  '/icons/favicon.svg',
  '/manifest.webmanifest'
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {
        // If any fail (e.g. running from file://), skip
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: take control and clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network first for HTML/navigation, cache fallback for shell
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match('/')))
    );
    return;
  }

  if (/^\/(js|icons)\//.test(url.pathname) || url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached || fetch(event.request).then((res) => {
          const clone = res.clone();
          if (res.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
      )
    );
  }
});
