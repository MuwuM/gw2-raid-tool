import EventEmitter from 'events'
import {
  InitStatusUninitialized,
  InitStatusStatusCode,
  NedbDatabase,
  BaseConfig,
  BackendConfig,
  EventHub
} from '../raid-tool'

type Handler = (...args: any[]) => void

class InitStatusClass implements InitStatusUninitialized {
  _status = 0
  _step = ''
  _emitter = new EventEmitter()
  db?: NedbDatabase
  baseConfig?: BaseConfig
  backendConfig?: BackendConfig
  eventHub?: EventHub

  set status(name) {
    this._status = name
    this._step = ''
    this._emitter.emit('statusChange', this._status, this._step)
  }
  get status() {
    return this._status
  }
  set step(name) {
    this._step = name
    this._emitter.emit('statusChange', this._status, this._step)
  }
  get step() {
    return this._step
  }
  onChange(handler: Handler) {
    handler(this._status, this._step)
    this._emitter.on('statusChange', handler)
  }
  offChange(handler: Handler) {
    this._emitter.off('statusChange', handler)
  }
  waitFor(status: InitStatusStatusCode) {
    if (status <= this._status) {
      return Promise.resolve(this._status)
    }
    return new Promise<InitStatusStatusCode>((res) => {
      const handler = (stat: InitStatusStatusCode) => {
        if (status > stat) {
          return
        }
        this._emitter.off('statusChange', handler)
        res(stat)
      }
      this._emitter.on('statusChange', handler)
    })
  }
}

export default new InitStatusClass()
