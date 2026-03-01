# Copilot Instructions

## How to update

Use this workflow for regular dependency version updates in this repository.

1. Work in `gw2-raid-tool`:
   - `cd gw2-raid-tool`
2. Update dependency ranges in `package.json` with `ncu`:
   - `ncu -u`
   - If `ncu` is not installed globally, use: `npx npm-check-updates -u`
3. Regenerate the lock file:
   - `npm install`
4. Verify the project still compiles:
   - `npm run typecheck`
   - `npm run build`
5. Commit dependency updates together:
   - Keep the dependency update focused on `gw2-raid-tool/package.json` and `gw2-raid-tool/package-lock.json` unless a dependency bump requires a code/config fix.
   - Use commit message style: `update deps`.

Notes based on existing git history:

- Dependency updates are done regularly in dedicated commits.
- App version bumps are often done in separate `bump version` / `bump minor version` commits.