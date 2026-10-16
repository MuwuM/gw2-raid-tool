import * as path from 'path'
import * as fs from 'fs-extra'
import semver from 'semver'
import Client from 'ssh2-sftp-client'
import {
  archiveFile,
  archiveRoot,
  atomicRemoteText,
  cleanupMarker,
  formatReleases,
  localDigest,
  packageDetails,
  parseReleases,
  readRemoteText,
  releaseTarget,
  remoteDigest,
  remoteHashMode,
  safeName,
  sameDigest,
  sha256,
  writeJsonAtomic
} from './release-storage'
import type { Channel, Digest, ReleaseConfig } from './release-storage'

const day = 24 * 60 * 60 * 1000

export interface RetentionPolicy {
  keepVersions: number
  minAgeDays: number
  graceDays: number
}

interface ArchivedFile extends Digest {
  name: string
  modifyTime: number
  remove: boolean
}

export interface CleanupPlan {
  id: string
  body: {
    schemaVersion: 1
    createdAt: string
    channel: Channel
    endpoint: { host: string; port: number; username: string; target: string }
    packageName: string
    policy: RetentionPolicy
    originalManifest: string
    proposedManifest: string
    files: ArchivedFile[]
    untouched: string[]
  }
}

interface CleanupState {
  deleted: string[]
  pending?: string
  completedAt?: string
}

interface Marker {
  planId: string
  publishedAt: string | null
}

export function validatePolicy(policy: RetentionPolicy): void {
  if (
    !Number.isSafeInteger(policy.keepVersions) ||
    policy.keepVersions < 3 ||
    !Number.isSafeInteger(policy.minAgeDays) ||
    policy.minAgeDays < 1 ||
    !Number.isSafeInteger(policy.graceDays) ||
    policy.graceDays < 7
  ) {
    throw new Error('Retention requires at least 3 versions, 1 day minimum age, and 7 grace days')
  }
}

export function applyRetention(plan: CleanupPlan['body']): void {
  validatePolicy(plan.policy)
  const entries = parseReleases(plan.originalManifest, plan.packageName)
  const versions = [
    ...new Set(entries.filter((entry) => entry.kind === 'full').map((entry) => entry.version))
  ].sort(semver.rcompare)
  const retained = new Set(versions.slice(0, plan.policy.keepVersions))
  const cutoff = Date.parse(plan.createdAt) - plan.policy.minAgeDays * day
  if (!Number.isFinite(cutoff)) throw new Error('Invalid cleanup creation date')
  for (const file of plan.files.filter((file) => file.name.endsWith('.nupkg'))) {
    const { version } = packageDetails(file.name, plan.packageName)
    if (file.modifyTime >= cutoff) retained.add(version)
  }
  for (const file of plan.files) {
    file.remove =
      file.name.endsWith('.nupkg') &&
      !retained.has(packageDetails(file.name, plan.packageName).version)
  }
  plan.proposedManifest = formatReleases(
    entries.filter((entry) => entry.kind === 'full' && retained.has(entry.version))
  )
}

