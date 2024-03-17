import electron from 'electron'
const { dialog } = electron
import path from 'path'
import fs from 'fs-extra'

import i18n from '../../i18n/i18n-loader'
import { BaseConfig, ElectronApp, NedbDatabase, SavedConfig } from '../../raid-tool'

export default async function loadConfig(
  db: NedbDatabase,
  baseConfig: BaseConfig,
  electronApp: ElectronApp
) {
  let savedConfig: SavedConfig | null = await db.settings.findOne({
    default: true
  })
  if (!savedConfig) {
    savedConfig = await db.settings.insert({
      default: true,
      lang: 'en',
      gw2Dir: '',
      launchBuddyDir: null,
      arcDisabled: false,
      logsPath: false
    })
  }
  baseConfig.savedConfigId = savedConfig._id

  if (!savedConfig.lang) {
    const res = await dialog.showMessageBox({
      title: 'Sprache/Language/Langue:',
      message: '',
      buttons: i18n.langLabels
    })
    savedConfig.lang = i18n.langIds[res.response]
    await db.settings.update({ _id: savedConfig._id }, { $set: { lang: savedConfig.lang } })
  }
  baseConfig.lang = savedConfig.lang

  if (!savedConfig.gw2Dir) {
    const res = await dialog.showOpenDialog({
      title: i18n[baseConfig.lang].msgSelectInstall,
      filters: [
        {
          name: 'Gw2-64.exe',
          extensions: ['exe']
        }
      ],
      properties: ['openFile']
    })
    if (res.canceled || res.filePaths.length < 1 || !(await fs.pathExists(res.filePaths[0]))) {
      console.error(new Error('no GW2 exe selected'))
      process.exit(1)
    }
    savedConfig.gw2Dir = path.dirname(path.resolve(res.filePaths[0]))
    await db.settings.update({ _id: savedConfig._id }, { $set: { gw2Dir: savedConfig.gw2Dir } })
  }
  baseConfig.gw2Dir = savedConfig.gw2Dir

  baseConfig.launchBuddyDir = savedConfig.launchBuddyDir
  baseConfig.launchBuddyConfigDir = path.join(electronApp.getPath('appData'), 'Gw2 Launchbuddy')

  baseConfig.arcDisabled = savedConfig.arcDisabled
  return savedConfig
}
