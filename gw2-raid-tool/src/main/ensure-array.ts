export default function ensureArray<T>(arr: T | undefined | (T | undefined)[]): T[] {
  if (Array.isArray(arr)) {
    return arr.filter((a) => typeof a !== 'undefined') as T[]
  }
  return [arr].filter((a) => typeof a !== 'undefined') as T[]
}
