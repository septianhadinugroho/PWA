import HomePresenter from '../../../presenter/home-presenter';
import CONFIG from '../../../core/Config.js';
import { showFormattedDate } from '../../../utils/date-formatter';
import * as maptiler from '@maptiler/sdk';
import '../../../../../public/maptiler/maptiler-sdk.css';
import { navigateWithTransition } from '../../../utils/view-transition.js';
import PushNotificationService from '../../../utils/PushNotificationManager.js';
import indexedDBManager from '../../../data/IndexedDBManager.js';

class HomePage {
  constructor() {
    this.presenter = null;
  }

  async render() {
    const isLoggedIn = !!localStorage.getItem('accessToken');

    return `
      <a href="#main-content" class="skip-link">Lompati konten utama</a>
      <main id="main-content">
        <section class="container" aria-labelledby="stories-heading">
          <h2 id="stories-heading">
            ${isLoggedIn ? 'Daftar Cerita' : 'Selamat Datang Di Story App'}
          </h2>
          
          <div id="loading-indicator" 
              class="loading" 
              hidden 
              aria-live="polite"
              aria-busy="true"
              role="status">
              <p class="visually-hidden">Memuat cerita...</p>
          </div>

          <button id="enable-push-btn">Aktifkan Notifikasi</button>
          
          ${isLoggedIn ? `
            <section aria-labelledby="story-section-heading">
              <h2 id="story-section-heading" class="visually-hidden">Daftar cerita pengguna</h2>
              <ul id="stories" class="stories-list">
                <!-- <li><article>...</article></li> will be rendered dynamically -->
              </ul>
            </section>

            <div id="map-container" class="map-container">
              <h3 id="map-heading" class="visually-hidden">Peta lokasi cerita</h3>
              <div id="map" 
                  style="height: 400px; margin-top: 2rem;" 
                  aria-labelledby="map-heading">
              </div>
            </div>
          ` : `
            <div class="auth-message">
              <p>Silakan login terlebih dahulu untuk melihat cerita.</p>
              <a href="#/login" class="btn-login">
                <span>Login Sekarang</span>
                <span class="visually-hidden">, halaman login</span>
              </a>
            </div>
          `}

        </section>
      </main>
    `;
  }

