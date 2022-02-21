let io;
let queue = [];
module.exports = {
  registerIo(_io) {
    io = _io;
    for (const step of queue) {
      try {
        module.exports[step.fn](...step.args);
      } catch (error) {
        console.error(error);
      }
    }
    queue = [];
  },
  onHandler: [],
  sockets: [],
  on(evt, handler) {
    module.exports.onHandler.push({
      fn: "on",
      args: [
        evt,
        handler
      ]
    });
    for (const socket of module.exports.sockets) {
      socket.on(evt, handler);
    }
  },
  emit(evt, data) {
    if (!io) {
      queue.push({
        fn: "emit",
        args: [
          evt,
          data
        ]
      });
      return;
    }
    io.emit(evt, data);
  }
};
