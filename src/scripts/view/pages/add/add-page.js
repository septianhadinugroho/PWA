import AddStoryPresenter from '../../../presenter/add-story-presenter';
import {
    navigateWithTransition
} from '../../../utils/view-transition';
import CONFIG from '../../../core/Config';
import * as maptiler from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import PushNotificationService from '../../../utils/PushNotificationManager.js';

let stream;
let map;

class AddPage {
    constructor() {
        this.presenter = new AddStoryPresenter(this);
        try {
            this.pushService = new PushNotificationService();
        } catch (error) {
            console.warn('Push notification tidak tersedia:', error);
            this.pushService = null;
        }
    }

    async render() {
        return `
            <a href="#main-content" class="skip-link">Lompati navigasi</a>
            <main id="main-content">
                <section class="container" aria-labelledby="add-story-heading">
                <div class="card">
                    <h2 id="add-story-heading" class="title">
                    <i class="fas fa-plus-circle" aria-hidden="true"></i> Tambah Cerita Baru
                    </h2>
                    
                    <div id="formErrors" class="error-container" aria-live="assertive"></div>
                    
                    <form id="story-form" class="form">
                    <div class="form-group">
                        <label for="description" id="desc-label">
                        <i class="fas fa-align-left" aria-hidden="true"></i> Deskripsi Cerita
                        </label>
                        <textarea 
                            id="description" 
                            name="description" 
                            required 
                            aria-required="true"
                            aria-labelledby="desc-label"
                            placeholder="Ceritakan pengalaman menarik Anda..."
                        ></textarea>
                    </div>

                    <div class="form-group">
                        <label id="camera-label">
                        <i class="fas fa-camera" aria-hidden="true"></i> Ambil Foto
                        </label>
                        <div class="camera-container" aria-labelledby="camera-label">
                        <video id="video" autoplay playsinline aria-label="Live camera feed"></video>
                        <canvas id="canvas" aria-hidden="true" style="display: none;"></canvas>
                        <button 
                            type="button" 
                            id="capture" 
                            class="btn" 
                            aria-label="Ambil gambar dari kamera"
                        >
                            <i class="fas fa-camera-retro" aria-hidden="true"></i> Ambil Gambar
                        </button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label id="map-label">
                            <i class="fas fa-map-marker-alt" aria-hidden="true"></i> Pilih Lokasi
                        </label>
                        <h5>Silahkan klik salah satu wilayah pada map untuk menampilkan marker</h5>
                        <div 
                            id="map" 
                            aria-labelledby="map-label" 
                            aria-label="Peta untuk memilih lokasi"
                            tabindex="0"
                        ></div>
                        <input type="hidden" id="lat" name="lat" aria-label="Latitude" />
                        <input type="hidden" id="lon" name="lon" aria-label="Longitude" />
                    </div>

                    <button type="submit" class="btn-submit">
                        <i class="fas fa-paper-plane" aria-hidden="true"></i> Kirim Cerita
                    </button>
                    </form>
                </div>
                </section>
            </main>
        `;
    }

