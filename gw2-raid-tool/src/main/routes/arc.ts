import path from 'path'
import fs from 'fs-extra'
import urllib from 'urllib'
import zlib from 'zlib'
import { promisify } from 'util'
const zip = promisify(zlib.deflate)
const unzip = promisify(zlib.unzip)

import adjustArcHtml from '../util/adjust-arc-html'
import fightIconMap from '../../info/fight-icon-map'
import hashLog from '../hash-log'

import wings from '../../info/wings'
import {
  KnownNedbDocument,
  LogFilter,
  LogStats,
  NedbDocumentLogs,
  ServerRouteHandler,
  TODO
} from '../../raid-tool'
import { app, net, protocol } from 'electron'
import { pathToFileURL } from 'url'

import type { fileTypeFromBuffer as FileTypeFromBuffer } from 'file-type'
import FastGlob from 'fast-glob'
import ErrorWithStack from '../error-with-stack'

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

const logsUploading = {}

function ensureArray(fightName) {
  if (Array.isArray(fightName)) {
    return fightName
  }
  return [fightName]
}

function structuredClonePolyfill(data) {
  //structuredClone will be there with nodejs 17.X
  return JSON.parse(JSON.stringify(data))
}

function enhanceLogs(logs) {
  const copyLogs = structuredClonePolyfill(logs.filter((l) => l))

  let fightName = null
  let recordedByName = null
  let collapseNumber = 1
  for (const log of copyLogs) {
    if (logsUploading[log.hash]) {
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

const kittyGolemTriggerIds = [16199, 19645, 19676]

async function paginatedLogs(ctx, db, query) {
  const page = parseInt(ctx.query.p, 10) || 0
  const maxPages = Math.ceil((await db.logs.count(query)) / 50)
  const logs = await db.logs
    .find(query)
    .sort({ timeEndMs: -1 })
    .skip(page * 50)
    .limit(50)

  const stats = {
    kills: await db.logs.count({
      $and: [
        query,
        {
          triggerID: { $nin: kittyGolemTriggerIds },
          success: true
        }
      ]
    }),
    cmKills: await db.logs.count({
      $and: [
        query,
        {
          triggerID: { $nin: kittyGolemTriggerIds },
          success: true,
          isCM: true
        }
      ]
    }),
    fails: await db.logs.count({
      $and: [
        query,
        {
          triggerID: { $nin: kittyGolemTriggerIds },
          success: { $ne: true }
        }
      ]
    })
  }
  return {
    logs: enhanceLogs(logs),
    maxPages,
    page,
    stats
  }
}

export default (async ({ db, baseConfig, backendConfig, eventHub }) => {
  const emptyLogFilter = await hashLog(JSON.stringify({}))

  let lastLog = emptyLogFilter
  let lastFriendsLog = emptyLogFilter
  let nextTick

  const logFilters: LogFilter = {
    p: 0,
    config: {}
  }

  eventHub.on('logFilter', async (data) => {
    //console.log('logFilter changed', data)
    clearTimeout(nextTick)
    logFilters.p = data.p || 0
    logFilters.config = data.config || {}
    lastLog = emptyLogFilter
    nextTick = setTimeout(updateLogs, 1)
  })
  eventHub.on('friendsFilter', async (/*data*/) => {
    //console.log("friendsFilter changed", data);
    clearTimeout(nextTick)
    lastFriendsLog = emptyLogFilter
    nextTick = setTimeout(updateLogs, 1)
  })

  async function updateLogs() {
    try {
      //console.log('updateLogs...')
      let stats = {} as LogStats
      const conf = {} as TODO
      if (logFilters.config.bossId) {
        const bossId = parseInt(decodeURIComponent(logFilters.config.bossId), 10)

        if (Number.isInteger(bossId)) {
          let bossInfo = wings
            .map((ws) => ws.steps)
            .flat()
            .find((s) => ensureArray(s.triggerID).includes(bossId)) as TODO

          if (!bossInfo) {
            bossInfo = { triggerID: bossId }
          }

          conf.triggerID = { $in: ensureArray(bossInfo.triggerID) }
          const bossIcon = fightIconMap[ensureArray(bossInfo.triggerID)[0]]
          stats = {
            ...stats,
            bossIcon,
            bossInfo
          }
        }
      }
      if (logFilters.config.friend) {
        const account = decodeURIComponent(logFilters.config.friend)
        let friend = await db.friends.findOne({ account })
        conf.players = { $elemMatch: account }
        stats = { ...stats, friend }
      }
      if (logFilters.config.cmOnly) {
        conf.isCM = true
        stats = { ...stats, cmOnly: true }
      }

      const {
        page,
        maxPages,
        logs,
        stats: readStats
      } = await paginatedLogs({ query: { p: logFilters.p } }, db, conf)

      if (logFilters.config.friend) {
        const account = decodeURIComponent(logFilters.config.friend)
        let friend = await db.friends.findOne({ account })
        if (!friend && logs.length > 0) {
          friend = await db.friends.insert({
            account,
            chars: [],
            sharedLogs: 0
          })
          stats = { ...stats, friend }
        }
      }

      if (stats) {
        stats = {
          ...stats,
          ...readStats
        }
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
      }
      const newLog = await hashLog(
        JSON.stringify({
          page,
          maxPages,
          logs: logs.map((l) => l.hash),
          stats
        })
      )
      if (lastLog !== newLog) {
        /*console.log("Log changed", {
        lastLog,
        newLog
      });*/
        eventHub.emit('logs', {
          page,
          maxPages,
          logs,
          stats
        })
        lastLog = newLog
      }

      const friends = await db.friends.find({ sharedLogs: { $gte: 10 } }).sort({ sharedLogs: -1 })

      const newFriendsLog = await hashLog(JSON.stringify({ friends }))
      if (lastFriendsLog !== newFriendsLog) {
        //console.log("newFriendsLog changed");
        eventHub.emit('friends', { friends })
        lastFriendsLog = newFriendsLog
      }
    } catch (error) {
      console.error(error)
    }

    nextTick = setTimeout(updateLogs, 500)
  }

  nextTick = setTimeout(updateLogs, 1)

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
      }

      //console.log('gw2-log', { host, pathname, searchParams })
      return new Response('', { status: 404, statusText: 'Not Found' })
    })
  })

  async function uploadLog(log: KnownNedbDocument<NedbDocumentLogs>) {
    if (log && log.entry && !log.permalink) {
      logsUploading[log.hash] = true
      log.permalinkFailed = false
      await db.logs.update({ _id: log._id }, { $set: { permalinkFailed: log.permalinkFailed } })
      clearTimeout(nextTick)
      lastLog = emptyLogFilter
      nextTick = setTimeout(updateLogs, 1)
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
        delete logsUploading[log.hash]
        clearTimeout(nextTick)
        lastLog = emptyLogFilter
        nextTick = setTimeout(updateLogs, 1)
      } catch (error) {
        console.error(error)
        log.permalinkFailed = true
        delete logsUploading[log.hash]
        await db.logs.update({ _id: log._id }, { $set: { permalinkFailed: log.permalinkFailed } })
        clearTimeout(nextTick)
        lastLog = emptyLogFilter
        nextTick = setTimeout(updateLogs, 1)
      }
    }
  }

  eventHub.on('uploadLog', async ({ hash }) => {
    //console.log(`starting upload: ${hash}`);
    const log = await db.logs.findOne({ hash })
    uploadLog(log)
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
