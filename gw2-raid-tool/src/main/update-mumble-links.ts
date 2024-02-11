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

  mumbleLink.on(
    'mumbleLink',
    (mumbleLinkStats: { [s: string]: RaidToolDef.TODO } | ArrayLike<RaidToolDef.TODO>) => {
      //baseConfig.mumbleLinkStats = mumbleLinkStats;
      const stats = Object.values(mumbleLinkStats).filter((a) => a.name === 'Guild Wars 2')
      stats.sort((a, b) => b.time - a.time)
      const active = stats[0]

      let mumbleLinkActive: RaidToolDef.MumbleLinkData | false = false
      if (active) {
        mumbleLinkActive = active
      } else if (stats.length < 1) {
        mumbleLinkActive = false
      }
      backendConfig.mumbleLinkActive = mumbleLinkActive

      const currentActive = JSON.stringify({
        mumbleLinkStats: Object.keys(mumbleLinkStats),
        mumbleLinkActive: !!mumbleLinkActive,
        spec: (mumbleLinkActive as RaidToolDef.MumbleLinkData)?.identity?.spec,
        TextboxHasFocus: (mumbleLinkActive as RaidToolDef.MumbleLinkData)?.uiStates
          ?.TextboxHasFocus,
        GameHasFocus: (mumbleLinkActive as RaidToolDef.MumbleLinkData)?.uiStates?.GameHasFocus,
        IsMapOpen: (mumbleLinkActive as RaidToolDef.MumbleLinkData)?.uiStates?.IsMapOpen,
        mountIndex: (mumbleLinkActive as RaidToolDef.MumbleLinkData)?.context?.mountIndex,
        time: true
      })

      if (lastActive !== currentActive) {
        eventHub.emit('mumbleLinkActive', { mumbleLinkActive })
        lastActive = currentActive
      }
    }
  )
}
