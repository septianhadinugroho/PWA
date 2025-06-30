import { registerSW } from 'virtual:pwa-register';
registerSW();

import.meta.env.PROD 
  ? import('/styles/styles.css')
  : document.head.insertAdjacentHTML(
      'beforeend',
      '<link rel="stylesheet" href="/styles/styles.css">'
    );

import App from './core/app';
import { AppView } from './view/app-view';
import PushNotificationService from './utils/PushNotificationManager';

const cameraManager = {
  activeStream: null,
  init() {
    window.addEventListener('beforeunload', this.cleanup);
    window.addEventListener('hashchange', this.cleanup);
  },
  cleanup() {
    if (this.activeStream) {
      console.log('Cleaning up camera tracks');
      this.activeStream.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped track: ${track.kind}`);
      });
      this.activeStream = null;
    }
  }
};

const initApp = async () => {
  try {
    cameraManager.init();

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

    const skipLink = document.querySelector('.skip-link');
    skipLink?.addEventListener('click', (e) => {
      e.preventDefault();
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
    });

    const handleNavigation = async () => {
      cameraManager.cleanup();

      const protectedRoutes = ['#/add', '#/profile'];
      const currentRoute = window.location.hash;

      if (!localStorage.getItem('accessToken') && protectedRoutes.includes(currentRoute)) {
        window.location.href = '#/';
        window.location.reload();
        return;
      }

      await app.renderPage();
    };

    await handleNavigation();

    window.addEventListener('hashchange', handleNavigation);

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled rejection:', event.reason);

      if (event.reason.message.includes('Failed to fetch')) {
        event.preventDefault();
        alert('Network error. Please check your connection');
        return false;
      }

      if (event.reason.message.includes('camera') || 
          event.reason.message.includes('permission')) {
        cameraManager.cleanup();
      }

      if (event.reason.message.includes('401')) {
        localStorage.removeItem('accessToken');
        window.dispatchEvent(new CustomEvent('auth-change'));
      }
    });

    // 🔔 Inisialisasi dan subscribe ke Push Notification
    const pushService = new PushNotificationService();
    const permissionGranted = await pushService.init();
    if (permissionGranted) {
      const granted = await pushService.requestPermission();
      if (granted) {
        await pushService.subscribe();
      }
    }

  } catch (error) {
    console.error('App initialization failed:', error);

    document.body.innerHTML = `
      <div class="error-screen">
        <h2>Application Error</h2>
        <p>${error.message}</p>
        <div class="error-actions">
          <button onclick="window.location.reload()">Refresh Page</button>
          <button onclick="window.location.href='#/'">Go to Homepage</button>
        </div>
      </div>
    `;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

if (!navigator.onLine) {
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {});
    import.meta.hot = undefined;
  }

  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url) {
    if (url.includes('localhost:5173')) {
      console.log('[Offline] Blocking Vite WebSocket connection');
      return {
        send: () => {},
        close: () => {},
        get readyState() { return 3; },
        addEventListener: () => {},
        removeEventListener: () => {}
      };
    }
    return new originalWebSocket(url);
  };

  window.addEventListener('error', (e) => {
    if (e.message.includes('WebSocket') || e.message.includes('HMR')) {
      e.preventDefault();
      console.log('[Offline] WebSocket/HMR error suppressed');
      return false;
    }
  });
}