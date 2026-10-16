import * as path from 'path'
import * as fs from 'fs-extra'
import { parseArgs } from 'util'
import { createInterface } from 'readline/promises'
import {
  prepareCleanup,
  pruneCleanup,
  publishCleanup,
  readCleanupMarker,
  rollbackCleanup,
  selectCleanupPlan,
  validatePolicy
} from './release-cleanup'
import type { CleanupPlan } from './release-cleanup'
import {
  archiveRoot,
  connectReleases,
  parseReleases,
  readReleaseLock,
  releaseTarget,
  unlockReleases,
  withReleaseLock
} from './release-storage'
import type { Channel, ReleaseConfig } from './release-storage'

function showPlan(plan: CleanupPlan): void {
  const candidates = plan.body.files.filter((file) => file.remove)
  const bytes = candidates.reduce((total, file) => total + file.size, 0)
  const versions = parseReleases(plan.body.proposedManifest, plan.body.packageName).map(
    (entry) => entry.version
  )
  console.info(
    `Channel: ${plan.body.channel}\nServer: ${plan.body.endpoint.host}:${plan.body.endpoint.port}${plan.body.endpoint.target}`
  )
  console.info(`Snapshot: ${plan.body.createdAt} (${plan.body.files.length} archived file records)`)
  console.info(`Retained full versions: ${versions.join(', ')}`)
  console.info(
    `Deletion candidates: ${candidates.length} packages (${(bytes / 1024 ** 3).toFixed(2)} GiB)`
  )
}

async function confirmAction(
  action: string,
  plan: CleanupPlan,
  approved: boolean,
  pruneNow = false
): Promise<boolean> {
  const descriptions: Record<string, string> = {
    publish: `Publish the reduced full-only feed to ${plan.body.channel}? No packages are deleted; new releases are blocked during the ${plan.body.policy.graceDays}-day grace period.`,
    prune: `${pruneNow ? 'WARNING: --prune-now skips any remaining grace period. Clients or caches using the old feed may fail to update. ' : ''}Permanently delete ${plan.body.files.filter((file) => file.remove).length} verified archived packages from ${plan.body.channel}?`,
    rollback: `Restore the original ${plan.body.channel} feed and cancel this cleanup?`
  }
  return confirmChange(descriptions[action], approved)
}

