export function preventDefault(event) {
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
