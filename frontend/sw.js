// Marotholi Les-Pot - Service Worker
const CACHE_NAME = 'lespot-v1';
const FILES_TO_CACHE = [
  'index.html',
  'discover.html',
  'wallet.html',
  'deposit.html',
  'auth.html',
  'upload.html',
  'admin.html',
  'style.css',
  'app.js',
  'player.js',
  'manifest.json',
  'icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => k !== CACHE_NAME ? caches.delete(k) : null))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request).then((res) => {
        return res;
      }).catch(() => caches.match('index.html'));
    })
  );
});
