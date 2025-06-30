import AuthRepository from '../data/api/AuthRepository';

class RegisterPresenter {
  constructor(view) {
    this.view = view;
    this.repository = new AuthRepository();
  }

  navigateTo(path) {
    window.location.hash = `#/${path}`;
  }

  async register(name, email, password) {
    try {
      await this.repository.register(name, email, password);
      this.view.onRegisterSuccess();
    } catch (error) {
      this.view.showRegisterError(error.message);
    }
  }
}

export default RegisterPresenter;