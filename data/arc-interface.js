const path = require("path");
const fg = require("fast-glob");
const chokidar = require("chokidar");
const fs = require("fs-extra");
const {spawn} = require("child_process");
const {DateTime} = require("luxon");
const zlib = require("zlib");
const {promisify} = require("util");

const zip = promisify(zlib.deflate);
const unzip = promisify(zlib.unzip);

const fightIconMap = require("./info/fight-icon-map");
const hashLog = require("./hash-log");
const updateKnownFriends = require("./arc-interface-friends");

async function execDetached(app, params, options) {
  return new Promise((res, rej) => {
    const bat = spawn(app, params, {
      ...options,
      detached: true
    });
    bat.on("error", (err) => {
      console.error(new Error(err.stack || err));
      rej(new Error("exec failed"));
    });

    /*bat.stdout.on("data", (data) => {
      console.log(`${data}`);
    });*/
    bat.stderr.on("data", (data) => {
      console.error(new Error(`${data}`));
    });
    bat.on("exit", (code) => {
      if (code > 0) {
        rej(new Error("exec failed"));
      } else {
        res();
      }
    });
  });
}

async function readJSON(file) {
  try {

    if (await fs.pathExists(`${file}z`)) {
      const content = await fs.readFile(`${file}z`);
      const unzipped = await unzip(content);
      return JSON.parse(`${unzipped}`);
    }
    return await fs.readJSON(file);

  } catch (error) {
    throw new Error(`Error reading File: '${file}'\n${error.message || error}\n${error.stack || ""}`);
  }
}

function waitFor(glob, cwd) {
  const {stack} = new Error("");
  return new Promise((res, rej) => {
    const tooLate = setTimeout(() => {
      rej(new Error(`wait for file Timed out\n${stack}`));
      watcher.close();
    }, 60000);
    const watcher = chokidar.watch(glob, {
      cwd,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });
    watcher.once("add", (chokiPath) => {
      clearTimeout(tooLate);
      res([chokiPath]);
      watcher.close();
    });
    watcher.once("error", (err) => {
      clearTimeout(tooLate);
      rej(err);
      watcher.close();
    });
  });
}

function logHeap(msg) {
  const mem = process.memoryUsage();

  console.log(`heap: ${(mem.heapUsed / mem.heapTotal * 100).toFixed(2)}% (${(mem.heapTotal / 1048576).toFixed(3)} MB) -> ${msg}`);
}

let reqIdCount = 0;

const db = new Proxy({}, {get(t, database) {
  if (!t[database]) {
    t[database] = new Proxy({}, {get(s, method) {
      return (...options) => new Promise((res, rej) => {
        reqIdCount++;
        const reqId = reqIdCount;
        const respHandler = (resp) => {
          if (resp && resp.msg === "error" && resp.reqId === reqId) {
            process.off("message", respHandler);
            rej(resp.err);
            return;
          }
          if (!resp || resp.msg !== "dbres" || resp.reqId !== reqId) {
            return;
          }
          process.off("message", respHandler);
          res(resp.dbres);
        };
        process.on("message", respHandler);
        process.send({
          msg: "db",
          reqId,
          database,
          method,
          options
        });
      });
    }});
  }
  return t[database];
}});


const baseConfig = new Proxy({}, {
  get(t, prop) {
    if (!t[`get-${prop}`]) {
      t[`get-${prop}`] = new Promise((res, rej) => {
        reqIdCount++;
        const reqId = reqIdCount;
        const respHandler = (resp) => {
          if (resp && resp.msg === "error" && resp.reqId === reqId) {
            process.off("message", respHandler);
            rej(resp.err);
            return;
          }
          if (!resp || resp.msg !== "cfgRes" || resp.reqId !== reqId) {
            return;
          }
          process.off("message", respHandler);
          res(resp.cfgRes);
        };
        process.on("message", respHandler);
        process.send({
          msg: "getBaseConfig",
          reqId,
          prop
        });
      });
    }
    return t[`get-${prop}`];
  },
  set(t, prop, value) {
    reqIdCount++;
    const reqId = reqIdCount;
    process.send({
      msg: "setBaseConfig",
      reqId,
      prop,
      value
    });
  }
});

