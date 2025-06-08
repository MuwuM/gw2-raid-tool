import path from 'path'
import fs from 'fs-extra'
import urllib from 'urllib'
import zlib from 'zlib'
import { promisify } from 'util'
const zip = promisify(zlib.deflate)
const unzip = promisify(zlib.unzip)

import adjustArcHtml from '../util/adjust-arc-html'
import fightIconMapSrc from '../../info/fight-icon-map'
const fightIconMap = fightIconMapSrc as Record<number, string>

import wings, { kittyGolemTriggerIds } from '../../info/wings'
import {
  KnownNedbDocument,
  LogFilter,
  LogStats,
  NedbDatabaseQuery,
  NedbDocumentLogs,
  ServerRouteHandler,
  UiLogs,
  WingsResStep
} from '../../raid-tool'
import { app, net, protocol } from 'electron'
import { pathToFileURL } from 'url'

import type { fileTypeFromBuffer as FileTypeFromBuffer } from 'file-type'
import FastGlob from 'fast-glob'
import ErrorWithStack from '../error-with-stack'
import ensureArray from '../ensure-array'
import { computed, reactive, toRaw, watchSyncEffect } from 'vue'

let _fileTypeFromBuffer: typeof FileTypeFromBuffer | undefined
const fileTypeFromBuffer = async (buffer: Uint8Array | ArrayBuffer) => {
  if (!_fileTypeFromBuffer) {
    _fileTypeFromBuffer = (await import('file-type')).fileTypeFromBuffer
  }
  return _fileTypeFromBuffer(buffer)
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'gw2-log',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true
    }
  }
])

const logData = reactive({
  logsUploading: {} as Record<string, boolean>,
  maxPages: 0 as number,
  logFilters: {
    p: 0,
    config: {}
  } as LogFilter,
  logChange: 0 as number,
  friendsChange: 0 as number
})

function enhanceLogs(logs: NedbDocumentLogs[]) {
  const copyLogs = structuredClone(logs.filter((l) => l)) as UiLogs[]

  let fightName: string | null = null
  let recordedByName: string | null = null
  let collapseNumber = 1
  for (const log of copyLogs) {
    if (logData.logsUploading[log.hash]) {
      log.isUploading = true
    }
    const cleanFightName = (log.fightName || '').replace(/\s+/g, '')
    if (cleanFightName === fightName) {
      collapseNumber += 1
      log.displayCollapse = collapseNumber
      if (recordedByName === log.recordedBy) {
        log.displayNameCollapse = false
      } else {
        log.displayNameCollapse = true
      }
      recordedByName = log.recordedBy
    } else {
      collapseNumber = 1
      recordedByName = log.recordedBy
      log.displayNameCollapse = true
    }
    fightName = cleanFightName
  }
  return copyLogs
}

