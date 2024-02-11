import path from 'path'
import fs from 'fs-extra'
import zlib from 'zlib'
import { promisify } from 'util'
import { pipeline } from 'stream'
const pipe = promisify(pipeline)

export default async function handleCompress(logsPath: string, compressEntries: string[]) {
  while (compressEntries.length > 0) {
    const uncompressedJSON = compressEntries.shift() as string
    console.info(`compressing: ${uncompressedJSON}`)

    const zipStream = zlib.createDeflate()
    const source = fs.createReadStream(path.join(logsPath, uncompressedJSON))
    const destination = fs.createWriteStream(path.join(logsPath, `${uncompressedJSON}z`))
    await pipe(source, zipStream, destination)
    await fs.remove(path.join(logsPath, uncompressedJSON))
  }
}
