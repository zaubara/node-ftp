const { EventEmitter } = require('events');
const { CompositeDisposable } = require('composite-disposable');
const Parser = require('./parser');

module.exports = class FtpAdapter {
  constructor(options) {
    this.subscriptions = new CompositeDisposable();
    this.emitter = new EventEmitter();
    this.parser = new Parser({ debug: this.debug });
    this.options = Object.assign({
      host: 'localhost',
      port: 21,
      user: 'anonymous',
      password: 'anonymous@',
      secure: false,
      secureOptions: null,
      connTimeout: 10000,
      pasvTimeout: 10000,
      aliveTimeout: 10000,
      passive: true,
      forcePasv: true,
      debug: false,
    }, options);

    this.secureOptions = {};

    this.debug = (str) => { console.log(str); };

    if (typeof options.debug === 'function') {
      this.debug = options.debug;
    } else if (!options.debug) {
      this.debug = false;
    }
  }

  onDidConnected(callback) {
    this.subscriptions.add(this.emitter.on('connected', callback));
  }

  onDidDisconnected(callback) {
    this.subscriptions.add(this.emitter.on('disconnected', callback));
  }

  onDidGreeting(callback) {
    this.subscriptions.add(this.emitter.on('greeting', callback));
  }

  onDidReady(callback) {
    this.subscriptions.add(this.emitter.on('ready', callback));
  }

  onDidError(callback) {
    this.subscriptions.add(this.emitter.on('error', callback));
  }

  dispose() {
    this.subscriptions.dispose();
  }
};
