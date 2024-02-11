import { SpawnOptions, spawn } from 'child_process'
import ErrorWithStack from '../error-with-stack'

export default async function execDetached(
  app: string,
  params: readonly string[],
  options: SpawnOptions
) {
  return new Promise<void>((res, rej) => {
    const bat = spawn(app, params, {
      ...options,
      detached: true
    })
    bat.on('error', (err) => {
      console.error(new ErrorWithStack(err))
      rej(new Error('exec failed'))
    })

    /*bat.stdout.on("data", (data) => {
      console.log(`${data}`);
    });*/
    bat.stderr?.on('data', (data) => {
      console.error(new Error(`${data}`))
    })
    bat.on('exit', (code) => {
      if (code && code > 0) {
        rej(new Error('exec failed'))
      } else {
        res()
      }
    })
  })
}
