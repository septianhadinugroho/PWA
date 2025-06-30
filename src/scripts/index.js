import { registerSW } from 'virtual:pwa-register';
import App from './core/app';
import { AppView } from './view/app-view';
import PushNotificationService from './utils/PushNotificationManager';
import indexedDBManager from './data/IndexedDBManager';

// Registrasi Service Worker dari VitePWA
registerSW({
  onRegistered(r) {
    console.log('Service Worker terdaftar:', r);
  },
  onRegisterError(error) {
    console.error('Registrasi Service Worker gagal:', error);
  },
});

// Load CSS
import.meta.env.PROD 
  ? import('/styles/styles.css')
  : document.head.insertAdjacentHTML(
      'beforeend',
      '<link rel="stylesheet" href="/styles/styles.css">'
    );

const cameraManager = {
  activeStream: null,
  init() {
    window.addEventListener('beforeunload', this.cleanup);
    window.addEventListener('hashchange', this.cleanup);
  },
  cleanup() {
    if (this.activeStream) {
      console.log('Cleaning up camera tracks');
      this.activeStream.getTracks().forEach(track => track.stop());
      this.activeStream = null;
    }
  }
};

const initApp = async () => {
  try {
    cameraManager.init();
    await indexedDBManager.init(); // Inisialisasi IndexedDB
    console.log('IndexedDB Manager initialized successfully');

    const appView = new AppView();
    const navigationDrawer = document.getElementById('navigation-drawer');
    const drawerButton = document.getElementById('drawer-button');
    const mainContent = document.getElementById('main-content');

    if (!drawerButton || !navigationDrawer || !mainContent) {
      throw new Error('Essential elements not found in DOM');
    }

    const app = new App({
      content: mainContent,
      drawerButton,
      navigationDrawer,
      appView
    });

    appView.setupSkipLink();
    
    const handleNavigation = async () => {
      cameraManager.cleanup();
      await app.renderPage();
    };

    await handleNavigation();
    window.addEventListener('hashchange', handleNavigation);

    // Inisialisasi Push Notification setelah app siap
    const pushService = new PushNotificationService();
    await pushService.init();

  } catch (error) {
    console.error('App initialization failed:', error);
    document.body.innerHTML = `
      <div class="error-screen" style="padding: 2rem; text-align: center;">
        <h2>Application Error</h2>
        <p>${error.message}</p>
        <button onclick="window.location.reload()">Refresh Page</button>
      </div>
    `;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}