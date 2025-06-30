import { openDB } from 'idb';

const dbPromise = openDB('StoryDB', 1, {
  upgrade(db) {
    db.createObjectStore('stories', { keyPath: 'id' });
  }
});

export default {
  async saveStory(story) {
    return (await dbPromise).put('stories', story);
  },
  async getStories() {
    return (await dbPromise).getAll('stories');
  }
};