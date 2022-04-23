const ahkApi = require("../ahk-manager");
const {path: ahkPath} = require("ahk.exe");
const {
  BrowserWindow, app
} = require("electron");

const path = require("path");

const keyBlockedOpacity = 0.6;
const keyUnblockedOpacity = 0;


module.exports = async({
  router, db, baseConfig,
  eventHub
}) => {
  router.get("/map", async(ctx) => {
    await ctx.renderView("map", {});
  });

  const tmpDir = app.getPath("temp");

  console.log({
    ahkPath,
    tmpDir
  });

  let blocked_keys = [];
  let ahkInstance = null;
  const blockingWindows = {};

  const possibleSlots = [
    {
      slot: "1",
      rect: {
        width: 52,
        height: 52,
        x: 637,
        y: 1005
      }
    },
    {
      slot: "2",
      rect: {
        width: 52,
        height: 52,
        x: 693,
        y: 1005
      }
    },
    {
      slot: "3",
      rect: {
        width: 52,
        height: 52,
        x: 747,
        y: 1005
      }
    },
    {
      slot: "4",
      rect: {
        width: 52,
        height: 52,
        x: 802,
        y: 1005
      }
    },
    {
      slot: "5",
      rect: {
        width: 52,
        height: 52,
        x: 859,
        y: 1005
      }
    },
    {
      slot: "6",
      rect: {
        width: 52,
        height: 52,
        x: 1012,
        y: 1005
      }
    },
    {
      slot: "7",
      rect: {
        width: 52,
        height: 52,
        x: 1067,
        y: 1005
      }
    },
    {
      slot: "8",
      rect: {
        width: 52,
        height: 52,
        x: 1121,
        y: 1005
      }
    },
    {
      slot: "9",
      rect: {
        width: 52,
        height: 52,
        x: 1176,
        y: 1005
      }
    },
    {
      slot: "0",
      rect: {
        width: 52,
        height: 52,
        x: 1231,
        y: 1005
      }
    },
    {
      slot: "F1",
      rect: {
        width: 39,
        height: 39,
        x: 666,
        y: 958
      }
    },
    {
      slot: "F2",
      rect: {
        width: 39,
        height: 39,
        x: 711,
        y: 958
      }
    },
    {
      slot: "F3",
      rect: {
        width: 39,
        height: 39,
        x: 756,
        y: 958
      }
    },
    {
      slot: "F4",
      rect: {
        width: 39,
        height: 39,
        x: 801,
        y: 958
      }
    }
  ];


  async function freeAllKeys() {
    if (ahkInstance) {
      ahkInstance.stop();
      ahkInstance = null;
    }
  }

  const updateBlockedKeys = async() => {

    const filter = {};

    //baseConfig.mumbleLinkActive.identity.name;

    let keysToBlock = [];
    if (
      baseConfig.mumbleLinkActive &&
      !baseConfig.mumbleLinkActive.uiStates.TextboxHasFocus &&
      baseConfig.mumbleLinkActive.uiStates.GameHasFocus
    ) {
      const blockingRules = await db.blocked_key_rules.find(filter);
      keysToBlock = blockingRules.map((rule) => rule.key);
      keysToBlock.push("3");
      keysToBlock.push("4");
      keysToBlock.push("F4");
      keysToBlock.sort();
    } else {
      keysToBlock = [];
    }
    if (JSON.stringify(blocked_keys) === JSON.stringify(keysToBlock)) {
      console.log("Blocked keys unchanged");
      return;
    }
    await freeAllKeys();
    for (const [
      key,
      win
    ] of Object.entries(blockingWindows)) {
      if (!keysToBlock.includes(key)) {
        win.setOpacity(keyUnblockedOpacity);
      }
    }
    if (keysToBlock.length > 0) {
      ahkInstance = await ahkApi(ahkPath, keysToBlock.map((k) => ({
        key: k,
        noInterrupt: false
      })), {tmpDir});
      for (const blockedKey of keysToBlock) {
        ahkInstance.setHotkey(blockedKey, () => {
          console.log(`triggered: ${blockedKey}`);
        }, true);
        if (blockingWindows[blockedKey].getOpacity() !== keyBlockedOpacity) {
          console.log(`show ${blockedKey} overlay`);
          blockingWindows[blockedKey].setOpacity(keyBlockedOpacity);
        }
      }
      console.log(baseConfig.mumbleLinkActive);
      console.log(`Blocking keys: ${JSON.stringify(keysToBlock)}`);
    } else {
      console.log("Unblocked all keys");
    }


    blocked_keys = keysToBlock;
  };

  let lastMumbleLinkActive = null;
  eventHub.onLocal("baseConfig", () => {
    const newMumbleLinkActive = JSON.stringify({
      spec: baseConfig.mumbleLinkActive && baseConfig.mumbleLinkActive.identity && baseConfig.mumbleLinkActive.identity.spec,
      TextboxHasFocus: baseConfig.mumbleLinkActive && baseConfig.mumbleLinkActive.uiStates && baseConfig.mumbleLinkActive.uiStates.TextboxHasFocus,
      GameHasFocus: baseConfig.mumbleLinkActive && baseConfig.mumbleLinkActive.uiStates && baseConfig.mumbleLinkActive.uiStates.GameHasFocus
    });
    if (newMumbleLinkActive !== lastMumbleLinkActive) {
      lastMumbleLinkActive = newMumbleLinkActive;
      updateBlockedKeys();
    }
    if (
      typeof baseConfig.mainWindowId === "number" &&
      baseConfig.mumbleLinkActive && baseConfig.mumbleLinkActive.uiStates && !baseConfig.mumbleLinkActive.uiStates.GameHasFocus
    ) {
      for (const possible of possibleSlots) {
        const blockedSlot = possible.slot;
        if (blockingWindows[blockedSlot]) {
          continue;
        }
        const parent = BrowserWindow.fromId(baseConfig.mainWindowId);
        blockingWindows[blockedSlot] = new BrowserWindow({
          width: possible.rect.width,
          height: possible.rect.height,
          x: possible.rect.x,
          y: possible.rect.y,
          title: `Block Slot: ${blockedSlot}`,
          //parent,
          resizable: false,
          alwaysOnTop: true,
          fullscreenable: false,
          focusable: false,
          frame: false,
          hasShadow: false,
          opacity: keyUnblockedOpacity
          //transparent: true
        });
        blockingWindows[blockedSlot].loadURL(`file://${path.join(__dirname, "../static/locked-skill.html")}`);
        blockingWindows[blockedSlot].showInactive();
        parent.on("close", () => {
          blockingWindows[blockedSlot].close();
        });
      }
    }

  });
};


