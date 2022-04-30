const electron = require("electron");
const path = require("path");
const fs = require("fs-extra");
const pem = require("pem");
const {promisify} = require("util");
const verifySigningChain = promisify(pem.verifySigningChain);

const {
  BrowserWindow,
  shell,
  Menu,
  MenuItem
} = electron;

module.exports = async({
  electronApp, initStatus
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

    await win.loadURL(`file://${__dirname}/static/updating.html`);
    const setStatus = (status, step) => {
      win.webContents.executeJavaScript(`{
      const elem = document.querySelector('.center-big-splash-status');
      if(elem){
        elem.textContent = ${JSON.stringify(initStatus.stateLabel[status])};
      }
      const elem2 = document.querySelector('.center-big-splash-step');
      if(elem2){
        elem2.textContent = ${JSON.stringify(step || "")};
      }
    }`, true);
    };
    initStatus.onChange(setStatus);
    win.webContents.once("dom-ready", () => {
      setStatus(initStatus.status, initStatus.step);
    });
    await initStatus.waitFor(initStatus.state.Loaded);
    const {
      baseConfig,
      eventHub, backendConfig
    } = initStatus;

    baseConfig.mainWindowId = win.id;

    win.webContents.session.setCertificateVerifyProc(async(request, callback) => {
      const check = await verifySigningChain(request.certificate.data, backendConfig.certificate);
      if (
        request.verificationResult === "net::ERR_CERT_AUTHORITY_INVALID" &&
        check
      ) {
        callback(0);
        return;
      }
      callback(-3);
    });

    await win.loadURL(`${backendConfig.appDomain}`);
    initStatus.offChange(setStatus);

    baseConfig.zoom = 1;
    eventHub.emit("baseConfig", {baseConfig});

    win.webContents.on("will-navigate", (event, url) => {
      if (!url.startsWith(backendConfig.appDomain)) {
        event.preventDefault();
        shell.openExternal(url);
        return false;
      }
    });
    win.webContents.setWindowOpenHandler((details) => {
      if (!details.url.startsWith(backendConfig.appDomain)) {
        shell.openExternal(details.url);
        return {action: "deny"};
      }
      const url = new URL(details.url);

      const path = url.pathname;
      const pathParts = path.split("/");
      //console.log(pathParts);
      if (!pathParts[1]) {
        win.webContents.executeJavaScript("{mnt.selectPage(\"overview\", {});}");
      } else {
        win.webContents.executeJavaScript(`{mnt.selectPage(${JSON.stringify(pathParts[1])},{id:${JSON.stringify(pathParts[2])},action:${JSON.stringify(pathParts[3])}});}`);
      }
      return {action: "deny"};
    });
    win.webContents.on("before-input-event", (event, input) => {
      if (input.control && input.key === "+") {
        baseConfig.zoom = Math.round(Math.min((baseConfig.zoom || 1) * 1.2, 1.728) * 1000) / 1000;
        eventHub.emit("baseConfig", {baseConfig});
        event.preventDefault();
      } else if (input.control && input.key === "-") {
        baseConfig.zoom = Math.round(Math.max((baseConfig.zoom || 1) / 1.2, 1 / 1.728) * 1000) / 1000;
        eventHub.emit("baseConfig", {baseConfig});
        event.preventDefault();
      } else if (input.control && input.key === "0") {
        baseConfig.zoom = 1;
        eventHub.emit("baseConfig", {baseConfig});
        event.preventDefault();
      }
    });
    win.webContents.on("context-menu", (event, {linkURL}) => {
      event.preventDefault();
      const menu = new Menu();
      if (linkURL && !linkURL.startsWith(backendConfig.appDomain)) {
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
        async click() {
          await win.webContents.session.clearCache();
          win.reload();
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
