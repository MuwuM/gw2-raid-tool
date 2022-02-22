const electron = require("electron");
const path = require("path");
const fs = require("fs-extra");

const {
  BrowserWindow,
  shell,
  Menu,
  MenuItem
} = electron;

module.exports = async({
  updaterDone, serverReady, electronApp
}) => {

  async function initElectron() {
    const configFilePath = path.join(electronApp.getPath("userData"), "config-gw2-raid-tool.json");
    //console.log({configFilePath});
    const screen = electron.screen;

    let config;
    try {
      config = await fs.readJSON(configFilePath);
    } catch (error) {
      config = {};
    }


    const win = new BrowserWindow({
      icon: path.resolve(__dirname, "icon.ico"),
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        nativeWindowOpen: true
      }
    });
    win.setMenu(null);

    //console.log(config.bounds);
    if (config.bounds) {
      const activeScreen = screen.getDisplayNearestPoint({
        x: config.bounds.x,
        y: config.bounds.y
      });
      if (activeScreen.bounds.x > config.bounds.x) {
        config.bounds.x = activeScreen.bounds.x;
      }
      if (activeScreen.bounds.y > config.bounds.y) {
        config.bounds.y = activeScreen.bounds.y;
      }
      if (activeScreen.bounds.x + activeScreen.bounds.width < config.bounds.x + config.bounds.width) {
        config.bounds.width = activeScreen.bounds.x + activeScreen.bounds.width - config.bounds.x;
      }
      if (activeScreen.bounds.y + activeScreen.bounds.height < config.bounds.y + config.bounds.height) {
        config.bounds.height = activeScreen.bounds.y + activeScreen.bounds.height - config.bounds.y;
      }

      //console.log(config.bounds);
      win.setBounds(config.bounds);
    }
    if (config.fullscreen) {
      win.maximize();
    }

    async function updateWindowConfig() {
      const data = {
        bounds: win.getBounds(),
        fullscreen: win.isMaximized()
      };
      await fs.writeJSON(configFilePath, data);
    }

    win.on("maximize", updateWindowConfig);
    win.on("minimize", updateWindowConfig);
    win.on("resized", updateWindowConfig);
    win.on("move", updateWindowConfig);

    win.loadURL(`file://${__dirname}/static/updating.html`);
    await updaterDone;
    win.loadURL(`file://${__dirname}/static/loading.html`);
    const {
      appDomain, db
    } = await serverReady;

    /*const accs = await db.accounts.find({});
    if (accs.length < 1) {
      win.loadURL(`${appDomain}/settings`);
    } else {
      win.loadURL(appDomain);
    }*/
    win.loadURL(`${appDomain}/logs`);
    win.webContents.on("will-navigate", (event, url) => {
      if (!url.startsWith(appDomain)) {
        event.preventDefault();
        shell.openExternal(url);
        return false;
      }
    });
    win.webContents.on("new-window", (event, url) => {
      if (!url.startsWith(appDomain)) {
        event.preventDefault();
        shell.openExternal(url);
        return false;
      }
    });
    win.webContents.on("context-menu", (event, {linkURL}) => {
      event.preventDefault();
      const menu = new Menu();
      if (linkURL && !linkURL.startsWith(appDomain)) {
        menu.append(new MenuItem({
          label: "Open Link",
          click() {
            shell.openExternal(linkURL);
          }
        }));
        menu.append(new MenuItem({type: "separator"}));
      }
      menu.append(new MenuItem({
        label: "Refresh",
        click() {
          win.reload();
        }
      }));
      menu.append(new MenuItem({
        label: "Force refresh",
        click() {
          win.webContents.session.clearCache(() => {
            win.reload();
          });
        }
      }));
      menu.append(new MenuItem({
        label: "Dev Tools",
        click() {
          win.toggleDevTools();
        }
      }));

      menu.popup({window: win});
      return false;
    });
    //console.log("loaded");
  }

  electronApp.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      electronApp.quit();
    }
  });

  electronApp.on("ready", initElectron);
};
