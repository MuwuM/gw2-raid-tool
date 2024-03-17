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
import { dirname } from 'path'

type HotkeysListWithKeyAndModifiers = {
  key: string
  modifiers?: string[]
  noInterrupt?: boolean
}
type HotkeysListWithKeys = { keys: string[]; noInterrupt?: boolean }

type HotkeyRunner = {
  (): void | Promise<void>
  instant?: boolean
}

function doNothing() {
  // do nothing
}

export type AHKManager = {
  hotkeys: Record<string, HotkeyRunner>
  hotkeysPending: Array<HotkeyRunner>
  setHotkey: (key: string, run: HotkeyRunner, instant: boolean) => void
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
  const ahknodejsDir = dirname(require.resolve('ahknodejs'))

  const ahk: AHKManager = {
    hotkeys: {},
    hotkeysPending: [],

    setHotkey(ahkKey, run, instant) {
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
  let hotkeysString = `#NoTrayIcon
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
        ahk.hotkeys[(x as HotkeysListWithKeys).keys.join(' ')] = doNothing
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
        ahk.hotkeys[mod + key] = doNothing
        hotkeysString += `${mod + key}::write("${mod + key}")
`
      }
    }
  })
  await fs.writeFile(`${options.tmpDir || ahknodejsDir}\\hotkeys.ahk`, hotkeysString)
  const hotkeys = spawn(path, [`${options.tmpDir || ahknodejsDir}\\hotkeys.ahk`], {
    detached: true
  })
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
