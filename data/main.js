const electron = require("electron");
const path = require("path");
const fs = require("fs-extra");
const detachedInterfaceWrapper = require("./detached-interface-wrapper");

const dbConnect = require("./db");
const electronHandler = require("./electron");
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
const specs = require("./info/specs.json");
const uniqueSpecs = require("./info/unique-specs.json");
const pgk = require("./package.json");
const handleSquirrelEvent = require("./handle-squirrel-event");
const initStatus = require("./init-status");
const loadConfig = require("./util/load-config");
const loadArcdpsConfig = require("./util/load-arcdps-config");
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
  const userDataDir = electronApp.getPath("userData");
  const progressConfig = {
    parsingLogs: 0,
    parsedLogs: 0,
    compressingLogs: 0,
    compressedLogs: 0,
    currentLog: false
  };
  const backendConfig = {
    userDataDir,
    dbBaseDir: userDataDir
  };
  const baseConfig = {
    appVersion: pgk.version,
    isAdmin: await isAdmin()
  };
  const db = await dbConnect({backendConfig});

  initStatus.db = db;
  initStatus.baseConfig = baseConfig;
  initStatus.backendConfig = backendConfig;
  initStatus.eventHub = eventHub;

  const savedConfig = await loadConfig(db, baseConfig, electronApp);


  await updateGw2Instances({
    baseConfig,
    eventHub
  });

  initStatus.status = initStatus.state.Updating;
  await updater({
    baseConfig,
    backendConfig,
    initStatus
  });
  initStatus.status = initStatus.state.Loading;


  await loadArcdpsConfig(baseConfig, savedConfig, db, electronApp);

  //console.log({eiConfig: baseConfig.eiConfig});
  await detachedInterfaceWrapper(path.join(__dirname, "./gw2-interface.js"), {
    db,
    baseConfig,
    progressConfig,
    eventHub
  }, 10);
  await detachedInterfaceWrapper(path.join(__dirname, "./arc-interface.js"), {
    db,
    baseConfig,
    progressConfig,
    eventHub
  }, 50);

  updateMumbleLinkData({
    db,
    baseConfig,
    eventHub
  });

  const {io} = await server({
    db,
    baseConfig,
    backendConfig,
    eventHub
  });
  initStatus.io = io;

  let builds = (baseConfig.buildJsonPath && await fs.readJSON(baseConfig.buildJsonPath) || []);
  io.on("connection", async(socket) => {
    eventHub.sockets.push(socket);
    socket.emit("accounts", {accounts: await db.accounts.find({})});
    socket.emit("gw2Instances", {gw2Instances: baseConfig.gw2Instances});
    socket.emit("baseConfig", {baseConfig});
    socket.emit("progressConfig", {progressConfig});
    socket.emit("init", {
      wings,
      specs,
      uniqueSpecs,
      deps: Object.keys(pgk.dependencies),
      langs: i18n.langIds.map((id, index) => ({
        id,
        label: i18n.langLabels[index]
      }))
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
  backendConfig.appDomain = `https://127.0.0.1:${backendConfig.port}/`;
  initStatus.status = initStatus.state.Loaded;
})().catch((err) => {
  console.error(err);
  process.exit(1);
});


