import { navigateWithTransition } from '../../utils/view-transition.js';

export class Navigation {
  static render(authState = false) {
    return `
      <nav id="navigation-drawer" aria-label="Main navigation">
        <div class="nav-header">
          <div class="connection-status">
            <span class="status-indicator ${navigator.onLine ? 'online' : 'offline'}" 
                  title="${navigator.onLine ? 'Online' : 'Offline'}">
              ${navigator.onLine ? '🟢' : '🔴'}
            </span>
            <span class="status-text">${navigator.onLine ? 'Online' : 'Offline'}</span>
          </div>
        </div>
        
        <ul class="nav-list">
          <li><a href="#/" data-nav="home" aria-current="page">🏠 Beranda</a></li>
          <li><a href="#/about" data-nav="about">ℹ️ Tentang</a></li>
          ${authState ? `
            <li><a href="#/add" data-nav="add">➕ Tambah Cerita</a></li>
            <li><a href="#/offline-stories" data-nav="offline-stories">📱 Cerita Offline</a></li>
            <li><a href="#/data-management" data-nav="data-management">💾 Kelola Data</a></li>
            <li class="nav-divider"></li>
            <li><button id="logout-btn" class="logout-button">🚪 Keluar</button></li>
          ` : `
            <li><a href="#/login" data-nav="login">🔑 Masuk</a></li>
            <li><a href="#/register" data-nav="register">📝 Daftar</a></li>
          `}
        </ul>

        <style>
          #navigation-drawer {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 0;
            min-height: 100vh;
            width: 100%;
            box-shadow: 2px 0 10px rgba(0,0,0,0.1);
          }

          .nav-header {
            padding: 0 20px 20px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
            margin-bottom: 20px;
          }

          .connection-status {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9em;
            opacity: 0.9;
          }

          .status-indicator {
            font-size: 1.1em;
            display: inline-block;
          }

          .status-text {
            font-weight: 500;
          }

          .nav-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .nav-list li {
            margin: 0;
          }

          .nav-list a,
          .nav-list button {
            display: block;
            padding: 15px 20px;
            color: white;
            text-decoration: none;
            transition: all 0.3s ease;
            border: none;
            background: none;
            width: 100%;
            text-align: left;
            font-size: 1em;
            cursor: pointer;
            font-family: inherit;
          }

          .nav-list a:hover,
          .nav-list button:hover {
            background-color: rgba(255,255,255,0.1);
            padding-left: 30px;
            transform: translateX(5px);
          }

          .nav-list a[aria-current="page"] {
            background-color: rgba(255,255,255,0.2);
            font-weight: 600;
            border-left: 4px solid white;
          }

          .nav-divider {
            height: 1px;
            background: rgba(255,255,255,0.2);
            margin: 10px 0;
          }

          .logout-button {
            color: #ffcccb !important;
            font-weight: 500;
          }

          .logout-button:hover {
            background-color: rgba(255,0,0,0.1) !important;
            color: #ff9999 !important;
          }

          /* Mobile responsiveness */
          @media (max-width: 768px) {
            #navigation-drawer {
              min-height: auto;
            }
            
            .nav-list a,
            .nav-list button {
              padding: 12px 16px;
              font-size: 0.95em;
            }
            
            .nav-header {
              padding: 0 16px 16px 16px;
            }
          }

          /* Animation for status changes */
          .status-indicator {
            transition: all 0.3s ease;
          }

          .status-indicator.online {
            animation: pulse-green 2s infinite;
          }

          .status-indicator.offline {
            animation: pulse-red 2s infinite;
          }

          @keyframes pulse-green {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
          }

          @keyframes pulse-red {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        </style>
      </nav>
    `;
  }

  static afterRender(authState = false) {
    // Handle navigation links
    document.querySelectorAll('a[data-nav]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const page = link.getAttribute('data-nav');
        
        // Update active state
        document.querySelectorAll('a[data-nav]').forEach(l => {
          l.removeAttribute('aria-current');
        });
        link.setAttribute('aria-current', 'page');
        
        navigateWithTransition(page);
      });
    });

    // Handle logout
    if (authState) {
      const logoutBtn = document.getElementById('logout-btn');
      logoutBtn?.addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin keluar?')) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('userName');
          localStorage.removeItem('userEmail');
          navigateWithTransition('');
        }
      });
    }

    // Handle online/offline status updates
    this.setupConnectionStatusListener();
  }

  static setupConnectionStatusListener() {
    const updateConnectionStatus = (isOnline) => {
      const statusIndicator = document.querySelector('.status-indicator');
      const statusText = document.querySelector('.status-text');
      
      if (statusIndicator && statusText) {
        statusIndicator.innerHTML = isOnline ? '🟢' : '🔴';
        statusIndicator.title = isOnline ? 'Online' : 'Offline';
        statusIndicator.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
        statusText.textContent = isOnline ? 'Online' : 'Offline';
      }
    };

    // Listen for online/offline events
    window.addEventListener('online', () => updateConnectionStatus(true));
    window.addEventListener('offline', () => updateConnectionStatus(false));
  }

  static updateActiveNav(currentPage) {
    // Update active navigation state when page changes
    document.querySelectorAll('a[data-nav]').forEach(link => {
      link.removeAttribute('aria-current');
      if (link.getAttribute('data-nav') === currentPage) {
        link.setAttribute('aria-current', 'page');
      }
    });
  }
}