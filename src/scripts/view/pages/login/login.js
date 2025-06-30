import { AuthModel } from '../../../data/model/AuthModel';
import LoginPresenter from '../../../presenter/login-presenter';
import { navigateWithTransition } from '../../../utils/view-transition';
import '../../../../styles/auth-form.css';

class LoginPage {
  constructor() {
    this.authModel = new AuthModel();
    this.presenter = new LoginPresenter(this, this.authModel);
  }

  async render() {
    return `
      <main class="auth-container" id="main-content">
        <div class="auth-card" role="region" aria-labelledby="login-heading">
          <h2 id="login-heading" class="auth-title">
            <i class="fas fa-sign-in-alt" aria-hidden="true"></i>
            Masuk ke Akun Anda
          </h2>
          
          <form 
            id="loginForm" 
            class="auth-form" 
            aria-describedby="form-instructions"
            novalidate
          >
            <p id="form-instructions" class="sr-only">
              Formulir login membutuhkan email dan password
            </p>
            
            <div class="form-group">
              <label for="email">Email</label>
              <input
                type="email"
                id="email"
                aria-required="true"
                aria-describedby="email-help"
                placeholder="contoh@email.com"
                required
                autocomplete="username"
              />
              <p id="email-help" class="sr-only">
                Contoh: user@example.com
              </p>
            </div>
            
            <div class="form-group">
              <label for="password">Password</label>
              <input
                type="password"
                id="password"
                aria-required="true"
                placeholder="Masukkan password"
                required
                autocomplete="current-password"
              />
            </div>
            
            <button 
              type="submit" 
              class="auth-button"
              aria-live="polite"
            >
              <span class="button-text">Masuk</span>
              <span class="button-loader hidden" aria-hidden="true"></span>
              <span class="sr-only">Memproses login...</span>
            </button>
          </form>
          
          <div class="auth-footer">
            Belum punya akun? 
            <a href="#/register" class="auth-link">
              Daftar disini <span class="sr-only">, halaman pendaftaran</span>
            </a>
          </div>
          
          <div id="loginMessage" aria-live="assertive"></div>
        </div>
      </main>
    `;
  }

  async afterRender() {
    console.log('Setting up form...');
    const form = document.getElementById('loginForm');
    const submitButton = form.querySelector('button[type="submit"]');
    const loader = submitButton.querySelector('.button-loader');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      submitButton.disabled = true;
      loader.classList.remove('hidden');

      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      await this.presenter.login(email, password);

      submitButton.disabled = false;
      loader.classList.add('hidden');
    });
  }

  showLoading(isLoading) {
    const submitButton = document.querySelector('#loginForm button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = isLoading;
      submitButton.innerHTML = isLoading 
        ? '<span class="spinner"></span> Memproses...' 
        : 'Masuk';
    }
  }

  hideLoading() {
    const submitButton = document.querySelector('#loginForm button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Masuk';
    }
  }

  onLoginSuccess() {
    window.dispatchEvent(new CustomEvent('auth-change'));
    navigateWithTransition('');
  }

  showLoginError(message) {
    const errorElement = document.getElementById('loginError');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
  }
}

export default LoginPage;