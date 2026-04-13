const CACHE_NAME = 'afaq-v5';

const ASSETS_TO_CACHE = ['/', '/index.html', '/manifest.webmanifest', '/icon-512.png', '/favicon.svg'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
            return undefined;
          })
        )
      ),
    ])
  );
});

/**
 * لا نخزّن إلا طلبات GET لنفس أصل التطبيق.
 * طلبات POST (Firebase Auth وغيرها) تُترك للمتصفح دون cache.put — يمنع:
 * Failed to execute 'put' on 'Cache': Request method 'POST' is unsupported
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!request.url.startsWith('http')) return;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
