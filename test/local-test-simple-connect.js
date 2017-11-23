const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const Client = require('../lib/connection');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const config = {
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASS,
  remote: process.env.REMOTE,
  debug: () => {
    return process.env.DEBUG || true;
  }
};

const client = new Client();
const emitter = new EventEmitter();
const uploadList = [];

//const ready = () => client.cwd('/keymaps/', () => emitter.emit('connected'));
const ready = () => emitter.emit('connected');

client.on('error', (err) => {
  console.error('ERROR: ', err);
});

client.on('close', (err) => {
  console.error('CLOSE: ', err);
});

const connected = () => {
  client.list((error, files) => {
    console.log(error);
  });
};

client.connect(config)

client.on('ready', ready);
emitter.on('connected', connected);
