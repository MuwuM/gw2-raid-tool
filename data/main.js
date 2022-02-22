const electron = require("electron");
const ChildProcess = require("child_process");
const {dialog} = electron;
const path = require("path");
const fs = require("fs-extra");
const arcInterface = require("./arc-interface-wrapper");

const dbConnect = require("./db");
const electronHandler = require("./electron");
const gw2Interface = require("./gw2-interface");
const server = require("./server");
const updater = require("./updater");
const updateGw2Instances = require("./update-gw2-instances");
const i18n = require("./i18n");
const {version: appVersion} = require("./package.json");

const eventHub = require("./event-hub");
const wings = require("./info/wings");
const pgk = require("./package.json");


let markUpdaterDone;
const updaterDone = new Promise((res) => markUpdaterDone = res);

let markServerReady;
const serverReady = new Promise((res) => markServerReady = res);


const electronApp = electron.app;

if (handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
}

function handleSquirrelEvent() {
  if (process.argv.length === 1) {
    return false;
  }

  const appFolder = path.resolve(process.execPath, "..");
  const rootAtomFolder = path.resolve(appFolder, "..");
  const updateDotExe = path.resolve(path.join(rootAtomFolder, "Update.exe"));
  const exeName = path.basename(process.execPath);

  const spawn = function(command, args) {
    let spawnedProcess;
    try {
      spawnedProcess = ChildProcess.spawn(command, args, {detached: true});
    } catch (error) {
      console.error(error);
    }

    return spawnedProcess;
  };

  const spawnUpdate = function(args) {
    return spawn(updateDotExe, args);
  };

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
  case "--squirrel-install":
  case "--squirrel-updated":
    // Optionally do things such as:
    // - Add your .exe to the PATH
    // - Write to the registry for things like file associations and
    //   explorer context menus

    // Install desktop and start menu shortcuts
    spawnUpdate([
      "--createShortcut",
      exeName
    ]);

    setTimeout(electronApp.quit, 1000);
    return true;

  case "--squirrel-uninstall":
    // Undo anything you did in the --squirrel-install and
    // --squirrel-updated handlers

    // Remove desktop and start menu shortcuts
    spawnUpdate([
      "--removeShortcut",
      exeName
    ]);

    setTimeout(electronApp.quit, 1000);
    return true;

  case "--squirrel-obsolete":
    // This is called on the outgoing version of your app before
    // we update to the new version - it's the opposite of
    // --squirrel-updated

    electronApp.quit();
    return true;
  }
}

electronHandler({
  updaterDone,
  serverReady,
  electronApp
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
    appVersion
  };
  //await new Promise(() => {});
  const db = await dbConnect({baseConfig});
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

  baseConfig.arcDisabled = savedConfig.arcDisabled;

  await updateGw2Instances({
    baseConfig,
    eventHub
  });

  await updater({baseConfig});
  markUpdaterDone();

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

  const {
    port, io
  } = await server({
    db,
    baseConfig,
    eventHub
  });

  baseConfig.langs = i18n.langIds.map((id, index) => ({
    id,
    label: i18n.langLabels[index]
  }));
  baseConfig.deps = Object.keys(pgk.dependencies);

  io.on("connection", async(socket) => {
    eventHub.sockets.push(socket);
    socket.emit("accounts", {accounts: await db.accounts.find({})});
    eventHub.emit("gw2Instances", {gw2Instances: baseConfig.gw2Instances});
    socket.emit("baseConfig", {baseConfig});
    socket.emit("wings", {wings});
    for (const handler of eventHub.onHandler) {
      socket.on(...handler.args);
    }
    socket.on("disconnect", () => {
      eventHub.sockets = eventHub.sockets.filter((s) => s === socket);
    });
  });

  await eventHub.registerIo(io);
  const appDomain = `http://127.0.0.1:${port}`;
  markServerReady({
    appDomain,
    db,
    io
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});


