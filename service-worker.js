// service-worker.js
// Frente D do master prompt (Push Notifications + PWA).
//
// De propósito NÃO cacheia JS/CSS agressivamente: o projeto evolui rápido
// com patches diários e cache-busting por query string (?v=YYYYMMDDx) — um
// service worker "esperto" cacheando por engano serviria versão antiga e
// criaria bugs fantasmas ("por que meu patch não aparece?"). Este SW existe
// só para (1) satisfazer o requisito de instalabilidade do PWA e (2)
// processar push notifications.

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'MOBYA', body: event.data?.text() || '' }; }
  const title = data.title || 'MOBYA';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
    tag: data.tag || 'mobya',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); if ('navigate' in existing) existing.navigate(url); }
      else clients.openWindow(url);
    })
  );
});
