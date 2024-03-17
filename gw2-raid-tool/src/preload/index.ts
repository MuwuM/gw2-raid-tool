import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { EventHandler, KnownEvents, PreloadApi } from '../raid-tool'

function send<T extends keyof KnownEvents>(channel: T) {
  return (data: KnownEvents[T]) => {
    ipcRenderer.send(channel, JSON.parse(JSON.stringify(data)))
  }
}
function on<T extends keyof KnownEvents>(channel: T) {
  return (callback: EventHandler<T>) => ipcRenderer.on(channel, (_event, value) => callback(value))
}

// Custom APIs for renderer
const api: PreloadApi = {
  ipc: {
    onLoading: on('loading'),
    onBaseConfig: on('baseConfig'),
    onAccounts: on('accounts'),
    onProgressConfig: on('progressConfig'),
    onMumbleLinkActive: on('mumbleLinkActive'),
    onLogs: on('logs'),
    onSelectPage: on('selectPage'),
    onFriends: on('friends'),
    onKeyRules: on('keyRules')
  },
  uploadLog: send('uploadLog'),
  logFilter: send('logFilter'),
  friendsFilter: send('friendsFilter'),
  startGame: send('startGame'),
  removeAccount: send('removeAccount'),
  addAccount: send('addAccount'),
  changeLang: send('changeLang'),
  selectGw2Dir: send('selectGw2Dir'),
  selectLaunchBuddyDir: send('selectLaunchBuddyDir'),
  removeLaunchBuddyDir: send('removeLaunchBuddyDir'),
  resetAllLogs: send('resetAllLogs'),
  enableArcUpdates: send('enableArcUpdates'),
  updateArcDps11: send('updateArcDps11'),
  checkArcUpdates: send('checkArcUpdates'),
  disableArcUpdates: send('disableArcUpdates'),
  updateKeyRule: send('updateKeyRule'),
  deleteKeyRule: send('deleteKeyRule'),
  addKeyRule: send('addKeyRule')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
//if (process.contextIsolated) {
try {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
} catch (error) {
  console.error(error)
}
//} else {
//  window['electron'] = electronAPI
//  window['api'] = api
//}
