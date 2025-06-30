import indexedDBManager from '../data/IndexedDBManager';
import CONFIG from '../core/Config';

class PushNotificationService {
  constructor() {
    this.vapidPublicKey = CONFIG.VAPID_PUBLIC_KEY;
    this.subscription = null;
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.deferredPrompt = null;
    this.setupPWAInstallListener();
  }

  async init() {
    if (!this.isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      // Gunakan service worker dari VitePWA
      const registration = await navigator.serviceWorker.ready;
      console.log('Service Worker registered:', registration);

      this.subscription = await registration.pushManager.getSubscription();

      if (this.subscription) {
        console.log('Existing push subscription found');
        await this.saveSubscriptionToServer(this.subscription);
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize push service:', error);
      return false;
    }
  }

  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Push notifications not supported');
    }

    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      console.log('Notification permission granted');
      return true;
    } else {
      console.log('Notification permission denied');
      return false;
    }
  }

  async subscribe() {
    if (!this.isSupported) {
      throw new Error('Push notifications not supported');
    }

    try {
      // Request permission dulu
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        throw new Error('Notification permission denied');
      }

      const registration = await navigator.serviceWorker.ready;
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      this.subscription = subscription;
      console.log('Push subscription created:', subscription);

      // PERBAIKAN: Fetch ke endpoint server yang benar
      await Promise.all([
        this.saveSubscriptionToServer(subscription),
        indexedDBManager.savePushSubscription(subscription)
      ]);

      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
      throw error;
    }
  }

  async unsubscribe() {
    if (!this.subscription) {
      console.log('No active subscription to unsubscribe');
      return true;
    }

    try {
      const success = await this.subscription.unsubscribe();

      if (success) {
        console.log('Push subscription cancelled');
        this.subscription = null;

        await Promise.all([
          this.removeSubscriptionFromServer(),
          indexedDBManager.removePushSubscription()
        ]);
      }

      return success;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      throw error;
    }
  }

  // PERBAIKAN: Format payload sesuai dokumentasi Story API
  async saveSubscriptionToServer(subscription) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.warn('No authentication token found');
        return;
      }

      // PERBAIKAN: Format payload sesuai dengan dokumentasi API
      const subscriptionObject = subscription.toJSON();
      const payload = {
        endpoint: subscriptionObject.endpoint,
        keys: {
          p256dh: subscriptionObject.keys.p256dh,
          auth: subscriptionObject.keys.auth
        }
      };

      console.log('📤 Sending subscription to server:', payload);

      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Subscription saved to server:', result);

      // Simpan juga ke IndexedDB sebagai backup
      await indexedDBManager.savePushSubscription(subscription);

      return result;
    } catch (error) {
      console.error('❌ Failed to save subscription to server:', error);

      // Fallback: simpan lokal saja jika server gagal
      try {
        await indexedDBManager.savePushSubscription(subscription);
        console.log('📦 Subscription saved locally as fallback');
      } catch (dbError) {
        console.error('Failed to save subscription locally:', dbError);
      }

      throw error;
    }
  }

  // PERBAIKAN: Endpoint unsubscribe yang benar
  async removeSubscriptionFromServer() {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.warn('No authentication token found');
        return;
      }

      // PERBAIKAN: Kirim endpoint subscription untuk unsubscribe
      const payload = this.subscription ? {
        endpoint: this.subscription.endpoint
      } : {};

      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST', // Menggunakan POST dengan payload
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('✅ Subscription removed from server');

      // Hapus juga dari IndexedDB
      await indexedDBManager.removePushSubscription();

    } catch (error) {
      console.error('❌ Failed to remove subscription from server:', error);

      // Tetap hapus dari local storage
      try {
        await indexedDBManager.removePushSubscription();
        console.log('🗑️ Subscription removed locally');
      } catch (dbError) {
        console.error('Failed to remove subscription locally:', dbError);
      }
    }
  }

  async isSubscribed() {
    if (!this.isSupported) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return false;
    }
  }

  async getSubscription() {
    if (!this.isSupported) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      return await registration.pushManager.getSubscription();
    } catch (error) {
      console.error('Failed to get subscription:', error);
      return null;
    }
  }

  /**
   * Menampilkan notifikasi ketika story berhasil ditambahkan
   */
  async showStoryAddedNotification(storyData) {
    try {
      // Cek permission terlebih dahulu
      if (!this.hasPermission()) {
        console.warn('Tidak ada permission untuk notifikasi');
        return false;
      }

      // Default notification options
      const options = {
        body: storyData.body || 'Cerita baru berhasil ditambahkan ke koleksi Anda',
        icon: storyData.icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: storyData.tag || 'story-added',
        requireInteraction: false,
        silent: false,
        data: {
          type: 'story-added',
          timestamp: Date.now(),
          ...storyData.data
        },
        actions: [{
            action: 'view',
            title: 'Lihat Stories'
          },
          {
            action: 'close',
            title: 'Tutup'
          }
        ]
      };

      // Kirim notifikasi melalui service worker jika ada
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(
          storyData.title || 'Story Berhasil Ditambahkan!', 
          options
        );
        console.log('✅ Notifikasi story berhasil ditampilkan via service worker');
        return true;
      }

      // Fallback ke Notification API langsung
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(storyData.title || 'Story Berhasil Ditambahkan!', options);
        console.log('✅ Notifikasi story berhasil ditampilkan via Notification API');
        return true;
      }

      console.warn('Tidak dapat menampilkan notifikasi - tidak ada service worker atau permission');
      return false;

    } catch (error) {
      console.error('❌ Error menampilkan notifikasi story:', error);
      return false;
    }
  }

  /**
   * Cek apakah ada permission untuk notifikasi
   */
  hasPermission() {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  /**
   * Method untuk cleanup jika diperlukan
   */
  cleanup() {
    console.log('PushNotificationManager cleanup');
  }

  // Notifikasi ketika PWA berhasil diinstall
  showPWAInstalledNotification() {
    if (!this.isSupported || Notification.permission !== 'granted') {
      console.warn('Notifications not available');
      return;
    }

    const notification = new Notification('🎉 Story App Terinstall!', {
      body: 'Aplikasi sudah siap digunakan offline',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'pwa-installed',
      requireInteraction: false,
      silent: false
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto close after 6 seconds
    setTimeout(() => {
      notification.close();
    }, 6000);

    return notification;
  }

  // Setup listener untuk PWA install
  setupPWAInstallListener() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA install prompt available');
      this.deferredPrompt = e;
    });

    // Listen for appinstalled event
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');

      // Tampilkan notifikasi setelah install
      setTimeout(() => {
        this.showPWAInstalledNotification();
      }, 1000);
    });

    // Detect if app is launched in standalone mode (PWA)
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App is running in standalone mode');
    }
  }

  // Method untuk trigger install PWA secara manual
  async promptPWAInstall() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('User accepted PWA install');
      } else {
        console.log('User dismissed PWA install');
      }

      this.deferredPrompt = null;
    }
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export default PushNotificationService;