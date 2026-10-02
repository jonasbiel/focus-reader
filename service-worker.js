const CACHE = 'focus-reader-v2-ios';
const APP_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const LIB_ASSETS = [
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/build/pdf.min.mjs',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/build/pdf.worker.min.mjs',
  'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      await cache.addAll(APP_ASSETS);
      // Cache libraries opportunistically; first online load still works if one
      // CDN request cannot be cached during installation.
      await Promise.allSettled(LIB_ASSETS.map(url => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(()=>{});
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        throw new Error('Offline and resource not cached');
      });
    })
  );
});
