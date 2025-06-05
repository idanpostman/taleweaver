class HomePresenter {
  constructor(view, apiService) {
    this._view = view;
    this._apiService = apiService;
  }

  async displayInitialData() {
    console.log('HomePresenter: displayInitialData called'); 
    if (!this._apiService.getToken()) {
      console.warn('HomePresenter: No token found. User needs to login.'); 
      this._view.showError('You need to login to see stories.');
      setTimeout(() => {
        console.log('HomePresenter: Navigating to #/login due to no token.'); 
        this._view.navigateTo('#/login');
      }, 2000);
      return undefined;
    }

    this._view.showLoading();

    try {
      console.log('HomePresenter: Calling apiService.fetchAllStories...'); 
      const stories = await this._apiService.fetchAllStories(1, 20, 1);
      console.log('HomePresenter: Stories received from apiService:', stories); 
      console.log('HomePresenter: Returning stories to caller (home-page.js).'); 
      return stories;
    } catch (error) {
      console.error('HomePresenter: Error in displayInitialData:', error); 
      this._view.showError(
        error.message || 'Failed to load stories from presenter.'
      );
      return undefined;
    } finally {
      this._view.hideLoading();
      console.log('HomePresenter: displayInitialData finished.'); 
    }
  }
}

export default HomePresenter;
