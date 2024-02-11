/**
 *
 * This file is based on https://github.com/RichardX366/AHKNodeJS
 *
 *
MIT License

Copyright (c) 2021 Richard-X-366

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 *
 */
import { spawn } from 'child_process'
import fs from 'fs/promises'
import { TODO } from '../raid-tool'
import { dirname } from 'path'

type HotkeysListWithKeyAndModifiers = { key: string; modifiers?: string[]; noInterrupt?: boolean }
type HotkeysListWithKeys = { keys: string[]; noInterrupt?: boolean }

export type AHKManager = {
  hotkeys: Record<string, TODO>
  hotkeysPending: Array<TODO>
  setHotkey: (
    key:
      | string
      | {
          keys?: TODO
          modifiers?: string[]
          key?: string
        },
    run: () => void,
    instant: boolean
  ) => void
  waitForInterrupt: () => Promise<void>
  stop: () => Promise<void>
}

export default async function (
  path: string,
  hotkeysList: Array<HotkeysListWithKeyAndModifiers | HotkeysListWithKeys> = [],
  options: {
    tmpDir?: string
    ahkV1?: boolean
  } = {}
): Promise<AHKManager> {
  const rootDir = dirname(require.resolve('ahknodejs'))

  const ahk: AHKManager = {
    hotkeys: {},
    hotkeysPending: [],

    setHotkey(key, run, instant) {
      let ahkKey: TODO
      if (typeof key === 'string') {
        ahkKey = key
      } else {
        if (key.keys) {
          ahkKey = key.keys
            .replace(/!/g, '{!}')
            .replace(/#/g, '{#}')
            .replace(/\+/g, '{+}')
            .replace(/\^/g, '{^}')
            .replace(/\\{/g, '{{}')
            .replace(/\\}/g, '{}}')
            .join(' ')
        } else {
          let mod = ''
          if (key.modifiers) {
            mod += key.modifiers
              .join('')
              .replace('win', '#')
              .replace('alt', '!')
              .replace('control', '^')
              .replace('shift', '+')
              .replace('any', '*')
          }
          ahkKey =
            mod +
            (key.key as string)
              .replace(/!/g, '{!}')
              .replace(/#/g, '{#}')
              .replace(/\+/g, '{+}')
              .replace(/\^/g, '{^}')
              .replace(/\\{/g, '{{}')
              .replace(/\\}/g, '{}}')
        }
      }
      ahk.hotkeys[ahkKey] = run
      if (instant) {
        ahk.hotkeys[ahkKey].instant = true
      }
    },
    /**
     * Runs a hotkey if one is detected
     */
    async waitForInterrupt() {
      while (ahk.hotkeysPending[0]) {
        await ahk.hotkeysPending[0]()
        ahk.hotkeysPending.shift()
      }
    },
    /**
     * Stops hotkey runner
     */
    stop() {
      if (hotkeys && !hotkeys.killed) {
        const ended = new Promise<void>((res) => {
          hotkeys.stdout.on('end', () => res())
        })
        hotkeys.kill()
        return ended
      }
      return Promise.resolve()
    }
  }
  var hotkeysString = `#NoTrayIcon
#SingleInstance Force
stdout := FileOpen("*", "w \`n")

write(x) {
  global stdout
  stdout.Write(x)
  stdout.Read(0)
}
`
  hotkeysList.forEach((x) => {
    if (x.noInterrupt) {
      hotkeysString += '~'
    }
    if (typeof x === 'string') {
      hotkeysString += `${x}::write("${x}")
`
    } else {
      if ((x as HotkeysListWithKeys).keys) {
        ahk.hotkeys[(x as HotkeysListWithKeys).keys.join(' ')] = function () {}
        hotkeysString += `${(x as HotkeysListWithKeys).keys.join(' & ')}::write("${(x as HotkeysListWithKeys).keys.join(' ')}")
`
      } else {
        let mod = ''
        if ((x as HotkeysListWithKeyAndModifiers).modifiers) {
          mod += ((x as HotkeysListWithKeyAndModifiers).modifiers as string[])
            .join('')
            .replace('win', '#')
            .replace('alt', '!')
            .replace('control', '^')
            .replace('shift', '+')
            .replace('any', '*')
        }
        const key = (x as HotkeysListWithKeyAndModifiers).key
          .replace(/\\{/g, '{{}')
          .replace(/\\}/g, '{}}')
        ahk.hotkeys[mod + key] = function () {}
        hotkeysString += `${mod + key}::write("${mod + key}")
`
      }
    }
  })
  await fs.writeFile(`${options.tmpDir || rootDir}\\hotkeys.ahk`, hotkeysString)
  const hotkeys = spawn(path, [`${options.tmpDir || rootDir}\\hotkeys.ahk`], { detached: true })
  //hotkeys.stdout.on('end', process.exit)
  process.on('SIGINT', process.exit)
  process.on('exit', function () {
    if (!hotkeys.killed) hotkeys.kill()
  })
  hotkeys.stdout.on('data', function (data) {
    data = data.toString()
    if (ahk.hotkeys[data].instant) ahk.hotkeys[data]()
    else ahk.hotkeysPending.push(ahk.hotkeys[data])
  })

  return ahk
}