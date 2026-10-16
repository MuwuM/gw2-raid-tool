# Release maintenance

Run commands from `gw2-raid-tool`. The existing `upload-config.json` supplies the SFTP connection.
`npm run releases -- --help` builds the maintenance entry point and prints usage without connecting.
The commands never run application packaging or increment the package version.

## Everyday commands (no IDs or paths to copy)

If planning already completed, reuse that saved archive; do not run the lengthy planning step again.
Existing plans remain valid and are not modified by automatic selection.

```powershell
npm run releases
npm run releases -- publish
```

The default command shows status using small metadata reads only, without hashing packages or changing
server files. Publish selects the active cleanup plan, or otherwise the most recently saved plan for
the selected channel, displays a readable summary, and asks `Continue? [y/N]`. Press Enter to cancel.
Production is the default; add `--channel development` for development commands.

After testing updates and waiting for the displayed grace-period deadline:

```powershell
npm run releases -- prune --updates-tested
```

Publish and prune still recheck checksums and can take substantial time.
Server verification calculates SHA-256 and SHA-1 on the server over SSH by default, transferring
only checksum results rather than downloading the snapshot again. Local archives are still hashed
independently. Verification prints local/server phases, files checked, GiB processed, percentage,
current filename, and elapsed time every ten seconds. In SSH mode, server byte progress advances
when each file finishes hashing, not while it is being read on the server.
An already running older command will not gain server-side hashing or progress output from a code update.
Automatic selection does not weaken archive verification or the default grace period.
Use `--yes` only for deliberate unattended approval.
Advanced `--plan <absolute-path>` and `--approve <plan-id>` options remain supported; the checksum ID
is normally an internal integrity check, not something to copy into commands.

## Configuration and prerequisites

- Set distinct `targetPath` and `targetPathDev` directories. Use canonical absolute server paths,
  not symlink aliases. Production cleanup does not recurse into `dev`.
- Optionally set `uploadDomainDev`; otherwise the development feed is `dev/` below `uploadDomain`.
- `remoteHashMode` defaults to `ssh`, using command execution on the existing authenticated SSH
  connection. The server needs a POSIX shell and `stat` (GNU-compatible `-c` formats), `sha256sum`,
  and `sha1sum`. Commands reject symlinks, compare device/inode/size/mtime/ctime before and after
  hashing, and return only hashes and byte size. SFTP metadata is independently checked too.
  Denied commands, missing tools, malformed output, disconnects, and a 15-minute per-file timeout
  abort verification; there is no automatic download fallback. Only for SFTP-only accounts, explicitly
  set `"remoteHashMode": "sftp"` to opt into the slower full-file network reads.
- `archiveDirectory` defaults to `release-archive` at the repository root. It may be an absolute path
  on a dedicated backup drive, but must not be inside an installer output directory.
- Allow enough local space for a complete archive (approximately 20 GiB for the supplied inventory).
  Existing installers are copied into the archive, not moved. A copy on the same disk is not protection
  against disk failure; keep another backup before permanently removing historical releases.
- The server must support exclusive SFTP file creation and OpenSSH POSIX atomic rename. Unsupported
  operations fail; there is no delete-then-rename fallback for live metadata.
- Stop legacy publishing scripts and manual writes during maintenance. Updated publishing and cleanup
  use an exclusive `.release-maintenance.lock` file. An interrupted connection can leave this lock:
  use the guarded recovery command below only after confirming no publisher/maintenance process is running.
- Publish, prune, and rollback refuse to run when `noUpload` is true. Planning still connects to read
  and archive files; its only server writes are acquiring and releasing the maintenance lock.

## 1. Archive and review (explicit; no release changes)

```powershell
npm run releases -- plan --channel production --keep 3 --min-age-days 180 --grace-days 7
```

The same command with `--channel development` handles the development directory independently.
Defaults are the latest three versions, everything modified within 180 days, and seven grace days.
You can increase retention. Fewer than three versions or seven grace days is rejected.

The planner inventories only top-level packages belonging to this application, `RELEASES`, and the
current installer. Unknown files, other applications, temporary files, and subdirectories remain
untouched. A missing installer, symlink, malformed manifest, missing manifest package, or checksum
mismatch aborts planning.

Every inventoried file is hashed from the live server using SHA-256 and SHA-1. Manifest packages must
also match their advertised SHA-1 and exact byte size. Matching copies in `installer-dist`,
`installer-dist-old`, and `installer-dist-dev` are reused only after hashing; missing or different
files are downloaded to temporary local files. Completed archive copies are independently rehashed.
Server files are rechecked before a plan is saved. Default SSH hashing avoids full-file network reads;
only missing archive contents need downloading. Explicit SFTP hashing still streams complete file
contents, even when all packages already exist locally. Existing saved plans need not be recreated.

The content-addressed archive contains:

- `production/objects/<sha256>` (or `development/objects/<sha256>`): immutable, verified file bytes.
- `<channel>/plans/<plan-id>.json`: filenames, sizes, hashes, modification dates, server identity,
  retention decisions, untouched entries, original feed, and proposed full-only feed.
- `<channel>/builds/`: filename-to-object mappings for newly packaged releases and published feeds.