export async function prepareCleanup(
  sftp: Client,
  config: ReleaseConfig,
  rootDir: string,
  channel: Channel,
  packageName: string,
  policy: RetentionPolicy
): Promise<string> {
  validatePolicy(policy)
  const target = releaseTarget(config, channel)
  if (await sftp.exists(path.posix.join(target, cleanupMarker)))
    throw new Error('A cleanup is already in progress')
  const originalManifest = await readRemoteText(sftp, path.posix.join(target, 'RELEASES'))
  const entries = parseReleases(originalManifest, packageName)
  const listing = await sftp.list(target)
  const selected = listing.filter(
    (file) =>
      file.name === 'RELEASES' ||
      file.name === `${packageName}_installer.exe` ||
      (file.name.startsWith(`${packageName}-`) && file.name.endsWith('.nupkg'))
  )
  const names = new Set<string>()
  for (const file of selected) {
    safeName(file.name)
    if (file.type !== '-' || names.has(file.name.toLowerCase()))
      throw new Error(`Unsafe or duplicate remote file: ${file.name}`)
    if (!Number.isFinite(file.modifyTime) || file.modifyTime <= 0)
      throw new Error(`Invalid modification date: ${file.name}`)
    if (file.name.endsWith('.nupkg')) packageDetails(file.name, packageName)
    names.add(file.name.toLowerCase())
  }
  for (const entry of entries) {
    if (!selected.some((file) => file.name === entry.name))
      throw new Error(`RELEASES references a missing package: ${entry.name}`)
  }
  if (!selected.some((file) => file.name === `${packageName}_installer.exe`))
    throw new Error('Current installer is missing')
  const directory = archiveRoot(config, rootDir, channel)
  const files: ArchivedFile[] = []
  for (const file of selected.sort((left, right) => left.name.localeCompare(right.name))) {
    console.info(`Verifying and archiving ${file.name}`)
    const remote = path.posix.join(target, file.name)
    const digest = await remoteDigest(sftp, remote)
    const entry = entries.find((entry) => entry.name === file.name)
    if (
      digest.size !== file.size ||
      (entry && (digest.sha1 !== entry.sha1 || digest.size !== entry.size))
    ) {
      throw new Error(`Server file does not match RELEASES/inventory: ${file.name}`)
    }
    if (file.name === 'RELEASES' && digest.sha256 !== sha256(originalManifest))
      throw new Error('RELEASES changed during planning')
    const sources = ['installer-dist', 'installer-dist-dev', 'installer-dist-old'].map((folder) =>
      path.join(rootDir, folder, file.name)
    )
    await archiveFile(directory, digest, sources, (temporary) => sftp.get(remote, temporary))
    files.push({ name: file.name, modifyTime: file.modifyTime, ...digest, remove: false })
  }
  const body: CleanupPlan['body'] = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    channel,
    endpoint: { host: config.host, port: config.port, username: config.username, target },
    packageName,
    policy,
    originalManifest,
    proposedManifest: '',
    files,
    untouched: listing.filter((file) => !selected.includes(file)).map((file) => file.name)
  }
  applyRetention(body)
  const plan = { id: sha256(JSON.stringify(body)), body }
  const planFile = path.join(directory, 'plans', `${plan.id}.json`)
  await verifySnapshot(sftp, plan, directory, originalManifest)
  await writeJsonAtomic(planFile, plan)
  console.table(
    files.map((file) => ({
      name: file.name,
      action: file.remove ? 'DELETE AFTER GRACE' : 'KEEP',
      bytes: file.size,
      sha256: file.sha256
    }))
  )
  console.info(
    `Reclaimable: ${(files.filter((file) => file.remove).reduce((total, file) => total + file.size, 0) / 1024 ** 3).toFixed(2)} GiB`
  )
  console.info(
    `Plan saved: ${planFile}\nNo release files were changed or deleted.\nNext: npm run releases -- publish --channel ${channel}\nYou do not need to copy the plan filename or verification ID.`
  )
  return planFile
}

export async function loadPlan(
  planFile: string,
  config: ReleaseConfig,
  rootDir: string,
  approval?: string
): Promise<CleanupPlan> {
  const plan: CleanupPlan = await fs.readJSON(planFile)
  if (
    plan.body.schemaVersion !== 1 ||
    plan.id !== sha256(JSON.stringify(plan.body)) ||
    (approval !== undefined && approval !== plan.id)
  ) {
    throw new Error('Plan checksum or explicit --approve ID does not match')
  }
  if (plan.body.channel !== 'production' && plan.body.channel !== 'development')
    throw new Error('Invalid plan channel')
  const { host, port, username, target } = plan.body.endpoint
  if (
    host !== config.host ||
    port !== config.port ||
    username !== config.username ||
    target !== releaseTarget(config, plan.body.channel)
  ) {
    throw new Error('Plan does not match the configured server/channel')
  }
  const directory = archiveRoot(config, rootDir, plan.body.channel)
  if (path.resolve(planFile) !== path.join(directory, 'plans', `${plan.id}.json`))
    throw new Error('Plan must remain in its archive plans directory')
  const names = new Set<string>()
  for (const file of plan.body.files) {
    safeName(file.name)
    if (
      names.has(file.name.toLowerCase()) ||
      !/^[a-f0-9]{64}$/.test(file.sha256) ||
      !/^[a-f0-9]{40}$/.test(file.sha1) ||
      !Number.isSafeInteger(file.size) ||
      file.size < 0 ||
      !Number.isFinite(file.modifyTime) ||
      file.modifyTime <= 0
    ) {
      throw new Error(`Invalid archived file record: ${file.name}`)
    }
    names.add(file.name.toLowerCase())
    if (!['RELEASES', `${plan.body.packageName}_installer.exe`].includes(file.name))
      packageDetails(file.name, plan.body.packageName)
  }
  const manifest = plan.body.files.find((file) => file.name === 'RELEASES')
  if (
    !manifest ||
    manifest.sha256 !== sha256(plan.body.originalManifest) ||
    !names.has(`${plan.body.packageName}_installer.exe`.toLowerCase())
  )
    throw new Error('Plan is missing its original metadata/installer')
  for (const entry of parseReleases(plan.body.originalManifest, plan.body.packageName)) {
    const file = plan.body.files.find((file) => file.name === entry.name)
    if (!file || file.sha1 !== entry.sha1 || file.size !== entry.size)
      throw new Error(`Plan is missing a manifest package: ${entry.name}`)
  }
  const recomputed = structuredClone(plan.body)
  applyRetention(recomputed)
  if (JSON.stringify(recomputed) !== JSON.stringify(plan.body))
    throw new Error('Plan retention decisions are inconsistent')
  return plan
}

