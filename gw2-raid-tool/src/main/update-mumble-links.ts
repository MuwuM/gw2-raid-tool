import gw2MumbleLink from './gw2-mumble-link'
import path from 'path'
import fs from 'fs-extra'
import { XMLParser } from 'fast-xml-parser'
const xml = new XMLParser()

import * as RaidToolDef from '../raid-tool'

/**
 *
 * @param {{
 * baseConfig:import("../raid-tool").BaseConfig,
 * backendConfig:import("../raid-tool").BackendConfig,
 * eventHub:import("../raid-tool").EventHub
 * }} param0
 */
export default async ({
  baseConfig,
  backendConfig,
  eventHub
}: {
  baseConfig: RaidToolDef.BaseConfig
  backendConfig: RaidToolDef.BackendConfig
  eventHub: RaidToolDef.EventHub
}) => {
  /*if (!baseConfig.mumbleLinkStats) {
    baseConfig.mumbleLinkStats = {};
  }*/
  const mumbleLink = gw2MumbleLink({
    pollingInterval: 100,
    gw2Pids: async () => baseConfig.gw2Instances.running.map((i) => i.pid),
    mumbleLinkIds: async () => {
      const currentMumbleLinkIds = ['MumbleLink']
      if (baseConfig.gw2Instances.lauchbuddy && baseConfig.gw2Instances.lauchbuddy.length > 0) {
        const launchBuddyAccsPath = path.join(baseConfig.launchBuddyConfigDir, 'Accs.xml')
        if (await fs.pathExists(launchBuddyAccsPath)) {
          const accsContent = await fs.readFile(launchBuddyAccsPath)
          const accs = await xml.parse(accsContent)
          if (accs?.ArrayOfAccount?.Account) {
            for (const acc of accs.ArrayOfAccount.Account) {
              if (acc && acc.Settings && acc.Settings.AccountID >= 0) {
                currentMumbleLinkIds.push(`GW2MumbleLink${acc.Settings.AccountID}`)
              }
            }
          }
        } else {
          console.warn(`Could not find LaunchBuddy config at: ${launchBuddyAccsPath}`)
        }
      }
      return currentMumbleLinkIds
    }
  })

  mumbleLink.on('error', (err: any) => {
    console.error(err)
  })
  let lastActive = null as null | string

  mumbleLink.on('mumbleLink', (mumbleLinkStats: { [key: string]: RaidToolDef.MumbleLinkData }) => {
    //baseConfig.mumbleLinkStats = mumbleLinkStats;
    const stats = Object.values(mumbleLinkStats).filter((a) => a.name === 'Guild Wars 2')
    stats.sort((a, b) => (b.time || 0) - (a.time || 0))

    const mumbleLinkActive: RaidToolDef.MumbleLinkData | null = stats[0] || null

    backendConfig.mumbleLinkActive = mumbleLinkActive

    const currentActive = JSON.stringify({
      mumbleLinkStats: Object.keys(mumbleLinkStats),
      mumbleLinkActive: !!mumbleLinkActive,
      spec: mumbleLinkActive?.identity?.spec,
      TextboxHasFocus: mumbleLinkActive?.uiStates?.TextboxHasFocus,
      GameHasFocus: mumbleLinkActive?.uiStates?.GameHasFocus,
      IsMapOpen: mumbleLinkActive?.uiStates?.IsMapOpen,
      mountIndex: mumbleLinkActive?.context?.mountIndex,
      time: true
    })

    if (lastActive !== currentActive) {
      eventHub.emit('mumbleLinkActive', { mumbleLinkActive })
      lastActive = currentActive
    }
  })
}
