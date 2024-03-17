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
      return updateLogEntry(logsPath, targetEntry)
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
      //console.log(`already known: ${entry}`);
      return
    }
    //console.log(`try to find: ${entry}`);
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
    //console.log({htmlFile});

    if (htmlFile && (!knownFriendCache || knownFriendCache.status === 'failed')) {
      await updateKnownFriends({
        knownFriendCache,
        htmlFile,
        entry
      }).catch((err: any) => {
        throw new ErrorWithStack(err)
      })
    }
    //console.log({known});
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
      try {
        await execDetached(
          `${await baseConfig.eiPath}`,
          ['-c', `${await baseConfig.eiConfig}`, '-p', `${logFilePath}`],
          { cwd: path.dirname(logFilePath) }
        )
        await waitFor([entry.replace(/\.z?evtc$/, '.log')], logsPath)
      } catch (error) {
        console.error(new ErrorWithStack(error))
        await waitFor([entry.replace(/\.z?evtc$/, '.log')], logsPath)
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
      const waitForHtml = waitFor(
        [
          `${baseFile}/${dateName}_*.html`.replace(/^\.\//, ''),
          `${baseFile}/${dateName}_*.htmlz`.replace(/^\.\//, '')
        ],
        logsPath
      )
      const waitForJson = waitFor(
        [
          `${baseFile}/${dateName}_*.json`.replace(/^\.\//, ''),
          `${baseFile}/${dateName}_*.jsonz`.replace(/^\.\//, '')
        ],
        logsPath
      )

      const htmlInnerFile = await waitForHtml
      await waitForJson
      console.info(`JSON/HTML ready: ${entry}`)

      const htmlFile2 =
        htmlInnerFile && path.join(logsPath, htmlInnerFile.replace(/\.htmlz$/, '.html'))
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
        //console.log("log assigned");
        if (htmlFile2 && (!knownFriendCache || knownFriendCache.status === 'failed')) {
          await updateKnownFriends({
            knownFriendCache,
            htmlFile: htmlFile2,
            entry
          }).catch((err: { stack: any }) => {
            throw new ErrorWithStack(err)
          })
          //console.log("updateKnownFriends");
        }
      } else {
        console.error(path.join(logsPath, entry))
        return
      }
    } else if (htmlFile) {
      if (
        !(await checkLogs(logsPath, baseFile, dateName, entry, false).catch(
          (err: { stack: any }) => {
            throw new ErrorWithStack(err)
          }
        ))
      ) {
        return
      }
      await assignLog(logsPath, htmlFile, entry).catch((err) => {
        throw new ErrorWithStack(err)
      })
    }
    await fs.move(path.resolve(logsPath, entry), path.resolve(logsPath, '.raid-tool', entry))
  } catch (error) {
    console.error(new ErrorWithStack(error))
  }
}
