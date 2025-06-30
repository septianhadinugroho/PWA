import RegisterPresenter from '../../../presenter/register-presenter';
import '../../../../styles/auth-form.css';

class RegisterPage {
  constructor() {
    this.presenter = new RegisterPresenter(this);
  }

  async render() {
    return `
      <main class="auth-container" id="main-content" role="main">
        <div class="auth-card" role="region" aria-labelledby="register-heading">
          <h2 id="register-heading" class="auth-title">
            <i class="fas fa-user-plus" aria-hidden="true"></i>
            Buat Akun Baru
          </h2>
          
          <form 
            id="registerForm" 
            class="auth-form"
            aria-describedby="form-instructions password-requirements"
            novalidate
          >
            <p id="form-instructions" class="sr-only">
              Formulir pendaftaran membutuhkan nama, email, dan password
            </p>
            
            <div class="form-group">
              <label for="name">Nama Lengkap</label>
              <input
                type="text"
                id="name"
                aria-required="true"
                placeholder="Nama Anda"
                required
                autocomplete="name"
              />
            </div>
            
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
                aria-describedby="password-hint"
                placeholder="Minimal 8 karakter"
                minlength="8"
                required
                autocomplete="new-password"
              />
              <div id="password-hint" class="password-hint">
                <span class="sr-only">Persyaratan password: </span>
                Gunakan kombinasi huruf, angka, dan simbol
              </div>
            </div>
            
            <button 
              type="submit" 
              class="auth-button"
              aria-live="polite"
            >
              <span class="button-text">Daftar</span>
              <span class="button-loader hidden" aria-hidden="true"></span>
              <span class="sr-only">Memproses pendaftaran...</span>
            </button>
          </form>
          
          <div class="auth-footer">
            Sudah punya akun? 
            <a href="#/login" class="auth-link">
              Masuk disini <span class="sr-only">, halaman login</span>
            </a>
          </div>
          
          <div id="registerMessage" aria-live="assertive"></div>
        </div>
      </main>
    `;
  }

  async afterRender() {
    const form = document.getElementById('registerForm');
    const submitButton = form.querySelector('button[type="submit"]');
    const loader = submitButton.querySelector('.button-loader');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      submitButton.disabled = true;
      loader.classList.remove('hidden');
      
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      await this.presenter.register(name, email, password);
      
      submitButton.disabled = false;
      loader.classList.add('hidden');
    });
  }

  onRegisterSuccess() {
    const messageElement = document.getElementById('registerMessage');
    messageElement.textContent = 'Pendaftaran berhasil! Mengarahkan ke halaman login...';
    messageElement.classList.add('success');
    
    setTimeout(() => {
      this.presenter.navigateTo('login');
    }, 2000);
  }

  showRegisterError(message) {
    const messageElement = document.getElementById('registerMessage');
    messageElement.textContent = message;
    messageElement.classList.add('error');
    
    setTimeout(() => {
      messageElement.textContent = '';
      messageElement.classList.remove('error');
    }, 5000);
  }
}

export default RegisterPage;