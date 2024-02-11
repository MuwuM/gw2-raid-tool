import { ElectronAPI } from '@electron-toolkit/preload'
import {
  BaseConfig,
  InitStatusStatusCode,
  Lang,
  MumbleLinkData,
  PreloadApi,
  ProgressConfig,
  TODO,
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

export const uniqueSpecs = uniqueSpecsSrc

export interface CustomWindow extends Window {
  api: PreloadApi
  electron: ElectronAPI
}
declare let window: CustomWindow

export const api = window.api
export const data = reactive({
  page: 'overview',
  logsPage: 0 as number,
  logsMaxPages: 0 as number,
  pageConfig: {} as TODO,
  stats: null as TODO,
  activeLog: null as null | string,
  loading: { status: InitStatusStatusCode.Starting, step: '' },
  baseConfig: {} as BaseConfig,
  progressConfig: {} as ProgressConfig,
  accounts: [] as TODO[],
  logs: [] as TODO[],
  friends: [] as TODO[],
  mumbleLinkActive: null as MumbleLinkData | null,
  logFilters: {} as TODO,
  dayOfYear: DateTime.utc().ordinal,
  totalKps: {} as TODO,
  zhaitaffy: false,
  token: '' as string,
  confirmReset: '' as string,
  lang: 'de' as Lang,
  langs: i18nLoader.langs,
  deps: Object.keys(pkg.dependencies),
  keyRules: [] as TODO[],
  currenttime: Date.now()
})

export const wings = reactive(wingsBase as WingsRes)

export function selectLog(log, event?) {
  preventDefault(event)
  if (log) {
    data.activeLog = log.hash
  } else {
    data.activeLog = null
  }
}

function uploadLog(logHash: string) {
  api.uploadLog({ hash: logHash })
}

function showFriendsPage(event?) {
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

export function selectPage(page, info, event?) {
  preventDefault(event)
  if (page === 'log' && info && info.id && info.action === 'upload') {
    uploadLog(info.id)
    return
  } else if (page === 'log') {
    const log = info && data.logs.find((l) => l.hash === info.id)
    if (log) {
      selectLog(log, event)
    }
    return
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
  data.accounts = accounts
  const accs = data.accounts.filter((a) => a.kps && a.accountInfo)
  const totalKps = {}
  for (const acc of accs) {
    acc.color = colors[accs.indexOf(acc) % colors.length]
    if (!acc.kps) {
      continue
    }
    for (const [key, value] of Object.entries(acc.kps)) {
      if (typeof value === 'number' || typeof totalKps[key] === 'number') {
        totalKps[key] = (totalKps[key] || 0) + value
      } else if (Array.isArray(value) && (!totalKps[key] || Array.isArray(totalKps[key]))) {
        totalKps[key] = (totalKps[key] || []).concat(value)
      } else if (
        typeof value === 'object' &&
        (!totalKps[key] || typeof totalKps[key] === 'object')
      ) {
        if (!totalKps[key]) {
          totalKps[key] = {}
        }
        for (const [sub, v] of Object.entries(totalKps[key] || {}).concat(
          Object.entries(value as object)
        )) {
          totalKps[key][sub] = (totalKps[key][sub] || 0) + (v || 0)
        }
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
  }
  if (!data.activeLog && data.logs[0]) {
    selectLog(data.logs[0])
  }
})
api.ipc.onSelectPage(({ page, info }) => {
  //console.log('onSelectPage', { page, info })
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
