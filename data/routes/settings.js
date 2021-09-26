const {
  dialog, app
} = require("electron");
const gw2 = require("gw2");
const path = require("path");

const hashLog = require("../hash-log");
const updateAccStats = require("../update-acc-stats");
const updateArcDps = require("../update-arc-dps");
const updateArcDps11 = require("../update-arc-dps-11");
const i18n = require("../i18n");

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
      ei_version: baseConfig.ei_version,
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
};
