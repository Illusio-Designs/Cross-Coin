/* Dashboard push service worker — shows order alerts even when the tab is closed. */
/* eslint-disable no-restricted-globals */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (_) { data = { title: 'CrossCoin', body: event.data ? event.data.text() : '' }; }

  const title = data.title || 'CrossCoin';
  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: data.url || '/dashboard/orders' },
    vibrate: [120, 60, 120],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/dashboard/orders';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes(target) && 'focus' in w) return w.focus();
      }
      for (const w of wins) {
        if (w.url.includes('/dashboard') && 'focus' in w) { w.navigate(target); return w.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    }),
  );
});
