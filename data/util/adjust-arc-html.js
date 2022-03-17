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
`;
module.exports = function(log, fileContent, ctx) {
  let file = fileContent;
  file = file.replace(/<script>[\s\S]+?function\s+initTheme\(\)\s+\{[\s\S]+?<\/script>/g, "<script>function initTheme() {}\nfunction storeTheme() {}</script>");
  file = file.replace(/<link id="theme" rel="stylesheet" href="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/bootswatch\/4\.1\.1\/slate\/bootstrap\.min\.css"\s+crossorigin="anonymous">/g, `<link
  rel="stylesheet"
  href="/ext/bootswatch/bootstrap.min.css?${ctx._global.bootstrapcss}"
>
<link
rel="stylesheet"
href="/static/style.css?${ctx._global.stylecss}"
>`);

  file = file.replace(/https:\/\/i\.imgur\.com\/(\w+)\.png/g, "/imgur/$1.png");
  file = file.replace(/https:\/\/wiki\.guildwars2\.com\/images\/([/%_-\w.]+)\.png/g, "/wikiimg/$1.png");
  file = file.replace(/https:\/\/wiki\.guildwars2\.com\/images\/([/%_-\w.]+)\.jpg/g, "/wikiimg/$1.jpg");
  file = file.replace(/https:\/\/render\.guildwars2\.com\/file\/([/%_-\w.]+)\.png/g, "/gwrenderapi/$1.jpg");

  file = file.replace(/<div class="d-flex flex-column justify-content-center align-items-center ml-5">\s*<div class="d-flex flex-row justify-content-center align-items-center mt-2 mb-2">[\s\S]+?<\/div>/g, "<div class=\"d-flex flex-column justify-content-center align-items-center ml-5\">");
  file = file.replace(/<\/style>/, `${customStyles}\n</style>`);
  file = file.replace(/<td>\{\{row\.player\.acc\}\}<\/td>/, "<td><a target=\"_top\" :href=\"'/friends/'+encodeURIComponent(row.player.acc)\">{{row.player.acc}}</a></td>");

  file = file.replace(/\{\{getLogData\(\)\.parser\}\}/, "<a href=\"https://baaron4.github.io/GW2-Elite-Insights-Parser/\" target=\"_top\">{{getLogData().parser}}</a>");

  file = file.replace(/name:\s+logData\.fightName,[\s\S]+?icon:\s+logData\.fightIcon/, "name: logData.fightName,\n  triggerID: logData.fightID,\n  icon: logData.fightIcon");

  file = file.replace(/<h3 class="card-header text-center">{{ encounter\.name }}<\/h3>/, "<h3 class=\"card-header text-center\"><a :href=\"'/boss/'+encodeURIComponent(encounter.triggerID)\" target=\"_top\">{{encounter.name}}</a></h3>");

  const poweredBy = "<div class=\"d-flex flex-row justify-content-center align-items-center\"><a href=\"https://baaron4.github.io/GW2-Elite-Insights-Parser/\" target=\"_top\">parsed with Elite-Insights</a></div>";
  if (ctx.query && ctx.query.is === "uploading") {
    file = file.replace(/<div v-if="(cr(\s*\|\|\s*healingExtShow)?)"/, `${poweredBy}<div class="d-flex flex-row justify-content-center align-items-center">
    <div class="d-flex flex-row justify-content-center align-items-center mt-2 mb-2">
    ... uploading
    </div>
    </div><div v-if="$1"`);
  } else if (log.permalink) {
    file = file.replace(/<div v-if="(cr(\s*\|\|\s*healingExtShow)?)"/, `${poweredBy}<div class="d-flex flex-row justify-content-center align-items-center">
    <div class="d-flex flex-row justify-content-center align-items-center mt-2 mb-2">
    <input class="form-control" onclick="this.select();" type="text" value="${log.permalink}" readonly="readonly">
    </div>
    </div><div v-if="$1"`);
  } else if (log.entry) {
    file = file.replace(/<div v-if="(cr(\s*\|\|\s*healingExtShow)?)"/, `${poweredBy}<div class="d-flex flex-row justify-content-center align-items-center">
  <div class="d-flex flex-row justify-content-center align-items-center mt-2 mb-2">
  <ul class="nav nav-pills" style="pointer-events:auto;">
  <li class="nav-item">
  <a href="/log/${log.hash}/upload" target="_self" class="nav-link btn btn-primary">Upload</a>
  </li>
  </ul>
  </div>
  </div><div v-if="$1"`);
  }
  return file;
};
