import electron from 'electron'
import path from 'path'
import fs from 'fs-extra'
import detachedInterfaceWrapper from './detached-interface-wrapper'

import * as RaidToolDef from '../raid-tool'

import dbConnect from './db'
import electronHandler from './electron-handler'
import updater from './updater'
import updateGw2Instances from './update-gw2-instances'
import updateMumbleLinkData from './update-mumble-links'
import util from 'util'
const execSync = require('child_process').exec
const execAsync = util.promisify(execSync)

import eventHub from './event-hub'
import pgk from '../../package.json'
import handleSquirrelEvent from './handle-squirrel-event'
import initStatus from './init-status'
import loadConfig from './util/load-config'
import loadArcdpsConfig from './util/load-arcdps-config'
import settings from './routes/settings'
import arc from './routes/arc'
import keys from './routes/keys'
const isAdmin = async () => {
  const { stdout } = await execAsync('whoami /groups')
  const isAdmin = stdout.indexOf('12288') > -1
  return isAdmin
}

const electronApp = electron.app

if (handleSquirrelEvent(electronApp)) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  process.exit(0)
}

electronHandler({
  electronApp,
  initStatus
})
;(async () => {
  //
  const userDataDir = electronApp.getPath('userData')

  const progressConfig = {
    parsingLogs: 0,
    parsedLogs: 0,
    compressingLogs: 0,
    compressedLogs: 0,
    currentLog: false
  } as RaidToolDef.ProgressConfig

  const backendConfig = {
    userDataDir,
    dbBaseDir: userDataDir
  } as RaidToolDef.BackendConfig

  const baseConfig = {
    appVersion: pgk.version,
    isAdmin: await isAdmin()
  } as RaidToolDef.BaseConfig

  const db = await dbConnect({ backendConfig })

  initStatus.db = db
  initStatus.baseConfig = baseConfig
  initStatus.backendConfig = backendConfig
  initStatus.eventHub = eventHub

  const savedConfig = await loadConfig(db, baseConfig, electronApp)

  await updateGw2Instances({
    baseConfig,
    eventHub
  })

  initStatus.status = RaidToolDef.InitStatusStatusCode.Updating
  await updater({
    baseConfig,
    backendConfig,
    initStatus
  })

  initStatus.status = RaidToolDef.InitStatusStatusCode.Loading

  await loadArcdpsConfig(baseConfig, savedConfig, db, electronApp)

  await detachedInterfaceWrapper(
    path.join(__dirname, './gw2-interface.js'),
    {
      db,
      baseConfig,
      progressConfig,
      eventHub
    },
    10
  )
  await detachedInterfaceWrapper(
    path.join(__dirname, './arc-interface.js'),
    {
      db,
      baseConfig,
      progressConfig,
      eventHub
    },
    50
  )

  updateMumbleLinkData({
    baseConfig,
    backendConfig,
    eventHub
  })

  let builds = (baseConfig.buildJsonPath && (await fs.readJSON(baseConfig.buildJsonPath))) || []

  if (baseConfig.localBuilds) {
    const updateBuilds = async () => {
      try {
        const oldBuilds = JSON.stringify(builds)
        builds = (baseConfig.buildJsonPath && (await fs.readJSON(baseConfig.buildJsonPath))) || []
        if (oldBuilds !== JSON.stringify(builds)) {
          eventHub.emit('builds', { builds })
        }
      } catch (error) {
        console.error(error)
      }
      setTimeout(updateBuilds, 500)
    }
    setTimeout(updateBuilds, 500)
  }

  const router = { get() {} } as RaidToolDef.TODO

  await settings({ router, db, baseConfig, backendConfig, eventHub })
  await arc({ router, db, baseConfig, backendConfig, eventHub })
  await keys({ router, db, baseConfig, backendConfig, eventHub })

  initStatus.status = RaidToolDef.InitStatusStatusCode.Loaded
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
