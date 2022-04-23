const ahkApi = require("../ahk-manager");
const {path: ahkPath} = require("ahk.exe");
const {
  BrowserWindow, app
} = require("electron");

const path = require("path");
const specs = require("../info/specs.json");

const keyBlockedOpacity = 0.6;
const keyUnblockedOpacity = 0;

const validAhkKeys = /(^\S$)|(^F\d$)|(^F\d\d$)|(^CapsLock$)|(^Space$)|(^Tab$)|(^Enter$)|(^Escape$)|(^Esc$)|(^Backspace$)|(^ScrollLock$)|(^Delete$)|(^Del$)|(^Insert$)|(^Ins$)|(^Home$)|(^End$)|(^PgUp$)|(^PgDn$)|(^Up$)|(^Down$)|(^Left$)|(^Right$)|(^Numpad\d$)|(^NumpadDot$)|(^NumLock$)|(^NumpadDiv$)|(^NumpadMult$)|(^NumpadAdd$)|(^NumpadSub$)|(^NumpadEnter$)|(^[LR]Win$)|(^[LR]?Control$)|(^[LR]?Ctrl$)|(^[LR]?Alt$)|(^[LR]?Shift$)/;

module.exports = async({
  router, db, baseConfig,
  eventHub
}) => {
  router.get("/map", async(ctx) => {
    await ctx.renderView("map", {});
  });

  if (baseConfig.isAdmin) {
    let keyRules = await db.blocked_key_rules.find({}).sort({
      spec: 1,
      slot: 1,
      _id: 1
    });
    baseConfig.uniqueSpecs = [];
    for (const spec of specs) {
      if (!baseConfig.uniqueSpecs.includes(spec.name)) {
        baseConfig.uniqueSpecs.push(spec.name);
      }
    }


    eventHub.on("addKeyRule", async() => {
      console.log("addKeyRule");
      let spec = "";
      if (baseConfig.mumbleLinkActive && baseConfig.mumbleLinkActive.identity && baseConfig.mumbleLinkActive.identity.spec) {
        spec = specs.find((sp) => sp.id === baseConfig.mumbleLinkActive.identity.spec).name;
      }
      await db.blocked_key_rules.insert({
        active: false,
        spec
      });
      keyRules = await db.blocked_key_rules.find({}).sort({
        spec: 1,
        slot: 1,
        _id: 1
      });
      eventHub.emit("keyRules", {keyRules});
    });
    eventHub.on("updateKeyRule", async({keyRule}) => {
      console.log("updateKeyRule", keyRule);
      await db.blocked_key_rules.update({_id: keyRule._id}, {$set: keyRule});
      keyRules = await db.blocked_key_rules.find({}).sort({
        spec: 1,
        slot: 1,
        _id: 1
      });
      eventHub.emit("keyRules", {keyRules});
      updateBlockedKeys();
    });
    eventHub.on("deleteKeyRule", async({keyRule}) => {
      console.log("deleteKeyRule", keyRule);
      await db.blocked_key_rules.remove({_id: keyRule._id});
      keyRules = await db.blocked_key_rules.find({}).sort({
        spec: 1,
        slot: 1,
        _id: 1
      });
      eventHub.emit("keyRules", {keyRules});
      updateBlockedKeys();
    });
    eventHub.on("getKeyRules", async() => {
      eventHub.emit("keyRules", {keyRules});
      updateBlockedKeys();
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

    baseConfig.possibleSlots = possibleSlots;


    const freeAllKeys = async() => {
      if (ahkInstance) {
        ahkInstance.stop();
        ahkInstance = null;
      }
    };

    const updateBlockedKeys = async() => {

      const filters = [{active: true}];

      //baseConfig.mumbleLinkActive.identity.name;

      if (baseConfig.mumbleLinkActive && baseConfig.mumbleLinkActive.identity && baseConfig.mumbleLinkActive.identity.spec) {
        filters.push({$or: [
          {spec: ""},
          {spec: specs.find((sp) => sp.id === baseConfig.mumbleLinkActive.identity.spec).name}
        ]});
      }

      let keysToBlock = [];
      let blockingRules = [];
      if (
        baseConfig.mumbleLinkActive &&
      !baseConfig.mumbleLinkActive.uiStates.TextboxHasFocus &&
      baseConfig.mumbleLinkActive.uiStates.GameHasFocus
      ) {
        blockingRules = await db.blocked_key_rules.find({$and: filters});
        keysToBlock = [];
        for (const rule of blockingRules) {
          const keys = (rule.keys || "").split(" ");
          for (const key of keys) {
            if (!key || !key.match(validAhkKeys)) {
              continue;
            }
            keysToBlock.push(key);
          }
          if (blockingWindows[rule.slot] && (blockingWindows[rule.slot].getOpacity() !== keyBlockedOpacity)) {
            console.log(`show ${rule.slot} overlay`);
            blockingWindows[rule.slot].setOpacity(keyBlockedOpacity);
          }
        }
        blockingRules.sort();
      } else {
        blockingRules = [];
        keysToBlock = [];
      }
      if (JSON.stringify(blocked_keys) === JSON.stringify(blockingRules)) {
        console.log("Blocked keys unchanged");
        return;
      }
      await freeAllKeys();
      for (const [
        key,
        win
      ] of Object.entries(blockingWindows)) {
        if (!blockingRules.find((r) => r.slot === key)) {
          win.setOpacity(keyUnblockedOpacity);
        }
      }
      if (keysToBlock.length > 0) {
        console.log(keysToBlock);
        ahkInstance = await ahkApi(ahkPath, keysToBlock.map((k) => ({
          key: k,
          noInterrupt: false
        })), {tmpDir});
        for (const blockedKey of keysToBlock) {
          ahkInstance.setHotkey(blockedKey, () => {
            console.log(`triggered: ${blockedKey}`);
          }, true);
        }
        console.log(baseConfig.mumbleLinkActive);
        console.log(`Blocking keys: ${JSON.stringify(keysToBlock)}`);
      } else {
        console.log("Unblocked all keys");
      }


      blocked_keys = blockingRules;
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
  }
};


