const path = require("path");
const fs = require("fs-extra");
const fg = require("fast-glob");
const chokidar = require("chokidar");
const EventEmitter = require("events");


const fightIconMap = require("./info/fight-icon-map");

const {
  db, baseConfig, progressConfig
} = require("./arc-interface/main-proxy");
const updateLogEntry = require("./arc-interface/update-log-entry");
const handleCompress = require("./arc-interface/handle-compress");

(async() => {
  const logsPath = await baseConfig.logsPath;
  for (const [
    triggerID,
    fightIcon
  ] of Object.entries(fightIconMap)) {
    await db.logs.update({
      triggerID: parseInt(triggerID, 10),
      fightIcon: {$ne: fightIcon}
    }, {$set: {fightIcon}}, {multi: true});
  }


  const counter = {
    i: 0,
    j: 0
  };
  let chokidarReady = false;

  let queue = Promise.resolve();
  function singleton() {
    return new Promise((res) => {
      let next;
      const done = new Promise((res) => next = res);
      queue.then(() => res(next)).catch((err) => {
        console.error(err);
        next();
      });
      queue = done;
    });
  }

  const ee1 = new EventEmitter({captureRejections: true});
  ee1.on("log", async(entry) => {
    console.log(`adding: ${entry}`);
    counter.i++;
    progressConfig.parsingLogs = counter.i;
    const done = await singleton();
    try {
      console.log(`parsing: ${entry}`);
      progressConfig.$currentLog = entry;
      await updateLogEntry(logsPath, entry);
      progressConfig.$currentLog = false;
      console.log(`parsed ${entry}`);
      counter.j++;
      progressConfig.$parsedLogs = counter.j;
      if (counter.i === counter.j && chokidarReady) {
        counter.i = 0;
        counter.j = 0;
        progressConfig.$parsingLogs = counter.i;
        progressConfig.$parsedLogs = counter.j;
      }
      done();
    } catch (error) {
      done();
      throw error;
    }

  });
  ee1.on("compress", async(entry) => {
    const done = await singleton();
    await handleCompress(logsPath, [entry]);
    done();
  });

  ee1.on("error", (err) => {
    console.error(err);
  });


  const start = Date.now();
  const watcher = chokidar.watch([
    "**/*.?(z)evtc",
    "**/*.json",
    "**/*.html",
    "*.?(z)evtc",
    "*.json",
    "*.html"
  ], {
    cwd: logsPath,
    ignoreInitial: false,
    awaitWriteFinish: true,
    ignored: [".raid-tool/**"]
  });
  watcher.on("add", async(chokPath) => {
    const entry = chokPath.replace(/\\/g, "/");
    //console.log({entry});
    if (entry.match(/\.z?evtc$/)) {
      ee1.emit("log", entry);
    }
    if (entry.match(/\.(json|html)$/)) {
      const uncompressedJSON = chokPath.replace(/\\/g, "/");
      ee1.emit("compress", uncompressedJSON);
    }
  });
  watcher.on("ready", () => {
    chokidarReady = true;
    if (counter.i === counter.j && chokidarReady) {
      counter.i = 0;
      counter.j = 0;
    }
    progressConfig.$parsingLogs = counter.i;
    progressConfig.$parsedLogs = counter.j;
    const end = Date.now();
    console.info(`All events added. in ${(end - start) / 1000} sec`);
  });

  const brokenFiles = await fg(
    [
      "**/*.zevtc-broken",
      "**/*.evtc-broken"
    ]
    , {
      dot: true,
      cwd: logsPath
    }
  );
  for (const brokenFile of brokenFiles) {
    console.info(`restore: ${brokenFile}`);
    await fs.move(path.join(logsPath, brokenFile), path.join(logsPath, brokenFile.replace(/-broken$/, "")));
  }
})();
