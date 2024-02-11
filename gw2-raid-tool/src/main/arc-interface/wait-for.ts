import chokidar from 'chokidar'

export default function waitFor(glob: string[], cwd: string) {
  const { stack } = new Error('')
  return new Promise((res, rej) => {
    const tooLate = setTimeout(() => {
      rej(new Error(`wait for file Timed out\n${stack}`))
      watcher.close()
    }, 60000)
    const watcher = chokidar.watch(glob, {
      cwd,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    })
    watcher.once('add', (chokiPath) => {
      clearTimeout(tooLate)
      res([chokiPath])
      watcher.close()
    })
    watcher.once('error', (err) => {
      clearTimeout(tooLate)
      rej(err)
      watcher.close()
    })
  })
}
