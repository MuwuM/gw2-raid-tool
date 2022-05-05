const electron = require("electron");
const {dialog} = electron;
const path = require("path");
const fs = require("fs-extra");

const i18n = require("../i18n");
/**
 * @param  {import("../raid-tool").NedbDatabase} db
 * @param  {import("../raid-tool").BaseConfig} baseConfig
 * @param  {import("../raid-tool").ElectronApp} electronApp
 */
module.exports = async function loadConfig(db, baseConfig, electronApp) {
  /**
   * @type {import("../raid-tool").SavedConfig}
   */
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
  return savedConfig;
};
