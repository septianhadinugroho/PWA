import routes from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';

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
    this.#appView = appView;

    this.#setupDrawer();
    this.#updateNavigation();
    this.#setupEventListeners();
    this._checkConnection();
    this._setupImageFallback();
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
    document.body.style.overflow = this.#navigationDrawer.classList.contains('open') ? 'hidden' : 'auto';
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

      if (document.startViewTransition) {
        document.startViewTransition(async () => {
            await this.#loadPageContent(PageComponent);
            main.focus();
        });
      } else {
        await this.#loadPageContent(PageComponent);
        main.focus();
      }
    } catch (error) {
      console.error('Render error:', error);
      await this.#handleRenderError(error);
    }
  }

  async #loadPageContent(PageComponent) {
    const page = new PageComponent();
    this.#content.innerHTML = await page.render();
    if (page.afterRender) {
      await page.afterRender();
    }
  }

  _checkConnection() {
    const updateStatus = (isOnline) => {
        if (isOnline) {
            this._hideOfflineUI();
        } else {
            this._showOfflineUI();
        }
    };
    updateStatus(navigator.onLine);
    window.addEventListener('offline', () => updateStatus(false));
    window.addEventListener('online', () => updateStatus(true));
  }
  
  _showOfflineUI() {
    if (document.getElementById('offline-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.style.cssText = 'background:#ff6b35;color:white;padding:10px;text-align:center;position:fixed;top:0;left:0;right:0;z-index:9999;font-size:14px;';
    banner.innerHTML = '<span>⚠️ Mode Offline - Beberapa fitur mungkin tidak tersedia</span>';
    document.body.prepend(banner);
  }

  _hideOfflineUI() {
    const banner = document.getElementById('offline-banner');
    if (banner) banner.remove();
  }

  _setupImageFallback() {
    document.addEventListener('error', (event) => {
      if (event.target.tagName === 'IMG') {
        event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkdhbWJhciB0aWRhayB0ZXJzZWRpYTwvdGV4dD48L3N2Zz4=';
        event.target.alt = 'Gambar tidak tersedia (offline)';
      }
    }, true);
  }
  
  async #handleRenderError(error) {
    this.#content.innerHTML = `
      <div class="error-container" role="alert">
        <p>Terjadi kesalahan saat memuat halaman.</p>
        <button onclick="window.location.reload()">Coba Lagi</button>
      </div>
    `;
    if (error.message.includes('401')) {
      setTimeout(() => this.#handleLogout(), 1500);
    }
  }
}

export default App;