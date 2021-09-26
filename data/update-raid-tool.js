
const {
  app: electronApp, autoUpdater
} = require("electron");

const updateUrl = "https://tool.raid-static.de/";

module.exports = () => new Promise((res, rej) => {
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
