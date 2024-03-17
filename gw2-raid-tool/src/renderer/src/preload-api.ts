import { ElectronAPI } from '@electron-toolkit/preload'
import {
  BaseConfig,
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
  WingsRes
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

export const api = window.api
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

export function selectLog(log, event?: Event) {
  preventDefault(event)
  if (log) {
    data.activeLog = log.hash
  } else {
    data.activeLog = null
    data.logIsLoading = null
  }
}

function uploadLog(logHash: string) {
  api.uploadLog({ hash: logHash })
}

function showFriendsPage(event?: Event) {
  preventDefault(event)
  const friendsFilter = {}
  api.friendsFilter(friendsFilter)
}

function showLogPage(page: number, filters, event?) {
  preventDefault(event)
  data.logFilters.p = page
  if (typeof filters === 'object' && filters) {
    data.logFilters.config = filters
  }
  const logFilter = { ...data.logFilters }

  api.logFilter(logFilter)
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

export const i18n = new Proxy(
  {},
  {
    get(_target, p) {
      return i18nLoader[data.baseConfig.lang][p]
    }
  }
) as BaseTranslationFile

api.ipc.onLoading((val) => {
  data.loading.status = val.status
  data.loading.step = val.step
})
api.ipc.onBaseConfig(({ baseConfig }) => {
  //console.log({ baseConfig })
  data.baseConfig = baseConfig
})
api.ipc.onAccounts(({ accounts }) => {
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
api.ipc.onLogs(({ logs, page, maxPages, stats }) => {
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
api.ipc.onSelectPage(({ page, info }) => {
  selectPage(page, info)
})
api.ipc.onFriends(({ friends }) => {
  //console.log({ friends })
  data.friends = friends
})
api.ipc.onKeyRules(({ keyRules }) => {
  //console.log({ keyRules })
  data.keyRules = keyRules
})

api.ipc.onProgressConfig(({ progressConfig }) => {
  console.log({ progressConfig })
  data.progressConfig = progressConfig
})
api.ipc.onMumbleLinkActive(({ mumbleLinkActive }) => {
  data.mumbleLinkActive = mumbleLinkActive
})
