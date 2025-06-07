import fs from 'fs-extra'
import path from 'path'

import { db } from './main-proxy'
import { LogJsonData, readLogJsonFiltered } from './read-json'
import { DateTime } from 'luxon'
import hashLog from '../hash-log'
import fightIconMapSrc from '../../info/fight-icon-map'
import ErrorWithStack from '../error-with-stack'
import { LogEntryRef } from '../../raid-tool'

const fightIconMap: { [key: number]: string } = fightIconMapSrc

export default async function assignLog(logsPath: string, htmlFile: string, entry: LogEntryRef) {
  const known = await db.logs.findOne({ htmlFile })
  if (known) {
    await db.logs.update({ _id: known._id }, { $set: { entry } })
    //console.log(known);
    return
  }
  const logFile = htmlFile.replace(/\.html$/, '.json')
  let json: LogJsonData | null = null
  try {
    //console.log(`read log: ${logFile}`)
    json = await readLogJsonFiltered(logFile)
    //console.log(`read log done: ${logFile}`)
  } catch (error) {
    console.error(new ErrorWithStack(error))
    let htmlStats: fs.Stats | null = null
    if (await fs.pathExists(`${htmlFile}z`)) {
      htmlStats = await fs.stat(`${htmlFile}z`)
    } else if (await fs.pathExists(htmlFile)) {
      htmlStats = await fs.stat(htmlFile)
    }
    if (!htmlStats || htmlStats.size <= 8) {
      await removeBrokenFiles(logsPath, htmlFile, entry, logFile)
    } else if (
      !(await fs.pathExists(`${htmlFile}-backup`)) ||
      !(await fs.pathExists(`${htmlFile}z-backup`))
    ) {
      await backupFile(htmlFile)
      await backupFile(`${htmlFile}z`)
      await backupFile(logFile)
      await backupFile(`${logFile}z`)
    }
    console.warn('could not read log')
    return
  }

  if (!json) {
    //console.log(`No JSON data found for: ${logFile}`)
    return
  }

  try {
    //console.log(`insert log: ${htmlFile}`)
    await db.logs.insert({
      hash: await hashLog(htmlFile),
      htmlFile,
      fightIcon:
        fightIconMap[json.triggerID] ||
        (json.fightIcon &&
          json.fightIcon.startsWith('https://wiki.guildwars2.com/images/') &&
          json.fightIcon) ||
        '',
      eliteInsightsVersion: json.eliteInsightsVersion,
      eiEncounterID: json.eiEncounterID,
      triggerID: json.triggerID,
      fightName: json.fightName,
      arcVersion: json.arcVersion,
      gW2Build: json.gW2Build,
      language: json.language,
      languageID: json.languageID,
      recordedBy: json.recordedBy,
      timeStart: json.timeStartStd,
      timeEnd: json.timeEndStd,
      timeEndMs: json.timeEndStd
        ? DateTime.fromFormat(json.timeEndStd, 'yyyy-MM-dd HH:mm:ss ZZ').toMillis()
        : 0,
      duration: json.duration,
      success: json.success,
      isCM: json.isCM,
      entry,
      players: json.players.map((p) => p.account)
    })
    //console.log(`Log inserted: ${htmlFile}`)
  } catch (error) {
    console.warn(error)
    const known = await db.logs.findOne({ htmlFile })
    if (known) {
      await db.logs.update({ _id: known._id }, { $set: { entry } })
      //console.log(known)
      return
    }
  }
}

async function removeBrokenFiles(
  logsPath: string,
  htmlFile: string,
  entry: LogEntryRef,
  logFile: string
) {
  await removeFileIfExists(path.join(logsPath, entry))
  await removeFileIfExists(htmlFile)
  await removeFileIfExists(`${htmlFile}z`)
  await removeFileIfExists(logFile)
  await removeFileIfExists(`${logFile}z`)
  console.warn(`Removed broken: ${entry}`)
}

async function removeFileIfExists(file: string) {
  if (await fs.pathExists(file)) {
    await fs.remove(file)
  }
}

async function backupFile(file: string) {
  if (await fs.pathExists(file)) {
    await fs.move(file, `${file}-backup`)
  }
}