export default (async ({ db, baseConfig, backendConfig, eventHub }) => {
  db.logs.on('update', async () => {
    const maxPages = Math.ceil((await db.logs.count({})) / 50)
    logData.logChange += 1
    logData.maxPages = maxPages
  })
  db.logs.on('insert', async () => {
    const maxPages = Math.ceil((await db.logs.count({})) / 50)
    logData.logChange += 1
    logData.maxPages = maxPages
  })
  db.friends.on('update', async () => {
    logData.friendsChange += 1
  })
  db.friends.on('insert', async () => {
    logData.friendsChange += 1
  })

  eventHub.on('logFilter', async (data) => {
    logData.logFilters.p = data.p || 0
    logData.logFilters.config = data.config || {}
  })
  eventHub.on('friendsFilter', async () => {
    logData.friendsChange += 1
  })

  function findBossInfoFromTriggerId(triggerId: number) {
    for (const wing of wings) {
      for (const step of wing.steps) {
        if (ensureArray(step.triggerID).includes(triggerId)) {
          return step
        }
      }
    }
    return null
  }

  const activeBossInfo = computed(() => {
    if (logData.logFilters.config.bossId) {
      const bossId = parseInt(decodeURIComponent(logData.logFilters.config.bossId), 10)

      if (Number.isInteger(bossId)) {
        let bossInfo = findBossInfoFromTriggerId(bossId)

        if (!bossInfo) {
          bossInfo = { triggerID: bossId } as WingsResStep
        }
        return bossInfo
      }
    }
    return null
  })

  const activePlayerAccount = computed(() => {
    if (logData.logFilters.config.friend) {
      return decodeURIComponent(logData.logFilters.config.friend)
    }
    return null
  })

  const activeQueryConfig = computed(() => {
    const query = {} as NedbDatabaseQuery<NedbDocumentLogs>

    if (activeBossInfo.value) {
      query.triggerID = { $in: ensureArray(activeBossInfo.value.triggerID) }
    }

    if (activePlayerAccount.value) {
      query.players = { $elemMatch: activePlayerAccount.value }
    }

    if (logData.logFilters.config.cmOnly) {
      query.isCM = true
    }

    if (logData.logFilters.config.favOnly) {
      query.favourite = true
    }

    return query
  })

  const baseStats = computed(() => {
    if (logData.logChange < 0) {
      return Promise.resolve({
        kills: 0,
        cmKills: 0,
        fails: 0
      }) // required to effectively update the logs when db.logs is updated
    }

    const killsQuery = {
      $and: [
        activeQueryConfig.value,
        {
          triggerID: { $nin: kittyGolemTriggerIds },
          success: true
        }
      ]
    }

    const cmKillsQuery = {
      $and: [
        activeQueryConfig.value,
        {
          triggerID: { $nin: kittyGolemTriggerIds },
          success: true,
          isCM: true
        }
      ]
    }

    const failsQuery = {
      $and: [
        activeQueryConfig.value,
        {
          triggerID: { $nin: kittyGolemTriggerIds },
          success: { $ne: true }
        }
      ]
    }

    return (async () => {
      return {
        kills: await db.logs.count(killsQuery),
        cmKills: await db.logs.count(cmKillsQuery),
        fails: await db.logs.count(failsQuery)
      }
    })()
  })

  const additionalStats = computed(() => {
    const stats = {} as LogStats
    const bossInfo = activeBossInfo.value
    if (bossInfo !== null) {
      const bossIcon = fightIconMap[ensureArray(bossInfo.triggerID)[0]]
      stats.bossIcon = bossIcon
      stats.bossInfo = bossInfo
    }
    if (logData.logFilters.config.cmOnly) {
      stats.cmOnly = true
    }
    if (logData.logFilters.config.favOnly) {
      stats.favOnly = true
    }
    return stats
  })

  const activeFriendInfo = computed(() => {
    if (logData.friendsChange < 0) {
      return Promise.resolve(null) // required to effectively update the logs when db.logs is updated
    }
    if (!activePlayerAccount.value) {
      return Promise.resolve(null)
    }

    const friendQuery = { account: activePlayerAccount.value }

    return (async () => {
      const res = await db.friends.findOne(friendQuery)
      return res
    })()
  })

  watchSyncEffect(async () => {
    if (logData.logChange < 0) {
      return // required to effectively update the logs when db.logs is updated
    }

    const query = activeQueryConfig.value
    const plainLogs = await db.logs
      .find(query)
      .sort({ timeEndMs: -1 })
      .skip(logData.logFilters.p * 50)
      .limit(50)

    const logs = enhanceLogs(plainLogs)

    const stats = {
      ...additionalStats.value,
      ...(await baseStats.value)
    } as LogStats

    if (stats.bossInfo && !stats.bossInfo.name_en) {
      stats.bossInfo.name_en =
        (logs?.[0]?.fightName && logs[0].fightName.replace(/\s+CM\s*$/, '')) || '???'
    }
    if (stats.bossInfo && !stats.bossInfo.name_de) {
      stats.bossInfo.name_de = stats.bossInfo.name_en
    }
    if (stats.bossInfo && !stats.bossInfo.name_fr) {
      stats.bossInfo.name_fr = stats.bossInfo.name_en
    }

    if (activePlayerAccount.value) {
      let friend = await activeFriendInfo.value
      if (!friend && logs.length > 0) {
        friend = await db.friends.insert({
          account: activePlayerAccount.value,
          chars: [],
          sharedLogs: 0
        })
      }
      stats.friend = friend
    }

    eventHub.emit('logs', {
      logs: toRaw(logs),
      page: logData.logFilters.p,
      maxPages: toRaw(logData.maxPages),
      stats
    })
  })

  watchSyncEffect(async () => {
    if (logData.friendsChange < 0) {
      return // required to effectively update the logs when db.logs is updated
    }

    const friends = await db.friends.find({ sharedLogs: { $gte: 10 } }).sort({ sharedLogs: -1 })
    eventHub.emit('friends', {
      friends
    })
  })

  async function respondWithFile(buffer: Buffer) {
    const mime = (await fileTypeFromBuffer(buffer))?.mime || ''
    return new Response(buffer, {
      headers: {
        'content-type': mime,
        'cache-control': `max-age=${(maxage / 1000) | 0},immutable`
      },
      status: 200,
      statusText: 'OK'
    })
  }

  app.whenReady().then(() => {
    protocol.handle('gw2-log', async (req) => {
      const { host, pathname, searchParams } = new URL(req.url)
      if (pathname === '/' || pathname === `/${host}/`) {
        const log = await db.logs.findOne({ hash: host })
        let body = ''
        if (log?.htmlFile) {
          if (searchParams.get('action') === 'upload') {
            uploadLog(log).catch((err) => {
              console.error(new ErrorWithStack(err))
            })
          } else if (searchParams.get('action') === 'favourite') {
            await setFavourite(log, true)
            log.favourite = true
          } else if (searchParams.get('action') === 'unfavourite') {
            await setFavourite(log, false)
            log.favourite = false
          }

          if (await fs.pathExists(`${log.htmlFile}z`)) {
            //const a = Date.now()
            const zippedFile = await fs.readFile(`${log.htmlFile}z`)
            //const b = Date.now()
            //console.log({ name: log.fightName, 'read z': b - a })
            const file = `${await unzip(zippedFile)}`
            //const c = Date.now()
            //console.log({ name: log.fightName, 'read z': b - a, unzip: c - b })
            body = adjustArcHtml(log, file, searchParams)
            //const d = Date.now()
            //console.log({ name: log.fightName, 'read z': b - a, unzip: c - b, adjust: d - c })
          } else {
            const file = `${await fs.readFile(log.htmlFile)}`
            body = adjustArcHtml(log, file, searchParams)
          }
        }
        return new Response(body, {
          headers: {
            'content-type': 'text/html'
          },
          status: 200,
          statusText: 'OK'
        })
      } else if (pathname.startsWith('/ext/bootswatch/bootstrap.min.css')) {
        const defaultPath = require.resolve('bootswatch/dist/darkly/bootstrap.min.css')
        const fileUrl = pathToFileURL(defaultPath).toString()
        return net.fetch(fileUrl)
      } else if (pathname.startsWith('/static/style.css')) {
        const defaultPath = path.join(__dirname, '../renderer/assets')
        const files = await FastGlob('index-*.css', { cwd: defaultPath })
        const fileUrl = pathToFileURL(path.join(defaultPath, files[0])).toString()
        return net.fetch(fileUrl)
      } else if (pathname.startsWith('/imgur/')) {
        const file = pathname.replace(/^\/imgur\//, '')
        const url = await imgFromCacheUrl(['imgur', file], `https://i.imgur.com/${file}`)
        return respondWithFile(url.body)
      } else if (pathname.startsWith('/wikiimg/')) {
        const file = pathname.replace(/^\/wikiimg\//, '').split('/')
        const fileListPlain = file.join('/')
        const fileList = file.map((s) => s.replace(/[^\w._-]+/g, '_')).join('/')
        const url = await imgFromCacheUrl(
          ['wiki', fileList],
          `https://wiki.guildwars2.com/images/${fileListPlain}`
        )
        return respondWithFile(url.body)
      } else if (pathname.startsWith('/gwrenderapi/')) {
        const file = pathname.replace(/^\/gwrenderapi\//, '')
        const url = await imgFromCacheUrl(
          ['gwrenderapi', file],
          `https://render.guildwars2.com/file/${file}`
        )
        return respondWithFile(url.body)
      } else if (pathname.startsWith('/img/bosses/')) {
        const file = pathname.replace(/^\/img\/bosses\//, '')
        const defaultPath = require.resolve('../../resources/img/bosses/' + file)
        const fileUrl = pathToFileURL(defaultPath).toString()
        return net.fetch(fileUrl)
      }

      //console.log('gw2-log', { host, pathname, searchParams })
      return new Response('', { status: 404, statusText: 'Not Found' })
    })
  })

  async function setFavourite(log: KnownNedbDocument<NedbDocumentLogs>, fav: boolean) {
    if (log) {
      log.favourite = fav
      await db.logs.update({ _id: log._id }, { $set: { favourite: log.favourite } })
    }
  }

  async function uploadLog(log: KnownNedbDocument<NedbDocumentLogs>) {
    if (log && log.entry && !log.permalink) {
      logData.logsUploading[log.hash] = true
      log.permalinkFailed = false
      await db.logs.update({ _id: log._id }, { $set: { permalinkFailed: log.permalinkFailed } })
      let evtcPath = path.join(baseConfig.logsPath, log.entry)
      const evtcDonePath = path.join(baseConfig.logsPath, '.raid-tool', log.entry)
      if (await fs.pathExists(evtcDonePath)) {
        evtcPath = evtcDonePath
      }
      try {
        const res = await urllib.request('https://dps.report/uploadContent?json=1&generator=ei', {
          timeout: 240000,
          dataType: 'json',
          method: 'POST',
          files: { file: fs.createReadStream(evtcPath) }
        })
        if (res?.data?.permalink) {
          log.permalink = res.data.permalink
          await db.logs.update({ _id: log._id }, { $set: { permalink: log.permalink } })
        }
        delete logData.logsUploading[log.hash]
      } catch (error) {
        console.error(error)
        log.permalinkFailed = true
        delete logData.logsUploading[log.hash]
        await db.logs.update({ _id: log._id }, { $set: { permalinkFailed: log.permalinkFailed } })
      }
    }
  }

  eventHub.on('uploadLog', async ({ hash }) => {
    const log = await db.logs.findOne({ hash })
    await uploadLog(log)
  })

  eventHub.on('setFavoriteLog', async ({ hash, favorite }) => {
    const log = await db.logs.findOne({ hash })
    await setFavourite(log, favorite)
  })

  const maxage = 31556952000

  async function imgFromCacheUrl(localSub: string[], url: string): Promise<{ body: Buffer }> {
    const localFile = path.join(backendConfig.userDataDir, '.imgcache', ...localSub)
    const ctx = { body: Buffer.alloc(0) as Buffer }
    try {
      if (await fs.pathExists(`${localFile}.z`)) {
        ctx.body = await unzip(await fs.readFile(`${localFile}.z`))
        return ctx
      }
      if (await fs.pathExists(localFile)) {
        ctx.body = await fs.readFile(localFile)
        return ctx
      }
    } catch (error) {
      console.warn(error)
    }
    const imgFile = await urllib.request(url, {
      timeout: 60000,
      followRedirect: true
    })
    await fs.outputFile(`${localFile}.z`, await zip(imgFile.data))
    //console.log("cached: " + `${localFile}.z`);
    ctx.body = imgFile.data
    return ctx
  }
}) as ServerRouteHandler
