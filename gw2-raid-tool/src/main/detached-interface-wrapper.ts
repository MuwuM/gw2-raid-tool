import * as RaidToolDef from '../raid-tool'
import { fork } from 'child_process'
import { dialog, shell } from 'electron'
import os from 'os'
import path from 'path'

const wrapper = async (
  childProcessFile: string,
  {
    db,
    baseConfig,
    progressConfig,
    eventHub
  }: {
    db: RaidToolDef.NedbDatabase
    baseConfig: RaidToolDef.BaseConfig
    progressConfig: RaidToolDef.ProgressConfig
    eventHub: RaidToolDef.EventHub
  },
  memoryModificator: number
) => {
  const pctMem = Math.max(
    Math.ceil(4 * 1024 * (Math.max(1, memoryModificator) / 100)),
    Math.floor((os.freemem() / 10485760) * (Math.max(1, memoryModificator) / 100))
  )
  console.info(`Using up to ${pctMem}MB for ${path.basename(childProcessFile)}`)
  const child = fork(childProcessFile, {
    stdio: 'inherit',
    execArgv: [`--max-old-space-size=${pctMem}`]
  })

  let isExiting = false
  process.on('exit', () => {
    isExiting = true
    child.kill()
  })

  child.on('error', (err) => {
    console.error(err)
  })

  child.on('exit', () => {
    if (isExiting) {
      return
    }
    console.warn({ 'child.exitCode': child.exitCode })
    if (child.exitCode === 134 || child.exitCode === 9) {
      setTimeout(() => {
        wrapper(
          childProcessFile,
          {
            db,
            baseConfig,
            progressConfig,
            eventHub
          },
          memoryModificator
        )
      }, 1000)
    } else {
      dialog
        .showMessageBox({
          title: 'Error processing logs',
          message:
            'Unexpected error processing logs: \nPlease report this issue.\n\nThank you. \n\nTo continue parsing logs, you have to restart the Raid Tool.',
          type: 'error'
        })
        .then(() => {
          const newIssueUrl = new URL('https://github.com/MuwuM/gw2-raid-tool/issues/new')
          newIssueUrl.searchParams.set('title', 'Error processing my logs')
          newIssueUrl.searchParams.set(
            'body',
            `I got an error processing my logs: \n\`\`\`\nUnexpected Exit Code: ${child.exitCode}\n\`\`\`\n`
          )
          shell.openExternal(newIssueUrl.href)
        })
    }
  })

  child.on(
    'message',
    async ({ msg, reqId, database, method, options, prop, value }: RaidToolDef.TODO) => {
      try {
        if (msg === 'db') {
          try {
            const res = await db[database][method](...options)
            child.send({
              msg: 'dbres',
              dbres: res,
              reqId
            })
          } catch (error: RaidToolDef.TODO) {
            if (!child.killed) {
              child.send({
                msg: 'error',
                err: (error && error.stack) || error,
                reqId
              })
            } else {
              console.error(error)
            }
          }
        } else if (msg === 'getBaseConfig') {
          child.send({
            msg: 'cfgRes',
            cfgRes: baseConfig[prop],
            reqId
          })
        } else if (msg === 'setBaseConfig') {
          baseConfig[prop] = value
          eventHub.emit('baseConfig', { baseConfig })
        } else if (msg === 'getProgessConfig') {
          child.send({
            msg: 'cfgProgessRes',
            cfgRes: progressConfig[prop],
            reqId
          })
        } else if (msg === 'setProgressConfig') {
          progressConfig[prop] = value
          eventHub.emit('progressConfig', { progressConfig })
        } else if (msg === 'emitEventHub') {
          eventHub.emit(prop, value)
        }
      } catch (error) {
        console.error(error)
      }
    }
  )
}

export default wrapper
