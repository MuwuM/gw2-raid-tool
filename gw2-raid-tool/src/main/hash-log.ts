import crypto from 'crypto'

export default async function hashLog(file: string) {
  const hash = crypto.createHash('md5')
  hash.update(file)
  return hash.digest('hex')
}
