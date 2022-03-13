
const initStatus = {
  set status(name) {
    this._status = name;
    this._step = "";
    for (const handler of this._handler) {
      handler(this._status, this._step);
    }
  },
  get status() {
    return this._status;
  },
  _status: 0,
  set step(name) {
    this._step = name;
    for (const handler of this._handler) {
      handler(this._status, this._step);
    }
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
  _handler: [],
  onChange(handler) {
    handler(this._status);
    this._handler.push(handler);
  },
  offChange(handler) {
    const index = this._handler.indexOf(handler);
    if (index >= 0) {
      this._handler.splice(index, 1);
    }
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
        this.offChange(handler);
        res(stat);
      };
      this._handler.push(handler);
    });
  }
};
module.exports = initStatus;
