import HomePage from '../view/pages/home/home-page';
import AboutPage from '../view/pages/about/about-page';
import AddPage from '../view/pages/add/add-page';
import LoginPage from '../view/pages/login/login';
import RegisterPage from '../view/pages/register/register-page';
import DataManagementPage from '../view/pages/data-management/data-management-page';
import OfflineStoriesPage from '../view/pages/offline-stories';

const routes = {
  '/': HomePage,
  '/about': AboutPage,
  '/add': AddPage,
  '/login': LoginPage,
  '/register': RegisterPage,
  '/data-management': DataManagementPage,
  '/offline-stories': OfflineStoriesPage,
};

export default routes;