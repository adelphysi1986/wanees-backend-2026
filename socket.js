const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: '*' },
  });

  // كل سوكيت لازم يبعت التوكن وقت الاتصال، وبنتحقق منه هون
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('لا يوجد توكن'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('توكن غير صالح'));
    }
  });

  io.on('connection', (socket) => {
    // كل يوزر بينضم لغرفة خاصة فيه بس — ما حدا ثاني بيشوف تحديثاته
    socket.join(`user:${socket.userId}`);
    console.log(`Socket connected -> user:${socket.userId}`);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected -> user:${socket.userId}`);
    });
  });

  return io;
}

// بينادى من أي كنترولر عشان يبعت تحديث لزبون معيّن
function emitActivityChange(customerId, payload) {
  if (!io) return;
  io.to(`user:${customerId}`).emit('activityChanged', payload);
}

module.exports = { initSocket, emitActivityChange };