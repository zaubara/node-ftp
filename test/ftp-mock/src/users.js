class Users {
  constructor() {
    this.accounts = [{
      username: 'icetee',
      password: 'password',
    }];
  }

  findUserByName(username = '') {
    return this.accounts.find(user => user.username === username);
  }
}

module.exports = Users;
