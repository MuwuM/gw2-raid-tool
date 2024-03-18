import fs from 'fs-extra'
import zlib from 'zlib'
import { promisify } from 'util'
const unzip = promisify(zlib.unzip)
import { chain } from 'stream-chain'
import { parser } from 'stream-json'
import { ignore } from 'stream-json/filters/Ignore'
//import { streamObject } from 'stream-json/streamers/StreamObject'
import { streamValues } from 'stream-json/streamers/StreamValues'

import type { Duplex, Readable, Transform, Writable } from 'stream'

type TransformFunction = (chunk: any, encoding?: string) => any
type Stream = Readable | Writable | Duplex | Transform
type StreamItem = Stream | TransformFunction

export default async function readJSON(file: string) {
  try {
    if (await fs.pathExists(`${file}z`)) {
      const content = await fs.readFile(`${file}z`)
      const unzipped = await unzip(content)
      return JSON.parse(`${unzipped}`)
    }
    return await fs.readJSON(file)
  } catch (error) {
    throw new Error(
      `Error reading File: '${file}'\n${(error as any).message || error}\n${(error as any).stack || ''}`
    )
  }
}

const filters = [
  'totalDamageDist',
  'totalDamageTaken',
  'rotation',
  'states',
  'combatReplayData',
  'damageModMap',
  'damage1S',
  'powerDamage1S',
  'conditionDamage1S',
  'breakbarDamage1S',
  'healthPercents',
  'barrierPercents',
  'targetDamage1S',
  'targetPowerDamage1S',
  'targetConditionDamage1S',
  'targetBreakbarDamage1S',
  'targetDamageDist',
  'statsTargets',
  'damageModifiers',
  'damageModifiersTarget',
  'incomingDamageModifiers',
  'incomingDamageModifiersTarget',
  'buffUptimes',
  'selfBuffs',
  'groupBuffs',
  'offGroupBuffs',
  'squadBuffs',
  'buffUptimesActive',
  'selfBuffsActive',
  'groupBuffsActive',
  'offGroupBuffsActive',
  'squadBuffsActive',
  'deathRecap',
  'consumables',
  'extHealingStats',
  'extBarrierStats',
  'activeCombatMinions',
  'conditionsStates',
  'boonsStates',
  'minions',
  'activeClones',
  'personalDamageMods',
  'personalBuffs',
  'buffs',
  'skillMap',
  'mechanicsData',
  'buffMap',
  'runningExtension',
  'mechanics',
  'defenses'
]

/*function showTypeWithLength(value: any) {
  const type = typeof value
  if (type === 'string') {
    return type + ' [' + value.length + ']'
  }

  if (type === 'object') {
    if (Array.isArray(value)) {
      return 'array<' + showTypeWithLength(value[0]) + '>[' + value.length + ']'
    }
    return (
      type +
      ' {' +
      Object.entries(value)
        .map(([key, value]) => `${key}: ${showTypeWithLength(value)}`)
        .join(', ') +
      '}'
    )
  }

  return type
}*/

export type LogJsonDpsTarget = {
  dps: number
  damage: number
  condiDps: number
  condiDamage: number
  powerDps: number
  powerDamage: number
  breakbarDamage: number
  actorDps: number
  actorDamage: number
  actorCondiDps: number
  actorCondiDamage: number
  actorPowerDps: number
  actorPowerDamage: number
  actorBreakbarDamage: number
}

export type LogJsonSupport = {
  resurrects: number
  resurrectTime: number
  condiCleanse: number
  condiCleanseTime: number
  condiCleanseSelf: number
  condiCleanseTimeSelf: number
  boonStrips: number
  boonStripsTime: number
}

export type LogJsonDpsAll = {
  dps: number
  damage: number
  condiDps: number
  condiDamage: number
  powerDps: number
  powerDamage: number
  breakbarDamage: number
  actorDps: number
  actorDamage: number
  actorCondiDps: number
  actorCondiDamage: number
  actorPowerDps: number
  actorPowerDamage: number
  actorBreakbarDamage: number
}

export type LogJsonStatsAll = {
  wasted: number
  timeWasted: number
  saved: number
  timeSaved: number
  stackDist: number
  distToCom: number
  avgBoons: number
  avgActiveBoons: number
  avgConditions: number
  avgActiveConditions: number
  swapCount: number
  skillCastUptime: number
  skillCastUptimeNoAA: number
  totalDamageCount: number
  totalDmg: number
  directDamageCount: number
  directDmg: number
  connectedDirectDamageCount: number
  connectedDirectDmg: number
  connectedDamageCount: number
  connectedDmg: number
  critableDirectDamageCount: number
  criticalRate: number
  criticalDmg: number
  flankingRate: number
  againstMovingRate: number
  glanceRate: number
  missed: number
  evaded: number
  blocked: number
  interrupts: number
  invulned: number
  killed: number
  downed: number
  downContribution: number
  connectedPowerCount: number
  connectedPowerAbove90HPCount: number
  connectedConditionCount: number
  connectedConditionAbove90HPCount: number
  againstDownedCount: number
  againstDownedDamage: number
}

