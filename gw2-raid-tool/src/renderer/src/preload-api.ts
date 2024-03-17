import { ElectronAPI } from '@electron-toolkit/preload'
import {
  BaseConfig,
  ExposedIpc,
  InitStatusStatusCode,
  Lang,
  LogFilter,
  LogStats,
  MumbleLinkData,
  PageId,
  PageInfo,
  PreloadApi,
  ProgressConfig,
  TotalKps,
  UiAccounts,
  UiBlockedKeyRules,
  UiFriends,
  UiLogs,
  WingsRes,
  exposedListeners,
  exposedSenders
} from '../../raid-tool'
import { reactive } from 'vue'

import i18nLoader from '../../i18n/i18n-loader'
import { BaseTranslationFile } from 'src/i18n/type'
import { DateTime } from 'luxon'
import wingsBase from '../../info/wings'
import uniqueSpecsSrc from '../../info/unique-specs.json'
import { preventDefault } from './util'

import pkg from '../../../package.json'

const colors = [
  '#77ff77',
  '#ffe66d',
  '#83b2ff',
  '#ff8650',
  '#9b6ef3',
  '#ff555e',
  '#82ffe8',
  '#ff54e5',
  '#BBE5A7',
  '#F7D79F',
  '#C1C5E7',
  '#F6A78F',
  '#C8A1DC',
  '#F69295',
  '#BFE6DC',
  '#F68FD2'
]

export const uniqueSpecs = uniqueSpecsSrc as string[]

export interface CustomWindow extends Window {
  api: PreloadApi
  electron: ElectronAPI
}
declare let window: CustomWindow

const ipc = { on: {}, send: {} } as ExposedIpc

for (const channel of exposedListeners) {
  ipc.on[channel] = window.api.ipc.on[channel] as any
}

for (const channel of exposedSenders) {
  ipc.send[channel] = (data: any) => {
    window.api.ipc.send[channel](JSON.parse(JSON.stringify(data))) as any
  }
}

export const api = { ...window.api, ipc } as PreloadApi

export const data = reactive({
  page: 'overview' as PageId,
  logsPage: 0 as number,
  logsMaxPages: 0 as number,
  pageConfig: {} as PageInfo,
  stats: {} as LogStats,
  activeLog: null as null | string,
  loading: { status: InitStatusStatusCode.Starting, step: '' },
  baseConfig: {} as BaseConfig,
  progressConfig: {} as ProgressConfig,
  accounts: [] as UiAccounts[],
  logs: [] as UiLogs[],
  friends: [] as UiFriends[],
  mumbleLinkActive: null as MumbleLinkData | null,
  logFilters: {} as LogFilter,
  dayOfYear: DateTime.utc().ordinal,
  totalKps: {} as TotalKps,
  zhaitaffy: false,
  token: '' as string,
  confirmReset: '' as string,
  lang: 'de' as Lang,
  langs: i18nLoader.langs,
  deps: Object.keys(pkg.dependencies),
  keyRules: [] as UiBlockedKeyRules[],
  currenttime: Date.now(),
  logIsLoading: null as null | string
})

export const wings = reactive(wingsBase as WingsRes)

export function selectLog(log: UiLogs, event?: Event) {
  preventDefault(event)
  if (log) {
    data.activeLog = log.hash
  } else {
    data.activeLog = null
    data.logIsLoading = null
  }
}

function uploadLog(logHash: string) {
  api.ipc.send.uploadLog({ hash: logHash })
}

function showFriendsPage(event?: Event) {
  preventDefault(event)
  const friendsFilter = {}
  api.ipc.send.friendsFilter(friendsFilter)
}

function showLogPage(page: number, filters: LogFilter['config'], event?: Event) {
  preventDefault(event)
  data.logFilters.p = page
  if (typeof filters === 'object' && filters) {
    data.logFilters.config = filters
  }
  const logFilter = { ...data.logFilters }

  api.ipc.send.logFilter(logFilter)
}