export async function selectCleanupPlan(
  config: ReleaseConfig,
  rootDir: string,
  channel: Channel,
  options: { planFile?: string; approval?: string; activePlanId?: string } = {}
): Promise<{ planFile: string; plan: CleanupPlan }> {
  const directory = path.join(archiveRoot(config, rootDir, channel), 'plans')
  let planFile = options.planFile && path.resolve(options.planFile)
  if (!planFile && options.activePlanId) {
    if (!/^[a-f0-9]{64}$/.test(options.activePlanId)) throw new Error('Invalid active cleanup ID')
    planFile = path.join(directory, `${options.activePlanId}.json`)
    if (!(await fs.pathExists(planFile)))
      throw new Error(
        'The active cleanup plan is missing from this local archive. Restore its plan and archived files before continuing.'
      )
  }
  if (!planFile) {
    const candidates = (await fs.pathExists(directory))
      ? (await fs.readdir(directory)).filter((name) => /^[a-f0-9]{64}\.json$/.test(name))
      : []
    const files = await Promise.all(
      candidates.map(async (name) => ({
        file: path.join(directory, name),
        stat: await fs.lstat(path.join(directory, name))
      }))
    )
    const latest = files
      .filter((file) => file.stat.isFile())
      .sort(
        (left, right) =>
          right.stat.mtimeMs - left.stat.mtimeMs || left.file.localeCompare(right.file)
      )[0]
    if (!latest)
      throw new Error(
        `No saved ${channel} cleanup plan. First run: npm run releases -- plan --channel ${channel}`
      )
    planFile = latest.file
  }
  return { planFile, plan: await loadPlan(planFile, config, rootDir, options.approval) }
}

async function verifyFileGroup(
  label: string,
  files: ArchivedFile[],
  verify: (file: ArchivedFile, onProgress: (bytes: number) => void) => Promise<void>
): Promise<void> {
  const totalBytes = files.reduce((total, file) => total + file.size, 0)
  const started = Date.now()
  let completedFiles = 0
  let completedBytes = 0
  let currentBytes = 0
  let currentName = ''
  const report = (): void => {
    const processed = completedBytes + currentBytes
    const percent = totalBytes ? Math.min(100, (processed / totalBytes) * 100).toFixed(1) : '100.0'
    console.info(
      `${label}: ${completedFiles}/${files.length} files checked, ${(processed / 1024 ** 3).toFixed(2)}/${(totalBytes / 1024 ** 3).toFixed(2)} GiB (${percent}%), elapsed ${Math.round((Date.now() - started) / 1000)}s${currentName ? `; current: ${currentName}` : ''}`
    )
  }
  report()
  const timer = setInterval(report, 10_000)
  try {
    for (const file of files) {
      currentName = file.name
      currentBytes = 0
      await verify(file, (bytes) => {
        currentBytes = bytes
      })
      completedFiles++
      completedBytes += file.size
      currentBytes = 0
    }
    currentName = ''
    report()
  } finally {
    clearInterval(timer)
  }
}

