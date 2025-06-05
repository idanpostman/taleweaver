import LoginPresenter from '../../presenters/auth/login-presenter.js';
import * as ApiService from '../../data/api.js';

class LoginPage {
  constructor() {
    this._presenter = new LoginPresenter(this, ApiService);
    this._viewElement = null;
  }

  async render() {
    return `
      <div class="page-content-wrapper">
        <div class="login-container">
          <h2>Login to TaleWeaver</h2>
          <form id="loginForm">
            <div class="form-group">
              <label for="email">Email:</label>
              <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
              <label for="password">Password:</label>
              <input type="password" id="password" name="password" required>
            </div>
            <button type="submit" id="loginButton"><i class="fas fa-sign-in-alt"></i> Login</button>
            <p class="register-link">Don't have an account? <a href="#/register">Register here</a></p>
          </form>
          <div id="loginErrorMessage" class="error-message" style="display:none;"></div>
        </div>
      </div>
    `;
  }

  async afterRender(viewElement) {
    this._viewElement = viewElement;
    const loginForm = this._viewElement.querySelector('#loginForm');
    const loginButton = this._viewElement.querySelector('#loginButton');

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      loginButton.disabled = true;
      loginButton.textContent = 'Logging in...';

      const email = this._viewElement.querySelector('#email').value;
      const password = this._viewElement.querySelector('#password').value;

      await this._presenter.login({ email, password });

      loginButton.disabled = false;
      loginButton.textContent = 'Login';
    });
  }

  showLoginError(message) {
    const errorMessageElement =
      this._viewElement.querySelector('#loginErrorMessage');
    if (errorMessageElement) {
      errorMessageElement.textContent = message;
      errorMessageElement.style.display = 'block';
    }
  }

  clearLoginError() {
    const errorMessageElement =
      this._viewElement.querySelector('#loginErrorMessage');
    if (errorMessageElement) {
      errorMessageElement.textContent = '';
      errorMessageElement.style.display = 'none';
    }
  }

  navigateTo(hash) {
    window.location.hash = hash;
  }
}

export default LoginPage;
