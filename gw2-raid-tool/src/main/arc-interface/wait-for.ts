import chokidar from 'chokidar'
import type { Stats } from 'fs'

export default function waitFor(
  ignored: (path: string, stats: Stats | undefined) => boolean,
  cwd: string
) {
  const { stack } = new Error('')
  return new Promise<string>((res, rej) => {
    const tooLate = setTimeout(() => {
      rej(new Error(`wait for file Timed out\n${stack}`))
      watcher.close()
    }, 60000)

    const watcher = chokidar.watch('.', {
      cwd,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      },
      ignored: ignored
    })
    watcher.once('add', (chokiPath) => {
      clearTimeout(tooLate)
      res(chokiPath)
      watcher.close()
    })
    watcher.once('error', (err) => {
      clearTimeout(tooLate)
      rej(err)
      watcher.close()
    })
  })
}
