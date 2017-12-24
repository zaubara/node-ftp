const fs = require('fs');
const net = require('net');
const Path = require('path');
const zlib = require('zlib');
const { Socket } = require('net');
const { inspect } = require('util');

const FtpError = require('./ftp-error');
const FtpAdapter = require('./ftp-adapter');
const Parser = require('./parser');

const {
  REX_TIMEVAL,
  RE_EOL,
  RE_SYST,
  RETVAL,
  BYTES_NOOP,
  PARSER_IP,
} = require('./expressions');

module.exports = class FtpSerivce extends FtpAdapter {
  constructor(options) {
    super(options);

    this.connected = false;
    this.connSocket = null;
    this.dataSocket = undefined;
    this.activeServer = undefined;
    this.currentReq = undefined;
    this.keepalive = null;

    this.feats = [];
    this.queue = [];
    this.secstate = undefined;
    this.ending = false;

    this.cmd = null;
    this.hasReset = false;

    this.reset();
    this.events();
  }

  connect() {
    this.initNoopreq();

    this.connSocket = new Socket();
    this.connSocket.setTimeout(0);
    this.connSocket.setKeepAlive(this.options.aliveTimeout > 0);

    /* eslint-disable no-bitwise */
    this.parser.on('response', (code, text) => {
      const retval = code / 100 >> 0;

      if ((retval === RETVAL.ERR_TEMP || retval === RETVAL.ERR_PERM)) {
        if (this.currentReq && this.currentReq.cmd !== 'NOOP') {
          this.currentReq.cb(new FtpError(code, text), undefined, code);
        } else {
          this.emitter.emit('error', new FtpError(code, text));
        }
      } else if (this.currentReq) {
        this.currentReq.cb(undefined, text, code);
      }

      // NOTE: a hack to signal we're waiting for a PASV data connection to complete
      // first before executing any more queued requests ...
      //
      // also: don't forget our current request if we're expecting another
      // terminating response ....
      if (this.currentReq && retval !== RETVAL.PRELIM) {
        this.currentReq = undefined;

        // NOTE: No implemented SEND
        this.send();
      }

      this.noopReq.cb();
    });
    /* eslint-enable */

    // NOTE: Implement implicit connection
    this.connSocketEvents();
    this.connSocket.connect(this.options.port, this.options.host);
  }

  onceConnect() {
    this.clearTimeouts();

    this.connected = true;
    this.emitter.emit('connected'); // Connected, but not ready!

    if (this._secstate) {
      if (this._secstate === 'upgraded-tls' && this.options.secure === true) {
        this.cmd = 'PBSZ';
        this.send('PBSZ 0', this._reentry, true);
      } else {
        this.cmd = 'USER';
        this.send(`USER ${this.options.user}`, this._reentry, true);
      }
    } else {
      this.currentReq = {
        cmd: '',
        cb: this._reentry.bind(this),
      };
    }
  }

  /**
   * The magic ✨ fuction .Responsible for workflow.
   * @param  {FtpError} err  Server response error
   * @param  {String} text Server response in parsed human text
   * @param  {Number} code Server response in parsed number
   * @return {Void}
   */
  _reentry(err, text, code) {
    if (err && (!this.cmd || this.cmd === 'USER' || this.cmd === 'PASS' || this.cmd === 'TYPE')) {
      this.emitter.emit('error', err);
      return this.connSocket && this.connSocket.end();
    }

    if ((this.cmd === 'AUTH TLS' && code !== 234 && this.options.secure !== true) ||
      (this.cmd === 'AUTH SSL' && code !== 334) ||
      (this.cmd === 'PBSZ' && code !== 200) ||
      (this.cmd === 'PROT' && code !== 200)) {
      this.emitter.emit('error', new FtpError(code, 'Unable to secure connection(s)'));
      return this.connSocket && this.connSocket.end();
    }

    if (!this.cmd) {
      // sometimes the initial greeting can contain useful information
      // about authorized use, other limits, etc.
      this.emitter.emit('greeting', text);

      if (this.options.secure && this.options.secure !== 'implicit') {
        this.cmd = 'AUTH TLS';
        this.send(this.cmd, this._reentry.bind(this), true);
      } else {
        this.cmd = 'USER';
        this.send(`USER ${this.options.user}`, this._reentry.bind(this), true);
      }
    } else if (this.cmd === 'USER') {
      if (code !== 230) {
        // password required
        if (!this.options.password && this.options.password !== '') {
          this.emitter.emit('error', new FtpError(code, 'Password required'));
          return this.connSocket && this.connSocket.end();
        }

        this.cmd = 'PASS';
        this.send(`PASS ${this.options.password}`, this._reentry.bind(this), true);
      } else {
        // no password required
        this.cmd = 'PASS';
        this._reentry(undefined, text, code);
      }
    } else if (this.cmd === 'PASS') {
      this.cmd = 'FEAT';
      this.send(this.cmd, this._reentry.bind(this), true);
    } else if (this.cmd === 'FEAT') {
      if (!err) {
        this.feats = Parser.parseFeat(text);
      }
      if (this.feats.indexOf('UTF8') > -1) { // RFC #2640
        // required by MS IIS 7.x FTP implementation which think based on
        // http://tools.ietf.org/html/draft-ietf-ftpext-utf-8-option-00
        this.cmd = 'OPTS';
        this.send('OPTS UTF8 ON', this._reentry.bind(this), true);
      } else {
        this.cmd = 'TYPE';
        this.send('TYPE I', this._reentry.bind(this), true);
      }
    } else if (this.cmd === 'OPTS') { // ignore OPTS UTF8 result
      this.cmd = 'TYPE';
      this.send('TYPE I', this._reentry.bind(this), true);
    } else if (this.cmd === 'TYPE') { this.emitter.emit('ready'); } else if (this.cmd === 'PBSZ') {
      this.cmd = 'PROT';
      this.send('PROT P', this._reentry.bind(this), true);
    } else if (this.cmd === 'PROT') {
      this.cmd = 'USER';
      this.send(`USER ${this.options.user}`, this._reentry.bind(this), true);
    } else if (this.cmd.substr(0, 4) === 'AUTH') {
      if (this.cmd === 'AUTH TLS' && code !== 234 && code !== 200) {
        this.cmd = 'AUTH SSL';
        return this.send(this.cmd, this._reentry.bind(this), true);
      } else if (this.cmd === 'AUTH TLS') {
        this._secstate = 'upgraded-tls';
      } else if (this.cmd === 'AUTH SSL') {
        this._secstate = 'upgraded-ssl';
      }
      this.connSocket.removeAllListeners('data');
      this.connSocket.removeAllListeners('error');
      this.connSocket._decoder = null;

      // prevent queue from being processed during
      // TLS/SSL negotiation
      this.currentReq = null;

      this.secureOptions.socket = this.connSocket;
      this.secureOptions.session = undefined;

      // this.connSocket = tls.connect(this.secureOptions, this.onceConnect);
      this.connSocket.setEncoding('binary');

      this.connSocket.on('data', this._onData.bind(this));
      this.connSocket.on('error', this._onError.bind(this));
      this.connSocket.once('end', this._onEnd.bind(this));
    }

    return true;
  }

  /**
    * It chooses to open an `active` or `passive` socket connection. Data and
    * communication are on two separate channels!
    * @param {Object} args - `zcomp` (boolean) - Use compression method?
    *                         Default: `false`
    *                      - `dataCallback` (function) - Callback of data communication
    *                      - `connCallback` (function) - Callback of command communication
    *                         - `errSock` - In case of an error.
    *                         - `message` - Communication response message
    *                         - `code` - Communication response code
    * @return {Void}
    */
  createDataSocket(...args) {
    if (this.options.passive) {
      this.passive(...args); // NOTE: Check this!
    } else {
      this.active(...args);
    }
  }

  /**
   * Initialize active connection.
   * @param  {boolean}  zcomp - Use compression method? Default: `false`
   * @param  {Function} dataCallback - Callback of data communication
   * @param  {Function} connCallback - Callback of command communication
   * @return {Void}
   */
  active(zcomp, dataCallback, connCallback) {
    this.activeServer = net.createServer((dataSocket) => {
      this.dataSocket = dataSocket;

      this.dataSocket.setKeepAlive(true, this.keepalive);
      this.dataSocket.setTimeout(0);

      this.additionalGet = {
        sockErr: undefined,
        done: false,
        started: false,
        lastReply: false,
      };

      this.dataSocket.once('connection', () => {
        if (this.debug) {
          this.debug('[connection] PORT socket connected');
        }
      });

      this.dataSocket.on('data', (chunk) => {
        this.emitter.emit('com.data', chunk, zcomp, dataCallback);
      });

      this.dataSocket.on('error', (err) => {
        if (!this.dataSocket.aborting) {
          connCallback(new FtpError(1, `Unexpected data connection error: ${err}`));
        }
      });

      this.dataSocket.once('timeout', () => {
        connCallback(new FtpError(2, 'Active dataSocket timedout'));
      });

      this.dataSocket.on('end', () => {
        clearTimeout(this.timerDataSocket);
      });

      this.dataSocket.on('close', () => {
        clearTimeout(this.timerDataSocket);

        this.dataSocket = undefined;
      });
    });

    this.activeServer.on('close', () => {
      clearTimeout(this.timerDataSocket);

      this.dataSocket = undefined;
    });

    // NOTE: NO IMPLEMENTED - TLS connection - this.options.secureOptions.socket
    // NOTE: Check wait connected event ?? ISSUE: Try speed re-run..
    this.activeServer.listen(() => {
      const { p1, p2 } = PARSER_IP.PARSE_IPV4_ACTIVE(this.activeServer.address());

      require('dns').lookup(require('os').hostname(), (err, add) => {
        const port = add.split('.').join(',');

        this.send(`PORT ${port},${p1},${p2}`, (errPort, textPort, codePort) => {
          if (codePort === 200) {
            connCallback(errPort, textPort, codePort);
          } else {
            connCallback(new FtpError(codePort, errPort));
          }
        });
      });
    });
  }

  /**
   * Initialize passive connection.
   * @param  {boolean}  zcomp - Use compression method? Default: `false`
   * @param  {Function} dataCallback - Callback of data communication
   * @param  {Function} connCallback - Callback of command communication
   * @return {Void}
   */
  passive(zcomp, dataCallback, connCallback) {
    const pasvCmd = (this.feats.indexOf('EPSV') > -1 && !this.options.forcePasv) ? 'EPSV' : 'PASV';

    let first = true;
    let pasvAddress;

    this.send(pasvCmd, (err, text, code) => {
      if (err) {
        connCallback(err);
      } else {
        this.currentReq = undefined;

        if (first) {
          pasvAddress = PARSER_IP[`PARSE_IPV4_${pasvCmd}`](text);

          if (!pasvAddress) connCallback(new FtpError(5, 'Unable to parse PASV server response'));

          first = false;
        }

        if (code !== 227) {
          connCallback(new FtpError(5, `Unable entering ${pasvCmd} Mode`));
        }

        this.passiveConnect(pasvAddress, zcomp, dataCallback, (errPass) => {
          if (errPass) {
            // try the IP of the control connection if the server was somehow
            // misconfigured and gave for example a LAN IP instead of WAN IP over
            // the Internet
            if (this.connSocket && (pasvAddress.ip !== this.connSocket.remoteAddress)) {
              pasvAddress.ip = this.connSocket.remoteAddress;
            } else {
              connCallback(errPass);

              // automatically abort PASV mode
              this.send('ABOR', () => {
                connCallback(errPass);
                this.disconnect();
              });
            }
          }

          connCallback();
        });
      }
    });
  }

  /**
   * Build passive socket, this method is extends of `passive` function.
   * @param  {object}   pasvAddress - Server IP Address and Server Port number
   * @param  {boolean}  zcomp - Use compression method? Default: `false`
   * @param  {Function} callback - Original callback function for data stream
   * @param  {Function} cb
   * @return {Void}
   */
  passiveConnect(pasvAddress, zcomp, callback, cb) {
    this.passiveSocket = new Socket();

    this.passiveSocket.setTimeout(0);

    this.passiveSocket.once('connect', () => {
      if (this.debug) {
        this.debug('[connection] PASV socket connected');
      }

      // if (this.options.secure === true) {
      //   this.options.secureOptions.socket = passiveSocket;
      //   this.options.secureOptions.session = this.connSocket.getSession();
      //
      //   this.dataSocket = tls.connect(this.options.secureOptions);
      //   this.dataSocket.setTimeout(0);
      // }

      clearTimeout(this.timerDataSocket);

      this.dataSocket = this.passiveSocket;
      cb(undefined);
    });

    this.passiveSocket.on('data', (chunk) => {
      this.emitter.emit('com.data', chunk, zcomp, callback);
    });

    this.passiveSocket.on('error', (err) => {
      if (!this.passiveSocket.aborting) {
        cb(new FtpError(1, `Unexpected data connection error: ${err}`));
      }
    });

    this.passiveSocket.once('end', () => {
      clearTimeout(this.timerDataSocket);
    });

    this.passiveSocket.once('close', () => {
      clearTimeout(this.timerDataSocket);

      this.dataSocket = undefined;
    });

    this.passiveSocket.connect(pasvAddress.port, pasvAddress.ip);
  }

  /**
   * @alias disconnect
   */
  end() {
    // NOTE: Supported old version.
    this.disconnect();
  }

  /**
  * @alias reset
  */
  destroy() {
    this.reset();
  }

  disconnect() {
    if (this.connSocket && this.connSocket.writable) {
      this.connSocket.end();
    }

    if (this.queue.length) {
      this.ending = true;
    } else {
      this.reset();
    }
  }

  clearTimeouts() {
    clearTimeout(this.keepalive);
    clearTimeout(this.timer);
    clearTimeout(this.timerDataSocket);
  }

  reset() {
    if (this.connected) process.exit(); // HACK: No kill process for Active mode

    this.dispose();
    this.clearTimeouts();

    if (this.activeServer && this.activeServer.writable) {
      this.activeServer.close(() => {
        console.log('server stopped');
      });
    }

    if (this.passiveServer && this.activeServer.writable) {
      this.passiveServer.close();
    }

    if (this.dataSocket && this.dataSocket.writable) {
      this.dataSocket.end();
    }

    this.connSocket = null;
    this.dataSocket = undefined;
    this.activeServer = undefined;
    this.feats = [];
    this.currentReq = undefined;
    this.secstate = undefined;
    this.keepalive = null;
    this.queue = [];
    this.ending = false;
    this.connected = false;
    this.cmd = null;
  }

  /**
   * Assets methods
   */
  initNoopreq() {
    this.noopReq = {
      cmd: 'NOOP',
      cb: () => {
        clearTimeout(this.keepalive);

        if (this.options === null) return;

        this.keepalive = setTimeout(this.donoop, this.options.aliveTimeout);
      },
    };

    this.donoop = () => {
      if (!this.connSocket || !this.connSocket.writable) {
        clearTimeout(this.keepalive);
      } else if (!this.currentReq && this.queue.length === 0) {
        this.currentReq = this.noopReq;

        if (this.debug) this.debug('[connection] > NOOP');

        this.connSocket.write(BYTES_NOOP);
      } else {
        this.noopReq.cb();
      }
    };

    /**
     * Listen connSocket timeout. It can be parameterized with options.connTimeout property.
     */
    this.timer = setTimeout(() => {
      this.emitter.emit('error', new FtpError(10060, 'Timeout while connecting to server'));

      if (this.connSocket) this.connSocket.destroy();

      this.reset();
    }, this.options.connTimeout);

    /**
     * Listen dataSocket timeout. It can be parameterized with options.pasvTimeout property.
     */
    this.timerDataSocket = setTimeout(() => {
      this.emitter.emit('error', new FtpError(10060, 'Timed out while making data connection'));

      if (this.dataSocket) this.dataSocket.destroy();
    }, this.options.pasvTimeout);
  }

  send(cmd, cb, promote) {
    clearTimeout(this.keepalive);

    if (typeof cmd !== 'undefined') {
      if (promote) {
        this.queue.unshift({ cmd, cb });
      } else {
        this.queue.push({ cmd, cb });
      }
    }

    if ((!this.currentReq && this.queue.length && this.connSocket && this.connSocket.readable)) {
      this.currentReq = this.queue.shift();

      if (this.currentReq.cmd === 'ABOR' && this.dataSocket) {
        this.dataSocket.aborting = true;
      }

      if (this.debug) {
        this.debug(`[connection] > ${inspect(this.currentReq.cmd)}`);
      }

      this.connSocket.write(`${this.currentReq.cmd}\r\n`);
    } else if (!this.currentReq && !this.queue.length && this.ending) {
      this.reset();
    }
  }

  store(cmd, input, zcomp, dataCallback, connCallback) {
    const isBuffer = Buffer.isBuffer(input);

    if (!isBuffer && typeof input.pause !== 'undefined') {
      input.pause();
    }

    // NOTE: Implement compress
    this.createDataSocket(zcomp, dataCallback, (errSock) => {
      if (errSock) {
        connCallback(errSock);
      } else if (this.queue[0] && this.queue[0].cmd === 'ABOR') {
        this.dataSocket.destroy();
        connCallback();
      }

      this.send(cmd, (err, message, code) => {
        if (err) connCallback(new FtpError(code, err));

        if (code === 150 || code === 125) {
          if (isBuffer) {
            this.dataSocket.end(input);
          } else if (typeof input === 'string') {
            const inputPath = Path.join(__dirname, input);
            fs.stat(inputPath, (errFs) => {
              if (errFs) {
                this.dataSocket.end(input);
              } else {
                fs.createReadStream(inputPath).pipe(this.dataSocket);
              }
            });
          } else {
            input.pipe(this.dataSocket);
            input.resume();
          }

          connCallback(errSock, message, code);
        }
      });
    });
  }

  /**
   * Events
   */
  events() {
    /**
     * The resulting stream is processed.
     */
    this.emitter.on('com.data', (chunk, zcomp, callback) => {
      let entries = [];

      if (zcomp) {
        zlib.deflate(chunk, (err, compChunk) => {
          if (err) {
            console.error(err);
            return;
          }

          callback(undefined, compChunk);
        });

        return;
      }

      let buffer = '';

      const parse = Parser.parseListEntry;
      buffer += chunk.toString(this._featUtf8 ? 'utf8' : 'binary');
      entries = buffer.split(RE_EOL);
      entries.pop(); // ending EOL

      const parsed = [];
      for (let i = 0, len = entries.length; i < len; ++i) {
        const parsedVal = parse(entries[i]);
        if (parsedVal !== null) { parsed.push(parsedVal); }
      }

      callback(undefined, parsed);
    });
  }

  connSocketEvents() {
    this.connSocket.once('connect', this.onceConnect.bind(this));

    this.connSocket.on('data', (chunk) => {
      if (this.debug) {
        this.debug(`[connection] < ${inspect(chunk.toString('binary'))}`);
      }

      if (this.parser) { this.parser.write(chunk); }
    });

    this.connSocket.on('error', () => {

    });

    this.connSocket.once('end', () => {

    });

    this.connSocket.once('close', () => {
      this.emitter.emit('disconnected');
      this.reset();
    });
  }

  /**
   * Additional function for get method. Set transfer method to `stream`
   * @param  {Boolean} done      - Is done?
   * @param  {Boolean} lastreply - Is last reply?
   * @return {Void}
   */
  onWillDoneGet() {
    if (this.additionalGet.done && this.additionalGet.lastReply) {
      this.send('MODE S', () => {
        this.dataSocket.emit('end');
        this.dataSocket.emit('close');
      }, true);
    }
  }

  /**
   * Additional function for get method. Set transfer method to `stream`
   *
   * this callback will be executed multiple times, the first is when server
   * replies with 150, then a final reply after the data connection closes
   * to indicate whether the transfer was actually a success or not
   * @param  {String}   path      [description]
   * @param  {Boolean}   zcomp     [description]
   * @param  {Function} cb        [description]
   * @return {Void}
   */
  onWillSendRetr(path, zcomp, cb) {
    this.send(`RETR ${path}`, (err, text, code) => {
      if (this.additionalGet.sockErr || err) {
        this.dataSocket.destroy();
        if (!this.additionalGet.started) {
          // NOTE: Implement zcomp
          cb(this.additionalGet.sockErr || err);
        } else {
          this.dataSocket.emit('error', this.additionalGet.sockErr || err);
          this.dataSocket.emit('close', true);
        }
        return;
      }

      // server returns 125 when data connection is already open; we treat it
      // just like a 150
      if (code === 150 || code === 125) {
        this.additionalGet.started = true;
        // console.log('STARTED', this.dataSocket);
        cb(undefined);
      } else {
        this.additionalGet.lastReply = true;
        this.additionalGet.done = true; // HACK: It must be watched event
        // this.onWillDoneGet();
      }
    }, true);
  }
};

process.on('uncaughtException', (err) => {
  console.error(err);
});
