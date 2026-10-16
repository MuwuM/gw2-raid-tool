import * as path from 'path'
import * as fs from 'fs-extra'
import { createHash, randomUUID } from 'crypto'
import { Readable, Writable } from 'stream'
import { pipeline } from 'stream/promises'
import semver from 'semver'
import Client from 'ssh2-sftp-client'
import { serverDigest } from './release-server-hash'

export interface ReleaseConfig {
  noUpload: boolean
  host: string
  port: number
  username: string
  privateKey: string
  targetPath: string
  targetPathDev: string
  uploadDomain: string
  uploadDomainDev?: string
  archiveDirectory?: string
  remoteHashMode?: 'ssh' | 'sftp'
}

export type Channel = 'production' | 'development'

export interface Digest {
  size: number
  sha1: string
  sha256: string
}

export interface ReleaseEntry {
  name: string
  sha1: string
  size: number
  version: string
  kind: 'full' | 'delta'
}

export const cleanupMarker = '.release-cleanup.json'
const lockName = '.release-maintenance.lock'
const hashModes = new WeakMap<Client, 'ssh' | 'sftp'>()

export function remoteHashMode(sftp: Client): 'ssh' | 'sftp' {
  return hashModes.get(sftp) || 'ssh'
}

export function safeName(name: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name)) {
    throw new Error(`Unsafe release filename: ${name}`)
  }
  return name
}

export function packageDetails(
  name: string,
  packageName: string
): Pick<ReleaseEntry, 'version' | 'kind'> {
  safeName(name)
  const prefix = `${packageName}-`
  const suffix = name.match(/-(full|delta)\.nupkg$/)
  const version =
    suffix && name.startsWith(prefix) ? name.slice(prefix.length, -suffix[0].length) : ''
  if (!semver.valid(version)) throw new Error(`Unrecognized release package: ${name}`)
  return { version, kind: suffix![1] as ReleaseEntry['kind'] }
}

export function parseReleases(text: string, packageName: string): ReleaseEntry[] {
  const names = new Set<string>()
  const entries = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      const match = line.match(/^([a-fA-F0-9]{40})\s+(\S+)\s+(\d+)\s*$/)
      if (!match || !Number.isSafeInteger(Number(match[3])) || Number(match[3]) <= 0) {
        throw new Error(`Invalid RELEASES entry: ${line}`)
      }
      const name = safeName(match[2])
      if (names.has(name.toLowerCase())) throw new Error(`Duplicate RELEASES entry: ${name}`)
      names.add(name.toLowerCase())
      return {
        name,
        sha1: match[1].toLowerCase(),
        size: Number(match[3]),
        ...packageDetails(name, packageName)
      }
    })
  if (!entries.some((entry) => entry.kind === 'full'))
    throw new Error('RELEASES must contain a full package')
  return entries
}

export function formatReleases(entries: ReleaseEntry[]): string {
  return `${entries.map((entry) => `${entry.sha1.toUpperCase()} ${entry.name} ${entry.size}`).join('\n')}\n`
}

export function sha256(text: string | Buffer): string {
  return createHash('sha256').update(text).digest('hex')
}

export function sameDigest(left: Digest, right: Digest): boolean {
  return left.size === right.size && left.sha256 === right.sha256 && left.sha1 === right.sha1
}

export async function localDigest(
  file: string,
  onProgress?: (bytes: number) => void
): Promise<Digest> {
  if (!(await fs.lstat(file)).isFile()) throw new Error(`Not a regular local file: ${file}`)
  const sha1Hash = createHash('sha1')
  const sha256Hash = createHash('sha256')
  let size = 0
  for await (const chunk of fs.createReadStream(file)) {
    size += chunk.length
    sha1Hash.update(chunk)
    sha256Hash.update(chunk)
    onProgress?.(size)
  }
  return { size, sha1: sha1Hash.digest('hex'), sha256: sha256Hash.digest('hex') }
}