export async function verifySnapshot(
  sftp: Client,
  plan: CleanupPlan,
  directory: string,
  expectedManifest: string,
  allowedMissing = new Set<string>()
): Promise<void> {
  const { target } = plan.body.endpoint
  if ((await readRemoteText(sftp, path.posix.join(target, 'RELEASES'))) !== expectedManifest)
    throw new Error('Live RELEASES changed; create a new plan')
  const listing = await sftp.list(target)
  const currentNames = listing
    .filter(
      (file) => file.name.startsWith(`${plan.body.packageName}-`) && file.name.endsWith('.nupkg')
    )
    .map((file) => file.name)
  if (currentNames.some((name) => !plan.body.files.some((file) => file.name === name)))
    throw new Error('New server packages appeared; create a new plan')
  await verifyFileGroup('Verifying local archive', plan.body.files, async (file, onProgress) => {
    const archived = path.join(directory, 'objects', file.sha256)
    if (!sameDigest(await localDigest(archived, onProgress), file))
      throw new Error(`Local archive no longer matches: ${file.name}`)
  })
  console.info(
    remoteHashMode(sftp) === 'ssh'
      ? 'Server verification calculates SHA-256 and SHA-1 on the server; only checksum results are transferred.'
      : 'Explicit SFTP verification streams full file contents over the network; this can take hours.'
  )
  const remoteFiles = plan.body.files.filter(
    (file) =>
      file.name !== 'RELEASES' &&
      !(allowedMissing.has(file.name) && !listing.some((item) => item.name === file.name))
  )
  await verifyFileGroup(
    `Verifying server files (${remoteHashMode(sftp) === 'ssh' ? 'server-side hashing' : 'SFTP network read'})`,
    remoteFiles,
    async (file, onProgress) => {
      const remote = path.posix.join(target, file.name)
      const item = listing.find((item) => item.name === file.name)
      if (
        !item ||
        item.type !== '-' ||
        item.modifyTime !== file.modifyTime ||
        !sameDigest(await remoteDigest(sftp, remote, onProgress), file)
      ) {
        throw new Error(`Remote file changed or disappeared: ${file.name}`)
      }
    }
  )
  if ((await readRemoteText(sftp, path.posix.join(target, 'RELEASES'))) !== expectedManifest)
    throw new Error('Live RELEASES changed during verification')
}

export async function readCleanupMarker(sftp: Client, target: string): Promise<Marker | undefined> {
  const remote = path.posix.join(target, cleanupMarker)
  if (!(await sftp.exists(remote))) return undefined
  const marker: Marker = JSON.parse(await readRemoteText(sftp, remote))
  if (
    !/^[a-f0-9]{64}$/.test(marker.planId) ||
    (marker.publishedAt !== null && !Number.isFinite(Date.parse(marker.publishedAt)))
  ) {
    throw new Error('Invalid remote cleanup marker')
  }
  return marker
}

async function readMarker(sftp: Client, plan: CleanupPlan): Promise<Marker | undefined> {
  const marker = await readCleanupMarker(sftp, plan.body.endpoint.target)
  if (marker && marker.planId !== plan.id)
    throw new Error('Remote cleanup marker does not match this plan')
  return marker
}

async function loadState(planFile: string, plan: CleanupPlan): Promise<CleanupState> {
  const state: CleanupState = (await fs.pathExists(`${planFile}.state.json`))
    ? await fs.readJSON(`${planFile}.state.json`)
    : { deleted: [] }
  const candidates = new Set(plan.body.files.filter((file) => file.remove).map((file) => file.name))
  if (
    !Array.isArray(state.deleted) ||
    [...state.deleted, ...(state.pending ? [state.pending] : [])].some(
      (name) => !candidates.has(name)
    )
  ) {
    throw new Error('Invalid cleanup progress journal')
  }
  return state
}

export async function publishCleanup(
  sftp: Client,
  plan: CleanupPlan,
  directory: string
): Promise<void> {
  console.info(
    'Checking publication metadata, then rechecking local and server checksums. No packages will be deleted.'
  )
  let marker = await readMarker(sftp, plan)
  const remoteManifest = path.posix.join(plan.body.endpoint.target, 'RELEASES')
  const current = await readRemoteText(sftp, remoteManifest)
  if (current !== plan.body.originalManifest && !(marker && current === plan.body.proposedManifest))
    throw new Error('Live RELEASES changed; create a new plan')
  await verifySnapshot(sftp, plan, directory, current)
  const markerPath = path.posix.join(plan.body.endpoint.target, cleanupMarker)
  if (!marker) {
    marker = { planId: plan.id, publishedAt: null }
    await atomicRemoteText(sftp, markerPath, JSON.stringify(marker))
  }
  if (!marker.publishedAt) {
    await atomicRemoteText(sftp, remoteManifest, plan.body.proposedManifest)
    marker.publishedAt = new Date().toISOString()
    await atomicRemoteText(sftp, markerPath, JSON.stringify(marker))
  } else if (current !== plan.body.proposedManifest) {
    throw new Error('Published cleanup manifest was changed')
  }
  console.info(
    `Full-only feed published. No packages deleted. Earliest prune: ${new Date(Date.parse(marker.publishedAt) + plan.body.policy.graceDays * day).toISOString()}`
  )
}

