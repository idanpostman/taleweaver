class AddStoryPresenter {
  constructor(view, apiService) {
    this._view = view;
    this._apiService = apiService;
  }

  async addNewStory({ description, photo, lat, lon }) {
    if (!this._apiService.getToken()) {
      this._view.showError('You need to login to add a story.');
      setTimeout(() => this._view.navigateTo('#/login'), 2000);
      return;
    }
    if (!description || !photo) {
      this._view.showError('Description and photo are required.');
      return;
    }
    try {
      const result = await this._apiService.addNewStory(
        description,
        photo,
        lat,
        lon
      );
      if (!result.error) {
        this._view.showSuccess('Tale posted successfully!');
        this._view.clearForm();
        setTimeout(() => {
          this._view.navigateTo('#/');
        }, 2000);
      } else {
        this._view.showError(result.message || 'Failed to post tale.');
      }
    } catch (error) {
      this._view.showError(
        error.message || 'An unexpected error occurred while posting.'
      );
    }
  }

  async saveStoryLocally(storyData) {
    try {
      const Database = (await import('../../data/database.js')).default;
      await Database.saveStory(storyData);
      return { success: true };
    } catch (error) {
      console.error('Failed to save story locally:', error);
      return { success: false, error: error.message };
    }
  }
}

export default AddStoryPresenter;
