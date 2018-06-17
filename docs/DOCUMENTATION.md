# @icetee/ftp _2.0.0_

> An FTP client module for node.js

## lib/expressions.js

### PARSE_IPV4_PASV()

Parse Passive Mode FTP server IPv4 response

#### Returns

- `Void`

### PARSE_IPV4_EPSV()

Parse Extended Passive Mode FTP server IPv4 response

#### Returns

- `Void`

## lib/ftp-error.js

### module.exports()

Error type for this module

#### Properties

Name | Type | Description |
---- | ---- | ----------- |
|

#### Returns

- `Void`

## lib/ftp-service.js

### _reentry(err, text, code)

The magic ✨ fuction .Responsible for workflow.

#### Parameters

Name | Type       | Description                          |
---- | ---------- | ------------------------------------ |
err  | `FtpError` | Server response error                |
text | `String`   | Server response in parsed human text |
code | `Number`   | Server response in parsed number     |

#### Returns

- `Void`

### createDataSocket(args)

It chooses to open an `active` or `passive` socket connection. Data and communication are on two separate channels!

#### Parameters

Name | Type     | Description                                                                                                                                                                                                                                                                                                                            |
---- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
args | `Object` | - `zcomp` (boolean) - Use compression method? Default: `false`<br>
- `dataCallback` (function) - Callback of data communication<br>
- `connCallback` (function) - Callback of command communication<br>
- `errSock` - In case of an error.<br>
- `message` - Communication response message<br>
- `code` - Communication response code |

#### Returns

- `Void`

### active(zcomp, dataCallback, connCallback)

Initialize active connection.

#### Parameters

Name         | Type       | Description                                |
------------ | ---------- | ------------------------------------------ |
zcomp        | `boolean`  | - Use compression method? Default: `false` |
dataCallback | `Function` | - Callback of data communication           |
connCallback | `Function` | - Callback of command communication        |

#### Returns

- `Void`

### passive(zcomp, dataCallback, connCallback)

Initialize passive connection.

#### Parameters

Name         | Type       | Description                                |
------------ | ---------- | ------------------------------------------ |
zcomp        | `boolean`  | - Use compression method? Default: `false` |
dataCallback | `Function` | - Callback of data communication           |
connCallback | `Function` | - Callback of command communication        |

#### Returns

- `Void`

### passiveConnect(pasvAddress, zcomp, callback, cb)

Build passive socket, this method is extends of `passive` function.

#### Parameters

Name        | Type       | Description                                  |
----------- | ---------- | -------------------------------------------- |
pasvAddress | `object`   | - Server IP Address and Server Port number   |
zcomp       | `boolean`  | - Use compression method? Default: `false`   |
callback    | `Function` | - Original callback function for data stream |
cb          | `Function` |                                              |

#### Returns

- `Void`

### end()

#### Returns

- `Void`

### destroy()

#### Returns

- `Void`

### initNoopreq()

Assets methods

#### Returns

- `Void`

### this.timer()

Listen connSocket timeout. It can be parameterized with options.connTimeout property.

#### Returns

- `Void`

### this.timerDataSocket()

Listen dataSocket timeout. It can be parameterized with options.pasvTimeout property.

#### Returns

- `Void`

### events()

Events

#### Returns

- `Void`

### onWillDoneGet(done, lastreply)

Additional function for get method. Set transfer method to `stream`

#### Parameters

Name      | Type      | Description      |
--------- | --------- | ---------------- |
done      | `Boolean` | - Is done?       |
lastreply | `Boolean` | - Is last reply? |

#### Returns

- `Void`

### onWillSendRetr(path, zcomp, cb)

Additional function for get method. Set transfer method to `stream`

this callback will be executed multiple times, the first is when server replies with 150, then a final reply after the data connection closes to indicate whether the transfer was actually a success or not

#### Parameters

Name  | Type       | Description   |
----- | ---------- | ------------- |
path  | `String`   | [description] |
zcomp | `Boolean`  | [description] |
cb    | `Function` | [description] |

#### Returns

- `Void`

## lib/ftp.js

### abort(immediate[, dataCallback])

Aborts the current data transfer (e.g. from get(), put(), or list()).

["Standard" (RFC 959)]

#### Parameters

