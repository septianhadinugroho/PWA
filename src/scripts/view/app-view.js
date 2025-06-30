import {
  Navigation
} from './components/Navigation';
import {
  AppPresenter
} from '../presenter/app-presenter';
import {
  AuthModel
} from '../data/model/AuthModel';

export class AppView {
  constructor() {
    this._authModel = new AuthModel();
    this.presenter = new AppPresenter(this, this._authModel);
    this._mainContent = document.querySelector('#main-content');
  }

  getMainContent() {
    return this._mainContent;
  }

  render() {
    return `
      <header>...</header>
      <main id="main-content"></main>
      <footer>...</footer>
    `;
  }

  renderNavigation(authState) {
    document.getElementById('navigation-container').innerHTML =
      Navigation.render(authState);
    Navigation.afterRender(authState);
  }

  setupSkipLink() {
    const mainContent = document.querySelector('#main-content');

    const skipLink = document.querySelector('.skip-link');

    if (mainContent && skipLink) {
      skipLink.addEventListener("click", function (event) {
        event.preventDefault();
        skipLink.blur();
        mainContent.focus();
        mainContent.scrollIntoView();
      });
    }
  }

  static async navigateTo(page) {
    try {
      if (!document.startViewTransition) {
        window.location.hash = `#/${page}`;
        return;
      }

      const transition = document.startViewTransition(async () => {
        await new Promise(resolve => {
          window.location.hash = `#/${page}`;
          window.addEventListener('hashchange', resolve, {
            once: true
          });
        });
      });

      await transition.ready;
    } catch (error) {
      console.error('Navigation failed:', error);
      window.location.hash = `#/${page}`;
    }
  }
}