import path from 'path'
import fs from 'fs-extra'
import fg from 'fast-glob'

import assignLog from './assign-log'
import checkLogs from './check-logs'
import { baseConfig, db } from './main-proxy'
import waitFor from './wait-for'
import updateKnownFriends from './arc-interface-friends'
import execDetached from './exec-detached'
import ErrorWithStack from '../error-with-stack'
import { LogEntryRef } from '../../raid-tool'

const logHeapActive = false

function logHeap(msg: string) {
  if (!logHeapActive) {
    return
  }
  const mem = process.memoryUsage()

  console.log(
    `heap: ${((mem.heapUsed / mem.heapTotal) * 100).toFixed(2)}% (${(mem.heapTotal / 1048576).toFixed(3)} MB) -> ${msg}`
  )
}

export default async function updateLogEntry(logsPath: string, entry: LogEntryRef) {
  try {
    if (entry.match(/[()]/)) {
      console.info(`rename: ${path.resolve(logsPath, entry)}`)
      const targetEntry = entry.replace(/[()]/g, '')
      try {
        await fs.move(path.resolve(logsPath, entry), path.resolve(logsPath, targetEntry))
        console.info(`renamed to: ${targetEntry}`)
      } catch (error) {
        console.error(new ErrorWithStack(error))
      }
      return // end prosessing, as renamed file will be detected
    }
    const baseFile = path.dirname(entry)
    const dateInfo = entry.match(/(^|\/)(\d{8})-(\d+)\.z?evtc$/)

    if (!dateInfo) {
      return
    }
    const dateName = `${dateInfo[2]}-${dateInfo[3]}`

    const knownFriendCache = await db.known_friends.findOne({ entry })
    const known = await db.logs.findOne({ entry })

    if (known && knownFriendCache && knownFriendCache.status !== 'failed') {
      await fs.move(path.resolve(logsPath, entry), path.resolve(logsPath, '.raid-tool', entry))
      //console.log(`already known: ${entry}`)
      return
    }
    //console.log(`try to find: ${entry}`)
    const htmlFiles = await fg(
      [
        `${baseFile}/${dateName}_*.html`.replace(/^\.\//, ''),
        `${baseFile}/${dateName}_*.htmlz`.replace(/^\.\//, '')
      ],
      {
        dot: true,
        cwd: logsPath
      }
    )

    const htmlFile =
      htmlFiles && htmlFiles[0] && path.join(logsPath, htmlFiles[0].replace(/\.htmlz$/, '.html'))
    //console.log({ htmlFile })

    if (htmlFile && (!knownFriendCache || knownFriendCache.status === 'failed')) {
      await updateKnownFriends({
        knownFriendCache,
        htmlFile,
        entry
      }).catch((err: any) => {
        throw new ErrorWithStack(err)
      })
    }
    //console.log({ known })
    if (known) {
      return
    }

    if (!htmlFile || (!(await fs.pathExists(htmlFile)) && !(await fs.pathExists(`${htmlFile}z`)))) {
      console.info(`Parsing Log: ${entry}`)
      //console.log({htmlFile});
      //console.log({entry});
      logHeap('checkLogs')
      if (
        !(await checkLogs(logsPath, baseFile, dateName, entry, false).catch((err: any) => {
          throw new ErrorWithStack(err)
        }))
      ) {
        return
      }

      logHeap('execDetached')
      const logFilePath = path.join(logsPath, entry)
      const logFileName = entry.replace(/\.z?evtc$/, '.log')
      try {
        await execDetached(
          `${await baseConfig.eiPath}`,
          ['-c', `${await baseConfig.eiConfig}`, `${logFilePath}`],
          { cwd: path.dirname(logFilePath) }
        )
        await waitFor(
          (p, stats) => (stats?.isFile() && !p.endsWith(logFileName)) || false,
          logsPath
        )
      } catch (error) {
        console.error(new ErrorWithStack(error))
        await waitFor(
          (p, stats) => (stats?.isFile() && !p.endsWith(logFileName)) || false,
          logsPath
        )
        if (!(await checkLogs(logsPath, baseFile, dateName, entry, true))) {
          return
        }
        return
      }

      logHeap('checkLogs')
      if (
        !(await checkLogs(logsPath, baseFile, dateName, entry).catch((err: { stack: any }) => {
          throw new ErrorWithStack(err)
        }))
      ) {
        console.info(`check logs failed: ${entry}`)
        return
      }
      console.info(`Log parsed: ${entry}`)

      logHeap('waitForHtml')
      const baseFilePath = path.join(logsPath, baseFile)
      const waitForHtml = waitFor((p, stats) => {
        const relativePath = path.relative(baseFilePath, p)
        return (
          (stats?.isFile() &&
            !(
              relativePath.startsWith(`${dateName}_`) &&
              (relativePath.endsWith('.html') || relativePath.endsWith('.htmlz'))
            )) ||
          false
        )
      }, baseFilePath)
      const waitForJson = waitFor((p, stats) => {
        const relativePath = path.relative(baseFilePath, p)
        return (
          (stats?.isFile() &&
            relativePath.startsWith(`${dateName}_`) &&
            (relativePath.endsWith('.json') || relativePath.endsWith('.jsonz'))) ||
          false
        )
      }, baseFilePath)

      const htmlInnerFile = await waitForHtml
      await waitForJson
      console.info(`JSON/HTML ready: ${entry}`)

      const htmlFile2 =
        htmlInnerFile && path.join(baseFilePath, htmlInnerFile.replace(/\.htmlz$/, '.html'))
      //console.log({ entry, htmlFile2 })
      if (htmlFile2) {
        if (
          !(await checkLogs(logsPath, baseFile, dateName, entry, false).catch(
            (err: { stack: any }) => {
              throw new ErrorWithStack(err)
            }
          ))
        ) {
          console.warn('checkLog failed')
          return
        }
        await assignLog(logsPath, htmlFile2, entry).catch((err) => {
          throw new ErrorWithStack(err)
        })
        //console.log('log assigned')
        if (htmlFile2 && (!knownFriendCache || knownFriendCache.status === 'failed')) {
          await updateKnownFriends({
            knownFriendCache,
            htmlFile: htmlFile2,
            entry
          }).catch((err: { stack: any }) => {
            throw new ErrorWithStack(err)
          })
          //console.log('updateKnownFriends')
        }
      } else {
        console.error(path.join(logsPath, entry))
        return
      }
      //console.log(`handled htmlFile2: ${htmlFile2}`)
    } else if (htmlFile) {
      if (
        !(await checkLogs(logsPath, baseFile, dateName, entry, false).catch(
          (err: { stack: any }) => {
            throw new ErrorWithStack(err)
          }
        ))
      ) {
        //console.log(`Returning, due to htmlFile and not checkLogs: ${entry}`)
        return
      }
      await assignLog(logsPath, htmlFile, entry).catch((err) => {
        throw new ErrorWithStack(err)
      })
      //console.info(`Log assigned: ${entry}`)
    }
    //console.info(`Move log to .raid-tool: ${entry}`)
    await fs.move(path.resolve(logsPath, entry), path.resolve(logsPath, '.raid-tool', entry))
    //console.info(`Moved log to .raid-tool: ${entry}`)
    console.info(`Log entry updated: ${entry}`)
  } catch (error) {
    console.error(new ErrorWithStack(error))
  }
}
