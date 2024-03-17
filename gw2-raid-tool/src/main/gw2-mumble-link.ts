// @ts-ignore-next-line
import NodeIPC from '@fynnix/node-easy-ipc'
import EventEmitter from 'events'
import { MumbleLinkData, MumbleLinkDataIdentity, MumbleLinkDataStatus } from '../raid-tool'
import entries from './entries'
class MumbleLinkEmitter extends EventEmitter {}

interface NodeIPCApi {
  createMapping: (security: any, file: string, size: number) => void
  openMapping: (file: string, size: number) => void
  closeMapping: () => void
  readInto: (start: number, length: number, buffer: Buffer) => void
}

const size = 5460

function readText(access: Buffer, start: number, length: number) {
  let i = 0
  const buf = Buffer.alloc(length)
  while (i < length) {
    buf.writeInt8(access.readInt8(start + i), i)
    i += 1
  }
  // eslint-disable-next-line no-control-regex
  return buf.toString('utf16le').replace(/\u0000.*$/, '')
}

function bit_test(num: number, bit: number) {
  return (num >> bit) % 2 !== 0
}

async function readStats(access: Buffer, parseUiStates: any): Promise<MumbleLinkDataStatus> {
  const uiVersion = access.readUInt32LE(0)
  if (!uiVersion) {
    return {}
  }
  const identityPlain = readText(access, 592, 512)
  let identity: MumbleLinkDataIdentity | undefined
  try {
    identity = JSON.parse(identityPlain)
  } catch (error) {
    // ignore invalid identity
  }
  const data = {
    uiVersion: access.readUInt32LE(0),
    uiTick: access.readUInt32LE(4),
    fAvatarPosition: {
      x: access.readFloatLE(8),
      y: access.readFloatLE(12),
      z: access.readFloatLE(16)
    },
    fAvatarFront: {
      x: access.readFloatLE(20),
      y: access.readFloatLE(24),
      z: access.readFloatLE(28)
    },
    fAvatarTop: {
      x: access.readFloatLE(32),
      y: access.readFloatLE(36),
      z: access.readFloatLE(40)
    },
    name: readText(access, 44, 512),
    fCameraPosition: {
      x: access.readFloatLE(556),
      y: access.readFloatLE(560),
      z: access.readFloatLE(564)
    },
    fCameraFront: {
      x: access.readFloatLE(568),
      y: access.readFloatLE(572),
      z: access.readFloatLE(576)
    },
    fCameraTop: {
      x: access.readFloatLE(580),
      y: access.readFloatLE(584),
      z: access.readFloatLE(588)
    },
    identity,
    identityPlain,
    context_len: access.readUInt32LE(1104),
    context: {
      serverAddress: readText(access, 1108, 28),
      mapId: access.readUInt32LE(1136),
      mapType: access.readUInt32LE(1140),
      shardId: access.readUInt32LE(1144),
      instance: access.readUInt32LE(1148),
      buildId: access.readUInt32LE(1152),
      uiState: access.readUInt32LE(1156),
      compassWidth: access.readInt16LE(1160),
      compassHeight: access.readInt16LE(1162),
      compassRotation: access.readFloatLE(1164),
      playerX: access.readFloatLE(1168),
      playerY: access.readFloatLE(1172),
      mapCenterX: access.readFloatLE(1176),
      mapCenterY: access.readFloatLE(1180),
      mapScale: access.readFloatLE(1184),
      processId: access.readUInt32LE(1188),
      mountIndex: access.readInt8(1192)
    }
  } as MumbleLinkData
  if (parseUiStates) {
    data.uiStates = {
      IsMapOpen: bit_test(data.context.uiState, 0),
      IsCompassTopRight: bit_test(data.context.uiState, 1),
      DoesCompassHaveRotationEnabled: bit_test(data.context.uiState, 2),
      GameHasFocus: bit_test(data.context.uiState, 3),
      IsInCompetitiveGameMode: bit_test(data.context.uiState, 4),
      TextboxHasFocus: bit_test(data.context.uiState, 5),
      IsInCombat: bit_test(data.context.uiState, 6)
    }
  }
  return data
}

