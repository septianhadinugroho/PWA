export class User {
  constructor({ userId, name, email, token }) {
    this.userId = userId;
    this.name = name;
    this.email = email;
    this.token = token;
  }
}