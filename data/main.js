const electron = require("electron");
const {dialog} = electron;
const path = require("path");
const fs = require("fs-extra");
const ini = require("ini");
const arcInterface = require("./arc-interface-wrapper");

const dbConnect = require("./db");
const electronHandler = require("./electron");
const gw2Interface = require("./gw2-interface");
const server = require("./server");
const updater = require("./updater");
const updateGw2Instances = require("./update-gw2-instances");
const updateMumbleLinkData = require("./update-mumble-links");
const i18n = require("./i18n");
const util = require("util");
const execSync = require("child_process").exec;
const execAsync = util.promisify(execSync);

const eventHub = require("./event-hub");
const wings = require("./info/wings");
const specs = require("./info/specs");
const pgk = require("./package.json");
const handleSquirrelEvent = require("./handle-squirrel-event");
const initStatus = require("./init-status");
const isAdmin = (async() => {
  const {stdout} = await execAsync("whoami /groups");
  const isAdmin = (stdout.indexOf("12288") > -1);
  return isAdmin;
});


const electronApp = electron.app;

if (handleSquirrelEvent(electronApp)) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  process.exit(0);
}


electronHandler({
  electronApp,
  initStatus
});

(async() => {
  //
  const processDir = electronApp.getPath("userData");
  const progressConfig = {
    parsingLogs: 0,
    parsedLogs: 0
  };
  const baseConfig = {
    dbBaseDir: processDir,
    processDir,
    appVersion: pgk.version,
    isAdmin: await isAdmin()
  };
  const db = await dbConnect({baseConfig});

  initStatus.db = db;
  initStatus.baseConfig = baseConfig;
  initStatus.eventHub = eventHub;

  let savedConfig = await db.settings.findOne({default: true});
  if (!savedConfig) {
    savedConfig = await db.settings.insert({default: true});
  }
  baseConfig.savedConfigId = savedConfig._id;

  if (!savedConfig.lang) {

    const res = await dialog.showMessageBox({
      title: "Sprache/Language/Langue:",
      buttons: i18n.langLabels
    });
    if (res.canceled) {
      console.error(new Error("no language selected"));
      process.exit(1);
    }
    savedConfig.lang = i18n.langIds[res.response];
    await db.settings.update({_id: savedConfig._id}, {$set: {lang: savedConfig.lang}});
  }
  baseConfig.lang = savedConfig.lang;

  if (!savedConfig.gw2Dir) {
    const res = await dialog.showOpenDialog({
      title: i18n[baseConfig.lang].msgSelectInstall,
      filters: [
        {
          name: "Gw2-64.exe",
          extensions: ["exe"]
        }
      ],
      properties: ["openFile"]
    });
    if (res.canceled || res.filePaths.length < 1 || !await fs.pathExists(res.filePaths[0])) {
      console.error(new Error("no GW2 exe selected"));
      process.exit(1);
    }
    savedConfig.gw2Dir = path.dirname(path.resolve(res.filePaths[0]));
    await db.settings.update({_id: savedConfig._id}, {$set: {gw2Dir: savedConfig.gw2Dir}});
  }
  baseConfig.gw2Dir = savedConfig.gw2Dir;

  baseConfig.launchBuddyDir = savedConfig.launchBuddyDir;
  baseConfig.launchBuddyConfigDir = path.join(electronApp.getPath("appData"), "Gw2 Launchbuddy");

  baseConfig.arcDisabled = savedConfig.arcDisabled;


  await updateGw2Instances({
    baseConfig,
    eventHub
  });

  initStatus.status = initStatus.state.Updating;
  await updater({
    baseConfig,
    initStatus
  });
  initStatus.status = initStatus.state.Loading;


  const arcConfigFilePath = path.join(baseConfig.gw2Dir, "addons/arcdps/arcdps.ini");
  try {
    const arcConfigFile = await fs.readFile(arcConfigFilePath);
    const arcConfig = ini.parse(`${arcConfigFile}`);
    let modified = false;
    if (!arcConfig.session || arcConfig.session.boss_encounter_saving !== "1") {
      arcConfig.session.boss_encounter_saving = "1";
      modified = true;
    }
    if (typeof arcConfig.session.boss_encounter_path === "string" && arcConfig.session.boss_encounter_path !== "") {
      const logsPath = arcConfig.session.boss_encounter_path;
      if (savedConfig.logsPath !== logsPath) {
        savedConfig.logsPath = logsPath;
        await db.settings.update({_id: baseConfig.savedConfigId}, {$set: {logsPath}});
      }
    } else {
      if (savedConfig.logsPath !== false) {
        savedConfig.logsPath = false;
        await db.settings.update({_id: baseConfig.savedConfigId}, {$set: {logsPath: false}});
      }
    }

    if (modified) {
      await new Promise((res) => {
        function checkInstances() {
          if (baseConfig.gw2Instances && baseConfig.gw2Instances.ready) {
            res();
          } else {
            setTimeout(checkInstances, 100);
          }
        }
        checkInstances();
      });
      if (baseConfig.gw2Instances.running.length <= 0) {
        await fs.outputFile(arcConfigFilePath, ini.stringify(arcConfig));
      } else {
        console.warn("Could not update arc config");
      }
    }
  } catch (error) {
    console.warn("Arc config file not found", error);
  }

  baseConfig.logsPath = savedConfig.logsPath || path.join(electronApp.getPath("documents"), "Guild Wars 2/addons/arcdps/arcdps.cbtlogs");
  baseConfig.eiConfig = path.resolve(electronApp.getAppPath(), "config.conf");

  //console.log({eiConfig: baseConfig.eiConfig});
  await gw2Interface({
    db,
    eventHub
  });
  await arcInterface({
    db,
    baseConfig,
    progressConfig,
    eventHub
  });

  updateMumbleLinkData({
    db,
    baseConfig,
    eventHub
  });

  const {
    port, io
  } = await server({
    db,
    baseConfig,
    eventHub
  });
  initStatus.io = io;

  baseConfig.langs = i18n.langIds.map((id, index) => ({
    id,
    label: i18n.langLabels[index]
  }));
  baseConfig.deps = Object.keys(pgk.dependencies);

  let builds = (baseConfig.buildJsonPath && await fs.readJSON(baseConfig.buildJsonPath) || []);
  io.on("connection", async(socket) => {
    eventHub.sockets.push(socket);
    socket.emit("accounts", {accounts: await db.accounts.find({})});
    eventHub.emit("gw2Instances", {gw2Instances: baseConfig.gw2Instances});
    socket.emit("baseConfig", {baseConfig});
    socket.emit("init", {
      wings,
      specs
    });
    socket.emit("builds", {builds});
    for (const handler of eventHub.onHandler) {
      socket.on(...handler.args);
    }
    socket.on("disconnect", () => {
      eventHub.sockets = eventHub.sockets.filter((s) => s === socket);
    });
  });

  if (baseConfig.localBuilds) {
    const updateBuilds = async() => {
      try {
        const oldBuilds = JSON.stringify(builds);
        builds = (baseConfig.buildJsonPath && await fs.readJSON(baseConfig.buildJsonPath) || []);
        if (oldBuilds !== JSON.stringify(builds)) {
          io.emit("builds", {builds});
        }
      } catch (error) {
        console.error(error);
      }
      setTimeout(updateBuilds, 500);
    };
    setTimeout(updateBuilds, 500);
  }


  await eventHub.registerIo(io);
  const appDomain = `http://127.0.0.1:${port}`;
  initStatus.appDomain = appDomain;
  initStatus.status = initStatus.state.Loaded;
})().catch((err) => {
  console.error(err);
  process.exit(1);
});


