import path from 'path'
import fs from 'fs-extra'
import ini from 'ini'
import { BaseConfig, ElectronApp, NedbDatabase, SavedConfig } from '../../raid-tool'

export default async function loadArcdpsConfig(
  baseConfig: BaseConfig,
  savedConfig: SavedConfig,
  db: NedbDatabase,
  electronApp: ElectronApp
) {
  const arcConfigFilePath = path.join(baseConfig.gw2Dir, 'addons/arcdps/arcdps.ini')
  try {
    const arcConfigFile = await fs.readFile(arcConfigFilePath)
    const arcConfig = ini.parse(`${arcConfigFile}`)
    let modified = false
    if (!arcConfig.session || arcConfig.session.boss_encounter_saving !== '1') {
      arcConfig.session.boss_encounter_saving = '1'
      modified = true
    }
    if (
      typeof arcConfig.session.boss_encounter_path === 'string' &&
      arcConfig.session.boss_encounter_path !== ''
    ) {
      const logsPath = arcConfig.session.boss_encounter_path
      if (savedConfig.logsPath !== logsPath) {
        savedConfig.logsPath = logsPath
        await db.settings.update({ _id: baseConfig.savedConfigId }, { $set: { logsPath } })
      }
    } else {
      if (savedConfig.logsPath !== false) {
        savedConfig.logsPath = false
        await db.settings.update({ _id: baseConfig.savedConfigId }, { $set: { logsPath: false } })
      }
    }

    if (modified) {
      await new Promise((res) => {
        function checkInstances() {
          if (baseConfig.gw2Instances?.ready) {
            res(undefined)
          } else {
            setTimeout(checkInstances, 100)
          }
        }
        checkInstances()
      })
      if (baseConfig.gw2Instances.running.length <= 0) {
        await fs.outputFile(arcConfigFilePath, ini.stringify(arcConfig))
      } else {
        console.warn('Could not update arc config')
      }
    }
  } catch (error) {
    console.warn('Arc config file not found', error)
  }

  baseConfig.logsPath =
    savedConfig.logsPath ||
    path.join(electronApp.getPath('documents'), 'Guild Wars 2/addons/arcdps/arcdps.cbtlogs')
  baseConfig.eiConfig = path.resolve(electronApp.getAppPath(), 'config.conf')
}
