const EventEmitter = require("events");

/**
 * @type  {import("./raid-tool").InitStatus}
 */
const initStatus = {
  set status(name) {
    this._status = name;
    this._step = "";
    this._emitter.emit("statusChange", this._status, this._step);
  },
  get status() {
    return this._status;
  },
  _status: 0,
  set step(name) {
    this._step = name;
    this._emitter.emit("statusChange", this._status, this._step);
  },
  get step() {
    return this._step;
  },
  _step: "",
  state: {
    Starting: 0,
    Updating: 1,
    Loading: 2,
    Loaded: 3
  },
  get stateLabel() {
    if (!this._stateLabels) {
      this._stateLabels = {};
      for (const [
        key,
        value
      ] of Object.entries(this.state)) {
        this._stateLabels[value] = key;
      }
    }
    return this._stateLabels;
  },
  _emitter: new EventEmitter(),
  onChange(handler) {
    handler(this._status, this._step);
    this._emitter.on("statusChange", handler);
  },
  offChange(handler) {
    this._emitter.off("statusChange", handler);
  },
  waitFor(status) {
    if (status <= this._status) {
      return Promise.resolve(this._status);
    }
    return new Promise((res) => {
      const handler = (stat) => {
        if (status > stat) {
          return;
        }
        this._emitter.off("statusChange", handler);
        res(stat);
      };
      this._emitter.on("statusChange", handler);
    });
  }
};
module.exports = initStatus;
