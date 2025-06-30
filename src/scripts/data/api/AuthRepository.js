import { User } from '../model/User';

class AuthRepository {
  async login(email, password) {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('pushToken') || ''}`
      },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();
    if (result.error) throw new Error(result.message);

    return new User({
      userId: result.loginResult.userId,
      name: result.loginResult.name,
      email: email,
      token: result.loginResult.token
    });
  }

  async register(name, email, password) {
    const response = await fetch('https://story-api.dicoding.dev/v1/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const result = await response.json();
    if (result.error) throw new Error(result.message);

    return true;
  }
}

export default AuthRepository;