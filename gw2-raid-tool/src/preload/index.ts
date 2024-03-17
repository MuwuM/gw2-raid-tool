import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import {
  EventHandler,
  ExposedIpc,
  KnownEvents,
  PreloadApi,
  exposedListeners,
  exposedSenders
} from '../raid-tool'

function send<T extends keyof KnownEvents>(channel: T) {
  return (data: KnownEvents[T]) => {
    try {
      ipcRenderer.send(channel, data)
    } catch (e: any) {
      console.error('Error in Channel: "' + channel + '" send:', e)
    }
  }
}
function on<T extends keyof KnownEvents>(channel: T) {
  return (callback: EventHandler<T>) =>
    ipcRenderer.on(channel, (_event, value) => {
      try {
        callback(JSON.parse(JSON.stringify(value)))
      } catch (e: any) {
        console.error('Error in Channel: "' + channel + '" on:', e)
      }
    })
}

const ipc = { on: {}, send: {} } as ExposedIpc

for (const channel of exposedListeners) {
  ipc.on[channel] = on(channel) as any
}

for (const channel of exposedSenders) {
  ipc.send[channel] = send(channel) as any
}

// Custom APIs for renderer
const api: PreloadApi = {
  ipc,
  electronVersionUrl:
    process.versions.electron &&
    `https://releases.electronjs.org/release/v${process.versions.electron}`,
  electronVersionString: `electron: ${process.versions.electron}, chrome: ${process.versions.chrome}, node: ${process.versions.node}`
}

try {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
} catch (error: any) {
  console.error(error)
  window.alert('Error: ' + error.message)
  window.close()
}
