// Service Worker do Hábitos — cacheia só o "app shell" (HTML/CSS/JS/ícones)
// e também cuida de mostrar notificações push quando o app está fechado.
// Os dados (dashboards, atividades, etc) sempre vêm da rede, direto da API do
// Apps Script — nunca são cacheados aqui, pra evitar mostrar informação velha.

importScripts('config.js'); // define self.APP_CONFIG (mesmo arquivo usado pela página)
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

if (self.APP_CONFIG && self.APP_CONFIG.FIREBASE_CONFIG && self.APP_CONFIG.FIREBASE_CONFIG.apiKey) {
  try {
    firebase.initializeApp(self.APP_CONFIG.FIREBASE_CONFIG);
    const messaging = firebase.messaging();
    // Mostra a notificação quando o app NÃO está em primeiro plano.
    messaging.onBackgroundMessage(payload => {
      const title = (payload.notification && payload.notification.title) || 'Hábitos';
      const body = (payload.notification && payload.notification.body) || '';
      self.registration.showNotification(title, {
        body,
        icon: './icon-192.png',
        badge: './icon-192.png'
      });
    });
  } catch (e) {
    // FIREBASE_CONFIG ainda não preenchido no config.js — segue sem notificações.
  }
}

const CACHE_NAME = 'habitos-shell-v2'; // versão trocada de propósito: invalida caches antigos de instalações anteriores
const SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
  // OBS: config.js NÃO entra aqui de propósito — é o arquivo que você mais
  // provavelmente vai editar (Client ID, URL do Apps Script), então ele
  // sempre busca a versão mais nova da rede (ver fetch handler abaixo).
];

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});

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

  // config.js: sempre busca da rede primeiro (é o arquivo que você edita ao
  // configurar o app). Só usa o cache se estiver de fato offline.
  if (url.pathname.endsWith('/config.js')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

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