Name         | Type                 | Description                                                               |
------------ | -------------------- | ------------------------------------------------------------------------- | ----------
immediate    | `Boolean` `Function` | - Be done right away. If `true` will not be added to the end of the list. |
dataCallback | `Function`           | - `err` (FtpError) - In case of an error                                  | _Optional_

#### Returns

- `Void`

### append(input, destPath[, zcomp], dataCallback)

Append data to the end of a file on the remote host. Same as put(), except if destPath already exists, it will be appended to instead of overwritten.

#### Parameters

Name         | Type       | Description                                |
------------ | ---------- | ------------------------------------------ | ----------
input        | `Mixed`    | [description]                              |
destPath     | `String`   | - The file remote location                 |
zcomp        | `Boolean`  | - Use compression method? Default: `false` | _Optional_
dataCallback | `Function` | - `err` (FtpError) - In case of an error.  |

#### Returns

- `Void`

### ascii(dataCallback)

Sets the transfer data type to ASCII.

["Standard" (RFC 959)]

#### Parameters

Name         | Type       | Description                               |
------------ | ---------- | ----------------------------------------- |
dataCallback | `Function` | - `err` (FtpError) - In case of an error. |

#### Returns

- `Void`

### binary(dataCallback)

Sets the transfer data type to binary.

["Standard" (RFC 959)]

#### Parameters

Name         | Type       | Description                               |
------------ | ---------- | ----------------------------------------- |
dataCallback | `Function` | - `err` (FtpError) - In case of an error. |

#### Returns

- `Void`

### cwd(path, dataCallback[, promote=false])

Change working directory. Makes the given directory be the current directory on the remote host.

["Standard" (RFC 959)]

#### Parameters

Name          | Type       | Description                                                                                                                               |
------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------
path          | `String`   | - Location from the server                                                                                                                |
dataCallback  | `Function` | - `err` (FtpError) - In case of an error - `currentDir` - Is only given if the<br>
server replies with the path in the<br>
response text. |
promote=false | `Boolean`  | [description]                                                                                                                             | _Optional_

#### Returns

- `Void`

### delete(path, dataCallback)

Delete remote file.

["Standard" (RFC 959)]

#### Parameters

Name         | Type       | Description                               |
------------ | ---------- | ----------------------------------------- |
path         | `String`   | - Location from the server                |
dataCallback | `Function` | - `err` (FtpError) - In case of an error. |

#### Returns

- `Void`

### site(cmd, dataCallback)

Executes a site-specific command.

["Standard" (RFC 959)]

#### Parameters

Name         | Type       | Description                                                 |
------------ | ---------- | ----------------------------------------------------------- |
cmd          | `String`   | - Sends command (e.g. 'CHMOD 755 foo', 'QUOTA') using SITE. |
dataCallback | `Function` | - `err` (FtpError) - In case of an error.                   |

#### Returns

- `Void`

### status(dataCallback)

Retrieves human-readable information about the server's status.

["Standard" (RFC 959)]

#### Parameters

Name         | Type       | Description                               |
------------ | ---------- | ----------------------------------------- |
dataCallback | `Function` | - `err` (FtpError) - In case of an error. |

#### Returns

- `Void`

### rename(oldPath, newPath, dataCallback)

Rename remote file or directory name. Also helps move it.

["Standard" (RFC 959)]

#### Parameters

Name         | Type       | Description                                                                        |
------------ | ---------- | ---------------------------------------------------------------------------------- |
oldPath      | `String`   | - Old file / directory remote location                                             |
newPath      | `String`   | - New file / directory remote location                                             |
dataCallback | `Function` | - `err` (FtpError) - In case of an error. - `fileStream` (ReadableStream) - Stream |

#### Returns

- `Void`

### logout(dataCallback)

Logout the user from the server.

["Standard" (RFC 959)]

#### Parameters

Name         | Type       | Description                               |
------------ | ---------- | ----------------------------------------- |
dataCallback | `Function` | - `err` (FtpError) - In case of an error. |

#### Returns

- `Void`

### listSafe([path, zcomp], dataCallback)

(Optional) Similar to list(), except the directory is temporarily changed to path to retrieve the directory listing. This is useful for servers that do not handle characters like spaces and quotes in directory names well for the LIST command. This function is "optional" because it relies on pwd() being available.

["Standard" (RFC 959)]

#### Parameters

