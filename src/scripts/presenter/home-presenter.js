import { StoryModel } from '../data/model/StoryModel';

class HomePresenter {
  constructor(view) {
    this._view = view;
    this._model = new StoryModel();
  }

  async loadStories() {
    try {
      this._view.showLoading();
      const stories = await this._model.getStoriesWithLocation();

      if (!stories || !Array.isArray(stories)) {
        throw new Error('Data stories tidak valid');
      }

      if (stories.length === 0) {
        this._view.showEmptyMessage();
      } else {
        this._view.showStories(stories);
      }
    } catch (error) {
      console.error('Error loading stories:', error);
      this._view.showError(error.message);
    } finally {
      this._view.hideLoading();
    }
  }
}

export default HomePresenter;