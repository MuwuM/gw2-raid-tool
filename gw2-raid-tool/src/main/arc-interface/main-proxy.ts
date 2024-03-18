import EventEmitter from 'events'
import { BaseConfig, EventHubEmitter, NedbDatabase, ProgressConfigProxied } from '../../raid-tool'

let reqIdCount = 0

type ProxifyReadAccess<T> = {
  [P in keyof T]: Promise<T[P]>
}

type ResponseHandler = (
  resp:
    | {
        msg: 'error'
        reqId: number
        err: any
      }
    | {
        msg: 'dbres'
        reqId: number
        dbres: any
      }
    | {
        msg: 'cfgRes'
        reqId: number
        cfgRes: any
      }
    | undefined
) => void

function registerMessage(handler: ResponseHandler): void {
  ;(process as EventEmitter).on('message', handler)
}

function unregisterMessage(handler: ResponseHandler): void {
  ;(process as EventEmitter).off('message', handler)
}

export const db = new Proxy({} as any, {
  get(t, database: keyof NedbDatabase) {
    if (!t[database]) {
      t[database] = new Proxy(
        {},
        {
          get(_s, method: keyof NedbDatabase[keyof NedbDatabase]) {
            return (...options: any[]) =>
              new Promise((res, rej) => {
                reqIdCount++
                const reqId = reqIdCount
                const respHandler: ResponseHandler = (resp) => {
                  if (resp && resp.msg === 'error' && resp.reqId === reqId) {
                    unregisterMessage(respHandler)
                    rej(resp.err)
                    return
                  }
                  if (!resp || resp.msg !== 'dbres' || resp.reqId !== reqId) {
                    return
                  }
                  unregisterMessage(respHandler)
                  res(resp.dbres)
                }
                registerMessage(respHandler)
                process.send?.({
                  msg: 'db',
                  reqId,
                  database,
                  method,
                  options
                })
              })
          }
        }
      )
    }
    return t[database]
  }
}) as NedbDatabase
export const baseConfig = new Proxy({} as any, {
  get(t, prop: string) {
    if (!t[`get-${prop}`]) {
      t[`get-${prop}`] = new Promise((res, rej) => {
        reqIdCount++
        const reqId = reqIdCount
        const respHandler: ResponseHandler = (resp) => {
          if (resp && resp.msg === 'error' && resp.reqId === reqId) {
            unregisterMessage(respHandler)
            rej(resp.err)
            return
          }
          if (!resp || resp.msg !== 'cfgRes' || resp.reqId !== reqId) {
            return
          }
          unregisterMessage(respHandler)
          res(resp.cfgRes)
          delete t[`get-${prop}`]
        }
        registerMessage(respHandler)
        process.send?.({
          msg: 'getBaseConfig',
          reqId,
          prop
        })
      })
    }
    return t[`get-${prop}`]
  },
  set() {
    return false
  }
}) as Readonly<ProxifyReadAccess<BaseConfig>>
export const progressConfig = new Proxy({} as any, {
  get() {
    // write only
  },
  set(_t, prop: string, value) {
    reqIdCount++
    const reqId = reqIdCount
    process.send?.({
      msg: 'setProgressConfig',
      reqId,
      prop: prop,
      value
    })
    return true
  }
}) as ProgressConfigProxied

export const eventHub = {
  emit(prop, value) {
    reqIdCount++
    const reqId = reqIdCount
    process.send?.({
      msg: 'emitEventHub',
      reqId,
      prop,
      value
    })
  }
} as EventHubEmitter