Name         | Type       | Description                                                                              |
------------ | ---------- | ---------------------------------------------------------------------------------------- | ----------
path         | `type`     | - The path to be queried. Defaults the current working directory.                        | _Optional_
zcomp        | `Boolean`  | - Use compression method? Default: `false`                                               | _Optional_
dataCallback | `Function` | - `err` (FtpError) - In case of an error directory.<br>
- `list` (Array) - Map structure |

#### Returns

- `Void`

### list(path[, zcomp], dataCallback)

Retrieves the directory listing of `path`.

["Standard" (RFC 959)]

#### Parameters

Name         | Type       | Description                                                                              |
------------ | ---------- | ---------------------------------------------------------------------------------------- | ----------
path         | `String`   | - The path to be queried. Defaults the current working directory.                        |
zcomp        | `Boolean`  | - Use compression method? Default: `false`                                               | _Optional_
dataCallback | `Function` | - `err` (FtpError) - In case of an error directory.<br>
- `list` (Array) - Map structure |

#### Returns

- `Void`

### get(path, zcomp, dataCallback)

Retrieve a remote file.

["Standard" (RFC 959)]

#### Parameters

Name         | Type       | Description                                                                        |
------------ | ---------- | ---------------------------------------------------------------------------------- |
path         | `String`   | - Retrieves a file at path from the server.                                        |
zcomp        | `Boolean`  | - Use compression method? Default: `false`                                         |
dataCallback | `Function` | - `err` (FtpError) - In case of an error. - `fileStream` (ReadableStream) - Stream |

#### Returns

- `Void`

### put(input, path, zcomp, dataCallback)

Store a file on the remote host. Sends data to the server to be stored as `destPath`.

["Standard" (RFC 959)]

#### Parameters

Name         | Type       | Description                                                    |
------------ | ---------- | -------------------------------------------------------------- |
input        | `Mixed`    | - Can be a ReadableStream, a Buffer, or a path to a local file |
path         | `String`   | - The file remote location                                     |
zcomp        | `Boolean`  | - Use compression method? Default: `false`                     |
dataCallback | `Function` | - `err` (FtpError) - In case of an error.                      |

#### Returns

- `Void`

### pwd(dataCallback)

(Optionnal) Retrieves the current working directory.

["Standard" (RFC 959)]

#### Parameters

Name         | Type       | Description                                                                                |
------------ | ---------- | ------------------------------------------------------------------------------------------ |
dataCallback | `Function` | - `err` (FtpError) - In case of an error - `cwd` (String) - Current working<br>
directory. |

#### Returns

- `Void`

### cdup(callback)

(Optional) Changes the working directory to the parent of the current directory.

["Standard" (RFC 959)]

#### Parameters

Name     | Type       | Description                              |
-------- | ---------- | ---------------------------------------- |
callback | `Function` | - `err` (FtpError) - In case of an error |

#### Returns

- `Void`

### size(path, callback)

Return the size of a file.

["Standard" (RFC 3659)]

#### Parameters

Name     | Type       | Description                                                                  |
-------- | ---------- | ---------------------------------------------------------------------------- |
path     | `String`   | - The file remote location                                                   |
callback | `Function` | - `err` (FtpError) - In case of an error. - `size` (Number) - Size in bytes. |

#### Returns

- `Void`

### lastMod(path, dataCallback)

Retrieves the last modified date and time for `path`.

["Standard" (RFC 3659)]

#### Parameters

Name         | Type       | Description                                                                            |
------------ | ---------- | -------------------------------------------------------------------------------------- |
path         | `String`   | - The file remote location                                                             |
dataCallback | `Function` | - `err` (FtpError) - In case of an error. - `lastModified` (Date) - Last modified date |

#### Returns

- `Void`

### restart(byteOffset, dataCallback)

Sets the file byte offset for the next file transfer action (get/put) to byteOffset.

["Standard" (RFC 3659)]

#### Parameters

Name         | Type       | Description                               |
------------ | ---------- | ----------------------------------------- |
byteOffset   | `Number`   | - Offset positive number.                 |
dataCallback | `Function` | - `err` (FtpError) - In case of an error. |

#### Returns

- `Void`

### deleteNextEntry()

Additional function for recursive delete method.

#### Returns

- `Void`

_Documentation generated with [doxdox](https://github.com/neogeek/doxdox)._
