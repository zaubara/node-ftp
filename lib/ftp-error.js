/**
 * Error type for this module
 * @typedef {Object} FtpError
 * @property {Number} code Error code in number represented
 * @property {String} message Error message in string represented
 */
module.exports = function FtpError(code, message) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  this.code = code;
};

require('util').inherits(module.exports, Error);
