// Marotholi Les-Pot - Service Worker v2 - DO NOT CACHE MONEY PAGES
// NEVER cache: account, wallet, deposit, withdraw, admin, auth, songs, supabase
// Only cache: icon + splash + css so app opens fast but always fresh
const CACHE = 'lespot-v2';
const SHELL = ['icon.png','splash.png','style.css'];
self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).catch(function(){}));
  self.skipWaiting();
});
self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ if(k !== CACHE) return caches.delete(k); }));
  }));
  self.clients.claim();
});
self.addEventListener('fetch', function(e) {
  const url = e.request.url;
  if(url.includes('supabase.co')) return;
  if(url.includes('account.html') || url.includes('wallet.html') || url.includes('deposit.html') || url.includes('withdraw.html') || url.includes('admin.html') || url.includes('auth.html') || url.includes('artist-dashboard')){
    // Money pages: NETWORK ONLY, never cache
    e.respondWith(fetch(e.request));
    return;
  }
  // Everything else: network first, cache fallback
  e.respondWith(fetch(e.request).then(function(res){ return res; }).catch(function(){ return caches.match(e.request); }));
});