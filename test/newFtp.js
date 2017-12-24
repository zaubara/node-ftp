const path = require('path');
const { inspect } = require('util');
// const Client = require('../lib/connection');
const Client = require('../lib/ftp');

// Load enviroments
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const c = new Client({
  host: process.env.HOST,
  port: process.env.PORT || 21,
  user: process.env.USER,
  password: process.env.PASS,
  passive: true,
  connTimeout: 10000,
  pasvTimeout: 10000,
  debug: true,
});

c.onDidReady(() => {
  // c.list('/bower_delete/', false, (listErr, list) => {
  //   if (listErr) {
  //     console.error(listErr);
  //   }
  //
  //   console.log('LIST COMMAND: ', list);
  //
  //   // c.disconnect();
  // });

  // c.get('/bower_components/bootstrap/package.js', false, (getErr, fileStream) => {
  //   if (getErr) {
  //     console.error('getErr =>', getErr);
  //   }
  //
  //   console.log('ok');
  //   // console.log('fileStream => ', fileStream);
  //   // setTimeout(() => {
  //   //   c.disconnect();
  //   // }, 500);
  // });

  // c.put('../Lorem.ipsum', '/Lorem.ipsum_2', false, (listErr, text) => {
  //   if (listErr) {
  //     console.error(listErr);
  //   }
  //
  //   // c.disconnect();
  // });

  // c.rename('Lorem.ipsum_3', 'Lorem.ipsum_2', (listErr) => {
  //   if (listErr) {
  //     console.error(listErr);
  //   }
  // });

  // c.logout((err) => {
  //   if (err) {
  //     console.error(err);
  //   }
  //
  //   console.warn('Bye Bye');
  // });

  // c.cwd('/bower_components/', (err) => {
  //   if (err) {
  //     console.error(err);
  //   }
  //
  //   console.warn('CWD success');
  // });

  // c.abort((err) => {
  //   if (err) {
  //     console.error(err);
  //   }
  //
  //   console.warn('ABORT success');
  // });

  // c.status((err) => {
  //   if (err) {
  //     console.error(err);
  //   }
  // });
  //
  // c.size('Lorem.ipsum_2', (err) => {
  //   if (err) {
  //     console.error(err);
  //   }
  // });

  // c.rmdir('/bower_delete/', true, (err) => {
  //   if (err) {
  //     console.error(err);
  //   }
  //
  //   console.warn('OK');
  // });

  // c.mdelete('/bower_delete/*', (err) => {
  //   if (err) {
  //     console.error(err);
  //   }
  //
  //   console.warn('OK');
  // });

  // c.pwd((err, pwd) => {
  //   if (err) {
  //     console.error(err);
  //   }
  //
  //   console.warn(pwd);
  // });

  // c.lastMod('Lorem.ipsum_2', (err, pwd) => {
  //   if (err) {
  //     console.error(err);
  //   }
  //
  //   console.warn(pwd);
  // });
});

c.connect();
