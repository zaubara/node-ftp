const path = require('path');
const { assert} = require('chai');
const { parseListEntry } = require('../lib/parser');
const Client = require('../lib/ftp-service');

// Load enviroments
require('dotenv').config({ path: path.join(__dirname, '../.env') });

describe('#Ftp Service', () => {
  const config = {
    host: process.env.HOST,
    port: process.env.PORT || 21,
    user: process.env.USER,
    password: process.env.PASS,
    passive: true,
    connTimeout: 10000,
    pasvTimeout: 10000,
    debug: false,
  };

  const c = new Client(config);

  describe('#Pre-connection', () => {
    it('should connected parameter is false (Non-connect)', () => {
      assert.equal(c.connected, false);
    });
  });


  describe('#Passive connection', () => {
    it('should connection without error', (done) => {
      c.onDidConnected(() => {
        done();
      });

      // Connection server
      c.connect();
    });

    it('should connected parameter is true (Connect)', () => {
      assert.equal(c.connected, true);
    });

    it('should greeting event triggered', (done) => {
      c.onDidGreeting((text) => {
        done();
      });
    });

    it('should ready without error', (done) => {
      c.onDidReady(() => {
        done();
      });
    });

    it('should connSocket timeout 0', () => {
      assert.equal(c.connSocket._idleTimeout, -1);
    });

    it('should features is Array and no empty', () => {
      assert.equal(Array.isArray(c.feats), true);
      assert.equal(c.feats.length > 0, true);
    });

    // it('should dataSocket timeout 0', () => {
    //   assert.equal(c.dataSocket._idleTimeout, -1);
    // });

    it('should disconnected without error', (done) => {
      c.onDidDisconnected(() => {
        done();
      });

      // Trigger close connection
      c.disconnect();
    });

    it('should connected parameter is false (Disconnect)', () => {
      assert.equal(c.connected, false);
    });

    after(() => {
      c.disconnect();
    });
  });
});
