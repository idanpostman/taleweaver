// app.js
import routes from '../routes/routes.js';
import { getActiveRoute } from '../routes/url-parser.js';
import * as ApiService from '../data/api.js';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;
  #navLogin = null;
  #navLogout = null;
  #navAddStory = null; 
  #navPush = null;
  #logoutButton = null;
  #currentPageInstance = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;

    this.#navLogin = document.querySelector('#nav-login');
    this.#navLogout = document.querySelector('#nav-logout');
    this.#navAddStory = document.querySelector('#nav-add-story'); 
    this.#navPush = document.querySelector('#nav-push');
    this.#logoutButton = document.querySelector('#logoutButton');

    this.#setupDrawer();
    this.#setupLogoutButton();
  }

  #setupDrawer() {
    if (!this.#drawerButton || !this.#navigationDrawer) {
      return;
    }
    this.#drawerButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.#navigationDrawer.classList.toggle('open');
    });

    document.body.addEventListener('click', (event) => {
      if (!this.#navigationDrawer.classList.contains('open')) {
        return;
      }
      const isClickInsideDrawer = this.#navigationDrawer.contains(event.target);
      const isClickOnDrawerButton = this.#drawerButton.contains(event.target);

      if (!isClickInsideDrawer && !isClickOnDrawerButton) {
        this.#navigationDrawer.classList.remove('open');
        return;
      }

      this.#navigationDrawer
        .querySelectorAll('a')
        .forEach((navLink) => {
          if (navLink.contains(event.target) && navLink.id !== 'logoutButton') {
            this.#navigationDrawer.classList.remove('open');
          }
        });
    });
  }

  #setupLogoutButton() {
    if (this.#logoutButton) {
      this.#logoutButton.addEventListener('click', async (event) => {
        event.preventDefault();
        if (this.#currentPageInstance && typeof this.#currentPageInstance.cleanup === 'function') {
          try {
            await this.#currentPageInstance.cleanup();
          } catch (cleanupError) {
            console.error('App: Error during cleanup before logout:', cleanupError);
          }
        }
        this.#currentPageInstance = null;
        ApiService.logoutUser(); 
        this.#updateNavigation();
        window.location.hash = '#/login';
        this.#navigationDrawer.classList.remove('open');
      });
    }
  }

  #updateNavigation() {
    const isLoggedIn = !!ApiService.getToken(); 
    if (this.#navLogin) this.#navLogin.style.display = isLoggedIn ? 'none' : 'list-item';
    if (this.#navLogout) this.#navLogout.style.display = isLoggedIn ? 'list-item' : 'none';
    if (this.#navAddStory) {
        this.#navAddStory.style.display = isLoggedIn ? 'list-item' : 'none';
    }
    const pushNotificationElement = document.getElementById('pushButton') || this.#navPush;
    if (pushNotificationElement) {
        const parentLi = pushNotificationElement.closest('li');
        if (parentLi) {
            parentLi.style.display = isLoggedIn ? 'list-item' : 'none';
        } else {
            pushNotificationElement.style.display = isLoggedIn ? (pushNotificationElement.tagName === 'A' ? 'inline-block' : 'block') : 'none';
        }
    }
  }

  async renderPage() {
    this.#updateNavigation();
    const url = getActiveRoute();
    const PageComponent = routes[url];

    const renderLogic = async () => {
      if (this.#currentPageInstance && typeof this.#currentPageInstance.cleanup === 'function') {
        try {
            await this.#currentPageInstance.cleanup();
        } catch (cleanupError) {
            console.error('App: Error during page cleanup:', cleanupError);
        }
      }

      if (PageComponent) {
        try {
          this.#currentPageInstance = new PageComponent();
          this.#content.innerHTML = await this.#currentPageInstance.render();
          if (typeof this.#currentPageInstance.afterRender === 'function') {
            await this.#currentPageInstance.afterRender(
              this.#content.firstElementChild || this.#content 
            );
          }
          document.body.scrollTop = 0;
          document.documentElement.scrollTop = 0;
        } catch (error) {
          console.error('App: Error rendering page component:', error);
          this.#content.innerHTML = '<h2>Error loading page content. Please try refreshing.</h2>';
          this.#currentPageInstance = null;
        }
      } else {
        this.#content.innerHTML =
          '<h2>404 - Page Not Found</h2><p>Oops! The page you are looking for does not exist.</p>';
        this.#currentPageInstance = null;
      }
    };

    if (document.startViewTransition) {
      document.startViewTransition(renderLogic);
    } else {
      await renderLogic();
    }
  }
}

export default App;
