import path from 'path'
import ChildProcess from 'child_process'
import { App } from 'electron'

export default function handleSquirrelEvent(electronApp: App) {
  if (process.argv.length === 1) {
    return false
  }

  const appFolder = path.resolve(process.execPath, '..')
  const rootAtomFolder = path.resolve(appFolder, '..')
  const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'))
  const exeName = path.basename(process.execPath)

  const spawn = function (command: string, args: readonly string[] | undefined) {
    let spawnedProcess: ChildProcess.ChildProcessWithoutNullStreams
    try {
      spawnedProcess = ChildProcess.spawn(command, args, { detached: true })
      return spawnedProcess
    } catch (error) {
      console.error(error)
    }
    return
  }

  const spawnUpdate = function (args: string[]) {
    return spawn(updateDotExe, args)
  }

  const squirrelEvent = process.argv[1]
  switch (squirrelEvent) {
    case '--squirrel-install':
    case '--squirrel-updated':
      // Optionally do things such as:
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      // Install desktop and start menu shortcuts
      spawnUpdate(['--createShortcut', exeName])

      setTimeout(electronApp.quit, 1000)
      return true

    case '--squirrel-uninstall':
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers

      // Remove desktop and start menu shortcuts
      spawnUpdate(['--removeShortcut', exeName])

      setTimeout(electronApp.quit, 1000)
      return true

    case '--squirrel-obsolete':
      // This is called on the outgoing version of your app before
      // we update to the new version - it's the opposite of
      // --squirrel-updated

      electronApp.quit()
      return true
  }
  return
}
