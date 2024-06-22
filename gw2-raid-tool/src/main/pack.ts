import * as packager from '@electron/packager'
import * as rebuild from '@electron/rebuild'
import * as electronInstaller from 'electron-winstaller'
import * as path from 'path'
import * as fs from 'fs-extra'
import fg from 'fast-glob'
import * as semver from 'semver'
import { minimatch } from 'minimatch'
import Client from 'ssh2-sftp-client'

import uploadConfig from '../../../upload-config.json'
import { Stats } from 'fs'
;(async () => {
  const rootDir = path.resolve(__dirname, '../../../')

  const dataDir = path.resolve(rootDir, 'gw2-raid-tool')
  const pgk = await fs.readJSON(path.resolve(dataDir, 'package.json'))
  const pgkLock = await fs.readJSON(path.resolve(dataDir, 'package-lock.json'))

  const electronVersion = pgkLock.packages['node_modules/electron'].version

  const parsedVersion = semver.parse(pgk.version) as semver.SemVer
  const isDevBuild = parsedVersion.prerelease.includes('dev')
  console.info({ isDevBuild })

  let buildDir = path.resolve(rootDir, 'build-dist')
  let installerDir = path.resolve(rootDir, 'installer-dist')
  if (isDevBuild) {
    buildDir = path.resolve(rootDir, 'build-dist-dev')
    installerDir = path.resolve(rootDir, 'installer-dist-dev')
  }

  console.info('Packing')

  const appIcon = path.resolve(dataDir, 'resources', 'logo5-1.ico')
  const installerIcon = path.resolve(dataDir, 'resources', 'installer.ico')

  const appPaths = await packager.packager({
    icon: appIcon,
    dir: dataDir,
    out: buildDir,
    overwrite: true,
    asar: false,
    platform: 'win32',
    arch: 'x64',
    name: pgk.name,
    appVersion: pgk.version,
    electronVersion,

    ignore(path) {
      return minimatch(
        path,
        `{${[
          '**/.vscode/*',
          '/.vscode',
          '/src',
          '/build',
          '/dist',
          '/out/main/pack.js',
          '/electron.vite.config.{js,ts,mjs,cjs}',
          '/{.eslintignore,.eslintrc.cjs,.prettierignore,.prettierrc.yaml,dev-app-update.yml,CHANGELOG.md,README.md}',
          '/{.editorconfig,electron-builder.yml}',
          '/{.env,.env.*,.npmrc,pnpm-lock.yaml}',
          '/{tsconfig.json,tsconfig.node.json,tsconfig.web.json}'
        ].join(',')}}`,
        {
          dot: true,
          matchBase: true
        }
      )
    },

    afterCopy: [
      async (buildPath, electronVersion, _platform, arch, callback) => {
        try {
          console.info(`rebuilding: ${buildPath}`)
          await rebuild.rebuild({
            buildPath,
            electronVersion,
            arch
          })
          callback()
        } catch (error) {
          callback(error as Error)
        }
      }
    ]
  })

  const targetDir = appPaths[0]
  console.info({ targetDir })

  const exeName = pgk.name.replace(/-/g, '_')
  await electronInstaller.createWindowsInstaller({
    appDirectory: targetDir,
    outputDirectory: installerDir,
    authors: pgk.author,
    name: exeName,
    exe: `${pgk.name}.exe`,
    version: `${pgk.version}`,
    title: exeName,
    description: pgk.description,
    iconUrl: appIcon,
    setupIcon: installerIcon,
    setupExe: `${exeName}_installer.exe`,
    setupMsi: `${exeName}_installer.msi`,
    remoteReleases: uploadConfig.uploadDomain,
    noMsi: true
  })
  console.info('It worked!')

  parsedVersion.patch = 1 + parsedVersion.patch
  pgk.version = parsedVersion.format()
  await fs.outputJSON(path.join(dataDir, 'package.json'), pgk, { spaces: 2 })
  if (!uploadConfig.noUpload) {
    let uploadConfigTargetPath = uploadConfig.targetPath
    if (isDevBuild) {
      uploadConfigTargetPath = uploadConfig.targetPathDev
    }

    console.info('Uploading files')
    // eslint-disable-next-line no-async-promise-executor
    const sftp = new Client()

    await sftp.connect({
      host: uploadConfig.host,
      port: uploadConfig.port,
      username: uploadConfig.username,
      privateKey: await fs.readFile(uploadConfig.privateKey)
    })

    const filesToUpload = await fg(['**/*'], {
      dot: true,
      cwd: installerDir
    })
    for (const fileToUpload of filesToUpload) {
      const onlineFile = path.posix.join(uploadConfigTargetPath, fileToUpload)
      const offlineFile = path.join(installerDir, fileToUpload)

      try {
        const onlineStat = await sftp.stat(onlineFile)
        const offlineStats: Stats = await fs.stat(offlineFile)
        if (onlineStat && offlineStats.mtimeMs <= onlineStat.modifyTime) {
          console.info(`Skipping: ${fileToUpload}`)
          continue
        }
      } catch (error) {
        // cannot skip uploading
      }

      console.info(`Uploading: ${fileToUpload}`)

      await sftp.fastPut(offlineFile, `${onlineFile}.tmp`)
      await sftp.delete(onlineFile, true)
      await sftp.rename(`${onlineFile}.tmp`, onlineFile)
    }
    await sftp.end()
    console.info('Upload Completed')
  }
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
