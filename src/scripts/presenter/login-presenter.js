class LoginPresenter {
  constructor(view, authModel) {
    this.view = view;
    this.authModel = authModel;
  }

    async login(email, password) {
    try {
      this.view.showLoading(true);

      const result = await this.authModel.login(email, password);

      if (!result.token) {
        throw new Error('Invalid login data');
      }

      this.authModel.saveAuth(result.token, result.user.name, result.user.email);
      this.view.onLoginSuccess();

    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed';
      if (error.message.includes('Invalid API')) {
        errorMessage = 'System error: Invalid server response';
      } else if (error.message.includes('User not found')) {
        errorMessage = 'Email not registered';
      }
      this.view.showLoginError(errorMessage);
    } finally {
      this.view.showLoading(false);
    }
  }
}

export default LoginPresenter;