export async function pruneCleanup(
  sftp: Client,
  plan: CleanupPlan,
  directory: string,
  planFile: string,
  updatesTested: boolean,
  pruneNow = false
): Promise<void> {
  if (!updatesTested)
    throw new Error(
      'Pruning requires --updates-tested after old-client and fresh-install smoke tests'
    )
  const marker = await readMarker(sftp, plan)
  const state = await loadState(planFile, plan)
  if (state.completedAt && !marker) {
    console.info('Cleanup already completed')
    return
  }
  if (!marker?.publishedAt)
    throw new Error('The reduced feed must be published before pruning, even with --prune-now')
  const earliestPruneAt = new Date(
    Date.parse(marker.publishedAt) + plan.body.policy.graceDays * day
  ).toISOString()
  if (Date.now() < Date.parse(earliestPruneAt)) {
    if (pruneNow !== true)
      throw new Error(
        `The grace period must finish before pruning (${earliestPruneAt}). Only an explicit --prune-now override can skip this wait.`
      )
    console.warn(
      'WARNING: --prune-now skips the remaining grace period. Clients or caches using the old feed may fail to update. Archive and deletion verification remain mandatory.'
    )
    await fs.appendFile(
      `${planFile}.audit.jsonl`,
      `${JSON.stringify({
        at: new Date().toISOString(),
        action: 'grace-period-overridden',
        reason: 'explicit --prune-now',
        planId: plan.id,
        channel: plan.body.channel,
        publishedAt: marker.publishedAt,
        earliestPruneAt
      })}\n`
    )
  }
  const missing = new Set([...state.deleted, ...(state.pending ? [state.pending] : [])])
  await verifySnapshot(sftp, plan, directory, plan.body.proposedManifest, missing)
  for (const file of plan.body.files.filter((file) => file.remove)) {
    const remote = path.posix.join(plan.body.endpoint.target, file.name)
    if (await sftp.exists(remote)) {
      if (
        !sameDigest(await localDigest(path.join(directory, 'objects', file.sha256)), file) ||
        !sameDigest(await remoteDigest(sftp, remote), file)
      )
        throw new Error(`Deletion verification failed: ${file.name}`)
      if (
        (await readRemoteText(sftp, path.posix.join(plan.body.endpoint.target, 'RELEASES'))) !==
        plan.body.proposedManifest
      )
        throw new Error('Live RELEASES changed before deletion')
      state.pending = file.name
      await writeJsonAtomic(`${planFile}.state.json`, state)
      await fs.appendFile(
        `${planFile}.audit.jsonl`,
        `${JSON.stringify({ at: new Date().toISOString(), action: 'delete-verified', ...file })}\n`
      )
      await sftp.delete(remote)
    } else if (!missing.has(file.name)) {
      throw new Error(`Unjournaled missing package: ${file.name}`)
    }
    if (!state.deleted.includes(file.name)) state.deleted.push(file.name)
    delete state.pending
    await writeJsonAtomic(`${planFile}.state.json`, state)
  }
  state.completedAt = new Date().toISOString()
  await writeJsonAtomic(`${planFile}.state.json`, state)
  await sftp.delete(path.posix.join(plan.body.endpoint.target, cleanupMarker))
  console.info('Cleanup completed. All deleted packages remain in the verified local archive.')
}

export async function rollbackCleanup(
  sftp: Client,
  plan: CleanupPlan,
  directory: string
): Promise<void> {
  if (!(await readMarker(sftp, plan))) throw new Error('No matching cleanup is active')
  const remoteManifest = path.posix.join(plan.body.endpoint.target, 'RELEASES')
  const current = await readRemoteText(sftp, remoteManifest)
  if (current !== plan.body.originalManifest && current !== plan.body.proposedManifest)
    throw new Error('Live RELEASES changed')
  await verifySnapshot(sftp, plan, directory, current)
  await atomicRemoteText(sftp, remoteManifest, plan.body.originalManifest)
  await sftp.delete(path.posix.join(plan.body.endpoint.target, cleanupMarker))
  console.info(
    'Original feed restored. Rollback is only possible before any package has been deleted.'
  )
}
