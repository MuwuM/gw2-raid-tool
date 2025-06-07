import { progressConfig } from './main-proxy'
import updateLogEntry from './update-log-entry'
import handleCompress from './handle-compress'
import path from 'path'
import fs from 'fs-extra'
import ErrorWithStack from '../error-with-stack'

type QueueParam = { mode: 'log' | 'compress'; entry: string }

type ArrayQueue = {
  queue: QueueParam[]
  active: boolean
}

const arrayQueue: ArrayQueue = {
  queue: [],
  active: false
}

function preventBlocking() {
  return new Promise((resolve) => {
    setTimeout(resolve, 1)
  })
}

const arcFileHandlerInit = (
  logsPath: string,
  counter: {
    i: number
    j: number
    chokidarReady: boolean
    k: number
    l: number
  }
) => {
  async function handleQueue(add: QueueParam) {
    if (add.mode === 'log') {
      const entry = add.entry
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
      console.info(`adding: ${entry}`)
      counter.i++
      progressConfig.parsingLogs = counter.i
    } else if (add.mode === 'compress') {
      counter.k++
      progressConfig.compressingLogs = counter.k
    }
    arrayQueue.queue.push(add)
    if (arrayQueue.active) {
      return
    }
    arrayQueue.active = true
    while (arrayQueue.queue.length > 0) {
      const next = arrayQueue.queue.shift()
      if (!next) {
        continue
      }
      if (next.mode === 'log') {
        const entry = next.entry
        console.info(`parsing: ${entry}`)
        progressConfig.currentLog = entry
        try {
          await updateLogEntry(logsPath, entry)
          progressConfig.currentLog = false
          console.info(`parsed ${entry}`)
          counter.j++
          progressConfig.parsedLogs = counter.j
          if (counter.i === counter.j && counter.chokidarReady) {
            counter.i = 0
            counter.j = 0
            progressConfig.parsingLogs = counter.i
            progressConfig.parsedLogs = counter.j
          }
        } catch (error) {
          console.error(error)
        }
      } else if (next.mode === 'compress') {
        const compress = next.entry
        console.info(`zipping: ${compress}`)
        progressConfig.currentLog = `zipping: ${compress}`
        try {
          await handleCompress(logsPath, [compress])
          progressConfig.currentLog = false
          console.info(`zipped ${compress}`)
          counter.l++
          progressConfig.compressedLogs = counter.l
          if (counter.k === counter.l && counter.chokidarReady) {
            counter.k = 0
            counter.l = 0
            progressConfig.compressingLogs = counter.k
            progressConfig.compressedLogs = counter.l
          }
        } catch (error) {
          console.error(error)
        }
      }
      await preventBlocking()
    }
    arrayQueue.active = false
  }

  return {
    emit(mode: 'log' | 'compress', entry: string) {
      handleQueue({ mode, entry })
    }
  }
}
export default arcFileHandlerInit
