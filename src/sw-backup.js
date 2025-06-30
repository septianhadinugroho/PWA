import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

// Menggunakan manifest dari VitePWA
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Konfigurasi caching strategies
const pageCache = new NetworkFirst({
  cacheName: 'pages-cache',
  plugins: [
    new CacheableResponsePlugin({
      statuses: [0, 200]
    })
  ]
});

const assetCache = new StaleWhileRevalidate({
  cacheName: 'assets-cache',
  plugins: [
    new CacheableResponsePlugin({
      statuses: [0, 200]
    })
  ]
});

const imageCache = new CacheFirst({
  cacheName: 'images-cache',
  plugins: [
    new CacheableResponsePlugin({
      statuses: [0, 200]
    }),
    new ExpirationPlugin({
      maxEntries: 60,
      maxAgeSeconds: 30 * 24 * 60 * 60 // 30 hari
    })
  ]
});

// Register routes
registerRoute(
  ({ request }) => request.mode === 'navigate',
  pageCache
);

registerRoute(
  ({ request }) => ['style', 'script', 'worker'].includes(request.destination),
  assetCache
);

registerRoute(
  ({ request }) => request.destination === 'image',
  imageCache
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200, 404]
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60 // 5 menit
      })
    ]
  })
);

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('🔔 Push message received:', event);

  let payload;
  try {
    payload = event.data ? event.data.json() : {
      title: 'Story App',
      body: 'Ada update baru untuk kamu!',
      icon: '/icons/icon-192x192.png'
    };
  } catch (e) {
    console.error('Failed to parse push data:', e);
    payload = {
      title: 'Story App',
      body: 'Ada notifikasi baru',
      icon: '/icons/icon-192x192.png'
    };
  }

  const promiseChain = self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-192x192.png',
    data: payload.data || { url: '/' },
    actions: [{ action: 'open', title: 'Buka App' }, { action: 'close', title: 'Tutup' }],
    requireInteraction: false,
    silent: false,
    tag: 'story-notification'
  });

  event.waitUntil(promiseChain);
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked:', event.notification);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((windowClients) => {
      const matchingClient = windowClients.find((client) => client.url === urlToOpen);

      if (matchingClient) {
        return matchingClient.focus();
      }
      return clients.openWindow(urlToOpen);
    })
  );
});


// Install dan Activate
self.addEventListener('install', () => {
  console.log('🔧 Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
  event.waitUntil(clients.claim());
});