The report lists each keep/delete decision, reclaimable bytes, the absolute plan path, and approval ID.
Review the JSON and back up the archive. Do not edit the plan: its ID covers the entire snapshot and
policy. Changed server files or a different configured server invalidate it. Subsequent commands select
the saved plan automatically; do not create a second plan to continue the first one.

## 2. Explicitly publish the reduced feed

```powershell
npm run releases -- publish
```

Review the displayed summary and answer `y` to confirm. Add `--channel development` if appropriate.
All archived bytes and server files are verified again before changing the feed. The new feed advertises
retained full packages only, removing delta-chain dependencies. No packages are deleted yet.

A persistent `.release-cleanup.json` marker records the plan and actual publication time. Updated
packaging refuses to publish to this channel until cleanup completes or is rolled back, preventing a
new release from invalidating the grace-period snapshot. Reads/downloads remain available.
An interrupted publish can be retried with the same command; the grace period never
starts before successful feed publication.

## 3. Smoke-test, wait, then explicitly prune

Before confirming tests, verify the public HTTP feed/installer is served correctly (including cache
behavior), perform a fresh install, and test updating both a genuinely old installation and the
previous release to the current full package. The script cannot perform these interactive Windows
update tests for you. Allow CDN/proxy metadata caches to expire; increase the grace period if their
lifetime can exceed seven days.

```powershell
npm run releases -- prune --updates-tested
```

Normal pruning refuses to run before the plan's grace period expires or without `--updates-tested`. It verifies
the complete archive and remaining server snapshot first, then rehashes each candidate locally and
remotely immediately before deleting that exact file. No globs or recursive deletion are used.
The current installer, retained packages, full-only feed, unknown files, and subdirectories stay intact.

Progress is written atomically to `<plan>.state.json`, with a verification audit in `<plan>.audit.jsonl`.
A pending deletion is journaled before the server delete, so rerunning the exact command can recover
from interruption. An unexplained missing file or changed feed aborts rather than silently proceeding.
The persistent marker is removed only after cleanup completes. Local archives are never pruned.

### Initial migration: intentionally prune before the deadline

For the initial storage cleanup, you can explicitly skip the remaining grace-period wait:

```powershell
npm run releases -- prune --updates-tested --prune-now
```

This is not the default. Clients or caches still using the previous feed can request packages that
are about to be removed and fail to update. Test fresh installation and old-client updates first;
`--updates-tested` is still required. Review the warning and deletion summary, then confirm `y`.
For deliberate unattended use, `--yes` approves the displayed warning too.

The override skips only the clock check. The reduced feed must already be published, and archive,
server checksum, manifest, per-file deletion checks, locks, and recovery journals remain enforced.
An early-prune attempt is recorded as `grace-period-overridden` in the local audit log before
verification/deletion, even if a later check fails. Neither the saved plan nor the publication time
is edited. Future commands still enforce the normal deadline unless `--prune-now` is supplied again.

## Rollback and recovery

### Interrupted commands and leftover locks

If a command reports that maintenance is locked (older versions may report only `Failure`), run
`npm run releases` to see the lock path, owner, and creation time. An old timestamp does not prove
that a lock is abandoned. Stop and verify all maintenance and publishing processes on every machine,
including other terminals, CI, and manual upload sessions, before running:

```powershell
npm run releases -- unlock --no-active-processes
```

Review the lock details and answer `y`. This command removes only the displayed maintenance lock,
checks that its contents have not changed while awaiting confirmation, and never publishes, deletes
packages, or removes the cleanup marker. It does not terminate a running process. Unknown/partial
regular lock contents can also be recovered after confirming no process is using them. Locks are
never removed automatically by age. Add `--channel development` to inspect or recover development.
After unlocking, check status and resume the appropriate publish/prune/rollback command with the
existing plan; do not repeat planning. Noninteractive unlock also needs the explicit `--yes` flag.

Before any package deletion, restore the original feed and unblock publishing with:

```powershell
npm run releases -- rollback
```

Rollback verifies every original package is still present and matches its archive. After pruning starts,
it deliberately refuses a rollback that would advertise missing packages. To restore historical files
after deletion, use each plan record's `name` and `sha256` to copy the corresponding `objects/<sha256>`
blob back under its original filename, verify its hash, and only then restore the archived manifest.
Never restore an old manifest before its referenced packages. Do not manually remove an active cleanup
marker to bypass validation.

## Future packaging

`npm run pack` creates a unique directory under `installer-staging`, generates full packages without
deltas, and archives the new full package, installer, and generated metadata. It uploads only the
current full package and current installer, never historical output directories. Existing same-version
packages must match the new content exactly; differing bytes abort instead of overwriting a release.
Upload skips use content hashes rather than modification times. Development builds use the development
feed when synchronizing release metadata.

Under the shared lock, packaging merges the new release with existing full-package feed entries,
checks existing references, uploads/verifies packages and installer, archives the merged feed, and
atomically publishes `RELEASES` last. It never applies retention automatically. The package version is
bumped only after archiving and successful publication (or successful local-only packaging). Successful
staging directories are removed; failed builds retain staging for investigation. Existing historical
installer directories are left untouched.
