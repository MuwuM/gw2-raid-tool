import path from 'path'
import fs from 'fs-extra'
import fg from 'fast-glob'
import chokidar from 'chokidar'

import fightIconMap from '../info/fight-icon-map'

import { db, baseConfig, progressConfig } from './arc-interface/main-proxy'
import arcFileHandlerInit from './arc-interface/arc-file-handler'

//
;(async () => {
  const logsPath = await baseConfig.logsPath
  for (const [triggerID, fightIcon] of Object.entries(fightIconMap)) {
    await db.logs.update(
      {
        triggerID: parseInt(triggerID, 10),
        fightIcon: { $ne: fightIcon }
      },
      { $set: { fightIcon } },
      { multi: true }
    )
  }

  const counter = {
    i: 0,
    j: 0,
    k: 0,
    l: 0,
    chokidarReady: false
  }

  const arcFileHandler = arcFileHandlerInit(logsPath, counter)

  const start = Date.now()
  const watcher = chokidar.watch(
    ['**/*.?(z)evtc', '**/*.json', '**/*.html', '*.?(z)evtc', '*.json', '*.html'],
    {
      cwd: logsPath,
      ignoreInitial: false,
      awaitWriteFinish: true,
      ignored: ['.raid-tool/**']
    }
  )
  watcher.on('add', async (chokPath) => {
    const entry = chokPath.replace(/\\/g, '/')
    if (entry.match(/\.z?evtc$/)) {
      arcFileHandler.emit('log', entry)
    } else if (entry.match(/\.(json|html)$/)) {
      arcFileHandler.emit('compress', entry)
    }
  })

  watcher.on('ready', () => {
    counter.chokidarReady = true
    if (counter.i === counter.j && counter.chokidarReady) {
      counter.i = 0
      counter.j = 0
    }
    progressConfig.parsingLogs = counter.i
    progressConfig.parsedLogs = counter.j
    if (counter.k === counter.l && counter.chokidarReady) {
      counter.k = 0
      counter.l = 0
    }
    progressConfig.compressingLogs = counter.k
    progressConfig.compressedLogs = counter.l
    const end = Date.now()
    console.info(`All events added. in ${(end - start) / 1000} sec`)
  })

  const brokenFiles = await fg(['**/*.zevtc-broken', '**/*.evtc-broken'], {
    dot: true,
    cwd: logsPath
  })
  for (const brokenFile of brokenFiles) {
    console.info(`restore: ${brokenFile}`)
    await fs.move(
      path.join(logsPath, brokenFile),
      path.join(logsPath, brokenFile.replace(/-broken$/, ''))
    )
  }
})().catch((err) => {
  console.error(err)
})
