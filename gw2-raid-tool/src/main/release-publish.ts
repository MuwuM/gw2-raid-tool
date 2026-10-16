import * as path from 'path'
import * as fs from 'fs-extra'
import semver from 'semver'
import Client from 'ssh2-sftp-client'
import {
  archiveFile,
  archiveRoot,
  atomicRemotePut,
  atomicRemoteText,
  cleanupMarker,
  formatReleases,
  localDigest,
  parseReleases,
  readRemoteText,
  releaseTarget,
  remoteDigest,
  sameDigest,
  sha256,
  withReleaseLock,
  writeJsonAtomic
} from './release-storage'
import type { Channel, Digest, ReleaseConfig } from './release-storage'

export async function archiveBuild(
  config: ReleaseConfig,
  rootDir: string,
  channel: Channel,
  installerDir: string,
  packageName: string,
  version: string
): Promise<Record<string, Digest>> {
  const entries = parseReleases(
    await fs.readFile(path.join(installerDir, 'RELEASES'), 'utf8'),
    packageName
  )
  const current = entries.find((entry) => entry.version === version && entry.kind === 'full')
  if (!current) throw new Error('Installer output does not contain the current full release')
  const files: Record<string, Digest> = {}
  const directory = archiveRoot(config, rootDir, channel)
  for (const name of [current.name, `${packageName}_installer.exe`, 'RELEASES']) {
    const source = path.join(installerDir, name)
    const digest = await localDigest(source)
    if (name === current.name && (digest.sha1 !== current.sha1 || digest.size !== current.size))
      throw new Error('Built package does not match RELEASES')
    await archiveFile(directory, digest, [source])
    files[name] = digest
  }
  await writeJsonAtomic(
    path.join(directory, 'builds', `${version}-${files[current.name].sha256}.json`),
    { version, channel, files }
  )
  return files
}

export async function publishBuild(
  sftp: Client,
  config: ReleaseConfig,
  rootDir: string,
  channel: Channel,
  installerDir: string,
  packageName: string,
  version: string,
  files: Record<string, Digest>
): Promise<void> {
  const target = releaseTarget(config, channel)
  await withReleaseLock(sftp, target, async () => {
    if (await sftp.exists(path.posix.join(target, cleanupMarker)))
      throw new Error('A cleanup grace period is active; finish or roll it back before publishing')
    const manifestPath = path.posix.join(target, 'RELEASES')
    const original = (await sftp.exists(manifestPath))
      ? await readRemoteText(sftp, manifestPath)
      : undefined
    const previous = original ? parseReleases(original, packageName) : []
    if (previous.some((entry) => semver.gt(entry.version, version)))
      throw new Error('Refusing to publish an older release over a newer feed')
    const built = parseReleases(
      await fs.readFile(path.join(installerDir, 'RELEASES'), 'utf8'),
      packageName
    )
    const current = built.find((entry) => entry.kind === 'full' && entry.version === version)
    if (!current || !files[current.name]) throw new Error('Missing archived current full package')
    for (const entry of previous.filter(
      (entry) => entry.kind === 'full' && entry.name !== current.name
    )) {
      const remote = path.posix.join(target, entry.name)
      if ((await sftp.exists(remote)) !== '-' || (await sftp.stat(remote)).size !== entry.size)
        throw new Error(`Existing feed references a missing/invalid full package: ${entry.name}`)
    }
    for (const name of [current.name, `${packageName}_installer.exe`]) {
      const source = path.join(installerDir, name)
      const expected = files[name]
      if (!expected || !sameDigest(await localDigest(source), expected))
        throw new Error(`Staged file changed after archiving: ${name}`)
      const remote = path.posix.join(target, name)
      if (await sftp.exists(remote)) {
        if (sameDigest(await remoteDigest(sftp, remote), expected)) {
          console.info(`Verified unchanged: ${name}`)
          continue
        }
        if (name.endsWith('.nupkg'))
          throw new Error(
            `Refusing to overwrite a different package with the same version: ${name}`
          )
      }
      console.info(`Uploading and verifying: ${name}`)
      await atomicRemotePut(sftp, source, remote, expected)
    }
    const live = (await sftp.exists(manifestPath))
      ? await readRemoteText(sftp, manifestPath)
      : undefined
    if (live !== original) throw new Error('RELEASES changed while publishing')
    const merged = [
      ...previous.filter((entry) => entry.kind === 'full' && entry.name !== current.name),
      current
    ].sort((left, right) => semver.compare(left.version, right.version))
    const published = formatReleases(merged)
    const publishedPath = path.join(installerDir, 'RELEASES.published')
    await fs.writeFile(publishedPath, published)
    const directory = archiveRoot(config, rootDir, channel)
    const digest = await localDigest(publishedPath)
    await archiveFile(directory, digest, [publishedPath])
    await writeJsonAtomic(
      path.join(directory, 'builds', `${version}-published-${digest.sha256}.json`),
      { version, channel, name: 'RELEASES', ...digest }
    )
    console.info(`Publishing RELEASES last (${sha256(published)})`)
    await atomicRemoteText(sftp, manifestPath, published)
  })
}
