import { EventHandlerStored } from '../raid-tool'
import { ipcMain } from 'electron'

const eventHub = {
  onHandler: [] as Array<EventHandlerStored>,
  onLocalHandler: [] as Array<EventHandlerStored>,
  sockets: [] as Array<Electron.WebContents>,
  on(evt: any, handler: any) {
    eventHub.onHandler.push({
      fn: 'on',
      args: [evt, handler]
    })
    ipcMain.on(evt, (_event, value) => handler(value))
  },
  onLocal(evt: any, handler: any) {
    eventHub.onLocalHandler.push({
      fn: 'on',
      args: [evt, handler]
    })
  },
  emit(evt: string, data: any) {
    for (const localHandler of eventHub.onLocalHandler) {
      if (localHandler.args[0] === evt && typeof localHandler.args[1] === 'function') {
        try {
          localHandler.args[1]()
        } catch (error) {
          console.error(error)
        }
      }
    }
    for (const handler of eventHub.onHandler) {
      if (handler.args[0] === evt && typeof handler.args[1] === 'function') {
        try {
          handler.args[1]()
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
}
export default eventHub
