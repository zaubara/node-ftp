const path = require('path');
const { assert} = require('chai');
const { parseListEntry } = require('../lib/parser');
const Client = require('../lib/ftp');

// Load enviroments
require('dotenv').config({ path: path.join(__dirname, '../.env') });

describe('#Ftp API', () => {
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
  let dataSocket = null;

  describe('#Connection', () => {
    before((done) => {
      c.onDidReady(() => {
        done();
      });

      // Trigger connection server
      c.connect();
    });

    it('should list command responde array', (done) => {
      c.list('/', false, (listErr, list) => {
        dataSocket = c.dataSocket;
        assert.equal(Array.isArray(list), true);
        done();
      });
    }).timeout(6000);

    it('should (compressed) list command responde buffer', (done) => {
      c.list('/', true, (listErr, list) => {
        assert.equal(Buffer.isBuffer(list), true);
        done();
      });
    }).timeout(6000);

    it('should dataSocket timeout 0', () => {
      assert.equal(dataSocket._idleTimeout, -1);
    });

    after((done) => {
      c.onDidDisconnected(() => {
        done();
      });

      // Trigger close connection
      c.disconnect();
    });
  });
});
