import indexedDBManager from "../../data/IndexedDBManager";

export default class OfflineStoriesPage {
  async render() {
    const stories = await indexedDBManager.getStories();
    const drafts = await indexedDBManager.getOfflineActions();

    return `
      <div class="offline-stories">
        <h2>Cerita Offline</h2>
        <div class="status">
          Status: ${navigator.onLine ? 'Online' : 'Offline'}
        </div>
        
        <h3>Draft Belum Terkirim</h3>
        ${drafts.length === 0 ? 
          '<p>Tidak ada draft</p>' : 
          drafts.map(draft => `
            <div class="draft">
              <p>${draft.data.description}</p>
              <small>${new Date(draft.timestamp).toLocaleString()}</small>
            </div>
          `).join('')
        }
        
        <h3>Cerita Tersimpan</h3>
        ${stories.length === 0 ? 
          '<p>Tidak ada cerita tersimpan</p>' : 
            stories.map(story => `
              <div class="story">
                <p>${story.description}</p>
                <small>${new Date(story.createdAt).toLocaleString()}</small>
                <button onclick="deleteStory('${story.id}')">Hapus</button>
              </div>
            `)
          .join('')
          
        }
      </div>
    `;
  }
}

window.deleteStory = async (id) => {
  await indexedDBManager.deleteStory(id);
  alert('Cerita dihapus.');
  window.location.reload();
};