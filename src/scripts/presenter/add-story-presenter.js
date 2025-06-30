import { StoryModel } from '../data/model/StoryModel';
import { AuthModel } from '../data/model/AuthModel';
import PushNotificationService from '../utils/PushNotificationManager';

class AddStoryPresenter {
  constructor(view, appPresenter) {
    this.view = view;
    this.appPresenter = appPresenter;
    this.model = new StoryModel();
    this.auth = new AuthModel();
    this.pushService = new PushNotificationService();
  }

  async submitStory(storyData) {
    try {
      this.view.showLoading();

      const token = this.auth.getAccessToken();
      if (!token) {
        throw new Error('Anda harus login terlebih dahulu');
      }

      if (!storyData.photo || storyData.photo.size > 1000000) {
        throw new Error('Ukuran gambar maksimal 1MB (JPEG/PNG)');
      }

      const result = await this.model.postStory(token, storyData);
      
      // PERBAIKAN 1: Trigger push notification setelah berhasil add story
      await this.triggerPushNotification(storyData);
      
      this.view.onSubmissionSuccess(result);

    } catch (error) {
      console.error('Gagal mengirim story:', error);
      this.view.showError(
        error.message.includes('Unsupported Media Type') ?
        'Format gambar tidak valid. Gunakan JPEG/PNG (max 1MB)' :
        error.message
      );
    } finally {
      this.view.hideLoading();
    }
  }

  async triggerPushNotification(storyData) {
    try {
      // Cek apakah user sudah subscribe push notification
      const isSubscribed = await this.pushService.isSubscribed();
      
      if (!isSubscribed) {
        console.log('User belum subscribe push notification');
        return;
      }

      // Kirim push notification otomatis
      const notificationPayload = {
        title: 'Story Berhasil Ditambahkan! 🎉',
        body: `Story "${storyData.description || 'Tanpa deskripsi'}" telah berhasil diupload`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data: {
          url: '/home',
          action: 'story_added',
          timestamp: new Date().toISOString()
        }
      };

      // Karena tidak ada server endpoint, simulasi dengan local notification
      // Dalam implementasi real, ini akan mengirim ke server push service
      await this.sendPushNotificationToSubscribers(notificationPayload);
      
      console.log('✅ Push notification triggered after story submission');
      
    } catch (error) {
      console.error('Gagal mengirim push notification:', error);
      // Jangan throw error, biarkan story tetap berhasil meskipun notifikasi gagal
    }
  }

  async sendPushNotificationToSubscribers(payload) {
    try {
      // Simulasi pengiriman push notification
      // Dalam implementasi real, ini akan mengirim ke server dengan VAPID key
      
      // Untuk demo, kirim local notification langsung
      if (Notification.permission === 'granted') {
        // Delay sedikit untuk simulasi network
        setTimeout(() => {
          this.pushService.showNotification(payload.title, {
            body: payload.body,
            icon: payload.icon,
            badge: payload.badge,
            data: payload.data,
            tag: 'story-added',
            requireInteraction: true
          });
        }, 1000);
      }

      // Log untuk debugging
      console.log('📤 [SIMULASI] Push notification yang akan dikirim:', payload);
      console.log('🔑 Menggunakan VAPID Key:', this.pushService.vapidPublicKey);
      
    } catch (error) {
      console.error('Error dalam simulasi push notification:', error);
    }
  }

  // Method untuk setup push notification saat user pertama kali akses add story
  async setupPushNotificationIfNeeded() {
    try {
      const isSubscribed = await this.pushService.isSubscribed();
      
      if (!isSubscribed) {
        // Tanya user apakah mau enable notification
        const userWantsNotification = confirm(
          'Aktifkan notifikasi untuk mendapat pemberitahuan setelah menambah story?'
        );
        
        if (userWantsNotification) {
          await this.pushService.requestPermission();
          await this.pushService.subscribe();
          console.log('✅ Push notification setup completed');
        }
      }
    } catch (error) {
      console.error('Error setting up push notification:', error);
    }
  }
}

export default AddStoryPresenter;