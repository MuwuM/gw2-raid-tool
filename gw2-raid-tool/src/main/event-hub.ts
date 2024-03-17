import { EventHandler, EventHandlerStored, EventHub, KnownEvents } from '../raid-tool'
import { ipcMain } from 'electron'

const eventHub = {
  onHandler: [] as Array<EventHandlerStored<keyof KnownEvents>>,
  onLocalHandler: [] as Array<EventHandlerStored<keyof KnownEvents>>,
  sockets: [] as Array<Electron.WebContents>,
  on(evt, handler) {
    eventHub.onHandler.push({
      fn: 'on',
      args: [evt, handler as EventHandler<keyof KnownEvents>]
    })
    ipcMain.on(evt, (_event, value) => handler(value))
  },
  onLocal(evt, handler) {
    eventHub.onLocalHandler.push({
      fn: 'on',
      args: [evt, handler as EventHandler<keyof KnownEvents>]
    })
  },
  emit(evt, data) {
    for (const localHandler of eventHub.onLocalHandler) {
      if (localHandler.args[0] === evt && typeof localHandler.args[1] === 'function') {
        try {
          localHandler.args[1](data)
        } catch (error) {
          console.error(error)
        }
      }
    }
    for (const handler of eventHub.onHandler) {
      if (handler.args[0] === evt && typeof handler.args[1] === 'function') {
        try {
          handler.args[1](data)
        } catch (error) {
          console.error(error)
        }
      }
    }

    for (const socket of this.sockets) {
      if (!socket.isDestroyed()) {
        socket.send(evt, data)
      }
    }
  }
} as EventHub
export default eventHub
