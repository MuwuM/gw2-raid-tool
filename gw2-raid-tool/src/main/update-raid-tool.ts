import { app as electronApp, autoUpdater } from 'electron'
import semver from 'semver'

const updateUrlProd = 'https://tool.raid-static.de/'
const updateUrlDev = 'https://tool.raid-static.de/dev/'

export default () =>
  new Promise((res) => {
    const version = electronApp.getVersion()
    const parsedVersion = semver.parse(version)
    if (!parsedVersion) {
      res(undefined)
      return
    }
    const isDevBuild = parsedVersion.prerelease.includes('dev')
    let updateUrl = updateUrlProd
    if (isDevBuild) {
      updateUrl = updateUrlDev
    }
    if (!electronApp.isPackaged) {
      res(undefined)
      return
    }
    autoUpdater.on('update-not-available', () => {
      res(undefined)
    })
    autoUpdater.on('update-downloaded', () => {
      autoUpdater.quitAndInstall()
    })
    autoUpdater.on('error', (error) => {
      console.warn(error)
      res(undefined)
    })
    autoUpdater.setFeedURL({ url: updateUrl })
    autoUpdater.checkForUpdates()
  })
