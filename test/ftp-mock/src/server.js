const net = require('net');

function socketHandler(socket) {
  socket.write('220 (Ftp-mock 0.0.1)\r\n');

  socket.on('data', (data) => {
    socket.write(`DATA ${data}` + '\r\n');

    if (/greeting/.test(data)) {
      socket.write('220 Welcome in FTP Mock server\r\n');
    } else if (/USER/.test(data)) {
      socket.write('220 Welcome in FTP Mock server\r\n');
    } else {
      socket.write('500 Unknown command\r\n');
    }

    socket.destroy();
  });

  socket.on('close', () => {
    socket.end('221 Goodbye.\r\n');
  });

  // socket.pipe(socket);
}

module.exports = net.createServer(socketHandler).on('error', (err) => {
  throw err;
});
