import fs from 'fs-extra'
import zlib from 'zlib'
import { promisify } from 'util'
const unzip = promisify(zlib.unzip)

export default async function readJSON(file: string) {
  try {
    if (await fs.pathExists(`${file}z`)) {
      const content = await fs.readFile(`${file}z`)
      const unzipped = await unzip(content)
      return JSON.parse(`${unzipped}`)
    }
    return await fs.readJSON(file)
  } catch (error) {
    throw new Error(
      `Error reading File: '${file}'\n${(error as any).message || error}\n${(error as any).stack || ''}`
    )
  }
}
