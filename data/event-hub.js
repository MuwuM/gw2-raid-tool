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
  onLocalHandler: [],
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
  onLocal(evt, handler) {
    module.exports.onLocalHandler.push({
      fn: "on",
      args: [
        evt,
        handler
      ]
    });
  },
  emit(evt, data) {
    for (const localHandler of module.exports.onLocalHandler) {
      if (localHandler.args[0] === evt && typeof localHandler.args[1] === "function") {
        try {
          localHandler.args[1]();
        } catch (error) {
          console.error(error);
        }
      }
    }
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
