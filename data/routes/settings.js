const {
  dialog, app
} = require("electron");
const gw2 = require("gw2");
const path = require("path");
const util = require("util");
const wincmd = require("node-windows");
const elevate = util.promisify(wincmd.elevate);

const updateAccStats = require("../update-acc-stats");
const updateArcDps = require("../update-arc-dps");
const updateArcDps11 = require("../update-arc-dps-11");
const i18n = require("../i18n");

const {spawn} = require("child_process");

module.exports = async({
  router, db, baseConfig, eventHub
}) => {

  async function renderSettings(ctx) {
    await ctx.renderView("settings", {});
  }

  router.get("/settings", async(ctx) => renderSettings(ctx));
  eventHub.on("addAccount", async({token}) => {
    if (token) {
      const acc = await db.accounts.insert({token});
      eventHub.emit("accounts", {accounts: await db.accounts.find({})});
      const client = new gw2.Client();
      const accountInfo = await client.get("account", {token: acc.token});
      await db.accounts.update({_id: acc._id}, {$set: {accountInfo}});
      eventHub.emit("accounts", {accounts: await db.accounts.find({})});
      const account = await db.accounts.findOne({_id: acc._id});
      await updateAccStats({
        db,
        client,
        account,
        eventHub
      });
      eventHub.emit("accounts", {accounts: await db.accounts.find({})});
    }
  });
  eventHub.on("removeAccount", async({token}) => {
    if (token) {
      const acc = await db.accounts.findOne({token});
      if (acc) {

        const res = await dialog.showMessageBox({
          message: "Wirklich löschen",
          type: "warning",
          buttons: [
            "Löschen",
            "Abbrechen"
          ],
          defaultId: 1,
          cancelId: 1
        });
        if (res.response === 0) {
          await db.accounts.remove({_id: acc._id});
          eventHub.emit("accounts", {accounts: await db.accounts.find({})});
        }
      }
    }
  });
  eventHub.on("changeLang", async({lang}) => {
    //console.log("changeLang", {lang});
    if (lang) {
      if (i18n.langIds.includes(lang)) {
        baseConfig.lang = lang;
        eventHub.emit("baseConfig", {baseConfig});
        await db.settings.update({_id: baseConfig.savedConfigId}, {$set: {lang: baseConfig.lang}});
      }
    }
  });
  eventHub.on("selectLogsPath", async() => {
    //console.log("selectLogsPath", {});
    const res = await dialog.showOpenDialog({
      title: "arcdps Logs Ordner",
      properties: ["openDirectory"],
      buttonLabel: "Übernehmen und neustarten",
      defaultPath: baseConfig.logsPath
    });
    await db.settings.update({_id: baseConfig.savedConfigId}, {$set: {logsPath: res.filePaths[0]}});
    app.relaunch();
    app.exit(0);
  });
  eventHub.on("selectGw2Dir", async() => {
    //console.log("selectGw2Dir", {});
    const res = await dialog.showOpenDialog({
      title: "Wähle deine Guild Wars 2 Installation aus:",
      filters: [
        {
          name: "Gw2-64.exe",
          extensions: ["exe"]
        }
      ],
      properties: ["openFile"],
      buttonLabel: "Übernehmen und neustarten",
      defaultPath: baseConfig.gw2Dir
    });
    if (!res.canceled && res.filePaths.length > 0) {
      baseConfig.gw2Dir = path.dirname(res.filePaths[0]);
      eventHub.emit("baseConfig", {baseConfig});
      await db.settings.update({_id: baseConfig.savedConfigId}, {$set: {gw2Dir: baseConfig.gw2Dir}});
    }
    app.relaunch();
    app.exit(0);
  });

  eventHub.on("selectLaunchBuddyDir", async() => {
    //console.log("selectLaunchBuddyDir", {});
    const res = await dialog.showOpenDialog({
      title: "Wähle deine GW2 LaunchBuddy Installation aus:",
      filters: [
        {
          name: "Gw2.Launchbuddy.exe",
          extensions: ["exe"]
        }
      ],
      properties: ["openFile"],
      buttonLabel: "Übernehmen und neustarten",
      defaultPath: baseConfig.launchBuddyDir || ""
    });
    if (!res.canceled && res.filePaths.length > 0) {
      baseConfig.launchBuddyDir = path.dirname(res.filePaths[0]);
      eventHub.emit("baseConfig", {baseConfig});
      await db.settings.update({_id: baseConfig.savedConfigId}, {$set: {launchBuddyDir: baseConfig.launchBuddyDir}});
    }
  });
  eventHub.on("removeLaunchBuddyDir", async() => {
    //console.log("removeLaunchBuddyDir", {});
    baseConfig.launchBuddyDir = null;
    eventHub.emit("baseConfig", {baseConfig});
    await db.settings.update({_id: baseConfig.savedConfigId}, {$set: {launchBuddyDir: baseConfig.launchBuddyDir}});
  });
  eventHub.on("resetAllLogs", async({confirmReset}) => {
    //console.log("resetAllLogs", {confirmReset});
    if (confirmReset === "reset") {
      await db.logs.remove({}, {multi: true});
      await db.known_friends.remove({}, {multi: true});
      await db.friends.remove({}, {multi: true});
      await dialog.showMessageBox({message: "Erfolgreich zurück gesetzt"});
      app.relaunch();
      app.exit(0);
    } else {
      await dialog.showMessageBox({message: "Bitte trage 'reset' ein um zu bestätigen, dass du wirklich alle Logs neu einlesen willst willst."});
    }
  });

  eventHub.on("updateArcDps", async() => {
    //console.log("updateArcDps", {});
    await updateArcDps({
      baseConfig,
      dialogs: true
    });
    eventHub.emit("baseConfig", {baseConfig});
  });
  eventHub.on("updateArcDps11", async() => {
    //console.log("updateArcDps11", {});
    await updateArcDps11({
      baseConfig,
      dialogs: true
    });
    eventHub.emit("baseConfig", {baseConfig});
  });
  eventHub.on("checkArcUpdates", async() => {
    //console.log("checkArcUpdates", {});
    if (!baseConfig.arcDisabled) {
      try {
        await updateArcDps({
          baseConfig,
          dialogs: false
        });
        eventHub.emit("baseConfig", {baseConfig});
      } catch (error) {
        console.error(error);
      }
      try {
        await updateArcDps11({
          baseConfig,
          dialogs: false
        });
        eventHub.emit("baseConfig", {baseConfig});
      } catch (error) {
        console.error(error);
      }
    }
  });
  eventHub.on("disableArcUpdates", async() => {
    //console.log("disableArcUpdates", {});
    baseConfig.arcDisabled = true;
    eventHub.emit("baseConfig", {baseConfig});
    await db.settings.update({_id: baseConfig.savedConfigId}, {$set: {arcDisabled: baseConfig.arcDisabled}});
  });
  eventHub.on("enableArcUpdates", async() => {
    //console.log("enableArcUpdates", {});
    baseConfig.arcDisabled = false;
    eventHub.emit("baseConfig", {baseConfig});
    await db.settings.update({_id: baseConfig.savedConfigId}, {$set: {arcDisabled: baseConfig.arcDisabled}});
    try {
      await updateArcDps({
        baseConfig,
        dialogs: false
      });
      eventHub.emit("baseConfig", {baseConfig});
    } catch (error) {
      console.error(error);
    }
    try {
      await updateArcDps11({
        baseConfig,
        dialogs: false
      });
      eventHub.emit("baseConfig", {baseConfig});
    } catch (error) {
      console.error(error);
    }
  });

  eventHub.on("startGame", async() => {
    //console.log("startGame", {});
    if (baseConfig.launchBuddyDir) {
      if (baseConfig.gw2Instances.lauchbuddy.length < 1) {
        const started = await elevate(path.join(baseConfig.launchBuddyDir, "Gw2.Launchbuddy.exe"), {cwd: baseConfig.launchBuddyDir});
        baseConfig.gw2Instances.lauchbuddy.push({
          name: "Gw2.Launchbuddy.exe",
          pid: started.pid
        });
        eventHub.emit("baseConfig", {baseConfig});
      }
    } else {
      if (baseConfig.gw2Dir && baseConfig.gw2Instances.running.length < 1) {
        const started = spawn(path.join(baseConfig.gw2Dir, "Gw2-64.exe"), {
          cwd: baseConfig.gw2Dir,
          detached: true,
          stdio: "ignore"
        });
        baseConfig.gw2Instances.running.push({
          name: "Gw2-64.exe",
          pid: started.pid
        });
        eventHub.emit("baseConfig", {baseConfig});
      }
    }
  });

};