    cleanup() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        if (map) {
            map.remove();
            map = null;
        }
        if (this.pushService && typeof this.pushService.cleanup === 'function') {
            this.pushService.cleanup();
        }
    }

    async afterRender() {
        window.addEventListener('hashchange', this.cleanup.bind(this));

        await new Promise(resolve => requestAnimationFrame(resolve));

        maptiler.config.apiKey = CONFIG.MAPTILER_API_KEY;
        this.initMap();
        this.initCamera();
        this.setupForm();
    }

    initMap() {
        if (!navigator.onLine) {
            console.warn('[Offline] Lewati inisialisasi MapTiler');
            return;
        }

        try {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) {
                throw new Error('Map container not found');
            }

            mapContainer.style.minHeight = '400px';

            map = new maptiler.Map({
                container: 'map',
                style: maptiler.MapStyle.STREETS,
                center: [106.8, -6.2],
                zoom: 12,
                accessibility: true
            });

            map.on('load', () => {
                console.log('Map loaded');

                let marker = null;
                map.on('click', (e) => {
                    const {
                        lng,
                        lat
                    } = e.lngLat;
                    document.getElementById('lat').value = lat;
                    document.getElementById('lon').value = lng;

                    if (marker) marker.remove();
                    marker = new maptiler.Marker({
                            color: '#FF0000'
                        })
                        .setLngLat([lng, lat])
                        .addTo(map);
                });
            });

            map.on('error', (e) => {
                console.error('Map error:', e?.error || e);
                this.showError('Gagal memuat peta. Silakan periksa koneksi internet Anda.');
            });

        } catch (error) {
            console.error('Map init error:', error);
            this.showError('Gagal memuat peta. Periksa koneksi internet Anda.');
        }
    }

    initCamera() {
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const captureBtn = document.getElementById('capture');

        try {
            navigator.mediaDevices.getUserMedia({
                    video: true
                })
                .then((mediaStream) => {
                    stream = mediaStream;
                    video.srcObject = stream;
                })
                .catch(error => {
                    this.showError(`Gagal mengakses kamera: ${error.message}`);
                    captureBtn.disabled = true;
                });
        } catch (error) {
            this.showError('Browser tidak mendukung akses kamera.');
            captureBtn.disabled = true;
        }

        captureBtn.addEventListener('click', () => {
            try {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                video.style.display = 'none';
                canvas.style.display = 'block';
                captureBtn.innerHTML = '<i class="fas fa-camera-retro" aria-hidden="true"></i> Ambil Ulang';
            } catch (error) {
                this.showError('Gagal mengambil gambar. Coba lagi.');
            }
        });
    }

    showLoading() {
        const btnSubmit = document.querySelector('#story-form button[type="submit"]');
        btnSubmit.innerHTML = '<div class="loading-spinner"></div>';
        btnSubmit.disabled = true;
    }

    hideLoading() {
        const btnSubmit = document.querySelector('#story-form button[type="submit"]');
        btnSubmit.innerHTML = '<i class="fas fa-paper-plane" aria-hidden="true"></i> Kirim Cerita';
        btnSubmit.disabled = false;
    }

    setupForm() {
        const form = document.getElementById('story-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const description = document.getElementById('description').value.trim();
            const lat = document.getElementById('lat').value;
            const lon = document.getElementById('lon').value;
            const canvas = document.getElementById('canvas');

            const errors = [];
            if (!description) errors.push('Deskripsi harus diisi');
            if (canvas.style.display !== 'block') errors.push('Silakan ambil gambar terlebih dahulu');
            if (!lat || !lon) errors.push('Silakan pilih lokasi di peta');

            if (errors.length > 0) {
                this.showError(errors.join('<br>'));
                return;
            }

            canvas.toBlob(async (blob) => {
                try {
                    const imageFile = new File([blob], `story-${Date.now()}.jpg`, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });

                    await this.presenter.submitStory({
                        description,
                        photo: imageFile,
                        lat,
                        lon
                    });
                } catch (error) {
                    // Error sudah ditangani presenter
                }
            }, 'image/jpeg', 0.85);
        });
    }

    onSubmissionSuccess(responseData) {
        console.log('Story berhasil dikirim:', responseData);

        if (this.pushService) {
            try {
                this.pushService.showStoryAddedNotification({
                    title: 'Story Berhasil Ditambahkan!',
                    body: responseData.description || 'Cerita baru berhasil ditambahkan',
                    icon: '/icons/icon-192x192.png',
                    tag: 'story-added',
                    data: {
                        storyId: responseData.id,
                        timestamp: Date.now()
                    }
                });
            } catch (error) {
                console.warn('Gagal menampilkan notifikasi:', error);
                // Fallback ke alert atau toast notification
                this.showSuccess('Cerita berhasil ditambahkan!');
            }
        }
        this.resetForm();

        setTimeout(() => {
            navigateWithTransition('');
        }, 5000);
    }

    resetForm() {
        document.getElementById('description').value = '';
        document.getElementById('lat').value = '';
        document.getElementById('lon').value = '';

        const canvas = document.getElementById('canvas');
        const video = document.getElementById('video');
        
        canvas.style.display = 'none';
        video.style.display = 'block';
        
        const captureBtn = document.getElementById('capture');
        if (captureBtn) {
            captureBtn.innerHTML = '<i class="fas fa-camera-retro" aria-hidden="true"></i> Ambil Gambar';
        }
    }

    showSuccess(message) {
        const container = document.getElementById('formErrors');
        if (container) {
            container.innerHTML = `<p class="success-message">${message}</p>`;
            container.scrollIntoView({
                behavior: 'smooth'
            });
        }
    }

    showError(message) {
        const container = document.getElementById('formErrors');
        if (container) {
            container.innerHTML = `<p role="alert">${message}</p>`;
            container.scrollIntoView({
                behavior: 'smooth'
            });
        }
    }

    resetSubmitButton(button) {
        button.innerHTML = '<i class="fas fa-paper-plane" aria-hidden="true"></i> Kirim Cerita';
        button.disabled = false;
    }
}

export default AddPage;