(async() => {
  for (const [
    triggerID,
    fightIcon
  ] of Object.entries(fightIconMap)) {
    await db.logs.update({
      triggerID,
      fightIcon: {$ne: fightIcon}
    }, {$set: {fightIcon}}, {multi: true});
  }


  async function checkLogs(baseFile, dateInfo, entry, parseFailed) {
    const logFiles = await fg([`${baseFile}/${dateInfo[1]}-${dateInfo[2]}.log`], {
      dot: true,
      cwd: await baseConfig.logsPath
    });
    const logFile = logFiles && logFiles[0] && path.join(await baseConfig.logsPath, logFiles[0]);
    //console.log(`checkLogs: ${logFile}`);
    if (logFile) {
      const log = `${await fs.readFile(logFile)}`;
      const lines = log.split(/\s*[\n\r]+\s*/).filter((t) => t !== "");
      const result = lines[lines.length - 1];
      /*console.log({
        logFile,
        result
      });*/
      if (!result.startsWith("Completed parsing")) {
        if (result.match(/(^Fight is too short(:.+)?$|^Buffs can not be stackless$)/)) {
          console.warn(`Removed broken: ${entry}`);
          await fs.remove(path.join(await baseConfig.logsPath, entry));
        } else {
          if (await fs.pathExists(`${logFile}-backup`)) {
            await fs.remove(`${logFile}-backup`);
          }
          await fs.move(logFile, `${logFile}-backup`);
        }
        return false;
      }
      return true;
    } else if (parseFailed) {
      console.warn(`Removed broken: ${entry}`);
      const entryPath = path.join(await baseConfig.logsPath, entry);
      if (await fs.pathExists(`${entryPath}-broken`)) {
        await fs.remove(`${entryPath}-broken`);
      }
      await fs.move(entryPath, `${entryPath}-broken`);
    }
    return true;
  }

  async function assignLog(htmlFile, entry) {
    const known = await db.logs.findOne({htmlFile});
    if (known) {
      await db.logs.update({_id: known._id}, {$set: {entry}});
      //console.log(known);
      return;
    }
    const logFile = htmlFile.replace(/\.html$/, ".json");
    let json = null;
    try {
      json = await readJSON(logFile);
    } catch (error) {
      console.error(new Error(error.stack || error));
      let htmlStats;
      if (await fs.pathExists(`${htmlFile}z`)) {
        htmlStats = await fs.stat(`${htmlFile}z`);
      } else if (await fs.pathExists(htmlFile)) {
        htmlStats = await fs.stat(htmlFile);
      }
      if (!htmlStats || htmlStats.size <= 8) {
        console.warn(`Removed broken: ${entry}`);
        await fs.remove(path.join(await baseConfig.logsPath, entry));
        if (await fs.pathExists(htmlFile)) {
          await fs.remove(htmlFile);
        }
        if (await fs.pathExists(`${htmlFile}z`)) {
          await fs.remove(`${htmlFile}z`);
        }
        if (await fs.pathExists(logFile)) {
          await fs.remove(logFile);
        }
        if (await fs.pathExists(`${logFile}z`)) {
          await fs.remove(`${logFile}z`);
        }
      } else if (!await fs.pathExists(`${htmlFile}-backup`) || !await fs.pathExists(`${htmlFile}z-backup`)) {
        if (await fs.pathExists(htmlFile)) {
          await fs.move(htmlFile, `${htmlFile}-backup`);
        }
        if (await fs.pathExists(`${htmlFile}z`)) {
          await fs.move(`${htmlFile}z`, `${`${htmlFile}z`}-backup`);
        }
        if (await fs.pathExists(logFile)) {
          await fs.move(logFile, `${logFile}-backup`);
        }
        if (await fs.pathExists(`${logFile}z`)) {
          await fs.move(`${logFile}z`, `${`${logFile}z`}-backup`);
        }
      }
      console.warn("could not read log");
      return;
    }
    await db.logs.insert({
      hash: await hashLog(htmlFile),
      htmlFile,
      fightIcon: fightIconMap[json.triggerID] || (
        json.fightIcon && json.fightIcon.startsWith("https://wiki.guildwars2.com/images/") && json.fightIcon
      ),
      eliteInsightsVersion: json.eliteInsightsVersion,
      triggerID: json.triggerID,
      fightName: json.fightName,
      arcVersion: json.arcVersion,
      gW2Build: json.gW2Build,
      language: json.language,
      languageID: json.languageID,
      recordedBy: json.recordedBy,
      timeStart: json.timeStartStd,
      timeEnd: json.timeEndStd,
      timeEndMs: DateTime.fromFormat(json.timeEndStd, "yyyy-MM-dd HH:mm:ss ZZ").toMillis(),
      duration: json.duration,
      success: json.success,
      isCM: json.isCM,
      entry,
      players: json.players.map((p) => p.account)
    });
  }

  const lockedEntry = {};

  async function updateLogEntry(entry) {
    if (lockedEntry[entry]) {
      console.warn(`Entry locked: ${entry}`);
      return;
    }
    lockedEntry[entry] = true;
    const logsPath = await baseConfig.logsPath;
    try {


      if (entry.match(/[()]/)) {
        console.info(`rename: ${path.resolve(logsPath, entry)}`);
        const targetEntry = entry.replace(/[()]/g, "");
        try {
          await fs.move(path.resolve(logsPath, entry), path.resolve(logsPath, targetEntry));
          console.info(`renamed to: ${targetEntry}`);
        } catch (error) {
          console.error(new Error(error.stack || error));
        }
        delete lockedEntry[entry];
        return updateLogEntry();
      }
      const baseFile = path.dirname(entry);
      const dateInfo = entry.match(/\/(\d{8})-(\d+)\.z?evtc$/);

      if (!dateInfo) {
        delete lockedEntry[entry];
        return;
      }

      const knownFriendCache = await db.known_friends.findOne({entry});
      const known = await db.logs.findOne({entry});

      if (known && (knownFriendCache && knownFriendCache.status !== "failed")) {
        //console.log(`already known: ${entry}`);
        delete lockedEntry[entry];
        return;
      }
      //console.log(`try to find: ${entry}`);
      const htmlFiles = await fg([
        `${baseFile}/${dateInfo[1]}-${dateInfo[2]}_*.html`,
        `${baseFile}/${dateInfo[1]}-${dateInfo[2]}_*.htmlz`
      ], {
        dot: true,
        cwd: logsPath
      });

      const htmlFile = htmlFiles && htmlFiles[0] && path.join(logsPath, htmlFiles[0].replace(/\.htmlz$/, ".html"));

      //console.log({htmlFile});

      if (htmlFile && (!knownFriendCache || knownFriendCache.status === "failed")) {
        await updateKnownFriends({
          knownFriendCache,
          htmlFile,
          entry,
          db,
          baseConfig,
          readJSON
        }).catch((err) => {
          throw new Error(err.stack || err);
        });
      }

      if (known) {
        delete lockedEntry[entry];
        return;
      }

      if (!htmlFile || (!await fs.pathExists(htmlFile) && !await fs.pathExists(`${htmlFile}z`))) {
        console.info(`Parsing Log: ${entry}`);
        //console.log({htmlFile});
        //console.log({entry});
        logHeap("checkLogs");
        if (!await checkLogs(baseFile, dateInfo, entry, false).catch((err) => {
          throw new Error(err.stack || err);
        })) {
          delete lockedEntry[entry];
          return;
        }

        logHeap("execDetached");
        const logFilePath = path.join(logsPath, entry);
        try {

          await execDetached(`${await baseConfig.eiPath}`, [
            "-c",
            `${await baseConfig.eiConfig}`,
            "-p",
            `${logFilePath}`
          ], {cwd: path.dirname(logFilePath)});
          await waitFor([entry.replace(/\.z?evtc$/, ".log")], logsPath);
        } catch (error) {
          console.error(new Error(error.stack || error));
          await waitFor([entry.replace(/\.z?evtc$/, ".log")], logsPath);
          if (!await checkLogs(baseFile, dateInfo, entry, true)) {
            delete lockedEntry[entry];
            return;
          }
          delete lockedEntry[entry];
          return;
        }

        logHeap("checkLogs");
        if (!await checkLogs(baseFile, dateInfo, entry).catch((err) => {
          throw new Error(err.stack || err);
        })) {
          delete lockedEntry[entry];
          return;
        }
        console.info(`Log parsed: ${entry}`);


        logHeap("waitForHtml");
        const waitForHtml = waitFor([
          `${baseFile}/${dateInfo[1]}-${dateInfo[2]}_*.html`,
          `${baseFile}/${dateInfo[1]}-${dateInfo[2]}_*.htmlz`
        ], logsPath);
        const waitForJson = waitFor([
          `${baseFile}/${dateInfo[1]}-${dateInfo[2]}_*.json`,
          `${baseFile}/${dateInfo[1]}-${dateInfo[2]}_*.jsonz`
        ], logsPath);

        const htmlInnerFiles = await waitForHtml; /*fg([
          `${baseFile}/${dateInfo[1]}-${dateInfo[2]}_*.html`,
          `${baseFile}/${dateInfo[1]}-${dateInfo[2]}_*.htmlz`
        ], {
          dot: true,
          cwd: baseConfig.logsPath
        });*/
        await waitForJson;
        console.info(`JSON/HTML ready: ${entry}`);

        const htmlFile2 = htmlInnerFiles && htmlInnerFiles[0] && path.join(logsPath, htmlInnerFiles[0].replace(/\.htmlz$/, ".html"));
        if (htmlFile2) {
          if (!await checkLogs(baseFile, dateInfo, entry, false).catch((err) => {
            throw new Error(err.stack || err);
          })) {
            console.warn("checkLog failed");
            delete lockedEntry[entry];
            return;
          }
          await assignLog(htmlFile2, entry).catch((err) => {
            throw new Error(err.stack || err);
          });
          //console.log("log assigned");
          if (htmlFile2 && (!knownFriendCache || knownFriendCache.status === "failed")) {
            await updateKnownFriends({
              knownFriendCache,
              htmlFile: htmlFile2,
              entry,
              db,
              baseConfig,
              readJSON
            }).catch((err) => {
              throw new Error(err.stack || err);
            });
            //console.log("updateKnownFriends");
          }
        } else {
          console.error(path.join(logsPath, entry));
          delete lockedEntry[entry];
          return;
        }
      } else if (htmlFile) {
        if (!await checkLogs(baseFile, dateInfo, entry, false).catch((err) => {
          throw new Error(err.stack || err);
        })) {
          delete lockedEntry[entry];
          return;
        }
        await assignLog(htmlFile, entry).catch((err) => {
          throw new Error(err.stack || err);
        });
      }

      delete lockedEntry[entry];
    } catch (error) {
      console.error(new Error(error.stack || error));
      delete lockedEntry[entry];
    }
  }

  let i = 0;
  let j = 0;

  const logEntries = [];
  const compressEntries = [];
  let processingLogEntries = false;

  async function handleCompress() {
    const logsPath = await baseConfig.logsPath;
    while (compressEntries.length > 0) {
      const uncompressedJSON = compressEntries.shift();
      console.info(`compressing: ${uncompressedJSON}`);
      const content = await fs.readFile(path.join(logsPath, uncompressedJSON));
      await fs.outputFile(path.join(logsPath, `${uncompressedJSON}z`), await zip(content));
      await fs.remove(path.join(logsPath, uncompressedJSON));
    }
  }
  async function handleLogEntry() {
    if (processingLogEntries) {
      return;
    }
    processingLogEntries = true;

    const entry = logEntries.shift();
    if (!entry) {
      await handleCompress();
      processingLogEntries = false;
      return;
    }
    try {
      await updateLogEntry(entry);
    } catch (error) {
      console.error(error);
    }
    j++;
    baseConfig.parsedLogs = j;
    if (i === j) {
      i = 0;
      j = 0;
      baseConfig.parsingLogs = i;
      baseConfig.parsedLogs = j;
    }
    logHeap(`Queue-size: ${i - j}`);

    await handleCompress();
    processingLogEntries = false;
    setImmediate(handleLogEntry);
  }

  //setInterval(() => logHeap("Tick"), 5000);

  const watcher = chokidar.watch([
    "**/*.zevtc",
    "**/*.evtc",
    "**/*.json",
    "**/*.html"
  ], {
    cwd: await baseConfig.logsPath,
    awaitWriteFinish: true
  });
  watcher.on("add", async(chokPath) => {
    const entry = chokPath.replace(/\\/g, "/");
    if (entry.match(/\.z?evtc$/)) {
      i++;
      baseConfig.parsingLogs = i;
      logEntries.push(entry);
      setImmediate(handleLogEntry);
    }
    if (entry.match(/\.(json|html)$/)) {
      const uncompressedJSON = chokPath.replace(/\\/g, "/");
      compressEntries.push(uncompressedJSON);
      setImmediate(handleLogEntry);
    }

  });

  const brokenFiles = await fg(
    [
      "**/*.zevtc-broken",
      "**/*.evtc-broken"
    ]
    , {
      dot: true,
      cwd: await baseConfig.logsPath
    }
  );
  for (const brokenFile of brokenFiles) {
    console.log(`restore: ${brokenFile}`);
    await fs.move(path.join(await baseConfig.logsPath, brokenFile), path.join(await baseConfig.logsPath, brokenFile.replace(/-broken$/, "")));
  }
})();
