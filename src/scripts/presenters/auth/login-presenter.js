class LoginPresenter {
  constructor(view, apiService) {
    this._view = view;
    this._apiService = apiService;
  }

  async login({ email, password }) {
    this._view.clearLoginError();

    if (!email || !password) {
      this._view.showLoginError('Email and password are required.');
      return;
    }

    try {
      const loginResult = await this._apiService.loginUser(email, password);

      if (loginResult && loginResult.token) {
        this._view.navigateTo('#/');
      } else {
        this._view.showLoginError(
          'Login failed. Please try again or check credentials.'
        );
      }
    } catch (error) {
      this._view.showLoginError(
        error.message || 'An unexpected error occurred during login.'
      );
    }
  }
}

export default LoginPresenter;
