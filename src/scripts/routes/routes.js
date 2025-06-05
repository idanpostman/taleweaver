import LoginPage from '../pages/auth/login-page.js';
import RegisterPage from '../pages/auth/register-page.js';
import HomePage from '../pages/home/home-page.js';
import AddStoryPage from '../pages/story/add-story-page.js';
import AboutPage from '../pages/about/about-page.js';
import MyTalePage from '../pages/home/my-tale-page.js';

const routes = {
  '/': HomePage,
  '/login': LoginPage,
  '/register': RegisterPage,
  '/add-story': AddStoryPage,
  '/about': AboutPage,
  '/my-tales': MyTalePage,
};

export default routes;