export function selectPage(page: PageId, info: PageInfo, event?: Event) {
  preventDefault(event)
  if (data.page !== page) {
    data.logIsLoading = null
  }
  if (page === 'logs' && info && info.id && info.action === 'upload') {
    uploadLog(info.id)
    return
  } else if (page === 'logs') {
    const log = info && data.logs.find((l) => l.hash === info.id)
    if (log) {
      selectLog(log, event)
      return
    }
  }

  data.page = page
  data.pageConfig = info

  /*console.log({
        page,
        info
      });*/
  if (page === 'logs') {
    showLogPage(0, {})
  } else if (page === 'friends') {
    const friend = data.pageConfig && data.pageConfig.id
    if (friend) {
      data.page = 'friend'
      showLogPage(0, { friend })
    } else {
      showFriendsPage()
    }
  } else if (page === 'boss') {
    showLogPage(0, { bossId: data.pageConfig && data.pageConfig.id })
  }
}

setInterval(() => {
  const now = DateTime.utc()
  data.dayOfYear = now.ordinal
  data.currenttime = now.toMillis()
}, 100)

export const i18n = new Proxy({} as any, {
  get(_target, p: keyof BaseTranslationFile) {
    return i18nLoader[data.baseConfig.lang][p]
  }
}) as BaseTranslationFile

api.ipc.on.loading((val) => {
  data.loading.status = val.status
  data.loading.step = val.step
})
api.ipc.on.baseConfig(({ baseConfig }) => {
  //console.log({ baseConfig })
  data.baseConfig = baseConfig
})
api.ipc.on.accounts(({ accounts }) => {
  //console.log({ accounts })
  data.accounts = accounts.map((a: UiAccounts, index) => {
    a.color = colors[index % colors.length]
    return a
  })
  const totalKps: TotalKps = {
    li: 0,
    fractal: 0,
    boneSkinner: 0,
    zhaitaffy: 0,
    raidBossKp: {},
    unopenedBoxes: []
  }
  for (const acc of data.accounts) {
    if (!acc.kps) {
      continue
    }

    totalKps.li += acc.kps.li || 0
    totalKps.fractal += acc.kps.fractal || 0
    totalKps.boneSkinner += acc.kps.boneSkinner || 0
    totalKps.zhaitaffy += acc.kps.zhaitaffy || 0
    if (acc.kps.raidBossKp) {
      for (const [key, value] of Object.entries(acc.kps.raidBossKp)) {
        totalKps.raidBossKp[key] = (totalKps.raidBossKp[key] || 0) + (value || 0)
      }
    }
    if (acc.kps.unopenedBoxes) {
      for (const box of acc.kps.unopenedBoxes) {
        totalKps.unopenedBoxes.push(box)
      }
    }
  }
  data.totalKps = totalKps
})
api.ipc.on.logs(({ logs, page, maxPages, stats }) => {
  //console.log('onLogs', { logs, page, maxPages, stats })
  data.logs = logs
  data.logsPage = page
  data.logsMaxPages = maxPages
  data.stats = stats
  if (!data.logs.find((l) => l.hash === data.activeLog)) {
    data.activeLog = null
    data.logIsLoading = null
  }
  if (!data.activeLog && data.logs[0]) {
    selectLog(data.logs[0])
  }
})
api.ipc.on.selectPage(({ page, info }) => {
  selectPage(page, info)
})
api.ipc.on.friends(({ friends }) => {
  //console.log({ friends })
  data.friends = friends
})
api.ipc.on.keyRules(({ keyRules }) => {
  //console.log({ keyRules })
  data.keyRules = keyRules
})

api.ipc.on.progressConfig(({ progressConfig }) => {
  console.log({ progressConfig })
  data.progressConfig = progressConfig
})
api.ipc.on.mumbleLinkActive(({ mumbleLinkActive }) => {
  data.mumbleLinkActive = mumbleLinkActive
})
