/**
 * USEF-TSE Service Worker
 * Progressive Web App offline caching and runtime asset handler.
 *
 * Rules:
 * - NEVER caches POST requests (/api/extract).
 * - NEVER caches temporary private uploaded or extracted audio (/api/audio/*).
 * - Static assets (HTML, CSS, JS, Images, Icons) use Cache-First / Stale-While-Revalidate.
 * - API status requests use Network-First.
 */

const CACHE_NAME = 'usef-tse-v1.0.0';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons.svg',
  '/logo.png',
  '/microphone.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png'
];

// Install: Cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Route handling
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Never handle non-GET requests (e.g. POST /api/extract)
  if (req.method !== 'GET') {
    return;
  }

  // 2. Never cache private uploaded audio or extracted output audio
  if (url.pathname.startsWith('/api/audio/') || url.pathname.startsWith('/api/extract')) {
    return; // Pass through straight to network
  }

  // 3. Status and health checks: Network-first
  if (url.pathname.startsWith('/api/status') || url.pathname.startsWith('/api/health')) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // 4. Sample files: Stale-while-revalidate or Cache-first
  if (url.pathname.startsWith('/api/samples')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(req).then((cachedResponse) => {
          const fetchPromise = fetch(req).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(req, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 5. HTML Navigation: Network-first with cache fallback to /index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // 6. Static assets (JS, CSS, Images, Fonts): Cache-first with background revalidation
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch updated version in background to keep cache fresh
        fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
          }
        }).catch(() => { /* ignore background network errors */ });
        return cachedResponse;
      }

      return fetch(req).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