export async function remoteDigest(
  sftp: Client,
  file: string,
  onProgress?: (bytes: number) => void
): Promise<Digest> {
  if ((await sftp.exists(file)) !== '-') throw new Error(`Not a regular remote file: ${file}`)
  const before = await sftp.stat(file)
  let digest: Digest
  if (remoteHashMode(sftp) === 'ssh') {
    try {
      digest = await serverDigest(sftp, file)
    } catch (error) {
      throw new Error(
        `Server-side hashing failed for ${file}: ${error instanceof Error ? error.message : String(error)}. SSH command execution and stat, sha256sum, sha1sum are required. No SFTP download fallback was attempted. Only if necessary, explicitly set remoteHashMode to "sftp" in upload-config.json to allow full-file network reads.`
      )
    }
  } else {
    const sha1Hash = createHash('sha1')
    const sha256Hash = createHash('sha256')
    let size = 0
    await sftp.get(
      file,
      new Writable({
        write(chunk: Buffer, _encoding, callback) {
          size += chunk.length
          sha1Hash.update(chunk)
          sha256Hash.update(chunk)
          onProgress?.(size)
          callback()
        }
      })
    )
    digest = { size, sha1: sha1Hash.digest('hex'), sha256: sha256Hash.digest('hex') }
  }
  const after = await sftp.stat(file)
  if (
    digest.size !== before.size ||
    after.size !== before.size ||
    after.modifyTime !== before.modifyTime
  ) {
    throw new Error(`Remote file changed while reading: ${file}`)
  }
  onProgress?.(digest.size)
  return digest
}

export async function readRemoteText(sftp: Client, file: string): Promise<string> {
  if ((await sftp.exists(file)) !== '-' || (await sftp.stat(file)).size > 1024 * 1024) {
    throw new Error(`Expected a regular metadata file smaller than 1 MiB: ${file}`)
  }
  const contents = await sftp.get(file)
  if (!Buffer.isBuffer(contents)) throw new Error(`Cannot read remote metadata: ${file}`)
  return contents.toString('utf8')
}

export async function atomicRemotePut(
  sftp: Client,
  source: string | Buffer,
  destination: string,
  expected: Digest
): Promise<void> {
  const temporary = `${destination}.${randomUUID()}.tmp`
  try {
    await sftp.put(source, temporary)
    if (!sameDigest(await remoteDigest(sftp, temporary), expected))
      throw new Error(`Uploaded file failed verification: ${destination}`)
    await sftp.posixRename(temporary, destination)
  } finally {
    await sftp.delete(temporary, true)
  }
}

export async function atomicRemoteText(
  sftp: Client,
  destination: string,
  text: string
): Promise<void> {
  const contents = Buffer.from(text)
  await atomicRemotePut(sftp, contents, destination, {
    size: contents.length,
    sha1: createHash('sha1').update(contents).digest('hex'),
    sha256: sha256(contents)
  })
}

export interface ReleaseLock {
  file: string
  contents: string
  owner?: string
  createdAt?: string
}

export async function readReleaseLock(
  sftp: Client,
  target: string
): Promise<ReleaseLock | undefined> {
  const file = path.posix.join(target, lockName)
  if (!(await sftp.exists(file))) return undefined
  const contents = await readRemoteText(sftp, file)
  let metadata: { owner?: unknown; createdAt?: unknown }
  try {
    metadata = JSON.parse(contents) || {}
  } catch {
    metadata = {}
  }
  return {
    file,
    contents,
    owner:
      typeof metadata.owner === 'string' && /^[a-f0-9-]{36}$/.test(metadata.owner)
        ? metadata.owner
        : undefined,
    createdAt:
      typeof metadata.createdAt === 'string' && Number.isFinite(Date.parse(metadata.createdAt))
        ? new Date(metadata.createdAt).toISOString()
        : undefined
  }
}

export async function unlockReleases(
  sftp: Client,
  target: string,
  expected: ReleaseLock,
  noActiveProcesses: boolean
): Promise<void> {
  if (!noActiveProcesses)
    throw new Error(
      'Unlock requires confirmation that no maintenance or publishing processes are running on any machine'
    )
  if ((await sftp.realPath(target)) !== target)
    throw new Error('Release target must be canonical, not a symlink or alias')
  const current = await readReleaseLock(sftp, target)
  if (!current || current.file !== expected.file || current.contents !== expected.contents)
    throw new Error(
      'The maintenance lock changed or disappeared during confirmation. Nothing was removed; inspect status again.'
    )
  await sftp.delete(current.file)
}

