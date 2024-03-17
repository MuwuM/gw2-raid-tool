import { Lang, LocalizedName } from 'src/raid-tool'

export function preventDefault(event: Event | undefined) {
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault()
  }
}

export function img(imgPath: string) {
  const publicDir = import.meta.url.replace(/\/out\/.*$/, '/resources/')
  const file = new URL(imgPath.replace(/^\/img\//, './img/'), publicDir).href
  //console.log({ publicDir, file })
  return file
}

export function localizeName(locale: Lang): LocalizedName {
  return `name_${locale}`
}
