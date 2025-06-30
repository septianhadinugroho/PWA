import { defineConfig } from 'vite';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Root project adalah direktori utama, bukan 'src'
  // root: './', // Menghapus ini agar Vite menggunakan root folder proyek secara default
  
  server: {
    proxy: {
      '/api': {
        target: 'https://story-api.dicoding.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/v1'),
        secure: false,
      },
    },
  },

  // publicDir sekarang relatif terhadap root proyek
  publicDir: 'public',

  build: {
    // outDir sekarang relatif terhadap root proyek
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Path input harus relatif terhadap root proyek
        main: resolve(__dirname, 'src/index.html'),
      },
    },
    manifest: true,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'injectManifest',
      // Konfigurasi injectManifest harus berada di dalam objek utama
      srcDir: 'src',
      filename: 'sw-backup.js', // Nama file service worker Anda di dalam srcDir
      
      manifest: {
        name: "Story App - Berbagi Cerita dengan Lokasi",
        short_name: "StoryApp",
        description: "Aplikasi berbagi cerita dengan lokasi menggunakan kamera dan GPS",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#2563eb",
        orientation: "portrait",
        scope: "/",
        lang: "id",
        icons: [{
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ],
        screenshots: [{
            src: "/screenshots/StoryApp_001.png",
            sizes: "1886x914",
            type: "image/png",
            form_factor: "wide"
          },
          {
            src: "/screenshots/StoryApp_002.png",
            sizes: "1889x917",
            type: "image/png",
            form_factor: "wide"
          },
          {
            src: "/screenshots/StoryApp_003.png",
            sizes: "1883x916",
            type: "image/png",
            form_factor: "wide"
          },
          {
            src: "/screenshots/StoryApp_004.png",
            sizes: "1885x916",
            type: "image/png",
            form_factor: "wide"
          },
          {
            src: "/screenshots/StoryApp_005.png",
            sizes: "453x791",
            type: "image/png",
            form_factor: "narrow"
          },
          {
            src: "/screenshots/StoryApp_006.png",
            sizes: "445x794",
            type: "image/png",
            form_factor: "narrow"
          },
          {
            src: "/screenshots/StoryApp_007.png",
            sizes: "445x796",
            type: "image/png",
            form_factor: "narrow"
          },
          {
            src: "/screenshots/StoryApp_008.png",
            sizes: "451x796",
            type: "image/png",
            form_factor: "narrow"
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
});