export async function withReleaseLock<Result>(
  sftp: Client,
  target: string,
  action: () => Promise<Result>
): Promise<Result> {
  if ((await sftp.realPath(target)) !== target)
    throw new Error('Release target must be canonical, not a symlink or alias')
  const lock = path.posix.join(target, lockName)
  const existing = await readReleaseLock(sftp, target)
  if (existing)
    throw new Error(
      `Release maintenance is locked at ${lock}${existing.createdAt ? ` (created ${existing.createdAt})` : ''}. Another process may still be running. Check status and use the guarded unlock command only after confirming all maintenance and publishers have stopped.`
    )
  console.info('Acquiring exclusive release maintenance lock...')
  try {
    await pipeline(
      Readable.from([
        Buffer.from(JSON.stringify({ owner: randomUUID(), createdAt: new Date().toISOString() }))
      ]),
      sftp.createWriteStream(lock, { flags: 'wx', mode: 0o600 })
    )
  } catch (error) {
    throw new Error(
      `Could not acquire the exclusive maintenance lock at ${lock}: ${error instanceof Error ? error.message : String(error)}. A lock may have appeared concurrently, or the server may deny exclusive file creation. No release operation was started. Check status before retrying; never remove an active process's lock.`
    )
  }
  try {
    return await action()
  } finally {
    await sftp.delete(lock)
  }
}

export function releaseTarget(config: ReleaseConfig, channel: Channel): string {
  const target = channel === 'production' ? config.targetPath : config.targetPathDev
  if (!path.posix.isAbsolute(target) || path.posix.normalize(target) === '/') {
    throw new Error('Release target must be an absolute, non-root POSIX directory')
  }
  if (path.posix.normalize(config.targetPath) === path.posix.normalize(config.targetPathDev)) {
    throw new Error('Production and development release targets must be different')
  }
  return path.posix.normalize(target)
}

export function releaseFeed(config: ReleaseConfig, channel: Channel): string {
  if (channel === 'production') return config.uploadDomain
  return (
    config.uploadDomainDev || new URL('dev/', `${config.uploadDomain.replace(/\/+$/, '')}/`).href
  )
}

export async function connectReleases(config: ReleaseConfig, rootDir: string): Promise<Client> {
  if (config.remoteHashMode !== undefined && !['ssh', 'sftp'].includes(config.remoteHashMode))
    throw new Error('remoteHashMode must be ssh or sftp')
  const sftp = new Client()
  hashModes.set(sftp, config.remoteHashMode || 'ssh')
  try {
    await sftp.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      privateKey: await fs.readFile(path.resolve(rootDir, config.privateKey))
    })
    return sftp
  } catch (error) {
    await sftp.end()
    throw error
  }
}

export function archiveRoot(config: ReleaseConfig, rootDir: string, channel: Channel): string {
  const directory = path.resolve(rootDir, config.archiveDirectory || 'release-archive', channel)
  for (const output of [
    'installer-dist',
    'installer-dist-dev',
    'installer-dist-old',
    'installer-staging'
  ]) {
    const relative = path.relative(path.join(rootDir, output), directory)
    if (!relative || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
      throw new Error('Release archive must be outside packaging output directories')
    }
  }
  return directory
}

export async function archiveFile(
  directory: string,
  expected: Digest,
  sources: string[],
  download?: (temporary: string) => Promise<unknown>
): Promise<string> {
  const objects = path.join(directory, 'objects')
  await fs.ensureDir(objects)
  const destination = path.join(objects, expected.sha256)
  if (await fs.pathExists(destination)) {
    if (!sameDigest(await localDigest(destination), expected))
      throw new Error(`Corrupted archived object: ${destination}`)
    return destination
  }
  const temporary = path.join(objects, `${randomUUID()}.tmp`)
  try {
    let copied = false
    for (const source of sources) {
      if (!(await fs.pathExists(source))) continue
      if (!(await fs.lstat(source)).isFile() || !sameDigest(await localDigest(source), expected))
        continue
      await fs.copyFile(source, temporary, fs.constants.COPYFILE_EXCL)
      copied = true
      break
    }
    if (!copied) {
      if (!download) throw new Error('No matching local archive source')
      await download(temporary)
    }
    if (!sameDigest(await localDigest(temporary), expected))
      throw new Error(`Archive verification failed: ${temporary}`)
    await fs.move(temporary, destination, { overwrite: false })
    return destination
  } finally {
    await fs.rm(temporary, { force: true })
  }
}

export async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  await fs.ensureDir(path.dirname(file))
  const temporary = `${file}.${randomUUID()}.tmp`
  try {
    await fs.writeJSON(temporary, value, { spaces: 2 })
    await fs.rename(temporary, file)
  } finally {
    await fs.rm(temporary, { force: true })
  }
}
