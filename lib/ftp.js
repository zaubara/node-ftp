const FtpError = require('./ftp-error');
const FtpSerivce = require('./ftp-service');

const {
  RE_WD,
  PARSE_DATE,
} = require('./expressions');

module.exports = class Ftp extends FtpSerivce {
  /**
   * Aborts the current data transfer (e.g. from get(), put(), or list()).
   *
   * ["Standard" (RFC 959)]
   * @param  {Boolean|Function} immediate - Be done right away. If `true` will
   *                                        not be added to the end of the list.
   * @param  {Function}  [dataCallback] - `err` (FtpError) - In case of an error
   * @return {Void}
   */
  abort(immediate, dataCallback) {
    if (typeof immediate === 'function') {
      dataCallback = immediate;
      immediate = true;
    }

    if (immediate) {
      this.send('ABOR', dataCallback, true);
    } else {
      this.send('ABOR', dataCallback);
    }
  }

  /**
   * Append data to the end of a file on the remote host. Same as put(),
   * except if destPath already exists, it will be appended to instead of
   * overwritten.
   * @param  {Mixed} input        [description]
   * @param  {String} destPath - The file remote location
   * @param  {Boolean} [zcomp] - Use compression method? Default: `false`
   * @param  {Function} dataCallback - `err` (FtpError) - In case of an error.
   * @return {Void}
   */
  append(input, destPath, zcomp, dataCallback) {
    this.store(`APPE ${destPath}`, input, zcomp, dataCallback, (errSock) => {
      if (errSock) {
        dataCallback(errSock);
      } else if (this.queue[0] && this.queue[0].cmd === 'ABOR') {
        this.dataSocket.destroy();
        dataCallback();
      }
    });
  }

  /**
   * Sets the transfer data type to ASCII.
   *
   * ["Standard" (RFC 959)]
   * @param  {Function} dataCallback - `err` (FtpError) - In case of an error.
   * @return {Void}
   */
  ascii(dataCallback) {
    return this.send('TYPE A', dataCallback);
  }

  /**
   * Sets the transfer data type to binary.
   *
   * ["Standard" (RFC 959)]
   * @param  {Function} dataCallback - `err` (FtpError) - In case of an error.
   * @return {Void}
   */
  binary(dataCallback) {
    return this.send('TYPE I', dataCallback);
  }

  /**
   * Change working directory. Makes the given directory be the current
   * directory on the remote host.
   *
   * ["Standard" (RFC 959)]
   * @param  {String}  path - Location from the server
   * @param  {Function}  dataCallback - `err` (FtpError) - In case of an error
   *                                  - `currentDir` - Is only given if the
   *                                    server replies with the path in the
   *                                    response text.
   * @param  {Boolean} [promote=false] [description]
   * @return {Void}
   */
  cwd(path, dataCallback, promote = false) {
    this.send(`CWD ${path}`, (errSend, message) => {
      if (errSend) {
        dataCallback(errSend);
      } else {
        const m = RE_WD.exec(message);
        dataCallback(undefined, m ? m[1] : undefined);
      }
    }, promote);
  }

  /**
   * Delete remote file.
   *
   * ["Standard" (RFC 959)]
   * @param  {String} path - Location from the server
   * @param  {Function} dataCallback - `err` (FtpError) - In case of an error.
   * @return {Void}
   */
  delete(path, dataCallback) {
    this.send(`DELE ${path}`, dataCallback);
  }

  /**
   * Executes a site-specific command.
   *
   * ["Standard" (RFC 959)]
   * @param  {String} cmd - Sends command (e.g. 'CHMOD 755 foo', 'QUOTA')
   *                        using SITE.
   * @param  {Function} dataCallback - `err` (FtpError) - In case of an error.
   * @return {Void}
   */
  site(cmd, dataCallback) {
    this.send(`SITE ${cmd}`, dataCallback);
  }

  /**
   * Retrieves human-readable information about the server's status.
   *
   * ["Standard" (RFC 959)]
   * @param  {Function} dataCallback - `err` (FtpError) - In case of an error.
   * @return {Void}
   */
  status(dataCallback) {
    this.send('STAT', dataCallback);
  }

  /**
   * Rename remote file or directory name. Also helps move it.
   *
   * ["Standard" (RFC 959)]
   * @param  {String}   oldPath - Old file / directory remote location
   * @param  {String}   newPath - New file / directory remote location
   * @param  {Function} dataCallback - `err` (FtpError) - In case of an error.
   *                                 - `fileStream` (ReadableStream) - Stream
   * @return {Void}
   */
  rename(oldPath, newPath, dataCallback) {
    this.send(`RNFR ${oldPath}`, (errSend) => {
      if (errSend) {
        if (typeof dataCallback === 'function') {
          dataCallback(errSend);
        }
      } else {
        this.send(`RNTO ${newPath}`, () => {
          if (typeof dataCallback === 'function') {
            dataCallback();
          }
        }, true);
      }
    });
  }

  /**
   * Logout the user from the server.
   *
   * ["Standard" (RFC 959)]
   * @param  {Function} dataCallback - `err` (FtpError) - In case of an error.
   * @return {Void}
   */
  logout(dataCallback) {
    this.send('QUIT', dataCallback);
  }

  /**
   * (Optional) Similar to list(), except the directory is temporarily changed to path to retrieve the directory listing. This is useful for servers that do not handle characters like spaces and quotes in directory names well for the LIST command. This function is "optional" because it relies on pwd() being available.
   *
   * ["Standard" (RFC 959)]
   * @param  {type} [path] - The path to be queried. Defaults the current
   *                         working directory.
   * @param  {Boolean}  [zcomp] - Use compression method? Default: `false`
   * @param  {Function} dataCallback - `err` (FtpError) - In case of an error
   *                                    directory.
   *                                 - `list` (Array) - Map structure
   * @return {Void}
   */
  listSafe(path, zcomp, dataCallback) {
    if (typeof path === 'string') {
      // store current path
      this.pwd((errPwd, origpath) => {
        if (errPwd) return dataCallback(errPwd);

        // change to destination path
        return this.cwd(path, (errCwd) => {
          if (errCwd) return dataCallback(errCwd);

          // get dir listing
          return this.list(zcomp || false, (errList, list) => {
            // change back to original path
            if (errList) return this.cwd(origpath, dataCallback);

            return this.cwd(origpath, (err) => {
              if (err) return dataCallback(err);

              return dataCallback(err, list);
            });
          });
        });
      });
    } else {
      this.list(path, zcomp, dataCallback);
    }
  }

  /**
   * Retrieves the directory listing of `path`.
   *
   * ["Standard" (RFC 959)]
   * @param  {String}   path  - The path to be queried. Defaults the current
   *                            working directory.
   * @param  {Boolean}  [zcomp] - Use compression method? Default: `false`
   * @param  {Function} dataCallback - `err` (FtpError) - In case of an error
   *                                    directory.
   *                                 - `list` (Array) - Map structure
   * @return {Void}
   */
  list(path, zcomp, dataCallback) {
    let cmd;

    if (typeof path === 'function') {
      dataCallback = path;
      path = undefined;
      zcomp = false;
    } else if (typeof path === 'boolean') {
      dataCallback = zcomp;
      zcomp = path;
      path = undefined;
    } else if (typeof zcomp === 'function') {
      dataCallback = zcomp;
      cmd = `LIST ${path}`;
      zcomp = false;
    } else {
      cmd = `LIST ${path}`;
    }

    this.createDataSocket(zcomp, dataCallback, (errSock) => {
      if (errSock) {
        dataCallback(errSock);
      } else {
        this.send(cmd, (err, message, code) => {
          if (err) dataCallback(new FtpError(code, err));

          if (code === 150) {
            if (this.activeServer) this.activeServer.close();
          }
        });
      }
    });
  }

  /**
   * Retrieve a remote file.
   *
   * ["Standard" (RFC 959)]
   * @param  {String}   path - Retrieves a file at path from the server.
   * @param  {Boolean}  zcomp - Use compression method? Default: `false`
   * @param  {Function} dataCallback - `err` (FtpError) - In case of an error.
   *                                 - `fileStream` (ReadableStream) - Stream
   * @return {Void}
   */
  get(path, zcomp, dataCallback) {
    if (typeof zcomp === 'function') {
      dataCallback = zcomp;
      zcomp = false;
    }

    this.createDataSocket(zcomp, dataCallback, (errSock) => {
      if (errSock) {
        dataCallback(errSock);
      } else if (this.queue[0] && this.queue[0].cmd === 'ABOR') {
        this.dataSocket.destroy();
        dataCallback();
      } else {
        // NOTE: Implement zcomp
        this.additionalGet = {
          sockErr: undefined,
          done: false,
          started: false,
          lastReply: false,
        };

        this.onWillSendRetr(path, zcomp, (errRetr) => {
          if (errRetr) {
            dataCallback(errRetr);
          }
        });
      }
    });
  }

  /**
   * Store a file on the remote host. Sends data to the server to be stored
   * as `destPath`.
   *
   * ["Standard" (RFC 959)]
   * @param  {Mixed} input - Can be a ReadableStream, a Buffer, or a path to
   *                         a local file
   * @param  {String} path - The file remote location
   * @param  {Boolean} zcomp - Use compression method? Default: `false`
   * @param  {Function} dataCallback - `err` (FtpError) - In case of an error.
   * @return {Void}
   */
  put(input, path, zcomp, dataCallback) {
    this.store(`STOR ${path}`, input, zcomp, dataCallback, (errSock) => {
      if (errSock) {
        dataCallback(errSock);
      } else if (this.queue[0] && this.queue[0].cmd === 'ABOR') {
        this.dataSocket.destroy();
        dataCallback();
      }
    });
  }

  /**
   * (Optionnal) Retrieves the current working directory.
   *
   * ["Standard" (RFC 959)]
   * @param  {Function} dataCallback - `err` (FtpError) - In case of an error
   *                                 - `cwd` (String) - Current working
   *                                   directory.
   * @return {Void}
   */
  pwd(dataCallback) {
    this.send('PWD', (errPwd, text, code) => {
      if (errPwd) {
        return dataCallback(errPwd);
      } else if (code === 502) {
        this.cwd('.', (errCwd, cwd) => {
          if (errCwd) {
            return dataCallback(errCwd);
          }

          if (typeof cwd === 'undefined') {
            dataCallback(errPwd);
          } else {
            dataCallback(undefined, cwd);
          }

          return true;
        }, true);

        return true;
      }

      return dataCallback(undefined, RE_WD.exec(text)[1]);
    });
  }

  /**
   * (Optional) Changes the working directory to the parent of the current directory.
   *
   * ["Standard" (RFC 959)]
   * @param  {Function} callback - `err` (FtpError) - In case of an error
   * @return {Void}
   */
  cdup(callback) {
    this.send('CDUP', (err, text, code) => {
      if (code === 502) {
        this.cwd('..', callback, true);
      } else {
        callback(err);
      }
    });
  }

  mkdir() {
    // NOTE: NO IMPLEMENTED
  }

  rmdir(path, recursive, callback) {
    // NOTE: NO IMPLEMENTED
    if (typeof recursive === 'function') {
      callback = recursive;
      recursive = false;
    }

    if (!recursive) {
      this.send(`RMD ${path}`, callback);
    } else {
      this.list(path, false, (listErr, list) => {
        if (listErr) {
          callback(listErr);
        } else {
          this.deleteNextEntry(list, path, 0, callback);
        }
      });
    }
  }

  listFilenames() {
    // NOTE: NO IMPLEMENTED
    // NLST
  }

  pass() {
    // NOTE: NO IMPLEMENTED
  }

  retr() {
    // NOTE: NO IMPLEMENTED
  }

  /**
   * Return the size of a file.
   *
   * ["Standard" (RFC 3659)]
   * @param  {String}   path - The file remote location
   * @param  {Function} callback - `err` (FtpError) - In case of an error.
   *                             - `size` (Number) - Size in bytes.
   * @return {Void}
   */
  size(path, callback) {
    this.send(`SIZE ${path}`, (errSend, text, code) => {
      if (errSend) {
        callback(errSend);
      } else if (code === 502) {
        // NOTE: this may cause a problem as list() is _appended_ to the queue
        this.list(path, (errList, list) => {
          if (errList) {
            callback(errList);
          } else if (list.length === 1) {
            callback(undefined, list[0].size);
          } else {
            // path could have been a directory and we got a listing of its
            // contents, but here we echo the behavior of the real SIZE and
            // return 'File not found' for directories
            callback(new FtpError(code, text));
          }
        });
      } else {
        callback(undefined, parseInt(text, 10));
      }
    });
  }

  /**
   * Retrieves the last modified date and time for `path`.
   *
   * ["Standard" (RFC 3659)]
   * @param  {String}   path - The file remote location
   * @param  {Function} dataCallback - `err` (FtpError) - In case of an error.
   *                                 - `lastModified` (Date) - Last modified date
   * @return {Void}
   */
  lastMod(path, dataCallback) {
    this.send(`MDTM ${path}`, (errSend, message, code) => {
      if (code === 502) {
        this.list(path, (errList, list) => {
          if (errList) {
            return dataCallback(errList);
          }

          if (list.length === 1) {
            return dataCallback(undefined, list[0].date);
          }

          return dataCallback(code, new FtpError(message));
        });
      } else if (errSend) {
        return dataCallback(errSend);
      }

      const date = PARSE_DATE(message);

      if (!date) {
        return dataCallback(new FtpError(500, 'Invalid date/time format from server'));
      }

      return dataCallback(undefined, date);
    });
  }

  /**
   * Sets the file byte offset for the next file transfer action (get/put) to
   * byteOffset.
   *
   * ["Standard" (RFC 3659)]
   * @param  {Number} byteOffset - Offset positive number.
   * @param  {Function} dataCallback - `err` (FtpError) - In case of an error.
   * @return {Void}
   */
  restart(byteOffset, dataCallback) {
    this.send(`REST ${byteOffset}`, dataCallback);
  }

  /**
   * Additional function for recursive delete method.
   */
  deleteNextEntry(list, path, idx, cb) {
    if (idx >= list.length) {
      if (list[0] && list[0].name === path) {
        return cb(null);
      }

      return this.rmdir(path, cb);
    }

    let entry = list[idx++];
    let subPath = null;

    if (entry.name[0] === '/') {
      // this will be the case when you call deleteRecursively() and pass
      // the path to a plain file
      subPath = entry.name;
    } else if (path[path.length - 1] === '/') {
      subPath = path + entry.name;
    } else {
      subPath = `${path}/${entry.name}`;
    }

    // delete the entry (recursively) according to its type
    if (entry.type === 'd') {
      if (entry.name === '.' || entry.name === '..') {
        this.deleteNextEntry();
      }

      this.rmdir(subPath, true, this.deleteNextEntry);
    } else {
      this.delete(subPath, this.deleteNextEntry);
    }

    return true;
  }
};
