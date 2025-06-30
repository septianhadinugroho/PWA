import CONFIG from '../../core/Config';
import { Story } from '../model/Story';
import indexedDBManager from '../model/IndexedDBManager';

class StoryRepository {
  constructor() {
    this._setupOnlineSync();
  }

  /**
   * Fetch stories with location data (online/offline)
   * @returns {Promise<Story[]>}
   */
  async getStoriesWithLocation() {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${CONFIG.BASE_URL}/stories?location=1`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const stories = data.listStory.map(story => new Story(story));

      await this._saveStoriesToDB(stories);
      return stories;
    } catch (error) {
      console.warn('Offline mode - loading from cache:', error.message);
      const cachedStories = await indexedDBManager.getStories();
      
      if (!cachedStories.length) {
        throw new Error('No stories available. Please connect to internet to fetch initial data.');
      }
      
      return cachedStories;
    }
  }

  /**
   * Post new story (with offline fallback)
   * @param {Object} payload 
   * @param {string} payload.description
   * @param {Blob} payload.photo
   * @param {number} [payload.lat]
   * @param {number} [payload.lon]
   * @returns {Promise<Object>}
   */
  async postStory({ description, photo, lat, lon }) {
    try {
      if (!description || !photo) {
        throw new Error('Description and photo are required');
      }

      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Authentication required');

      const formData = new FormData();
      formData.append('description', description);
      formData.append('photo', photo);
      if (lat && lon) {
        formData.append('lat', lat);
        formData.append('lon', lon);
      }

      const response = await fetch(`${CONFIG.BASE_URL}/stories`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to post story');
      }

      const result = await response.json();
      await this._saveStoriesToDB([result]);
      return result;
    } catch (error) {
      console.log('Offline mode - saving draft');
      const draft = {
        id: `draft_${Date.now()}`,
        description,
        photo: await this._blobToBase64(photo),
        createdAt: new Date().toISOString(),
        isDraft: true
      };
      
      await indexedDBManager.saveDraft(draft);
      return draft;
    }
  }

  /**
   * Save stories to IndexedDB
   * @private
   * @param {Story[]} stories 
   */
  async _saveStoriesToDB(stories) {
    try {
      await indexedDBManager.saveStories(stories);
      console.log('Stories saved to IndexedDB');
    } catch (dbError) {
      console.error('Failed to save to IndexedDB:', dbError);
    }
  }

  /**
   * Save story as draft when offline
   * @private
   * @param {Object} storyData
   * @returns {Promise<Object>} Draft story
   */
  async _saveAsDraft({ description, photo, lat, lon }) {
    try {
      const photoBase64 = await this._blobToBase64(photo);
      const draftStory = {
        id: `draft_${Date.now()}`,
        description,
        photo: photoBase64,
        ...(lat && lon && { lat, lon }),
        createdAt: new Date().toISOString(),
        isDraft: true,
        synced: false
      };

      await indexedDBManager.saveOfflineAction('add_story', draftStory);
      return draftStory;
    } catch (error) {
      console.error('Failed to save draft:', error);
      throw new Error('Failed to save story offline');
    }
  }

  /**
   * Convert Blob to Base64
   * @private
   * @param {Blob} blob 
   * @returns {Promise<string>}
   */
  _blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Setup auto-sync when online
   * @private
   */
  _setupOnlineSync() {
    window.addEventListener('online', async () => {
      try {
        const unsyncedActions = await indexedDBManager.getOfflineActions();
        if (!unsyncedActions.length) return;

        console.log('Syncing offline actions...');
        for (const action of unsyncedActions) {
          if (action.type === 'add_story') {
            await this._syncDraftStory(action.data);
          }
        }
      } catch (syncError) {
        console.error('Sync failed:', syncError);
      }
    });
  }

  /**
   * Sync draft story to server
   * @private
   * @param {Object} draft 
   */
  async _syncDraftStory(draft) {
    try {
      const blob = await this._base64ToBlob(draft.photo);
      
      await this.postStory({
        description: draft.description,
        photo: blob,
        ...(draft.lat && { lat: draft.lat }),
        ...(draft.lon && { lon: draft.lon })
      });

      await indexedDBManager.markActionAsSynced(draft.id);
      console.log('Draft synced successfully:', draft.id);
    } catch (error) {
      console.error('Failed to sync draft:', draft.id, error);
    }
  }

  /**
   * Convert Base64 to Blob
   * @private
   * @param {string} base64Data 
   * @returns {Promise<Blob>}
   */
  _base64ToBlob(base64Data) {
    return fetch(base64Data).then(res => res.blob());
  }
}

export default StoryRepository;