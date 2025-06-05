import RegisterPresenter from '../../presenters/auth/register-presenter.js';
import * as ApiService from '../../data/api.js';

class RegisterPage {
  constructor() {
    this._presenter = new RegisterPresenter(this, ApiService);
    this._viewElement = null;
  }

  async render() {
    return `
      <div class="page-content-wrapper">
        <div class="register-container">
          <h2>Register for TaleWeaver</h2>
          <form id="registerForm">
            <div class="form-group">
              <label for="name">Name:</label>
              <input type="text" id="name" name="name" required>
            </div>
            <div class="form-group">
              <label for="email">Email:</label>
              <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
              <label for="password">Password:</label>
              <input type="password" id="password" name="password" required minlength="8">
            </div>
            <button type="submit" id="registerButton"><i class="fas fa-user-plus"></i> Register</button>
            <p class="login-link">Already have an account? <a href="#/login">Login here</a></p>
          </form>
          <div id="registerSuccessMessage" class="success-message" style="display:none;"></div>
          <div id="registerErrorMessage" class="error-message" style="display:none;"></div>
        </div>
      </div>
    `;
  }

  async afterRender(viewElement) {
    this._viewElement = viewElement;
    const registerForm = this._viewElement.querySelector('#registerForm');
    const registerButton = this._viewElement.querySelector('#registerButton');

    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      registerButton.disabled = true;
      registerButton.textContent = 'Registering...';

      const name = this._viewElement.querySelector('#name').value;
      const email = this._viewElement.querySelector('#email').value;
      const password = this._viewElement.querySelector('#password').value;

      await this._presenter.register({ name, email, password });

      registerButton.disabled = false;
      registerButton.textContent = 'Register';
    });
  }

  showRegisterError(message) {
    const errorMessageElement = this._viewElement.querySelector(
      '#registerErrorMessage'
    );
    const successMessageElement = this._viewElement.querySelector(
      '#registerSuccessMessage'
    );
    if (errorMessageElement) {
      errorMessageElement.textContent = message;
      errorMessageElement.style.display = 'block';
    }
    if (successMessageElement) {
      successMessageElement.style.display = 'none';
    }
  }

  clearRegisterError() {
    const errorMessageElement = this._viewElement.querySelector(
      '#registerErrorMessage'
    );
    if (errorMessageElement) {
      errorMessageElement.textContent = '';
      errorMessageElement.style.display = 'none';
    }
  }

  showRegisterSuccess(message) {
    const successMessageElement = this._viewElement.querySelector(
      '#registerSuccessMessage'
    );
    const errorMessageElement = this._viewElement.querySelector(
      '#registerErrorMessage'
    );
    if (successMessageElement) {
      successMessageElement.textContent = message;
      successMessageElement.style.display = 'block';
    }
    if (errorMessageElement) {
      errorMessageElement.style.display = 'none';
    }
  }

  navigateTo(hash) {
    window.location.hash = hash;
  }

  clearForm() {
    this._viewElement.querySelector('#name').value = '';
    this._viewElement.querySelector('#email').value = '';
    this._viewElement.querySelector('#password').value = '';
  }
}

export default RegisterPage;
