const Users = require('./users');

class Commands {

  constructor() {
    //
  }

  static userHandler(client, command, username) {
    const user = Users.findUserByName(username);

    if (user === null) {
      return '530 Not logged in.';
    }

    // if (user.source && !user.source.contains(client.address)) {
    //   return '530 Not logged in.';
    // }

    client.state = 'AUTHENTICATING';
    client.user = user;

    return '331 User name okay, need password.';
  }
}

Commands.commandList = [
  { command: 'USER', state: 'CONNECTED', parameters: 1 },
  { command: 'PASS', state: 'AUTHENTICATING', parameters: 1 },
  { command: 'PWD', state: '', parameters: 1 },
];
