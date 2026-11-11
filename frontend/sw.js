// Marotholi LES-POT - Service Worker - v3
const CACHE = 'lespot-v3';
const CORE = [
  './',
  './index.html',
  './discover.html',
  './wallet.html',
  './library.html',
  './upload.html',
  './account.html',
  './admin.html',
  './deposit.html',
  './auth.html',
  './app.js',
  './player.js',
  './style.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never cache Supabase / API / Auth - always fresh
  if (url.hostname.includes('supabase.co') || url.pathname.includes('/auth/') || e.request.method !== 'GET') {
    return;
  }

  // For pages - Network First, fallback to Cache (so fans always get latest Wallet numbers)
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // For JS / CSS / Icons - Cache First, then Network
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => cached);
    })
  );
});
