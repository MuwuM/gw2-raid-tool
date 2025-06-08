import { NedbDocumentLogs } from '../../raid-tool'

const starFilled = `<svg style="height: 1em; width: 1em;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g class="" style="" transform="translate(0,0)"><path d="M256 38.013c-22.458 0-66.472 110.3-84.64 123.502-18.17 13.2-136.674 20.975-143.614 42.334-6.94 21.358 84.362 97.303 91.302 118.662 6.94 21.36-22.286 136.465-4.116 149.665 18.17 13.2 118.61-50.164 141.068-50.164 22.458 0 122.9 63.365 141.068 50.164 18.17-13.2-11.056-128.306-4.116-149.665 6.94-21.36 98.242-97.304 91.302-118.663-6.94-21.36-125.444-29.134-143.613-42.335-18.168-13.2-62.182-123.502-84.64-123.502z" fill="#fff" fill-opacity="1"></path></g></svg>`
const starEmpty = `<svg style="height: 1em; width: 1em;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g class="" style="" transform="translate(0,0)"><path d="M256 38.013c-22.458 0-66.472 110.3-84.64 123.502-18.17 13.2-136.674 20.975-143.614 42.334-6.94 21.358 84.362 97.303 91.302 118.662 6.94 21.36-22.286 136.465-4.116 149.665 18.17 13.2 118.61-50.164 141.068-50.164 22.458 0 122.9 63.365 141.068 50.164 18.17-13.2-11.056-128.306-4.116-149.665 6.94-21.36 98.242-97.304 91.302-118.663-6.94-21.36-125.444-29.134-143.613-42.335-18.168-13.2-62.182-123.502-84.64-123.502z" fill="#ffffff" fill-opacity="0" stroke="#ffffff" stroke-opacity="1" stroke-width="16"></path></g></svg>`

