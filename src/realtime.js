const { Server } = require('socket.io');
const { userFromToken } = require('./auth');

let io = null;

function init(httpServer) {
  io = new Server(httpServer); // same-origin only: no wildcard CORS
  io.use((socket, next) => {
    try {
      const user = userFromToken(socket.handshake.auth && socket.handshake.auth.token);
      socket.join('user:' + user.id); // each user can only ever listen to their own room
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });
}

function notify(userId, payload) {
  if (io) io.to('user:' + userId).emit('balance', payload);
}

module.exports = { init, notify };
