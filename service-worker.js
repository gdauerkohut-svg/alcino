// Service Worker do Hábitos — cacheia só o "app shell" (HTML/CSS/JS/ícones).
// Os dados (dashboards, atividades, etc) sempre vêm da rede, direto da API do
// Apps Script — nunca são cacheados aqui, pra evitar mostrar informação velha.

const CACHE_NAME = 'habitos-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './config.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Nunca cacheia chamadas à API (Apps Script) nem para outros domínios —
  // só o "shell" do próprio app (mesma origem).
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // sem rede: usa o que tiver em cache
      return cached || networkFetch;
    })
  );
});
