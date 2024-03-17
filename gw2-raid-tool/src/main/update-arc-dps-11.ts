import path from 'path'
import fs from 'fs-extra'
import urllib from 'urllib'
import crypto from 'crypto'
import { DateTime } from 'luxon'
import { dialog } from 'electron'
import * as RaidToolDef from '../raid-tool'
import d3d11_hotfixPath from '../../resources/d3d11-2024-02-29.dll?asset'

const arcVersionUrl = 'https://www.deltaconnected.com/arcdps/x64/d3d11.dll.md5sum'
const arcDownloadUrl = 'https://www.deltaconnected.com/arcdps/x64/d3d11.dll'

function md5File(path: string) {
  return new Promise((resolve, reject) => {
    const output = crypto.createHash('md5')
    const input = fs.createReadStream(path)

    input.on('error', (err) => {
      reject(err)
    })

    output.once('readable', () => {
      resolve(output.read().toString('hex'))
    })

    input.pipe(output)
  }) as Promise<string>
}

export default async ({
  baseConfig,
  dialogs
}: {
  baseConfig: RaidToolDef.BaseConfig
  dialogs?: true
}) => {
  if (!baseConfig.gw2Dir || baseConfig.arcDisabled) {
    return
  }
  const gw2Dir = path.join(baseConfig.gw2Dir)
  if (!(await fs.pathExists(gw2Dir))) {
    return
  }

  let installedVersion = null as null | string

  const arcFile = path.join(gw2Dir, 'd3d11.dll')
  if (await fs.pathExists(arcFile)) {
    installedVersion = await md5File(arcFile)
  }

  baseConfig.arcdps11VersionHash = installedVersion
  if (installedVersion) {
    const arcStats = await fs.stat(arcFile)
    const luxDate = DateTime.fromMillis(arcStats.mtimeMs)
    baseConfig.arcdps11VersionDate = luxDate.toFormat('dd.MM.y-HH:mm')

    const d3d11_hotfixDate = DateTime.fromFormat('2024-02-29', 'y-MM-dd', {
      zone: 'utc'
    })
      .endOf('day')
      .setZone('local')
    if (installedVersion === 'ed230d30f759929504b95ffb9f9c17ab') {
      const lastChangeMillis = d3d11_hotfixDate.toJSDate()
      const tmpArcFile = `${arcFile}.tmp`
      if (await fs.pathExists(tmpArcFile)) {
        await fs.unlink(tmpArcFile)
      }
      await fs.copy(d3d11_hotfixPath, tmpArcFile)
      await fs.utimes(tmpArcFile, lastChangeMillis, lastChangeMillis)
      await replaceCurrentArcdpsFileWithBackup(arcFile, tmpArcFile, dialogs)
      installedVersion = 'ed230d30f759929504b95ffb9f9c17ab'
      baseConfig.arcdps11VersionHash = installedVersion
      baseConfig.arcdps11VersionDate = d3d11_hotfixDate.toFormat('dd.MM.y-HH:mm') + ' (hotfix)'
    } else if (installedVersion === 'dd07afb3cee7ea1122a293ce2f51a144') {
      installedVersion = 'ed230d30f759929504b95ffb9f9c17ab'
      baseConfig.arcdps11VersionDate = d3d11_hotfixDate.toFormat('dd.MM.y-HH:mm') + ' (hotfix)'
    }
  }

  let latestVersion = null
  try {
    const versionRequest = await urllib.request<string>(arcVersionUrl, {
      timeout: 30000,
      followRedirect: true
    })
    const rows = versionRequest.data
      .toString()
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split(/\n/)
      .filter((r) => !r.match(/^\s*$/))
    for (const row of rows) {
      const [version, file] = row.split(/\s+/)
      if (file !== 'd3d9.dll' && file !== 'd3d11.dll') {
        continue
      }
      latestVersion = version
      break
    }
  } catch (error) {
    console.error(error)
  }

  baseConfig.arcdps11VersionHasUpdates = false

  if (latestVersion && latestVersion !== installedVersion) {
    baseConfig.arcdps11VersionHasUpdates = true
    console.info(`updating arcdps from version: ${installedVersion} to latest: ${latestVersion}`)
    if (baseConfig.gw2Instances.running.length > 1) {
      if (dialogs) {
        await dialog.showMessageBox({
          title: 'Update nicht möglich',
          message: 'Update von arcdps ist nicht möglich, solange das Spiel an ist.',
          type: 'warning'
        })
      }
      console.warn('Cannot update arcdps when GW2 is running')
      return
    }
    const dllFile = await urllib.request(arcDownloadUrl, {
      timeout: 30000,
      followRedirect: true
    })
    const lastChangeDate = DateTime.fromRFC2822(dllFile.headers['last-modified'] || 'undefined')
    let lastChangeMillis = null as null | Date
    if (lastChangeDate.isValid) {
      lastChangeMillis = lastChangeDate.toJSDate()
    }

    if (await fs.pathExists(`${arcFile}.tmp`)) {
      await fs.unlink(`${arcFile}.tmp`)
    }
    await fs.outputFile(`${arcFile}.tmp`, dllFile.data)
    if (lastChangeMillis) {
      await fs.utimes(`${arcFile}.tmp`, lastChangeMillis, lastChangeMillis)
    }
    const tempHash = await md5File(`${arcFile}.tmp`)
    if (tempHash !== latestVersion) {
      console.error('VersionHashes do not match')
      return
    }
    await replaceCurrentArcdpsFileWithBackup(arcFile, `${arcFile}.tmp`, dialogs)

    installedVersion = latestVersion
    baseConfig.arcdps11VersionHasUpdates = false
  }
  baseConfig.arcdps11VersionHash = installedVersion
  if (installedVersion) {
    const arcStats = await fs.stat(arcFile)
    baseConfig.arcdps11VersionDate = DateTime.fromMillis(arcStats.mtimeMs)
      .toUTC()
      .toFormat('dd.MM.y-HH:mm')
    if (
      installedVersion === 'ed230d30f759929504b95ffb9f9c17ab' &&
      (await md5File(arcFile)) === 'dd07afb3cee7ea1122a293ce2f51a144'
    ) {
      baseConfig.arcdps11VersionDate += ' (hotfix)'
    }
  }
}

async function replaceCurrentArcdpsFileWithBackup(
  currentArcFile: string,
  newArcFile: string,
  dialogs?: true
): Promise<void> {
  if (await fs.pathExists(`${currentArcFile}.old`)) {
    await fs.unlink(`${currentArcFile}.old`)
  }
  if (await fs.pathExists(currentArcFile)) {
    try {
      await fs.move(currentArcFile, `${currentArcFile}.old`)
    } catch (error) {
      if (dialogs) {
        await dialog.showMessageBox({
          title: 'arcdps nicht installiert',
          message:
            'Update von arcdps ist nicht möglich, da arcdps nicht installiert ist oder verwendet wird.',
          type: 'warning'
        })
      }
      console.warn(
        'Update von arcdps ist nicht möglich, da arcdps nicht installiert ist oder verwendet wird.'
      )
      return
    }
  }
  await fs.move(newArcFile, currentArcFile)
}