function MumbleLink(options: {
  pollingInterval?: number
  gw2Pids?: () => Promise<number[]>
  mumbleLinkIds?: () => Promise<string[]>
}) {
  const opts = {
    pollingInterval: 1000,
    parseUiStates: true,
    gw2Pids: async () => [],
    mumbleLinkIds: async () => ['MumbleLink'],
    ...(options || {})
  }

  const emitter = new MumbleLinkEmitter()

  const activeMaps = {} as Record<string, NodeIPCApi>
  const mumbleLinkStats = {} as Record<string, MumbleLinkDataStatus>
  const processesMap = {} as Record<number, string>

  async function readMumbleLinkData() {
    try {
      const pids = await opts.gw2Pids()

      for (const [pid, key] of entries(processesMap)) {
        if (!pids.find((i) => i === pid)) {
          if (activeMaps[key]) {
            try {
              activeMaps[key].closeMapping()
            } catch (error) {
              emitter.emit('error', error)
            }
            delete activeMaps[key]
          }
          if (mumbleLinkStats[key]) {
            delete mumbleLinkStats[key]
          }
          delete processesMap[pid]
        }
      }

      const missesMumbleLinkFiles = pids.find((i) => !processesMap[i])

      if (missesMumbleLinkFiles) {
        const currentMumbleLinkIds = await opts.mumbleLinkIds()
        for (const file of currentMumbleLinkIds) {
          if (!activeMaps[file]) {
            const map = new NodeIPC.FileMapping() as NodeIPCApi
            try {
              map.openMapping(file, size)
              activeMaps[file] = map
              mumbleLinkStats[file] = {}
            } catch (error) {
              if (`${error}`.match(/error code:\s*6(\s+|$)/)) {
                try {
                  map.createMapping(null, file, size)
                  map.openMapping(file, size)

                  const data = Buffer.alloc(size)
                  map.readInto(0, size, data)
                  activeMaps[file] = map
                  mumbleLinkStats[file] = {}
                } catch (error) {
                  emitter.emit('error', new Error(`Error creating File [${file}]: ${error}`))
                  delete activeMaps[file]
                  delete mumbleLinkStats[file]
                  continue
                }
              } else {
                emitter.emit('error', new Error(`Error opening File [${file}]: ${error}`))
                delete activeMaps[file]
                delete mumbleLinkStats[file]
                continue
              }
            }
          }
        }
      }

      for (const [key, access] of entries(activeMaps)) {
        const data = Buffer.alloc(size)
        try {
          access.readInto(0, size, data)
        } catch (error) {
          emitter.emit('error', error)
          try {
            await access.closeMapping()
          } catch (error) {
            emitter.emit('error', error)
          }
          delete activeMaps[key]
          delete mumbleLinkStats[key]
          continue
        }
        const stats = await readStats(data, opts.parseUiStates)
        if (stats.context?.processId) {
          processesMap[stats.context.processId] = key
        } else {
          try {
            await access.closeMapping()
          } catch (error) {
            emitter.emit('error', error)
          }
          delete activeMaps[key]
          delete mumbleLinkStats[key]
          continue
        }
        if (!mumbleLinkStats[key] || mumbleLinkStats[key].uiTick !== stats.uiTick) {
          if (
            stats.context &&
            stats.context.uiState > 0 &&
            (!mumbleLinkStats[key] ||
              !mumbleLinkStats[key].uiStates ||
              mumbleLinkStats[key].uiStates?.GameHasFocus !== stats.uiStates?.GameHasFocus)
          ) {
            stats.time = Date.now()
          } else if (mumbleLinkStats[key]?.time) {
            stats.time = mumbleLinkStats[key].time
          } else {
            stats.time = Date.now()
          }
          mumbleLinkStats[key] = stats
        }
      }
      emitter.emit('mumbleLink', mumbleLinkStats)
    } catch (error) {
      emitter.emit('error', error)
    }
    setTimeout(readMumbleLinkData, opts.pollingInterval)
  }

  setImmediate(readMumbleLinkData)
  return emitter
}
export default MumbleLink
