import { dialog, app } from 'electron'
import path from 'path'
import util from 'util'
import fs from 'fs-extra'
import fg from 'fast-glob'
import wincmd from 'node-windows'
const elevate = util.promisify(wincmd.elevate)

import updateAccStats from '../gw2-interface/update-acc-stats'
import updateArcDps11 from '../update-arc-dps-11'
import i18n from '../../i18n/i18n-loader'

import { ChildProcess, spawn } from 'child_process'
import { ServerRouteHandler } from '../../raid-tool'
import { gw2ApiClient } from '../gw2-api-with-types'

export default (async ({ db, baseConfig, eventHub }) => {
  eventHub.on('addAccount', async ({ token }) => {
    //console.log({ addAccount: { token } })
    if (token) {
      const acc = await db.accounts.insert({
        token,
        kps: {
          li: 0,
          fractal: 0,
          boneSkinner: 0,
          zhaitaffy: 0,
          raidBossKp: {},
          unopenedBoxes: []
        },
        completedSteps: [],
        completedCMs: {},
        completedStrikesDaily: {},
        completedFractalsDaily: {},
        completedStrikesWeekly: {}
      })
      eventHub.emit('accounts', { accounts: await db.accounts.find({}) })
      const apiClient = gw2ApiClient(acc.token)
      const accountInfo = await apiClient.account().get()
      await db.accounts.update({ _id: acc._id }, { $set: { accountInfo } })
      eventHub.emit('accounts', { accounts: await db.accounts.find({}) })
      const account = await db.accounts.findOne({ _id: acc._id })
      await updateAccStats({
        db,
        apiClient,
        account,
        eventHub
      })
      eventHub.emit('accounts', { accounts: await db.accounts.find({}) })
    }
  })
  eventHub.on('removeAccount', async ({ token }) => {
    if (token) {
      const acc = await db.accounts.findOne({ token })
      if (acc) {
        const res = await dialog.showMessageBox({
          message: i18n[baseConfig.lang].removeAccountQuestion,
          type: 'warning',
          buttons: [
            i18n[baseConfig.lang].removeAccountQuestionConfirm,
            i18n[baseConfig.lang].removeAccountQuestionCancel
          ],
          defaultId: 1,
          cancelId: 1
        })
        if (res.response === 0) {
          await db.accounts.remove({ _id: acc._id }, { multi: false })
          eventHub.emit('accounts', { accounts: await db.accounts.find({}) })
        }
      }
    }
  })
  eventHub.on('changeLang', async ({ lang }) => {
    //console.log("changeLang", {lang});
    if (lang) {
      if (i18n.langIds.includes(lang)) {
        baseConfig.lang = lang
        eventHub.emit('baseConfig', { baseConfig })
        await db.settings.update(
          { _id: baseConfig.savedConfigId },
          { $set: { lang: baseConfig.lang } }
        )
      }
    }
  })
  eventHub.on('selectLogsPath', async () => {
    //console.log("selectLogsPath", {});
    const res = await dialog.showOpenDialog({
      title: i18n[baseConfig.lang].settingsArcdpsLogDir,
      properties: ['openDirectory'],
      buttonLabel: i18n[baseConfig.lang].settingsApplyAndRestart,
      defaultPath: baseConfig.logsPath
    })
    await db.settings.update(
      { _id: baseConfig.savedConfigId },
      { $set: { logsPath: res.filePaths[0] } }
    )
    app.relaunch()
    app.exit(0)
  })
  eventHub.on('selectGw2Dir', async () => {
    //console.log("selectGw2Dir", {});
    const res = await dialog.showOpenDialog({
      title: i18n[baseConfig.lang].msgSelectInstall,
      filters: [
        {
          name: 'Gw2-64.exe',
          extensions: ['exe']
        }
      ],
      properties: ['openFile'],
      buttonLabel: i18n[baseConfig.lang].settingsApplyAndRestart,
      defaultPath: baseConfig.gw2Dir
    })
    if (!res.canceled && res.filePaths.length > 0) {
      baseConfig.gw2Dir = path.dirname(res.filePaths[0])
      eventHub.emit('baseConfig', { baseConfig })
      await db.settings.update(
        { _id: baseConfig.savedConfigId },
        { $set: { gw2Dir: baseConfig.gw2Dir } }
      )
    }
    app.relaunch()
    app.exit(0)
  })

  eventHub.on('selectLaunchBuddyDir', async () => {
    //console.log("selectLaunchBuddyDir", {});
    const res = await dialog.showOpenDialog({
      title: i18n[baseConfig.lang].msgSelectLaunchBuddyInstall,
      filters: [
        {
          name: 'Gw2.Launchbuddy.exe',
          extensions: ['exe']
        }
      ],
      properties: ['openFile'],
      buttonLabel: i18n[baseConfig.lang].settingsApplyAndRestart,
      defaultPath: baseConfig.launchBuddyDir || ''
    })
    if (!res.canceled && res.filePaths.length > 0) {
      baseConfig.launchBuddyDir = path.dirname(res.filePaths[0])
      eventHub.emit('baseConfig', { baseConfig })
      await db.settings.update(
        { _id: baseConfig.savedConfigId },
        { $set: { launchBuddyDir: baseConfig.launchBuddyDir } }
      )
    }
  })
  eventHub.on('removeLaunchBuddyDir', async () => {
    //console.log("removeLaunchBuddyDir", {});
    baseConfig.launchBuddyDir = null
    eventHub.emit('baseConfig', { baseConfig })
    await db.settings.update(
      { _id: baseConfig.savedConfigId },
      { $set: { launchBuddyDir: baseConfig.launchBuddyDir } }
    )
  })
  eventHub.on('resetAllLogs', async ({ confirmReset }) => {
    //console.log("resetAllLogs", {confirmReset});
    if (confirmReset === 'reset') {
      const raidDir = path.resolve(baseConfig.logsPath, '.raid-tool')
      const filesToReset = await fg(['**/*'], {
        dot: true,
        cwd: raidDir
      })
      for (const entry of filesToReset) {
        await fs.move(path.resolve(raidDir, entry), path.resolve(baseConfig.logsPath, entry))
      }

      await db.logs.remove({}, { multi: true })
      await db.known_friends.remove({}, { multi: true })
      await db.friends.remove({}, { multi: true })
      await dialog.showMessageBox({ message: i18n[baseConfig.lang].resetSuccess })
      app.relaunch()
      app.exit(0)
    } else {
      await dialog.showMessageBox({ message: i18n[baseConfig.lang].settingsResetInfoMessage })
    }
  })

  eventHub.on('updateArcDps11', async () => {
    //console.log("updateArcDps11", {});
    await updateArcDps11({
      baseConfig,
      dialogs: true
    })
    eventHub.emit('baseConfig', { baseConfig })
  })
  eventHub.on('checkArcUpdates', async () => {
    //console.log("checkArcUpdates", {});
    if (!baseConfig.arcDisabled) {
      try {
        await updateArcDps11({
          baseConfig
        })
        eventHub.emit('baseConfig', { baseConfig })
      } catch (error) {
        console.error(error)
      }
    }
  })
  eventHub.on('disableArcUpdates', async () => {
    //console.log("disableArcUpdates", {});
    baseConfig.arcDisabled = true
    eventHub.emit('baseConfig', { baseConfig })
    await db.settings.update(
      { _id: baseConfig.savedConfigId },
      { $set: { arcDisabled: baseConfig.arcDisabled } }
    )
  })
  eventHub.on('enableArcUpdates', async () => {
    //console.log("enableArcUpdates", {});
    baseConfig.arcDisabled = false
    eventHub.emit('baseConfig', { baseConfig })
    await db.settings.update(
      { _id: baseConfig.savedConfigId },
      { $set: { arcDisabled: baseConfig.arcDisabled } }
    )
    try {
      await updateArcDps11({
        baseConfig
      })
      eventHub.emit('baseConfig', { baseConfig })
    } catch (error) {
      console.error(error)
    }
  })

  eventHub.on('startGame', async () => {
    //console.log("startGame", {});
    if (baseConfig.launchBuddyDir) {
      if (baseConfig.gw2Instances.lauchbuddy.length < 1) {
        const started = (await elevate(
          `"${path.join(baseConfig.launchBuddyDir, 'Gw2.Launchbuddy.exe')}"`,
          { cwd: baseConfig.launchBuddyDir }
        )) as unknown as ChildProcess
        baseConfig.gw2Instances.lauchbuddy.push({
          name: 'Gw2.Launchbuddy.exe',
          pid: started.pid as number
        })
        eventHub.emit('baseConfig', { baseConfig })
      }
    } else {
      if (baseConfig.gw2Dir && baseConfig.gw2Instances.running.length < 1) {
        const started = spawn(path.join(baseConfig.gw2Dir, 'Gw2-64.exe'), {
          cwd: baseConfig.gw2Dir,
          detached: true,
          stdio: 'ignore'
        })
        baseConfig.gw2Instances.running.push({
          name: 'Gw2-64.exe',
          pid: started.pid as number
        })
        eventHub.emit('baseConfig', { baseConfig })
      }
    }
  })
}) as ServerRouteHandler