const customStyles = `
.ei-container-big{
  min-width: 1600px;
}
.ei-container-big h3, .ei-container-big .h3 {
  font-size: 1.25rem;
}
.ei-container-small{
  max-width: 80%;
}
.player-cell {
  background: rgba(0,0,0,0.1);
  border: 1px solid #333333;
}
.player-cell.active {
  border: 1px solid #375a7f;
}
.target-cell {
  border: 2px solid #333333;
  border-radius: 50%;
}
.target-cell.active {
  border: 2px solid #375a7f;
}
.nav-item .nav-link,.nav.nav-tabs .nav-link {
  background: rgba(0,0,0,0.1);
  border: 1px solid #333333;
}
.nav-item .nav-link.active, .nav.nav-tabs .nav-link.active {
  background: rgba(0,0,0,0.3);
  border: 1px solid #444444;
}
tr.condi td {
  background-color: rgba(255, 0, 0, 0.15);
}
tr.condi td.sorting_1 {
  background-color: rgba(183,43,76, 0.15);
}
input.form-control[readonly]{
  background-color: #444;
  color: #ebebeb;
}
`
export default function (log: NedbDocumentLogs, fileContent: string, query: URLSearchParams) {
  let file = fileContent
  file = file.replace(
    /<script>[\s\S]+?function\s+initTheme\(\)\s+\{[\s\S]+?<\/script>/g,
    '<script>function initTheme() {}\nfunction storeTheme() {}</script>'
  )
  file = file.replace(
    /<link id="theme" rel="stylesheet" href="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/bootswatch\/4\.1\.1\/slate\/bootstrap\.min\.css"\s+crossorigin="anonymous">/g,
    `<link
  rel="stylesheet"
  href="/ext/bootswatch/bootstrap.min.css"
>
<link
rel="stylesheet"
href="/static/style.css"
>`
  )

  file = file.replace(/https:\/\/i\.imgur\.com\/(\w+)\.png/g, '/imgur/$1.png')
  file = file.replace(
    /https:\/\/wiki\.guildwars2\.com\/images\/([/%_-\w.]+)\.png/g,
    '/wikiimg/$1.png'
  )
  file = file.replace(
    /https:\/\/wiki\.guildwars2\.com\/images\/([/%_-\w.]+)\.jpg/g,
    '/wikiimg/$1.jpg'
  )
  file = file.replace(
    /https:\/\/render\.guildwars2\.com\/file\/([/%_-\w.]+)\.png/g,
    '/gwrenderapi/$1.jpg'
  )
  file = file.replace(/:src="encounter\.icon"/g, `:src="'${log.fightIcon || ''}'||encounter.icon"`)

  file = file.replace(
    /<div class="d-flex flex-column justify-content-center align-items-center ml-5">\s*<div class="d-flex flex-row justify-content-center align-items-center mt-2 mb-2">[\s\S]+?<\/div>/g,
    '<div class="d-flex flex-column justify-content-center align-items-center ml-5">'
  )
  file = file.replace(/<\/style>/, `${customStyles}\n</style>`)
  file = file.replace(
    /<td>\{\{row\.player\.acc\}\}<\/td>/,
    '<td><a target="_top" :href="\'/friends/\'+encodeURIComponent(row.player.acc)">{{row.player.acc}}</a></td>'
  )
  file = file.replace(
    /<td([^>]*)>\{\{row\.player\.acc\}\}<\/td>/,
    '<td$1><a target="_top" :href="\'/friends/\'+encodeURIComponent(row.player.acc)">{{row.player.acc}}</a></td>'
  )

  file = file.replace(
    /\{\{getLogData\(\)\.parser\}\}/,
    '<a href="https://baaron4.github.io/GW2-Elite-Insights-Parser/" target="_top">{{getLogData().parser}}</a>'
  )

  file = file.replace(
    /name:\s+logData\.fightName,[\s\S]+?icon:\s+logData\.fightIcon/,
    'name: logData.fightName,\n  triggerID: logData.fightID || logData.triggerID,\n  icon: logData.fightIcon'
  )

  file = file.replace(
    /<h3 class="card-header text-center">{{ encounter\.name }}<\/h3>/,
    '<h3 class="card-header text-center"><a :href="\'/boss/\'+encodeURIComponent(logData.triggerID)" target="_top">{{encounter.name}}</a></h3>'
  )

  const poweredBy =
    '<div class="d-flex flex-row justify-content-center align-items-center"><a href="https://baaron4.github.io/GW2-Elite-Insights-Parser/" target="_top">parsed with Elite-Insights</a></div>'

  let customButtons = `${poweredBy}`

  if (log.favourite) {
    customButtons += `<div class="d-flex flex-row justify-content-center align-items-center">
    <div class="d-flex flex-row justify-content-center align-items-center mt-2 mb-2">
    <a href="gw2-log://${log.hash}/?action=unfavourite" target="_self" class="btn btn-primary active">${starFilled} Favourite</a>
    </div>
    </div>`
  } else {
    customButtons += `<div class="d-flex flex-row justify-content-center align-items-center">
    <div class="d-flex flex-row justify-content-center align-items-center mt-2 mb-2">
    <a href="gw2-log://${log.hash}/?action=favourite" target="_self" class="btn btn-primary">${starEmpty} Favourite</a>
    </div>
    </div>`
  }

  if (query.get('is') === 'uploading') {
    customButtons += `<div class="d-flex flex-row justify-content-center align-items-center">
    <div class="d-flex flex-row justify-content-center align-items-center mt-2 mb-2">
    ... uploading
    </div>
    </div>`
  } else if (log.permalink) {
    customButtons += `<div class="d-flex flex-row justify-content-center align-items-center">
    <div class="d-flex flex-row justify-content-center align-items-center mt-2 mb-2">
    <input class="form-control" onclick="this.select();" type="text" value="${log.permalink}" readonly="readonly">
    </div>
    </div>`
  } else if (log.entry) {
    customButtons += `<div class="d-flex flex-row justify-content-center align-items-center">
  <div class="d-flex flex-row justify-content-center align-items-center mt-2 mb-2">
  <ul class="nav nav-pills" style="pointer-events:auto;">
  <li class="nav-item">
  <a href="gw2-log://${log.hash}/?action=upload" target="_self" class="nav-link btn btn-primary">Upload</a>
  </li>
  </ul>
  </div>
  </div>`
  }
  file = file.replace(
    /<div v-if="(cr(\s*\|\|\s*healingExtShow)?)"/,
    `${customButtons}<div v-if="$1"`
  )
  return file
}
