const path = require("path");
const fs = require("fs-extra");
const {DateTime} = require("luxon");
const urllib = require("urllib");
const zlib = require("zlib");
const {promisify} = require("util");
const zip = promisify(zlib.deflate);
const unzip = promisify(zlib.unzip);
const adjustArcHtml = require("../util/adjust-arc-html");
const fightIconMap = require("../info/fight-icon-map");


const wings = require("../info/wings");

function ensureArray(fightName) {
  if (Array.isArray(fightName)) {
    return fightName;
  }
  return [fightName];
}

function enhanceLogs(logs) {
  const copyLogs = JSON.parse(JSON.stringify(logs.filter((l) => l)));

  const stats = {
    kills: 0,
    cmKills: 0,
    fails: 0
  };

  let fightName = null;
  let recordedByName = null;
  let collapseNumber = 1;
  for (const log of copyLogs) {
    //2020-07-03 23:23:53 +02:00
    log.timeEndDiff = DateTime.fromMillis(log.timeEndMs).toRelative({locale: "de"});
    const cleanFightName = log.fightName.replace(/\s+/g, "");
    if (cleanFightName === fightName) {
      collapseNumber += 1;
      log.displayCollapse = collapseNumber;
      if (recordedByName === log.recordedBy) {
        log.displayNameCollapse = false;
      } else {
        log.displayNameCollapse = true;
      }
      recordedByName = log.recordedBy;
    } else {
      collapseNumber = 1;
      recordedByName = log.recordedBy;
      log.displayNameCollapse = true;
    }
    fightName = cleanFightName;


    if (log.success) {
      stats.kills += 1;
      if (log.isCM) {
        stats.cmKills += 1;
      }
    } else {
      stats.fails += 1;
    }
  }
  return {
    logs: copyLogs,
    stats
  };
}

const kittyGolemTriggerIds = [
  16199,
  19645,
  19676
];

async function paginatedLogs(ctx, db, query) {
  const page = (parseInt(ctx.query.p, 10) || 0);
  const maxPages = Math.ceil((await db.logs.count(query)) / 50);
  const logs = await db.logs.find(query).sort({timeEndMs: -1})
    .skip(page * 50)
    .limit(50);

  const stats = {
    kills: await db.logs.count({$and: [
      query,
      {
        triggerID: {$nin: kittyGolemTriggerIds},
        success: true
      }
    ]}),
    cmKills: await db.logs.count({$and: [
      query,
      {
        triggerID: {$nin: kittyGolemTriggerIds},
        success: true,
        isCM: true
      }
    ]}),
    fails: await db.logs.count({$and: [
      query,
      {
        triggerID: {$nin: kittyGolemTriggerIds},
        success: {$ne: true}
      }
    ]})
  };
  return {
    logs,
    maxPages,
    page,
    stats
  };
}

