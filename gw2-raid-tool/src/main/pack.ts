import * as packager from '@electron/packager'
import * as rebuild from '@electron/rebuild'
import * as electronInstaller from 'electron-winstaller'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as semver from 'semver'
import { minimatch } from 'minimatch'
import { archiveBuild, publishBuild } from './release-publish'
import { connectReleases, releaseFeed, releaseTarget } from './release-storage'
import type { Channel, ReleaseConfig } from './release-storage'
;(async () => {
  const rootDir = path.resolve(__dirname, '../../../')
  const uploadConfig: ReleaseConfig = await fs.readJSON(path.join(rootDir, 'upload-config.json'))

  const dataDir = path.resolve(rootDir, 'gw2-raid-tool')
  const pgk = await fs.readJSON(path.resolve(dataDir, 'package.json'))
  const pgkLock = await fs.readJSON(path.resolve(dataDir, 'package-lock.json'))

  const electronVersion = pgkLock.packages['node_modules/electron'].version

  const parsedVersion = semver.parse(pgk.version)
  if (!parsedVersion) throw new Error(`Invalid package version: ${pgk.version}`)
  const isDevBuild = parsedVersion.prerelease.includes('dev')
  const channel: Channel = isDevBuild ? 'development' : 'production'
  releaseTarget(uploadConfig, channel)
  console.info({ isDevBuild })

  let buildDir = path.resolve(rootDir, 'build-dist')
  if (isDevBuild) {
    buildDir = path.resolve(rootDir, 'build-dist-dev')
  }

  console.info('Packing')

  const appIcon = path.resolve(dataDir, 'resources', 'logo5-3.ico')
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
          '/out/main/{pack,cleanup-releases}.js',
          '/out/main/chunks/release-*.js',
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
      async ({ buildPath, electronVersion, arch }) => {
        console.info(`rebuilding: ${buildPath}`)
        await rebuild.rebuild({
          buildPath,
          electronVersion,
          arch
        })
      }
    ]
  })

  const targetDir = appPaths[0]
  console.info({ targetDir })

  const exeName = pgk.name.replace(/-/g, '_')
  const stagingRoot = path.join(rootDir, 'installer-staging')
  await fs.ensureDir(stagingRoot)
  const installerDir = await fs.mkdtemp(path.join(stagingRoot, `${channel}-`))
  console.info(`Installer staging: ${installerDir}`)
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
    remoteReleases: uploadConfig.noUpload ? undefined : releaseFeed(uploadConfig, channel),
    noDelta: true,
    noMsi: true
  })
  console.info('It worked!')

  const archived = await archiveBuild(
    uploadConfig,
    rootDir,
    channel,
    installerDir,
    exeName,
    pgk.version
  )
  if (!uploadConfig.noUpload) {
    console.info('Uploading files')
    const sftp = await connectReleases(uploadConfig, rootDir)
    try {
      await publishBuild(
        sftp,
        uploadConfig,
        rootDir,
        channel,
        installerDir,
        exeName,
        pgk.version,
        archived
      )
    } finally {
      await sftp.end()
    }
    console.info('Upload Completed')
  }

  parsedVersion.patch = 1 + parsedVersion.patch
  pgk.version = parsedVersion.format()
  await fs.outputJSON(path.join(dataDir, 'package.json'), pgk, { spaces: 2 })
  if (path.dirname(installerDir) !== stagingRoot)
    throw new Error('Refusing to remove an unexpected staging directory')
  await fs.remove(installerDir)
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
