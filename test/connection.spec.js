const ftpMock = require('./ftp-mock');
const sinon = require('sinon');
const { assert} = require('chai');

describe('#Connection', () => {
  const Client = require('../lib/connection');
  const c = new Client();

  describe('#Server', () => {
    it('should emitted ready', (done) => {
      // ftpMock.listen({
      //   port: process.env.TEST_PORT,
      //   host: process.env.TEST_HOST,
      // });

      const config = {
        host: process.env.TEST_HOST,
        port: process.env.TEST_PORT,
        user: process.env.TEST_USER,
        password: process.env.TEST_PASS,
        debug: false,
      };

      // console.log(c);

      c.on('ready', () => {
        console.log(c);
        
        done();
        c.end();
      });

      // c.on('greeting', (text) => {
      //   console.log(text);
      //   assert.deepEqual(text, '220 Welcome in FTP Mock server');
      //   done();
      // });

      // c.on('ready', () => {
      //   c.on('greeting', (text) => {
      //     assert.deepEqual(text, '220 Welcome in FTP Mock server');
      //     done();
      //   });
      //
      //   c.end();
      // });

      c.connect(config);
    });
  });
});
