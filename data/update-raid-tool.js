
const {
  app: electronApp, autoUpdater
} = require("electron");
const semver = require("semver");

const updateUrlProd = "https://tool.raid-static.de/";
const updateUrlDev = "https://tool.raid-static.de/dev/";

module.exports = () => new Promise((res, rej) => {
  const version = electronApp.getVersion();
  const parsedVersion = semver.parse(version);
  const isDevBuild = parsedVersion.prerelease.includes("dev");
  let updateUrl = updateUrlProd;
  if (isDevBuild) {
    updateUrl = updateUrlDev;
  }
  if (!electronApp.isPackaged) {
    res();
    return;
  }
  autoUpdater.on("update-not-available", () => {
    res();
  });
  autoUpdater.on("update-downloaded", () => {
    autoUpdater.quitAndInstall();
  });
  autoUpdater.on("error", (error) => {
    rej(error);
  });
  autoUpdater.setFeedURL({url: updateUrl});
  autoUpdater.checkForUpdates();
});
