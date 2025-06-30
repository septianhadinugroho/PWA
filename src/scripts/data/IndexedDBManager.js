import { openDB } from 'idb';

class IndexedDBManager {
  constructor() {
    this.dbName = 'StoryAppDB';
    this.dbVersion = 1;
    this.db = null;
  }

  async init() {
    try {
      this.db = await openDB(this.dbName, this.dbVersion, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('stories')) {
            const storiesStore = db.createObjectStore('stories', {
              keyPath: 'id'
            });
            storiesStore.createIndex('createdAt', 'createdAt');
            storiesStore.createIndex('userId', 'userId');
          }

          if (!db.objectStoreNames.contains('users')) {
            // eslint-disable-next-line no-unused-vars
            const usersStore = db.createObjectStore('users', {
              keyPath: 'userId'
            });
          }

          if (!db.objectStoreNames.contains('offlineActions')) {
            const offlineStore = db.createObjectStore('offlineActions', {
              keyPath: 'id',
              autoIncrement: true
            });
            offlineStore.createIndex('timestamp', 'timestamp');
            offlineStore.createIndex('action', 'action');
          }

          if (!db.objectStoreNames.contains('subscriptions')) {
            // eslint-disable-next-line no-unused-vars
            const subscriptionsStore = db.createObjectStore('subscriptions', {
              keyPath: 'endpoint'
            });
          }

          if (!db.objectStoreNames.contains('settings')) {
            // eslint-disable-next-line no-unused-vars
            const settingsStore = db.createObjectStore('settings', {
              keyPath: 'key'
            });
          }
        }
      });

      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('IndexedDB initialized successfully');
      }
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize IndexedDB:', error);
      throw error;
    }
  }

  async saveStories(stories) {
    if (!this.db) await this.init();

    try {
      const tx = this.db.transaction('stories', 'readwrite');
      const store = tx.objectStore('stories');

      for (const story of stories) {
        await store.put({
          ...story,
          cachedAt: new Date().toISOString()
        });
      }

      await tx.done;
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log(`Saved ${stories.length} stories to IndexedDB`);
      }
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save stories:', error);
      throw error;
    }
  }

  async getStories(limit = 20) {
    if (!this.db) await this.init();

    try {
      const tx = this.db.transaction('stories', 'readonly');
      const store = tx.objectStore('stories');
      const index = store.index('createdAt');
      
      const stories = await index.getAll();
      
      return stories
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get stories from IndexedDB:', error);
      return [];
    }
  }

  async getStoryById(id) {
    if (!this.db) await this.init();

    try {
      const story = await this.db.get('stories', id);
      return story || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get story by id:', error);
      return null;
    }
  }

  async deleteStory(id) {
    if (!this.db) await this.init();

    try {
      await this.db.delete('stories', id);
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete story:', error);
      throw error;
    }
  }

  async clearStories() {
    if (!this.db) await this.init();

    try {
      await this.db.clear('stories');
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('All stories cleared from IndexedDB');
      }
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to clear stories:', error);
      throw error;
    }
  }

  async saveUser(user) {
    if (!this.db) await this.init();

    try {
      await this.db.put('users', {
        ...user,
        cachedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save user:', error);
      throw error;
    }
  }

  async getUser(userId) {
    if (!this.db) await this.init();

    try {
      const user = await this.db.get('users', userId);
      return user || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get user:', error);
      return null;
    }
  }

  async saveOfflineAction(action, data) {
    if (!this.db) await this.init();

    try {
      await this.db.add('offlineActions', {
        action,
        data,
        timestamp: new Date().toISOString(),
        synced: false
      });
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('Offline action saved:', action);
      }
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save offline action:', error);
      throw error;
    }
  }

  async getOfflineActions() {
    if (!this.db) await this.init();

    try {
      const tx = this.db.transaction('offlineActions', 'readonly');
      const store = tx.objectStore('offlineActions');
      const actions = await store.getAll();
      
      return actions.filter(action => !action.synced);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get offline actions:', error);
      return [];
    }
  }

  async markActionAsSynced(actionId) {
    if (!this.db) await this.init();

    try {
      const tx = this.db.transaction('offlineActions', 'readwrite');
      const store = tx.objectStore('offlineActions');
      const action = await store.get(actionId);
      
      if (action) {
        action.synced = true;
        action.syncedAt = new Date().toISOString();
        await store.put(action);
      }

      await tx.done;
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to mark action as synced:', error);
      throw error;
    }
  }

  async clearSyncedActions() {
    if (!this.db) await this.init();

    try {
      const tx = this.db.transaction('offlineActions', 'readwrite');
      const store = tx.objectStore('offlineActions');
      const actions = await store.getAll();
      
      for (const action of actions) {
        if (action.synced) {
          await store.delete(action.id);
        }
      }

      await tx.done;
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('Synced actions cleared');
      }
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to clear synced actions:', error);
      throw error;
    }
  }

  async saveSubscription(subscription) {
    if (!this.db) await this.init();

    try {
      await this.db.put('subscriptions', {
        ...subscription.toJSON(),
        savedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save subscription:', error);
      throw error;
    }
  }

  async getSubscription() {
    if (!this.db) await this.init();

    try {
      const subscriptions = await this.db.getAll('subscriptions');
      return subscriptions[0] || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get subscription:', error);
      return null;
    }
  }

  async removeSubscription() {
    if (!this.db) await this.init();

    try {
      await this.db.clear('subscriptions');
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to remove subscription:', error);
      throw error;
    }
  }

  async saveSetting(key, value) {
    if (!this.db) await this.init();

    try {
      await this.db.put('settings', {
        key,
        value,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save setting:', error);
      throw error;
    }
  }

  async getSetting(key, defaultValue = null) {
    if (!this.db) await this.init();

    try {
      const setting = await this.db.get('settings', key);
      return setting ? setting.value : defaultValue;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get setting:', error);
      return defaultValue;
    }
  }

  async getAllSettings() {
    if (!this.db) await this.init();

    try {
      const settings = await this.db.getAll('settings');
      const settingsObj = {};
      
      settings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });

      return settingsObj;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get all settings:', error);
      return {};
    }
  }

  async getStorageUsage() {
    if (!this.db) await this.init();

    try {
      const estimate = await navigator.storage.estimate();
      const storiesCount = await this.db.count('stories');
      const usersCount = await this.db.count('users');
      const actionsCount = await this.db.count('offlineActions');

      return {
        quota: estimate.quota,
        usage: estimate.usage,
        available: estimate.quota - estimate.usage,
        storiesCount,
        usersCount,
        actionsCount
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get storage usage:', error);
      return null;
    }
  }

  async clearAllData() {
    if (!this.db) await this.init();

    try {
      const tx = this.db.transaction(['stories', 'users', 'offlineActions', 'settings'], 'readwrite');
      
      await Promise.all([
        tx.objectStore('stories').clear(),
        tx.objectStore('users').clear(),
        tx.objectStore('offlineActions').clear(),
        tx.objectStore('settings').clear()
      ]);

      await tx.done;
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('All data cleared from IndexedDB');
      }
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }

  async syncWhenOnline() {
    if (!navigator.onLine) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('Still offline, skipping sync');
      }
      return false;
    }

    try {
      const actions = await this.getOfflineActions();
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log(`Found ${actions.length} offline actions to sync`);
      }

      for (const action of actions) {
        try {
          await this.processOfflineAction(action);
          await this.markActionAsSynced(action.id);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to sync action:', action, error);
        }
      }

      await this.clearSyncedActions();
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to sync offline actions:', error);
      return false;
    }
  }

  async processOfflineAction(action) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Processing offline action:', action);
    }
  }

  async getPushSubscription() {
    if (!this.db) await this.init();

    try {
      const subscriptions = await this.db.getAll('subscriptions');
      return subscriptions[0] || null;
    } catch (error) {
      console.error('Failed to get push subscription:', error);
      return null;
    }
  }

  async savePushSubscription(subscription) {
    if (!this.db) await this.init();

    try {
      await this.db.put('subscriptions', {
        ...subscription.toJSON(),
        savedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Failed to save push subscription:', error);
      throw error;
    }
  }

  async removePushSubscription() {
    if (!this.db) await this.init();

    try {
      await this.db.clear('subscriptions');
      return true;
    } catch (error) {
      console.error('Failed to remove push subscription:', error);
      throw error;
    }
  }
}

const indexedDBManager = new IndexedDBManager();

export default indexedDBManager;