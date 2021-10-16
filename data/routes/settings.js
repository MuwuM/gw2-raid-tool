const {
  dialog, app
} = require("electron");
const gw2 = require("gw2");
const path = require("path");
const util = require("util");
const wincmd = require("node-windows");
const elevate = util.promisify(wincmd.elevate);

const hashLog = require("../hash-log");
const updateAccStats = require("../update-acc-stats");
const updateArcDps = require("../update-arc-dps");
const updateArcDps11 = require("../update-arc-dps-11");
const i18n = require("../i18n");

const {spawn} = require("child_process");

module.exports = async({
  router, db, baseConfig
}) => {

  async function renderSettings(ctx) {
    const accs = await db.accounts.find({});
    const data = {
      accounts: accs,
      appVersion: baseConfig.appVersion,
      logsPath: baseConfig.logsPath,
      gw2Dir: baseConfig.gw2Dir,
      launchBuddyDir: baseConfig.launchBuddyDir,
      ei_version: baseConfig.ei_version,
      arcDisabled: baseConfig.arcDisabled,
      arc_version: baseConfig.arcdpsVersionDate,
      arcdpsVersionHasUpdates: baseConfig.arcdpsVersionHasUpdates,
      arc11_version: baseConfig.arcdps11VersionDate,
      arcdps11VersionHasUpdates: baseConfig.arcdps11VersionHasUpdates,
      langs: i18n.langIds.map((id, index) => ({
        id,
        label: i18n.langLabels[index]
      }))
    };
    const logsHash = await hashLog(JSON.stringify(data));
    await ctx.renderView("settings", {
      ...data,
      logsHash
    });
  }

  router.get("/settings/progress", async(ctx) => {
    ctx.type = "application/json";
    ctx.body = JSON.stringify({
      parsingLogs: baseConfig.parsingLogs,
      parsedLogs: baseConfig.parsedLogs
    });
    return;
  });

  router.get("/settings", async(ctx) => renderSettings(ctx));
  router.post("/settings", async(ctx) => {
    if (ctx.request.body && ctx.request.body.token) {
      const acc = await db.accounts.insert({token: ctx.request.body.token});
      const client = new gw2.Client();
      const accountInfo = await client.get("account", {token: acc.token});
      await db.accounts.update({_id: acc._id}, {$set: {accountInfo}});
      const account = await db.accounts.findOne({_id: acc._id});
      await updateAccStats({
        db,
        client,
        account
      });
    }
    return renderSettings(ctx);
  });


  router.post("/settings/lang", async(ctx) => {
    if (ctx.request.body && ctx.request.body.lang) {
      if (i18n.langIds.includes(ctx.request.body.lang)) {
        baseConfig.lang = ctx.request.body.lang;
        await db.settings.update({_id: baseConfig.savedConfigId}, {$set: {lang: baseConfig.lang}});
      }
    }
    return renderSettings(ctx);
  });

  router.post("/settings/logsPath", async(ctx) => {
    const res = await dialog.showOpenDialog({
      title: "arcdps Logs Ordner",
      properties: ["openDirectory"],
      buttonLabel: "Übernehmen und neustarten",
      defaultPath: baseConfig.logsPath
    });
    await db.settings.update({_id: baseConfig.savedConfigId}, {$set: {logsPath: res.filePaths[0]}});
    app.relaunch();
    app.exit(0);
    return renderSettings(ctx);

  });
  router.post("/settings/gw2Dir", async(ctx) => {
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
      await db.settings.update({_id: baseConfig.savedConfigId}, {$set: {gw2Dir: baseConfig.gw2Dir}});
    }
    app.relaunch();
    app.exit(0);
    return renderSettings(ctx);

  });
  router.get("/settings/launchBuddyDir", async(ctx) => {
    if (ctx.request.query.del === "true") {
      baseConfig.launchBuddyDir = null;
      await db.settings.update({_id: baseConfig.savedConfigId}, {$set: {launchBuddyDir: baseConfig.launchBuddyDir}});
    }
    ctx.redirect("/settings");
  });
  router.post("/settings/launchBuddyDir", async(ctx) => {
    if (ctx.request.query.del === "true") {
      baseConfig.launchBuddyDir = null;
      await db.settings.update({_id: baseConfig.savedConfigId}, {$set: {launchBuddyDir: baseConfig.launchBuddyDir}});
    } else {
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
        await db.settings.update({_id: baseConfig.savedConfigId}, {$set: {launchBuddyDir: baseConfig.launchBuddyDir}});
      }
    }
    ctx.redirect("/settings");
  });
  router.get("/settings/updateArcDps", async(ctx) => {

    await updateArcDps({
      baseConfig,
      dialogs: true
    });

    ctx.redirect("/settings");

  });
  router.get("/settings/updateArcDps11", async(ctx) => {

    await updateArcDps11({
      baseConfig,
      dialogs: true
    });

    ctx.redirect("/settings");

  });
  router.post("/settings/resetLog", async(ctx) => {
    if (ctx.request.body && ctx.request.body.reset === "reset") {
      await db.logs.remove({}, {multi: true});
      await db.known_friends.remove({}, {multi: true});
      await db.friends.remove({}, {multi: true});
      await dialog.showMessageBox({message: "Erfolgreich zurück gesetzt"});
      app.relaunch();
      app.exit(0);
    } else {
      await dialog.showMessageBox({message: "Bitte trage 'reset' ein um zu bestätigen, dass du wirklich alle Logs neu einlesen willst willst."});
    }

    ctx.redirect("/settings");

  });
  router.get("/settings/arcDisabled", async(ctx) => {
    if (ctx.request.query.check === "true") {
      if (!baseConfig.arcDisabled) {
        try {
          await updateArcDps({
            baseConfig,
            dialogs: false
          });
        } catch (error) {
          console.error(error);
        }
        try {
          await updateArcDps11({
            baseConfig,
            dialogs: false
          });
        } catch (error) {
          console.error(error);
        }
      }
    } else if (ctx.request.query.enable === "true") {
      baseConfig.arcDisabled = false;
      await db.settings.update({_id: baseConfig.savedConfigId}, {$set: {arcDisabled: baseConfig.arcDisabled}});
      try {
        await updateArcDps({
          baseConfig,
          dialogs: false
        });
      } catch (error) {
        console.error(error);
      }
      try {
        await updateArcDps11({
          baseConfig,
          dialogs: false
        });
      } catch (error) {
        console.error(error);
      }
    } else if (ctx.request.query.disable === "true") {
      baseConfig.arcDisabled = true;
      await db.settings.update({_id: baseConfig.savedConfigId}, {$set: {arcDisabled: baseConfig.arcDisabled}});
    }
    ctx.redirect("/settings");
  });
  router.get("/start-game", async(ctx) => {
    if (baseConfig.launchBuddyDir) {
      if (baseConfig.gw2Instances.lauchbuddy.length < 1) {
        const started = await elevate(path.join(baseConfig.launchBuddyDir, "Gw2.Launchbuddy.exe"), {cwd: baseConfig.launchBuddyDir});
        baseConfig.gw2Instances.lauchbuddy.push({
          name: "Gw2.Launchbuddy.exe",
          pid: started.pid
        });
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
      }
    }
    ctx.redirect(decodeURIComponent(ctx.request.query.rel));
  });
};