async function confirmChange(description: string, approved: boolean): Promise<boolean> {
  console.info(description)
  if (approved) return true
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      'Confirmation requires an interactive terminal. For unattended use, review the plan first and explicitly add --yes.'
    )
  }
  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return /^(y|yes)$/i.test((await prompt.question('Continue? [y/N] ')).trim())
  } finally {
    prompt.close()
  }
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      channel: { type: 'string' },
      keep: { type: 'string', default: '3' },
      'min-age-days': { type: 'string', default: '180' },
      'grace-days': { type: 'string', default: '7' },
      plan: { type: 'string' },
      approve: { type: 'string' },
      yes: { type: 'boolean', default: false },
      'updates-tested': { type: 'boolean', default: false },
      'prune-now': { type: 'boolean', default: false },
      'no-active-processes': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false }
    }
  })
  if (values.help) {
    console.info(`Release maintenance (run from gw2-raid-tool; production is the default channel):
  npm run releases                         Show status (small metadata reads, no file hashing)
  npm run releases -- plan --channel production [--keep 3 --min-age-days 180 --grace-days 7]
  npm run releases -- publish              Select the saved plan and ask for confirmation
  npm run releases -- prune --updates-tested
  npm run releases -- prune --updates-tested --prune-now   Explicit initial-migration grace override
  npm run releases -- rollback
  npm run releases -- unlock --no-active-processes

No hashes or paths need to be copied. Commands use the active cleanup plan, or the latest saved plan.
Use --channel development for development. Use --yes for explicit unattended confirmation.
Advanced: --plan <absolute-path> and --approve <plan-id> remain supported.
Plan verifies/archives server files locally, but never publishes or deletes releases.
Publish changes RELEASES to full packages only. Prune requires tested updates and normally at least 7 days.
--prune-now skips only the grace-period wait, warns about old clients/cached feeds, and logs the override.
It does not bypass publication, checksums, archive verification, locking, or --updates-tested.
Rollback restores the original feed only while all original packages still exist.
Unlock removes only a leftover maintenance lock, never packages or the cleanup marker.
Use it only after stopping every maintenance/publishing process on all machines; lock age is not proof.
Production and development are separate. Unknown files and subdirectories are never deleted.`)
    return
  }
  const action = positionals[0] || 'status'
  if (
    positionals.length > 1 ||
    !['status', 'plan', 'publish', 'prune', 'rollback', 'unlock'].includes(action)
  )
    throw new Error('Expected status, plan, publish, prune, rollback, or unlock; use --help')
  if (
    values.channel !== undefined &&
    values.channel !== 'production' &&
    values.channel !== 'development'
  )
    throw new Error('Channel must be production or development')
  const rootDir = path.resolve(__dirname, '../../../')
  const config: ReleaseConfig = await fs.readJSON(path.join(rootDir, 'upload-config.json'))
  const policy = {
    keepVersions: Number(values.keep),
    minAgeDays: Number(values['min-age-days']),
    graceDays: Number(values['grace-days'])
  }
  validatePolicy(policy)
  if (action !== 'prune' && values['prune-now'])
    throw new Error('--prune-now is only valid for prune')
  if (action !== 'unlock' && values['no-active-processes'])
    throw new Error('--no-active-processes is only valid for unlock')
  if (action === 'unlock') {
    if (values.plan || values.approve || values['updates-tested'])
      throw new Error('Unlock does not accept --plan, --approve, or --updates-tested')
    if (!values['no-active-processes'])
      throw new Error(
        'Stop all maintenance and publishing processes on every machine, then run: npm run releases -- unlock --no-active-processes'
      )
  }
  if (action === 'plan' && (values.plan || values.approve || values['updates-tested']))
    throw new Error('Plan does not accept --plan, --approve, or --updates-tested')
  if (!['plan', 'status'].includes(action) && config.noUpload)
    throw new Error('Remote changes are disabled by noUpload in upload-config.json')
  if (action === 'prune' && !values['updates-tested'])
    throw new Error(
      'First test fresh installation and updating old clients, then run: npm run releases -- prune --updates-tested'
    )
  let selected = ['plan', 'unlock'].includes(action)
    ? undefined
    : await selectCleanupPlan(config, rootDir, (values.channel || 'production') as Channel, {
        planFile: values.plan,
        approval: values.approve
      })
  if (selected && values.channel && selected.plan.body.channel !== values.channel)
    throw new Error('The selected plan belongs to a different channel')
  const channel: Channel =
    selected?.plan.body.channel || ((values.channel || 'production') as Channel)
  const target = releaseTarget(config, channel)
  const sftp = await connectReleases(config, rootDir)
  try {
    const lock = await readReleaseLock(sftp, target)
    const unlockCommand = `npm run releases -- unlock --channel ${channel} --no-active-processes`
    if (lock)
      console.info(
        `Maintenance lock: ${lock.file}\nCreated: ${lock.createdAt || 'unknown (possibly interrupted during creation)'}\nOwner: ${lock.owner || 'unknown'}`
      )
    if (action === 'unlock') {
      if (!lock) {
        console.info('No maintenance lock exists. Nothing was changed.')
        return
      }
      if (
        !(await confirmChange(
          `Remove only the ${channel} maintenance lock? You confirm that ALL maintenance and publishing processes on ALL machines have stopped. This does not cancel a running process.`,
          values.yes
        ))
      ) {
        console.info('Cancelled. The maintenance lock was not removed.')
        return
      }
      await unlockReleases(sftp, target, lock, values['no-active-processes'])
      console.info(
        `Maintenance lock removed. No release files or cleanup marker were changed.\nNext: npm run releases -- status --channel ${channel}`
      )
      return
    }
    if (lock && action !== 'status')
      throw new Error(
        `Maintenance is locked; no release operation was started. Another process may still be running. Only after confirming all maintenance and publishers have stopped, run: ${unlockCommand}`
      )
    if (lock)
      console.info(
        `Do not start another publisher or cleanup. If this lock is left over from an interrupted process, confirm all such processes have stopped, then run: ${unlockCommand}`
      )
    if (selected) {
      const marker = await readCleanupMarker(sftp, target)
      if (marker && marker.planId !== selected.plan.id) {
        if (values.plan)
          throw new Error('Another cleanup is active. Omit --plan to select it automatically.')
        selected = await selectCleanupPlan(config, rootDir, channel, {
          activePlanId: marker.planId,
          approval: values.approve
        })
      }
      const { plan, planFile } = selected
      showPlan(plan)
      const progress = (await fs.pathExists(`${planFile}.state.json`))
        ? await fs.readJSON(`${planFile}.state.json`)
        : undefined
      const earliest = marker?.publishedAt
        ? Date.parse(marker.publishedAt) + plan.body.policy.graceDays * 24 * 60 * 60 * 1000
        : undefined
      if (earliest)
        console.info(
          `Feed published: ${marker!.publishedAt}\nEarliest prune${values['prune-now'] ? ' without override' : ''}: ${new Date(earliest).toISOString()}`
        )
      if (action === 'status') {
        console.info(
          'Status reads metadata only; archive and package checksums are rechecked before changes.'
        )
        if (!marker && progress?.completedAt)
          console.info(`Cleanup completed: ${progress.completedAt}`)
        else
          console.info(
            `Next: npm run releases -- ${marker?.publishedAt ? 'prune --updates-tested' : 'publish'} --channel ${channel}`
          )
        return
      }
      if (action === 'prune' && earliest && Date.now() < earliest && !values['prune-now'])
        throw new Error(
          `The grace period is still running. Prune is available after ${new Date(earliest).toISOString()}. For an intentional initial migration, --prune-now explicitly skips only this wait.`
        )
      if (
        !(await confirmAction(
          action,
          plan,
          values.yes || values.approve !== undefined,
          values['prune-now']
        ))
      ) {
        console.info('Cancelled. No server release files were changed or deleted.')
        return
      }
    }
    await withReleaseLock(sftp, target, async () => {
      const directory = archiveRoot(config, rootDir, channel)
      if (!selected) {
        const pkg = await fs.readJSON(path.join(rootDir, 'gw2-raid-tool', 'package.json'))
        await prepareCleanup(sftp, config, rootDir, channel, pkg.name.replace(/-/g, '_'), policy)
      } else if (action === 'publish') {
        await publishCleanup(sftp, selected.plan, directory)
        console.info(
          `After the grace period and update tests: npm run releases -- prune --updates-tested --channel ${channel}`
        )
      } else if (action === 'prune') {
        await pruneCleanup(
          sftp,
          selected.plan,
          directory,
          selected.planFile,
          values['updates-tested'],
          values['prune-now']
        )
      } else {
        await rollbackCleanup(sftp, selected.plan, directory)
      }
    })
  } finally {
    await sftp.end()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
