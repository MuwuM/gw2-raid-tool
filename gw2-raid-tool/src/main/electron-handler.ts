import electron from 'electron'
import path from 'path'
import fs from 'fs-extra'

import * as RaidToolDef from '../raid-tool'
import appIcon from '../../resources/icon.ico?asset'

const { BrowserWindow, shell, Menu, MenuItem } = electron

function openExternal(url: string) {
  try {
    const link = new URL(url)
    //console.log(link);
    if (link.protocol === 'http:' || link.protocol === 'https:') {
      shell.openExternal(link.href)
    }
  } catch (error) {
    console.warn(error)
  }
}

export default async ({
  electronApp,
  initStatus
}: {
  electronApp: RaidToolDef.ElectronApp
  initStatus: RaidToolDef.InitStatusUninitialized
}) => {
  async function initElectron() {
    const configFilePath = path.join(electronApp.getPath('userData'), 'config-gw2-raid-tool.json')
    //console.log({configFilePath});
    const screen = electron.screen

    let config = {} as Partial<RaidToolDef.RaidToolConfig>
    try {
      config = await fs.readJSON(configFilePath)
    } catch (error) {
      config = {}
    }

    const win = new BrowserWindow({
      icon: appIcon,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/index.js')
      }
    })

    win.setMenu(null)
    win.on('closed', () => {
      for (const child of BrowserWindow.getAllWindows()) {
        if (win !== child && !child.isDestroyed()) {
          child.close()
        }
      }
    })

    //console.log(config.bounds);
    if (config.bounds) {
      const activeScreen = screen.getDisplayNearestPoint({
        x: config.bounds.x,
        y: config.bounds.y
      })
      if (activeScreen.bounds.x > config.bounds.x) {
        config.bounds.x = activeScreen.bounds.x
      }
      if (activeScreen.bounds.y > config.bounds.y) {
        config.bounds.y = activeScreen.bounds.y
      }
      if (
        activeScreen.bounds.x + activeScreen.bounds.width <
        config.bounds.x + config.bounds.width
      ) {
        config.bounds.width = activeScreen.bounds.x + activeScreen.bounds.width - config.bounds.x
      }
      if (
        activeScreen.bounds.y + activeScreen.bounds.height <
        config.bounds.y + config.bounds.height
      ) {
        config.bounds.height = activeScreen.bounds.y + activeScreen.bounds.height - config.bounds.y
      }

      //console.log(config.bounds);
      win.setBounds(config.bounds)
    }
    if (config.fullscreen) {
      win.maximize()
    }

    async function updateWindowConfig() {
      const data = {
        bounds: win.getBounds(),
        fullscreen: win.isMaximized()
      }
      await fs.writeJSON(configFilePath, data)
    }

    win.on('maximize', updateWindowConfig)
    win.on('minimize', updateWindowConfig)
    win.on('resized', updateWindowConfig)
    win.on('move', updateWindowConfig)

    win.loadFile(path.join(__dirname, '../renderer/index.html'))
    const setStatus = (status: number, step?: string) => {
      win.webContents.send('loading', { status, step })
    }
    initStatus.onChange(setStatus)
    win.webContents.once('dom-ready', () => {
      setStatus(initStatus.status, initStatus.step)
      setTimeout(() => setStatus(initStatus.status, initStatus.step), 1000)
    })
    await initStatus.waitFor(RaidToolDef.InitStatusStatusCode.Loaded)
    const { db, baseConfig, eventHub, backendConfig, progressConfig } =
      initStatus as RaidToolDef.InitStatus

    function navigateFromLogsUrl(urlStr: string) {
      const url = new URL(urlStr)

      const path = url.pathname
      const pathParts = path.split('/')
      //console.log({ url, pathParts })
      if (!pathParts[1]) {
        //console.log('send selectPage', { page: 'overview', info: {} })
        eventHub.emit('selectPage', { page: 'overview', info: {} })
      } else {
        // console.log('send selectPage', {
        //  page: pathParts[1],
        //  info: { id: pathParts[2], action: pathParts[3] }
        // })
        eventHub.emit('selectPage', {
          page: pathParts[1] as RaidToolDef.PageId,
          info: {
            id: pathParts[2],
            action: pathParts[3] as RaidToolDef.PageAction
          }
        })
      }
    }

    const socket = win.webContents
    eventHub.sockets.push(win.webContents)

    socket.send('accounts', { accounts: await db.accounts.find({}) })
    socket.send('gw2Instances', { gw2Instances: baseConfig.gw2Instances })
    socket.send('baseConfig', { baseConfig })
    socket.send('progressConfig', { progressConfig })
    socket.send('mumbleLinkActive', {
      mumbleLinkActive: backendConfig.mumbleLinkActive || false
    })
    eventHub.emit('keyRules', {
      keyRules: await db.blocked_key_rules.find({}).sort({
        spec: 1,
        slot: 1,
        _id: 1
      })
    })
    win.on('close', () => {
      eventHub.sockets = eventHub.sockets.filter((s) => s === socket)
    })
    initStatus.offChange(setStatus)

    baseConfig.zoom = 1
    eventHub.emit('baseConfig', { baseConfig })

    win.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith(backendConfig.appDomain) && !url.startsWith('gw2-log:')) {
        event.preventDefault()
        openExternal(url)
        return false
      }
      if (url.startsWith('gw2-log:')) {
        event.preventDefault()
        navigateFromLogsUrl(url)
        return false
      }
      return
    })
    win.webContents.setWindowOpenHandler((details) => {
      if (!details.url.startsWith(backendConfig.appDomain) && !details.url.startsWith('gw2-log:')) {
        openExternal(details.url)
        return { action: 'deny' }
      }
      navigateFromLogsUrl(details.url)
      return { action: 'deny' }
    })
    win.webContents.on('before-input-event', (event, input) => {
      if (input.control && input.key === '+') {
        baseConfig.zoom = Math.round(Math.min((baseConfig.zoom || 1) * 1.2, 1.728) * 1000) / 1000
        eventHub.emit('baseConfig', { baseConfig })
        event.preventDefault()
      } else if (input.control && input.key === '-') {
        baseConfig.zoom =
          Math.round(Math.max((baseConfig.zoom || 1) / 1.2, 1 / 1.728) * 1000) / 1000
        eventHub.emit('baseConfig', { baseConfig })
        event.preventDefault()
      } else if (input.control && input.key === '0') {
        baseConfig.zoom = 1
        eventHub.emit('baseConfig', { baseConfig })
        event.preventDefault()
      }
    })
    win.webContents.on('context-menu', (event, { linkURL }) => {
      event.preventDefault()
      const menu = new Menu()
      if (
        linkURL &&
        !linkURL.startsWith(backendConfig.appDomain) &&
        !linkURL.startsWith('gw2-log:')
      ) {
        menu.append(
          new MenuItem({
            label: 'Open Link',
            click() {
              openExternal(linkURL)
            }
          })
        )
        menu.append(new MenuItem({ type: 'separator' }))
      }
      menu.append(
        new MenuItem({
          label: 'Refresh',
          click() {
            win.reload()
          }
        })
      )
      menu.append(
        new MenuItem({
          label: 'Force refresh',
          async click() {
            await win.webContents.session.clearCache()
            win.reload()
          }
        })
      )
      menu.append(
        new MenuItem({
          label: 'Dev Tools',
          click() {
            win.webContents.toggleDevTools()
          }
        })
      )

      menu.popup({ window: win })
      return false
    })
    //console.log("loaded");
  }

  electronApp.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      electronApp.quit()
    }
  })

  electronApp.on('ready', initElectron)
}
