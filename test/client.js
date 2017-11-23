const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Client = require('../lib/connection');
const c = new Client();

c.on('ready', () => {
  console.log(c);

  done();
  c.end();
});

c.connect({
  host: process.env.TEST_HOST,
  port: process.env.TEST_PORT,
  user: process.env.TEST_USER,
  password: process.env.TEST_PASS,
  debug: false,
});
