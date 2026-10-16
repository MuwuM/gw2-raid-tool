import * as path from 'path'
import type Client from 'ssh2-sftp-client'
import type { Client as SshClient, ClientChannel } from 'ssh2'
import type { Digest } from './release-storage'

export async function serverDigest(sftp: Client, file: string): Promise<Digest> {
  if (!path.posix.isAbsolute(file) || file.includes('\0'))
    throw new Error('Server hashing requires an absolute remote path without NUL characters')
  const quoted = `'${file.replace(/'/g, "'\\''")}'`
  const command = [
    'set -eu',
    'export LC_ALL=C',
    `file=${quoted}`,
    '[ -f "$file" ]',
    '[ ! -L "$file" ]',
    'before=$(stat -c "%d:%i:%s:%y:%z" -- "$file")',
    'size=$(stat -c %s -- "$file")',
    'sha256sum -b < "$file"',
    'sha1sum -b < "$file"',
    'after=$(stat -c "%d:%i:%s:%y:%z" -- "$file")',
    '[ "$before" = "$after" ]',
    'printf "%s\\n" "$size"'
  ].join('\n')
  const ssh = (sftp as unknown as { client: SshClient }).client
  if (!ssh || typeof ssh.exec !== 'function')
    throw new Error('The release connection does not support SSH command execution')
  const output = await new Promise<string>((resolve, reject) => {
    let channel: ClientChannel | undefined
    let settled = false
    let stdout = ''
    let stderr = ''
    let outputBytes = 0
    const finish = (error?: Error): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      ssh.removeListener('error', onConnectionError)
      ssh.removeListener('end', onConnectionEnd)
      ssh.removeListener('close', onConnectionEnd)
      if (error) {
        channel?.close()
        reject(error)
      } else resolve(stdout)
    }
    const onConnectionError = (error: Error): void => finish(error)
    const onConnectionEnd = (): void => finish(new Error('SSH connection closed during hashing'))
    const timer = setTimeout(
      () => finish(new Error('Server hashing timed out after 15 minutes')),
      15 * 60 * 1000
    )
    const collect = (chunk: Buffer, errorOutput: boolean): void => {
      outputBytes += chunk.length
      if (outputBytes > 8192) {
        finish(new Error('Unexpectedly large server checksum response'))
        return
      }
      if (errorOutput) stderr += chunk.toString('utf8')
      else stdout += chunk.toString('utf8')
    }
    ssh.on('error', onConnectionError)
    ssh.on('end', onConnectionEnd)
    ssh.on('close', onConnectionEnd)
    try {
      ssh.exec(command, (error, stream) => {
        if (settled) {
          stream?.close()
          return
        }
        if (error) {
          finish(error)
          return
        }
        channel = stream
        stream.on('data', (chunk: Buffer) => collect(chunk, false))
        stream.stderr.on('data', (chunk: Buffer) => collect(chunk, true))
        stream.on('error', finish)
        stream.on('close', (code: number | null, signal?: string) => {
          if (code !== 0 || signal || stderr.trim())
            finish(
              new Error(`Server checksum command failed (${signal || code}): ${stderr.trim()}`)
            )
          else finish()
        })
        stream.end()
      })
    } catch (error) {
      finish(error instanceof Error ? error : new Error(String(error)))
    }
  })
  const match = output.match(/^([a-f0-9]{64})[ \t]+\*-\n([a-f0-9]{40})[ \t]+\*-\n(\d+)\n$/)
  if (!match || !Number.isSafeInteger(Number(match[3])))
    throw new Error('Invalid server checksum response')
  return { sha256: match[1], sha1: match[2], size: Number(match[3]) }
}
