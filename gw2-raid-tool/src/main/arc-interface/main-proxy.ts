import { BaseConfig, EventHubEmitter, NedbDatabase, ProgressConfigProxied } from '../../raid-tool'

let reqIdCount = 0

const delayProgressConfig = {} as { [key: string]: NodeJS.Timeout }

type Proxify<T> = {
  [P in keyof T]: T[P] extends object ? Proxify<T[P]> : Promise<T[P]>
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
                    process.off('message', respHandler)
                    rej(resp.err)
                    return
                  }
                  if (!resp || resp.msg !== 'dbres' || resp.reqId !== reqId) {
                    return
                  }
                  process.off('message', respHandler)
                  res(resp.dbres)
                }
                process.on('message', respHandler)
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
            process.off('message', respHandler)
            rej(resp.err)
            return
          }
          if (!resp || resp.msg !== 'cfgRes' || resp.reqId !== reqId) {
            return
          }
          process.off('message', respHandler)
          res(resp.cfgRes)
          delete t[`get-${prop}`]
        }
        process.on('message', respHandler)
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
}) as Readonly<Proxify<BaseConfig>>
export const progressConfig = new Proxy({} as any, {
  get() {},
  set(_t, prop: string, value) {
    if (prop.startsWith('$')) {
      //console.log(`${prop}: ${value}`);
      const realProp = prop.substring(1)
      if (delayProgressConfig[realProp]) {
        clearTimeout(delayProgressConfig[realProp])
      }
      delete delayProgressConfig[realProp]
      reqIdCount++
      const reqId = reqIdCount
      process.send?.({
        msg: 'setProgressConfig',
        reqId,
        prop: realProp,
        value
      })
    } else {
      if (delayProgressConfig[prop]) {
        clearTimeout(delayProgressConfig[prop])
      }
      delayProgressConfig[prop] = setTimeout(() => {
        delete delayProgressConfig[prop]
        reqIdCount++
        const reqId = reqIdCount
        process.send?.({
          msg: 'setProgressConfig',
          reqId,
          prop,
          value
        })
      }, 1)
    }
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
