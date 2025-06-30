export class AuthModel {
  constructor() {
    this._baseUrl = 'https://story-api.dicoding.dev/v1';
  }

  async login(email, password) {
    try {
      const response = await fetch(`${this._baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim()
        }),
      });

      const data = await response.json();
      console.log('API Response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (!data.token && !data.loginResult?.token) {
        throw new Error('Invalid API response structure');
      }

      return {
        token: data.token || data.loginResult.token,
        user: {
          name: data.name || data.loginResult.name,
          email: email
        }
      };

    } catch (error) {
      console.error('AuthModel error:', error);
      throw error;
    }
  }

  getAccessToken() {
    return localStorage.getItem('accessToken');
  }

  saveAuth(token, name, email) {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', email);
  }

}