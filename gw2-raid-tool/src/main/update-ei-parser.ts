import path from 'path'
import fs from 'fs-extra'
import urllib from 'urllib'
import JSZip from 'jszip'
import semver from 'semver'
import type { Octokit as OctokitClass } from '@octokit/rest/dist-types'

import * as RaidToolDef from '../raid-tool'

const eiRepo = {
  owner: 'baaron4',
  repo: 'GW2-Elite-Insights-Parser'
}

async function getOctokit(): Promise<OctokitClass> {
  //@ts-ignore-next-line
  const { Octokit } = await import('@octokit/rest')
  return new Octokit() as OctokitClass
}

export default async ({
  baseConfig,
  backendConfig
}: {
  baseConfig: RaidToolDef.BaseConfig
  backendConfig: RaidToolDef.BackendConfig
}) => {
  const eiLocalPath = path.resolve(backendConfig.userDataDir, 'GuildWars2EliteInsights')
  await fs.ensureDir(eiLocalPath)
  let eiPath = null as null | string
  let ei_version = null as null | string
  try {
    const octokit = await getOctokit()
    const eiReleases = await octokit.repos.getLatestRelease({
      owner: eiRepo.owner,
      repo: eiRepo.repo
    })
    ei_version = eiReleases.data.name
    if (ei_version) {
      const beforeCLISplit = !!ei_version.match(/v[12]\./)
      const versionFolder = path.join(eiLocalPath, `${ei_version}${beforeCLISplit ? '' : '-cli'}`)
      console.info(`Latest EI-Version: ${ei_version}${beforeCLISplit ? '' : ' (CLI)'}`)
      const eiZip = beforeCLISplit ? 'GW2EI.zip' : 'GW2EICLI.zip'
      if (!(await fs.pathExists(versionFolder))) {
        const zipFile = eiReleases.data.assets.find((a) => a.name === eiZip)
        if (zipFile) {
          const zibFileContent = await urllib.request(zipFile.browser_download_url, {
            timeout: 60000,
            followRedirect: true
          })
          await fs.outputFile(
            path.join(eiLocalPath, `${ei_version}${beforeCLISplit ? '' : '-cli'}.zip`),
            zibFileContent.data
          )
          //console.log({data: zibFileContent.data});
          await fs.ensureDir(versionFolder)
          const zip = JSZip()
          await zip.loadAsync(zibFileContent.data)
          const unzipFile = [] as Array<() => Promise<void>>
          zip.forEach((relativePath, file) => {
            unzipFile.push(async () => {
              if (file.dir) {
                await fs.ensureDir(path.join(versionFolder, relativePath))
              } else {
                await fs.outputFile(
                  path.join(versionFolder, relativePath),
                  await zip.file(relativePath)?.async('nodebuffer')
                )
              }
            })
            //console.log("iterating over", relativePath);
          })
          for (const unzipEntry of unzipFile) {
            await unzipEntry()
          }
          //console.log(zibFileContent);
        }
      }
      ei_version = beforeCLISplit ? ei_version : `${ei_version}-cli`
      console.info(`Updated EI-Version: ${ei_version}`)
      eiPath = path.join(versionFolder, 'GuildWars2EliteInsights-CLI.exe')
    }
  } catch (error) {
    console.error(error)
  }
  if (!eiPath) {
    const versions = await fs.readdir(eiLocalPath)

    let maxVersion = '0.0'
    let beforeCLISplit = true

    for (const version of versions) {
      if (beforeCLISplit && version.match(/-cli$/)) {
        beforeCLISplit = false
        maxVersion = version
      }
      if (
        (!beforeCLISplit && !version.match(/^[\d.]+-cli$/)) ||
        (beforeCLISplit && !version.match(/^[\d.]+$/))
      ) {
        continue
      }
      if (semver.gt(version, maxVersion)) {
        maxVersion = version
      }
    }
    ei_version = maxVersion
    eiPath = path.join(eiLocalPath, ei_version, 'GuildWars2EliteInsights-CLI.exe')
  }
  if (!eiPath) {
    throw new Error('Could not find Elite Insights')
  }

  baseConfig.ei_version = ei_version
  baseConfig.eiPath = eiPath
}
