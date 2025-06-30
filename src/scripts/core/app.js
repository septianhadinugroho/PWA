import routes from '../routes/routes';
import {
  getActiveRoute
} from '../routes/url-parser';
import pushNotificationManager from '../utils/PushNotificationManager';
import indexedDBManager from '../data/IndexedDBManager';

const appState = {
  cameraStream: null,
  cleanupCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
      console.log('Camera resources cleaned up');
    }
  }
};

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;
  #navList = null;
  #appView = null;
  #handleError = null;

  constructor({
    navigationDrawer,
    drawerButton,
    content,
    appView
  }) {
    if (!navigationDrawer || !drawerButton || !content || !appView) {
      console.error('Error: Elemen penting tidak ditemukan!');
      return;
    }

    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;
    this.#navList = navigationDrawer.querySelector('.nav-list');
    this.#appView = appView

    this.#setupDrawer();
    this.#updateNavigation();
    this.#setupEventListeners();
    this._initOfflineCapabilities();
    this._checkConnection();
    this._setupImageFallback();
    this._setupMapOfflineHandling();
    this._setupOfflineErrorSuppression();
  }

  #setupEventListeners() {
    window.addEventListener('auth-change', () => this.#updateNavigation());
    window.addEventListener('force-logout', () => this.#handleLogout());
    window.addEventListener('beforeunload', () => appState.cleanupCamera());

    window.addEventListener('hashchange', () => {
      const protectedRoutes = ['#/add', '#/profile'];
      const currentRoute = window.location.hash;

      if (!localStorage.getItem('accessToken') && protectedRoutes.includes(currentRoute)) {
        window.dispatchEvent(new Event('force-logout'));
      }
    });

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered!', registration);
          
          registration.addEventListener('updatefound', () => {
            console.log('New service worker found');
          });
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      });
    }
  }

  #updateNavigation() {
    if (!this.#navList) return;

    const isLoggedIn = !!localStorage.getItem('accessToken');

    this.#navList.innerHTML = `
      <li role="none"><a href="#/" class="nav-link" role="menuitem">Beranda</a></li>
      <li role="none"><a href="#/about" class="nav-link" role="menuitem">Tentang</a></li>
      ${isLoggedIn ? `
        <li role="none"><a href="#/add" class="nav-link" role="menuitem">Tambah Story</a></li>
        <li role="none"><a href="#/data-management" class="nav-link" role="menuitem">Data Tersimpan</a></li>
        <li role="none"><button id="logout-btn" class="nav-button" role="menuitem">Keluar</button></li>
      ` : `
        <li role="none"><a href="#/login" class="nav-link" role="menuitem">Masuk</a></li>
        <li role="none"><a href="#/register" class="nav-link" role="menuitem">Daftar</a></li>
      `}
    `;

    if (isLoggedIn) {
      document.getElementById('logout-btn')
        ?.addEventListener('click', this.#handleLogout);
    }
  }

  #handleLogout = () => {
    appState.cleanupCamera();

    localStorage.clear();

    this.#updateNavigation();

    this.#content.innerHTML = '';

    setTimeout(() => {
      window.location.href = window.location.origin + window.location.pathname + '#/';
      window.location.reload();
    }, 100);
  };

  #setupDrawer() {
    const checkScreenSize = () => {
      const isMobile = window.matchMedia('(max-width: 768px)').matches;

      if (isMobile) {
        this.#drawerButton.style.display = 'block';
        this.#navigationDrawer.classList.add('mobile-menu');
        this.#drawerButton.addEventListener('click', this.toggleMenu.bind(this));
      } else {
        this.#drawerButton.style.display = 'none';
        this.#navigationDrawer.classList.remove('mobile-menu', 'open');
        this.#drawerButton.removeEventListener('click', this.toggleMenu.bind(this));
      }
    };

    document.addEventListener('click', (event) => {
      if (this.#navigationDrawer.classList.contains('open') &&
        !this.#navigationDrawer.contains(event.target) &&
        !this.#drawerButton.contains(event.target)) {
        this.toggleMenu();
      }
    });

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
  }

  toggleMenu() {
    this.#navigationDrawer.classList.toggle('open');
    document.body.style.overflow =
      this.#navigationDrawer.classList.contains('open') ? 'hidden' : 'auto';
  }

  async renderPage() {
    try {
      const url = getActiveRoute();
      const PageComponent = routes[url];
      const main = this.#appView.getMainContent();

      if (!PageComponent) {
        this.#content.innerHTML = '<p>Halaman tidak ditemukan.</p>';
        return;
      }

      appState.cleanupCamera();

      if (!document.startViewTransition) {
        await this.#loadPageContent(PageComponent);
        main.focus();
        return;
      }

      await this.#loadPageContent(PageComponent);

      document.startViewTransition(() => {});

      main.focus();

    } catch (error) {
      console.error('Render error:', error);
      await this.#handleRenderError(error);
    }
  }

  async #loadPageContent(PageComponent) {
    const page = new PageComponent();
    const content = await page.render();

    this.#content.innerHTML = content.length > 10000 ?
      content.substring(0, 10000) + '...' :
      content;

    if (page.afterRender) {
      await page.afterRender();
    }
  }

  async _initOfflineCapabilities() {
    try {
      if (indexedDBManager && typeof indexedDBManager.init === 'function') {
        await indexedDBManager.init();
        console.log('IndexedDB Manager initialized successfully');
      } else {
        console.warn('IndexedDB Manager not available or missing init method');
      }

      if (pushNotificationManager && typeof pushNotificationManager.init === 'function') {
        await pushNotificationManager.init();
        console.log('Push Notification Manager initialized successfully');
      } else {
        console.warn('Push Notification Manager not available or missing init method');
      }

      if (indexedDBManager) {
        this._setupAPICache();
      }
      
      if (pushNotificationManager && indexedDBManager) {
        if (typeof pushNotificationManager.resubscribe === 'function') {
          try {
            const savedSub = await indexedDBManager.getPushSubscription();
            if (savedSub) {
              await pushNotificationManager.resubscribe(savedSub);
            }
          } catch (subError) {
            console.warn('Failed to resubscribe to push notifications:', subError);
          }
        }
      }
      
      if (indexedDBManager && typeof indexedDBManager.syncWhenOnline === 'function') {
        window.addEventListener('online', () => {
          indexedDBManager.syncWhenOnline();
        });
      }

      this._showOfflineStatus();
      
    } catch (error) {
      console.error('Offline capabilities init failed:', error);
      console.warn('Application will continue without offline capabilities');
    }
  }

  _setupAPICache() {
    if (!indexedDBManager) {
      console.warn('Cannot setup API cache: IndexedDB Manager not available');
      return;
    }

    const originalFetch = window.fetch;
    window.fetch = async (url, options) => {
      try {
        const response = await originalFetch(url, options);
        
        if (response.ok && url.includes('/api/')) {
          try {
            await this._cacheAPIResponse(url, response.clone());
          } catch (cacheError) {
            console.warn('Failed to cache API response:', cacheError);
          }
        }
        
        return response;
      } catch (error) {
        if (!navigator.onLine) {
          try {
            const cachedResponse = await this._getCachedAPIResponse(url);
            if (cachedResponse) {
              console.log('Using cached response for:', url);
              return cachedResponse;
            }
          } catch (cacheError) {
            console.warn('Failed to get cached response:', cacheError);
          }
        }
        throw error;
      }
    };
  }

  async _cacheAPIResponse(url, response) {
    if (!indexedDBManager || typeof indexedDBManager.cacheResponse !== 'function') {
      return;
    }
    
    try {
      const responseData = await response.json();
      await indexedDBManager.cacheResponse(url, responseData);
    } catch (error) {
      console.warn('Failed to cache response for', url, error);
    }
  }

  async _getCachedAPIResponse(url) {
    if (!indexedDBManager || typeof indexedDBManager.getCachedResponse !== 'function') {
      return null;
    }
    
    try {
      const cachedData = await indexedDBManager.getCachedResponse(url);
      if (cachedData) {
        return new Response(JSON.stringify(cachedData), {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.warn('Failed to get cached response for', url, error);
    }
    
    return null;
  }

  _checkConnection() {
    if (!navigator.onLine) {
      this._showOfflineUI();
    }
    window.addEventListener('offline', () => this._showOfflineUI());
    window.addEventListener('online', () => this._hideOfflineUI());
  }

  _showOfflineUI() {
    if (!document.getElementById('offline-banner')) {
      const banner = document.createElement('div');
      banner.id = 'offline-banner';
      banner.innerHTML = `
        <div class="offline-warning" style="
          background: #ff6b35;
          color: white;
          padding: 10px;
          text-align: center;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          font-size: 14px;
        ">
          <span>⚠️ Mode Offline - Beberapa konten mungkin tidak tersedia</span>
          <button onclick="this.parentElement.parentElement.remove()" style="
            background: none;
            border: none;
            color: white;
            margin-left: 10px;
            cursor: pointer;
            font-size: 16px;
          ">×</button>
        </div>
      `;
      document.body.prepend(banner);
      
      setTimeout(() => {
        const banner = document.getElementById('offline-banner');
        if (banner) {
          banner.style.opacity = '0.7';
        }
      }, 5000);
    }
  }

  _hideOfflineUI() {
    const banner = document.getElementById('offline-banner');
    if (banner) {
      banner.remove();
    }
  }

  _showOfflineStatus() {
    const updateStatus = () => {
      console.log(`Status: ${navigator.onLine ? 'Online' : 'Offline'}`);
    };

    updateStatus();
    
    window.addEventListener('online', () => {
      updateStatus();
    });

    window.addEventListener('offline', () => {
      updateStatus();
    });
  }

  _setupImageFallback() {
    document.addEventListener('error', (event) => {
      if (event.target.tagName === 'IMG') {
        event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkdhbWJhciB0aWRhayB0ZXJzZWRpYTwvdGV4dD48L3N2Zz4=';
        event.target.alt = 'Gambar tidak tersedia (offline)';
      }
    }, true);
  }

  _setupMapOfflineHandling() {
    if (!navigator.onLine) {
      const mapContainers = document.querySelectorAll('.map-container, #map');
      mapContainers.forEach(container => {
        if (container) {
          container.innerHTML = `
            <div class="offline-map-message">
              <p>🗺️ Peta tidak tersedia saat offline</p>
              <p>Hubungkan ke internet untuk melihat peta</p>
            </div>
          `;
        }
      });
    }
  }

  _setupOfflineErrorSuppression() {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorMessage = args.join(' ');
      
      if (!navigator.onLine && (
        errorMessage.includes('ERR_INTERNET_DISCONNECTED') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('api.maptiler.com') ||
        errorMessage.includes('story-api.dicoding.dev/images')
      )) {
        console.warn('Offline: Resource tidak dapat dimuat -', errorMessage);
        return;
      }
      
      originalConsoleError.apply(console, args);
    };
  }

  async #renderPageContent(PageComponent) {
    const page = new PageComponent();
    this.#content.innerHTML = await page.render();

    await new Promise(resolve => setTimeout(resolve, 50));

    if (page.afterRender) {
      await page.afterRender();
    }
  }

  async #loadPage(PageComponent) {
    appState.cleanupCamera();
    const page = new PageComponent();
    this.#content.innerHTML = await page.render();

    if (page.afterRender) {
      await page.afterRender();
    }
  }


  #animateTransition(transition) {
    const animation = document.documentElement.animate(
      [{
          opacity: 0,
          transform: 'translateY(20px)'
        },
        {
          opacity: 1,
          transform: 'translateY(0)'
        }
      ], {
        duration: 300,
        easing: 'ease-in-out',
      }
    );

    animation.onfinish = () => {
      transition.updateCallbackDone();
    };
  }

  async #handleRenderError(error) {
    this.#content.innerHTML = `
      <div class="error-container" role="alert">
        <p>Terjadi kesalahan saat memuat halaman.</p>
        <div class="error-actions">
          <button onclick="window.location.reload()">Coba Lagi</button>
          <button onclick="window.location.href='#/'">Ke Beranda</button>
        </div>
      </div>
    `;

    if (error.message.includes('401')) {
      setTimeout(() => this.#handleLogout(), 1500);
    }
  }
}

export default App;