  async afterRender() {
    const pushService = new PushNotificationService();
    const enableBtn = document.getElementById('enable-push-btn');
    enableBtn?.addEventListener('click', async () => {
      const granted = await pushService.requestPermission();
        if (granted) {
          await pushService.subscribe();
          alert('Notifikasi diaktifkan!');
        }
    });

    this.presenter = new HomePresenter(this);

    if (!localStorage.getItem('accessToken')) {
      this._setupLoginButton();
      return;
    }

    this.map = this.initMap();

    await this.presenter.loadStories();

    document.querySelectorAll('.save-offline-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const raw = e.target.dataset.story;
        if (!raw) return;

        const story = JSON.parse(raw);
        await indexedDBManager.saveStories([story]);
        alert('Cerita disimpan ke offline!');
      });
    });
  }

  _setupLoginButton() {
    const btnLogin = document.getElementById('btn-login');
    if (btnLogin) {
      btnLogin.addEventListener('click', (e) => {
        e.preventDefault();
        navigateWithTransition('login');
      });
    }
  }

  showLoading() {
    document.getElementById('loading-indicator').hidden = false;
  }

  hideLoading() {
    document.getElementById('loading-indicator').hidden = true;
  }

  showStories(stories) {
    const storiesContainer = document.getElementById('stories');
    if (!storiesContainer) return;

    storiesContainer.innerHTML = '';

    if (!Array.isArray(stories)) {
      // eslint-disable-next-line no-console
      console.error('Invalid stories data:', stories);
      storiesContainer.innerHTML = '<p class="error">Data tidak valid</p>';
      return;
    }

    const mapInstance = this.map;

    stories.forEach(story => {
      this.renderStory(story, mapInstance, storiesContainer);
    });
  }

  initMap() {
    try {
      if (!navigator.onLine) {
        console.warn('[Offline] Lewati inisialisasi MapTiler');
        return null;
      }

      maptiler.config.apiKey = CONFIG.MAPTILER_API_KEY;
      return new maptiler.Map({
        container: 'map',
        style: maptiler.MapStyle.STREETS,
        center: [106.8, -6.2],
        zoom: 5,
        interactive: true
      });

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Map init error:', error);
      return null;
    }
  }

  renderStory(story, map, container) {
    const listItem = document.createElement('li');
    const storyItem = document.createElement('article');
    storyItem.classList.add('story-item');
    storyItem.innerHTML = this.getStoryHTML(story);

    const saveButton = document.createElement('button');
    saveButton.classList.add('save-offline-btn');
    saveButton.textContent = 'Simpan Offline';
    saveButton.dataset.story = JSON.stringify(story);
    storyItem.appendChild(saveButton);

    listItem.appendChild(storyItem);
    container.appendChild(listItem);

    const lat = parseFloat(story.lat);
  const lon = parseFloat(story.lon);
  
  if (!isNaN(lat) && !isNaN(lon) && 
      lat >= -90 && lat <= 90 && 
      lon >= -180 && lon <= 180) {
      this.addStoryMarker(story, map, storyItem);
    } else {
      console.warn(`Story ${story.id || 'unknown'} has invalid coordinates: lat=${story.lat}, lon=${story.lon}`);
    }
  }

  getStoryHTML(story) {
    const imageUrl = story.photoUrl?.replace('http://', 'https://');

    return `
    <div class="story-image-container">
      <img src="${imageUrl}" 
           alt="Foto cerita oleh ${story.name}"
           loading="lazy"
           crossorigin="anonymous"
           onerror="this.onerror=null;this.src='./images/placeholder.svg'">
    </div>
    <div class="story-info">
      <h3>${story.name}</h3>
      <p>${story.description}</p>
      <small>${showFormattedDate(story.createdAt, 'id-ID')}</small>
    </div>
  `;
  }

  addStoryMarker(story, map, storyItem) {
    if (!map) return;

    // Validasi koordinat
    const lat = parseFloat(story.lat);
    const lon = parseFloat(story.lon);

    // Cek apakah koordinat valid
    if (isNaN(lat) || isNaN(lon)) {
      console.warn(`Invalid coordinates for story ${story.id}: lat=${story.lat}, lon=${story.lon}`);
      return;
    }

    // Cek rentang koordinat yang valid
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      console.warn(`Coordinates out of range for story ${story.id}: lat=${lat}, lon=${lon}`);
      return;
    }

    try {
      const marker = new maptiler.Marker({
          color: '#FF6D00',
          draggable: false
        })
        .setLngLat([lon, lat]) // Gunakan nilai yang sudah divalidasi
        .setPopup(new maptiler.Popup().setHTML(this.getPopupHTML(story)))
        .addTo(map);

      storyItem.addEventListener('click', (e) => {
        e.preventDefault();

        map.flyTo({
          center: [lon, lat], // Gunakan nilai yang sudah divalidasi
          zoom: 14,
          essential: true
        });

        setTimeout(() => {
          marker.togglePopup();
        }, 1000);
      });
    } catch (error) {
      console.error(`Failed to add marker for story ${story.id}:`, error);
    }
  }

  getPopupHTML(story) {
    return `
      <strong>${story.name}</strong><br />
      <img src="${story.photoUrl}" alt="Foto cerita oleh ${story.name}" width="100" /><br />
      ${story.description}<br />
      <small>${showFormattedDate(story.createdAt, 'id-ID')}</small>
    `;
  }

  showEmptyMessage() {
    const storiesContainer = document.getElementById('stories');
    storiesContainer.innerHTML = '<p class="empty-message">Belum ada cerita dengan lokasi.</p>';
  }

  showError(message) {
    const storiesContainer = document.getElementById('stories');
    if (!storiesContainer) return;

    storiesContainer.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
        <button onclick="window.location.reload()">Coba Lagi</button>
      </div>
    `;
  }

  navigateToLogin() {
    navigateWithTransition('login');
  }

  navigateToAddStory() {
    navigateWithTransition('add');
  }
}

export default HomePage;