export type LogJsonDataPlayer = {
  account: string
  group: number
  hasCommanderTag: boolean
  profession: string
  friendlyNPC: boolean
  notInSquad: boolean
  guildID: string
  weapons: string[]
  dpsTargets: LogJsonDpsTarget[][]
  support: LogJsonSupport[]
  activeTimes: number[]
  name: string
  totalHealth: number
  condition: number
  concentration: number
  healing: number
  toughness: number
  hitboxHeight: number
  hitboxWidth: number
  instanceID: number
  teamID: number
  isFake: boolean
  dpsAll: LogJsonDpsAll[]

  statsAll: LogJsonStatsAll[]
}

export type LogJsonDataTarget = {
  id: number
  finalHealth: number
  healthPercentBurned: number
  firstAware: number
  lastAware: number
  enemyPlayer: boolean
  breakbarPercents: number[][]
  name: string
  totalHealth: number
  condition: number
  concentration: number
  healing: number
  toughness: number
  hitboxHeight: number
  hitboxWidth: number
  instanceID: number
  teamID: number
  isFake: boolean
  dpsAll: LogJsonDpsAll[]
  statsAll: LogJsonStatsAll[]
}

export type LogJsonDataPhase = {
  start: number
  end: number
  name: 'Final Number'
  targets: number[]
  secondaryTargets: number[]
  subPhases: number[]
  breakbarPhase: boolean
}

export type LogJsonData = {
  eliteInsightsVersion: string
  triggerID: number
  eiEncounterID: number
  fightName: string
  fightIcon?: string
  arcVersion: string
  gW2Build: number
  language: string
  fractalScale: number
  languageID: number
  recordedBy: string
  recordedAccountBy: string
  timeStart: string
  timeEnd: string
  timeStartStd: string
  timeEndStd: string
  duration: string
  durationMS: number
  logStartOffset: number
  success: boolean
  isCM: boolean
  isLateStart: boolean
  missingPreEvent: boolean
  anonymous: boolean
  detailedWvW: boolean
  targets: LogJsonDataTarget[]
  players: LogJsonDataPlayer[]
  phases: LogJsonDataPhase[]
  uploadLinks: string[]
  logErrors: string[]
  usedExtensions?: {
    name: string
    version: string
    revision: number
    signature: number
  }[]
  combatReplayMetaData: {
    inchToPixel: number
    pollingRate: number
    sizes: [number, number]
    maps: {
      url: string
      interval: [number, number]
    }[]
  }
}

export async function readLogJsonFiltered(file: string): Promise<LogJsonData> {
  let filePath = file
  if (filePath.endsWith('.json') && (await fs.pathExists(`${filePath}z`))) {
    filePath = `${file}z`
  } else if (!(await fs.pathExists(file))) {
    throw new Error(`File not found: ${file}`)
  }

  const chainSteps: StreamItem[] = [fs.createReadStream(filePath)]
  if (filePath.endsWith('.jsonz')) {
    chainSteps.push(zlib.createUnzip())
  }
  chainSteps.push(parser())
  chainSteps.push(
    ignore({
      filter(val: ReadonlyArray<number | string | null>) {
        if (val.length === 0) {
          return false
        }
        if (filters.find((filter) => val.includes(filter))) {
          return true
        }
        return false
      }
    })
  )
  chainSteps.push(streamValues())
  return new Promise((resolve, reject) => {
    const pipeline = chain(chainSteps)
    let data: Partial<LogJsonData> = {}
    pipeline.on('data', (foundData: { value: LogJsonData }) => {
      data = foundData.value
      //console.log('data foundData "' + foundData.key + '": ' + showTypeWithLength(foundData.value))
      //console.log('data foundData "' + foundData.key + '": ' + showTypeWithLength(foundData.value))
    })
    pipeline.on('end', () => {
      //console.log('end')
      // console.log('Result', showTypeWithLength(data))
      //console.log('Result', data)
      //fs.outputJSON('debug.json', data, { spaces: 2 }).catch(console.error)
      resolve(data as LogJsonData)
    })
    pipeline.on('error', (error) => {
      reject(error)
    })
  })
}
