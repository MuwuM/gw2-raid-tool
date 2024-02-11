import processlist from 'node-processlist'

import * as RaidToolDef from '../raid-tool'

export default async ({
  eventHub,
  baseConfig
}: {
  baseConfig: RaidToolDef.BaseConfig
  eventHub: RaidToolDef.EventHub
}) => {
  baseConfig.gw2Instances = {
    running: [],
    lauchbuddy: [],
    nvidiaShare: [],
    ready: false
  }
  async function updateInstances() {
    const oldInstances = JSON.stringify(baseConfig.gw2Instances)
    let list: Array<{
      name: string
      pid: number
      sessionName: string
      sessionNumber: number
      memUsage: number
    }> = []
    try {
      list = await processlist.getProcesses({})
    } catch (error) {
      console.error(error)
    }
    if (list) {
      const running = [] as typeof baseConfig.gw2Instances.running
      const lauchbuddy = [] as typeof baseConfig.gw2Instances.lauchbuddy
      const nvidiaShare = [] as typeof baseConfig.gw2Instances.nvidiaShare
      for (const prog of list) {
        if (prog.name === 'Gw2-64.exe') {
          running.push({
            name: prog.name,
            pid: prog.pid
          })
        } else if (prog.name === 'Gw2.Launchbuddy.exe') {
          lauchbuddy.push({
            name: prog.name,
            pid: prog.pid
          })
        } else if (prog.name === 'NVIDIA Share.exe') {
          nvidiaShare.push({
            name: prog.name,
            pid: prog.pid
          })
        }
      }
      baseConfig.gw2Instances.running = running
      baseConfig.gw2Instances.lauchbuddy = lauchbuddy
      baseConfig.gw2Instances.nvidiaShare = nvidiaShare
    }
    baseConfig.gw2Instances.ready = true
    const newInstances = JSON.stringify(baseConfig.gw2Instances)
    if (oldInstances !== newInstances) {
      eventHub.emit('baseConfig', { baseConfig })
    }
    setTimeout(updateInstances, 1000)
  }

  try {
    await updateInstances()
  } catch (error) {
    console.error(error)
  }
}
