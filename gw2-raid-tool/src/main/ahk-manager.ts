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

type HotkeysListWithKeyAndModifiers = { key: string; modifiers?: string[]; noInterrupt?: boolean }
type HotkeysListWithKeys = { keys: string[]; noInterrupt?: boolean }

/**
 * Initiates AHK NodeJS with the following parameters
 * @module ahknodejs
 * @param {string} path - The path to AutoHotKey.exe
 * @param {[
 *  {key: string,
 *   modifiers?: [
 *    string
 *   ],
 *   noInterrupt?: boolean
 *  }?,
 *  {
 *   keys: [string],
 *   noInterrupt?: boolean
 *  }?
 * ]?} hotkeysList - A list of to-be-used hotkeys
 * @param {{
 *  defaultColorVariation?: number
 * }} options - The options to initiate AHK NodeJS with
 * @returns An object containing this package's functions
 */
export default async function (
  path: string,
  hotkeysList: Array<HotkeysListWithKeyAndModifiers | HotkeysListWithKeys> = [],
  options: {
    defaultColorVariation?: number
    tmpDir?: string
  } = {}
) {
  const ahk = {
    defaultColorVariation: 1,
    width: 1366,
    height: 768,
    hotkeys: {},
    hotkeysPending: [] as TODO[],
    stop: undefined as TODO,
    /**
     * Turns pixel coordinates into screen percentages
     * @param {[x: number, y: number]} x - The coordinates
     * @returns The array with pixels as screen percentages.
     */
    toPercent(x) {
      return [(x[0] * 100) / ahk.width, (x[1] * 100) / ahk.height]
    },
    /**
     * Turns screen percentages into pixel coordinates
     * @param {[x: number, y: number]} x - The percentages
     * @returns The array with screen percentages as pixels.
     */
    toPx(x) {
      return [(x[0] / 100) * ahk.width, (x[1] / 100) * ahk.height]
    },
    /**
     * Sets a hotkey to a function
     * @param {string | object} key - The hotkey to bind
     * @param {function} run - The function to run on bind
     * @param {boolean} instant - Whether or not to instantly run the hotkey
     */
    setHotkey(key, run, instant) {
      let ahkKey
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
            key.key
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
     * Sleeps for a certain amount of time
     * @param {number} x - The time in ms to sleep for
     * @returns A promise that is fufilled once the time is up
     */
    sleep(x) {
      return new Promise((resolve) => {
        setTimeout(resolve, x)
      })
    },
    /**
     * Runs a hotkey if one is detected
     */
    async waitForInterrupt() {
      while (ahk.hotkeysPending[0]) {
        await ahk.hotkeysPending[0]()
        ahk.hotkeysPending.shift()
      }
    }
  }
  if (options.defaultColorVariation) {
    ahk.defaultColorVariation = options.defaultColorVariation
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
  await fs.writeFile(`${options.tmpDir || __dirname}\\hotkeys.ahk`, hotkeysString)
  const hotkeys = spawn(path, [`${options.tmpDir || __dirname}\\hotkeys.ahk`])

  let stopping = false
  function childProcessesEnding(code) {
    //console.log({"Exiting: ": code});
    if (!stopping) {
      process.exit(code)
    }
  }

  function stop() {
    stopping = true
    if (!hotkeys.killed) {
      hotkeys.kill()
    }
  }
  ahk.stop = stop

  hotkeys.stderr.on('data', (chuck) => {
    console.warn(chuck.toString())
  })
  hotkeys.stdout.on('end', childProcessesEnding)

  process.on('SIGINT', stop)
  process.on('exit', stop)
  hotkeys.stdout.on('data', (data) => {
    data = data.toString()
    if (ahk.hotkeys[data].instant) {
      ahk.hotkeys[data]()
    } else {
      ahk.hotkeysPending.push(ahk.hotkeys[data])
    }
  })
  return ahk
}
