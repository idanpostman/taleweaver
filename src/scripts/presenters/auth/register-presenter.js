class RegisterPresenter {
  constructor(view, apiService) {
    this._view = view;
    this._apiService = apiService;
  }

  async register({ name, email, password }) {
    this._view.clearRegisterError();

    if (!name || !email || !password) {
      this._view.showRegisterError('Name, email, and password are required.');
      return;
    }

    if (password.length < 8) {
      this._view.showRegisterError(
        'Password must be at least 8 characters long.'
      );
      return;
    }

    try {
      const result = await this._apiService.registerUser(name, email, password);

      if (!result.error) {
        this._view.showRegisterSuccess(
          'Registration successful! Please login.'
        );
        this._view.clearForm();
        setTimeout(() => {
          this._view.navigateTo('#/login');
        }, 2000);
      } else {
        this._view.showRegisterError(
          result.message || 'Registration failed. Please try again.'
        );
      }
    } catch (error) {
      this._view.showRegisterError(
        error.message || 'An unexpected error occurred during registration.'
      );
    }
  }
}

export default RegisterPresenter;
