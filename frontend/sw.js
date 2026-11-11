// Marotholi Les-Pot - Service Worker - SIMPLE
// Does NOT cache songs - songs always stream fresh from Supabase
// Only caches app shell so Home loads fast
const CACHE = 'lespot-v1';
const SHELL = ['index.html','discover.html','library.html','style.css','app.js','player.js','icon.svg','manifest.json'];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(SHELL); }).catch(function() {}));
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.map(function(k) { if (k !== CACHE) return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  const url = e.request.url;
  // NEVER cache Supabase storage / API - always fresh
  if (url.includes('supabase.co')) return;
  // For pages: try network first, fallback to cache
  e.respondWith(fetch(e.request).then(function(res) {
    return res;
  }).catch(function() {
    return caches.match(e.request);
  }));
});