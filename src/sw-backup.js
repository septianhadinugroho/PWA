import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { openDB } from 'idb';

// PERBAIKAN: Gunakan manifest dari VitePWA
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
      maxAgeSeconds: 30 * 24 * 60 * 60
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
        maxAgeSeconds: 5 * 60
      })
    ]
  })
);

// PERBAIKAN: Push notification handler yang lebih robust
self.addEventListener('push', (event) => {
  console.log('🔔 Push message received:', event);
  
  let payload;
  try {
    // Coba parse data dari push event
    if (event.data) {
      payload = event.data.json();
    } else {
      // Fallback jika tidak ada data
      payload = {
        title: 'Story App',
        body: 'Ada update baru untuk kamu!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png'
      };
    }
  } catch (e) {
    console.error('Failed to parse push data:', e);
    payload = {
      title: 'Story App',
      body: 'Ada notifikasi baru',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png'
    };
  }

  // Tampilkan notifikasi
  const promiseChain = self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-192x192.png',
    data: payload.data || { url: '/' },
    actions: [
      {
        action: 'open',
        title: 'Buka App',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Tutup'
      }
    ],
    requireInteraction: false,
    silent: false,
    tag: 'story-notification'
  });

  event.waitUntil(promiseChain);
});

// PERBAIKAN: Notification click handler yang lebih baik
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked:', event.notification);
  
  // Tutup notifikasi
  event.notification.close();
  
  // Jika user klik "close", tidak perlu buka app
  if (event.action === 'close') {
    return;
  }
  
  // Tentukan URL yang akan dibuka
  const urlToOpen = event.notification.data?.url || '/';
  
  // Buka atau fokus ke aplikasi
  event.waitUntil(
    clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    }).then((windowClients) => {
      // Cari window yang sudah terbuka
      const matchingClient = windowClients.find(
        (client) => client.url.includes(self.location.origin)
      );

      if (matchingClient) {
        // Fokus ke window yang sudah ada
        return matchingClient.focus().then(() => {
          // Navigate ke URL yang diinginkan jika perlu
          if (matchingClient.navigate && urlToOpen !== '/') {
            return matchingClient.navigate(urlToOpen);
          }
        });
      } else {
        // Buka window baru
        return clients.openWindow(urlToOpen);
      }
    }).catch(error => {
      console.error('Error handling notification click:', error);
      // Fallback: buka window baru
      return clients.openWindow('/');
    })
  );
});

// Background sync untuk story offline
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-stories') {
    event.waitUntil(
      syncStories()
        .then(() => console.log('✅ Background sync completed'))
        .catch(error => console.error('❌ Background sync failed:', error))
    );
  }
});

// Function untuk sync stories offline
async function syncStories() {
  try {
    const db = await openDB('StoryAppDB', 1);
    const unsyncedStories = await db.getAll('unsyncedStories');
    
    console.log(`📤 Syncing ${unsyncedStories.length} unsynced stories`);
    
    for (const story of unsyncedStories) {
      try {
        const token = await getTokenFromStorage();
        if (!token) {
          console.warn('No auth token available for sync');
          continue;
        }

        const response = await fetch('/api/stories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(story)
        });

        if (response.ok) {
          // Hapus dari unsynced stories
          await db.delete('unsyncedStories', story.id);
          console.log(`✅ Story synced: ${story.id}`);
          
          // Tampilkan notifikasi sukses
          await self.registration.showNotification('Story Tersinkronisasi', {
            body: `"${story.description}" berhasil dipublish`,
            icon: '/icons/icon-192x192.png',
            tag: 'sync-success'
          });
        } else {
          console.error(`❌ Failed to sync story ${story.id}:`, response.status);
        }
      } catch (error) {
        console.error(`❌ Error syncing story ${story.id}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Sync stories error:', error);
    throw error;
  }
}

// Helper function untuk mendapatkan token
async function getTokenFromStorage() {
  try {
    // Coba dari clients yang aktif
    const allClients = await clients.matchAll();
    for (const client of allClients) {
      try {
        const response = await client.postMessage({ type: 'GET_TOKEN' });
        if (response && response.token) {
          return response.token;
        }
      } catch (e) {
        // Continue ke client berikutnya
      }
    }
    
    // Fallback: gunakan IndexedDB jika tersedia
    const db = await openDB('StoryAppDB', 1);
    const tokenData = await db.get('settings', 'auth_token');
    return tokenData?.value;
  } catch (error) {
    console.error('Failed to get token:', error);
    return null;
  }
}

// Install event
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  // Skip waiting untuk update langsung
  event.waitUntil(self.skipWaiting());
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
  
  // Claim semua clients
  event.waitUntil(self.clients.claim());
});

// Message handler untuk komunikasi dengan main thread
self.addEventListener('message', (event) => {
  console.log('📨 Message received in SW:', event.data);
  
  if (event.data && event.data.type === 'GET_TOKEN') {
    // Respond dengan token jika diminta
    event.ports[0]?.postMessage({ 
      token: null // SW tidak bisa akses localStorage langsung
    });
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});