module.exports = async({
  router, hashLog, db, baseConfig, eventHub
}) => {

  let lastLog = JSON.stringify({});
  let lastFriendsLog = JSON.stringify({});
  let nextTick;

  const logFilters = {
    p: 0,
    config: {}
  };

  eventHub.on("logFilter", (data) => {
    console.log("logFilter changed", data);
    clearTimeout(nextTick);
    logFilters.p = data.p || 0;
    logFilters.config = data.config || {};
    lastLog = JSON.stringify({});
    nextTick = setTimeout(updateLogs, 1);
  });
  eventHub.on("friendsFilter", (data) => {
    console.log("friendsFilter changed", data);
    clearTimeout(nextTick);
    lastFriendsLog = JSON.stringify({});
    nextTick = setTimeout(updateLogs, 1);
  });

  async function updateLogs() {

    let stats = null;
    const conf = {};
    if (logFilters.config.bossId) {
      const bossId = parseInt(decodeURIComponent(logFilters.config.bossId), 10);

      if (Number.isInteger(bossId)) {
        let bossInfo = wings.map((ws) => ws.steps).flat()
          .find((s) => ensureArray(s.triggerID).includes(bossId));

        if (!bossInfo) {
          bossInfo = {triggerID: bossId};
        }

        conf.triggerID = {$in: ensureArray(bossInfo.triggerID)};
        const bossIcon = fightIconMap[ensureArray(bossInfo.triggerID)[0]];
        stats = {
          bossIcon,
          bossInfo
        };
      }
    }
    if (logFilters.config.friend) {
      const account = decodeURIComponent(logFilters.config.friend);
      let friend = await db.friends.findOne({account});
      if (!friend && logs.length > 0) {
        friend = await db.friends.insert({
          account,
          chars: [],
          sharedLogs: 0
        });
      }
      conf.players = {$elemMatch: account};
      stats = {friend};
    }


    const {
      page, maxPages, logs, stats: readStats
    } = await paginatedLogs({query: {p: logFilters.p}}, db, conf);
    if (stats) {
      stats = {
        ...stats,
        ...readStats
      };
      if (stats.bossInfo && !stats.bossInfo.name_en) {
        stats.bossInfo.name_en = (logs[0] && logs[0].fightName && logs[0].fightName.replace(/\s+CM\s*$/, "")) || "???";
      }
      if (stats.bossInfo && !stats.bossInfo.name_de) {
        stats.bossInfo.name_de = stats.bossInfo.name_en;
      }
    }
    const newLog = JSON.stringify({
      page,
      maxPages,
      logs,
      stats
    });
    if (lastLog !== newLog) {
      console.log("Log changed");
      eventHub.emit("logs", {
        page,
        maxPages,
        logs,
        stats
      });
      lastLog = newLog;
    }

    const friends = await db.friends.find({sharedLogs: {$gte: 10}}).sort({sharedLogs: -1});

    const newFriendsLog = JSON.stringify({friends});
    if (lastFriendsLog !== newFriendsLog) {
      console.log("newFriendsLog changed");
      eventHub.emit("friends", {friends});
      lastFriendsLog = newFriendsLog;
    }

    nextTick = setTimeout(updateLogs, 500);
  }

  nextTick = setTimeout(updateLogs, 1);

  router.get("/logs", async(ctx) => {

    const {
      page, maxPages, logs
    } = await paginatedLogs(ctx, db, {});

    const logsHash = await hashLog(JSON.stringify({
      page,
      logs: logs.map((l) => l.hash)
    }));
    await ctx.renderView("logs", {
      logs: enhanceLogs(logs).logs,
      logsHash,
      page,
      maxPages
    });
  });
  router.get("/log/:hash", async(ctx) => {
    const log = await db.logs.findOne({hash: ctx.params.hash});
    if (log && log.htmlFile) {
      ctx.type = "text/html";
      if (await fs.pathExists(`${log.htmlFile}z`)) {
        const file = `${await unzip(await fs.readFile(`${log.htmlFile}z`))}` ;
        ctx.body = adjustArcHtml(log, file, ctx);
      } else {
        const file = `${await fs.readFile(log.htmlFile)}` ;
        ctx.body = adjustArcHtml(log, file, ctx);
      }
    }
  });
  router.get("/log/:hash/upload", async(ctx) => {
    const log = await db.logs.findOne({hash: ctx.params.hash});
    if (log && log.entry && !log.permalink) {
      log.permalinkFailed = false;
      await db.logs.update({_id: log._id}, {$set: {permalinkFailed: log.permalinkFailed}});
      ctx.status = 302;
      ctx.redirect(`/log/${log.hash}/uploading`);
      setTimeout(async() => {
        try {
          const res = await urllib.request("https://dps.report/uploadContent?json=1&generator=ei", {
            timeout: 240000,
            dataType: "json",
            method: "POST",
            files: {file: fs.createReadStream(path.join(baseConfig.logsPath, log.entry))}
          });
          if (res.data && res.data.permalink) {
            log.permalink = res.data.permalink;
            await db.logs.update({_id: log._id}, {$set: {permalink: log.permalink}});
          }
        } catch (error) {
          console.error(error);
          log.permalinkFailed = true;
          await db.logs.update({_id: log._id}, {$set: {permalinkFailed: log.permalinkFailed}});
        }
      }, 1);


    } else {
      ctx.status = 302;
      ctx.redirect(`/log/${log.hash}`);
    }
  });
  router.get("/log/:hash/uploading", async(ctx) => {
    const log = await db.logs.findOne({hash: ctx.params.hash});
    if (log && log.entry) {
      if (log.permalink || log.permalinkFailed) {
        ctx.status = 302;
        ctx.redirect(`/log/${log.hash}`);
      } else {
        ctx.body = "<html><head><meta http-equiv=\"refresh\" content=\"1\"><style>html{margin:0;padding:5rem;background:#272b30;}h1{color:rgb(170, 170, 170);}</style></head><body><h1>Uploading ...</h1></body>";
      }
    } else {
      ctx.status = 302;
      ctx.redirect(`/log/${log.hash}`);
    }
  });


  router.get("/friends", async(ctx) => {
    const friends = await db.friends.find({sharedLogs: {$gte: 10}}).sort({sharedLogs: -1});
    //.limit(100);
    const logsHash = await hashLog(JSON.stringify({friends}));
    await ctx.renderView("friends", {
      friends,
      logsHash
    });
  });
  router.get("/friends/:acc", async(ctx) => {
    const account = decodeURIComponent(ctx.params.acc);
    let friend = await db.friends.findOne({account});

    const {
      page, maxPages, logs, stats
    } = await paginatedLogs(ctx, db, {players: {$elemMatch: account}});
    if (!friend && logs.length > 0) {
      friend = await db.friends.insert({
        account,
        chars: [],
        sharedLogs: 0
      });
    }
    if (!friend) {
      ctx.throw(404);
    }
    const {logs: copyLogs} = enhanceLogs(logs);
    const data = {
      stats,
      page,
      maxPages,
      friend,
      logs: logs.map((l) => l.hash)
    };

    const logsHash = await hashLog(JSON.stringify(data));
    await ctx.renderView("friend", {
      ...data,
      logs: copyLogs,
      logsHash
    });
  });

  router.get("/boss/:bossId", async(ctx) => {
    const bossId = parseInt(decodeURIComponent(ctx.params.bossId), 10);

    if (!Number.isInteger(bossId)) {
      ctx.throw(404);
      return;
    }

    let bossInfo = wings.map((ws) => ws.steps).flat()
      .find((s) => ensureArray(s.triggerID).includes(bossId));

    if (!bossInfo) {
      bossInfo = {triggerID: bossId};
    }


    const {
      page, maxPages, logs, stats
    } = await paginatedLogs(ctx, db, {triggerID: {$in: ensureArray(bossInfo.triggerID)}});

    const bossIcon = fightIconMap[ensureArray(bossInfo.triggerID)[0]];
    const {logs: copyLogs} = enhanceLogs(logs);

    if (!bossInfo.name_en) {
      bossInfo.name_en = (copyLogs[0] && copyLogs[0].fightName && copyLogs[0].fightName.replace(/\s+CM\s*$/, "")) || "???";
    }
    if (!bossInfo.name_de) {
      bossInfo.name_de = bossInfo.name_en;
    }

    const data = {
      page,
      maxPages,
      bossInfo,
      bossIcon,
      stats,
      logs: logs.map((l) => l.hash)
    };
    const logsHash = await hashLog(JSON.stringify(data));
    await ctx.renderView("boss", {
      ...data,
      logs: copyLogs,
      logsHash
    });
  });

  const maxage = 31556952000;

  async function imgFromCache(ctx, localSub, url) {
    const localFile = path.join(baseConfig.processDir, ".imgcache", ...localSub);
    try {

      if (await fs.pathExists(`${localFile}.z`)) {
        if (!ctx.response.get("Cache-Control")) {
          const directives = [`max-age=${(maxage / 1000 | 0)}`];
          directives.push("immutable");
          ctx.set("Cache-Control", directives.join(","));
        }
        ctx.body = await unzip(await fs.readFile(`${localFile}.z`)) ;
        return;
      }
      if (await fs.pathExists(localFile)) {
        if (!ctx.response.get("Cache-Control")) {
          const directives = [`max-age=${(maxage / 1000 | 0)}`];
          directives.push("immutable");
          ctx.set("Cache-Control", directives.join(","));
        }
        ctx.body = await fs.readFile(localFile);
        return;
      }
    } catch (error) {
      console.warn(error);
    }
    const imgFile = await urllib.request(url, {
      timeout: 60000,
      followRedirect: true
    });
    await fs.outputFile(`${localFile}.z`, await zip(imgFile.data));
    //console.log("cached: " + `${localFile}.z`);
    if (!ctx.response.get("Cache-Control")) {
      const directives = [`max-age=${(maxage / 1000 | 0)}`];
      directives.push("immutable");
      ctx.set("Cache-Control", directives.join(","));
    }
    ctx.body = imgFile.data;
  }

  router.get("/imgur/:file", async(ctx) => imgFromCache(ctx, [
    "imgur",
    ctx.params.file
  ], `https://i.imgur.com/${ctx.params.file}`));
  router.get("/wikiimg/:file*", async(ctx) => {
    const fileListPlain = ctx.params.file.join("/");
    const fileList = ctx.params.file.map((s) => s.replace(/[^\w._-]+/g, "_")).join("/");
    return imgFromCache(ctx, [
      "wiki",
      fileList
    ], `https://wiki.guildwars2.com/images/${fileListPlain}`);
  });
  router.get("/gwrenderapi/:file*", async(ctx) => {
    const fileList = ctx.params.file.join("/");
    return imgFromCache(ctx, [
      "gwrenderapi",
      fileList
    ], `https://render.guildwars2.com/file/${fileList}`);
  });
};
