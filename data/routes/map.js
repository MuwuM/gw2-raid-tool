const ahkApi = require("../ahk-manager");
const {path: ahkPath} = require("ahk.exe");
const {
  BrowserWindow, app, screen
} = require("electron");

const path = require("path");
const specs = require("../info/specs.json");

const keyBlockedOpacity = 0.6;
const keyUnblockedOpacity = 0;

const validAhkKeys = /(^\S$)|(^F\d$)|(^F\d\d$)|(^CapsLock$)|(^Space$)|(^Tab$)|(^Enter$)|(^Escape$)|(^Esc$)|(^Backspace$)|(^ScrollLock$)|(^Delete$)|(^Del$)|(^Insert$)|(^Ins$)|(^Home$)|(^End$)|(^PgUp$)|(^PgDn$)|(^Up$)|(^Down$)|(^Left$)|(^Right$)|(^Numpad\d$)|(^NumpadDot$)|(^NumLock$)|(^NumpadDiv$)|(^NumpadMult$)|(^NumpadAdd$)|(^NumpadSub$)|(^NumpadEnter$)|(^[LR]Win$)|(^[LR]?Control$)|(^[LR]?Ctrl$)|(^[LR]?Alt$)|(^[LR]?Shift$)/;

module.exports = async({
  db, baseConfig, backendConfig,
  eventHub
}) => {
  if (baseConfig.isAdmin) {
    let keyRules = await db.blocked_key_rules.find({}).sort({
      spec: 1,
      slot: 1,
      _id: 1
    });

    eventHub.on("addKeyRule", async() => {
      //console.log("addKeyRule");
      let spec = "";
      if (backendConfig.mumbleLinkActive?.identity?.spec) {
        spec = specs.find((sp) => sp.id === backendConfig.mumbleLinkActive.identity.spec).name;
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
      //console.log("updateKeyRule", keyRule);
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
      //console.log("deleteKeyRule", keyRule);
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

    /*console.log({
      ahkPath,
      tmpDir
    });*/

    let blocked_keys = [];
    let ahkInstance = null;
    const blockingWindows = {};


    const possibleSlots = () => {
      let uiSize = backendConfig.mumbleLinkActive?.identity?.uisz;
      if (typeof uiSize !== "number") {
        uiSize = 1;
      }
      const uiSizes = [
        {
          boxSize: 50,
          boxOffset: 0,
          offCenterL: 43,
          offCenterR: -6,
          offBottom: 67
        },
        {
          boxSize: 52,
          boxOffset: 3,
          offCenterL: 48,
          offCenterR: -4,
          offBottom: 75
        },
        {
          boxSize: 60,
          boxOffset: 1,
          offCenterL: 53,
          offCenterR: -4,
          offBottom: 83
        },
        {
          boxSize: 67,
          boxOffset: 0,
          offCenterL: 60,
          offCenterR: -6,
          offBottom: 93
        }
      ];
      const {bounds} = screen.getPrimaryDisplay();
      const offsetX = bounds.x + (bounds.width / 2);
      const offsetY = bounds.y + bounds.height;
      const {
        boxSize,
        boxOffset,
        offCenterL,
        offCenterR,
        offBottom
      } = uiSizes[uiSize] || uiSizes[1];
      const scaleBox = boxSize + boxOffset;

      /*let F5 = {
        slot: "F5",
        rect: {
          width: 39,
          height: 39,
          x: -59 + offsetX,
          y: offsetY - 122
        }
      };

      if (spec) {
        const specInfo = specs.find((s) => s.id === spec);
        if (specInfo && [
          "Soulbeast",
          "Druid"
        ].includes(specInfo.name)) {
          F5 = {
            slot: "F5",
            rect: {
              width: 39,
              height: 39,
              x: 0 + offsetX,
              y: offsetY - 222
            }
          };
        }

      }*/

      return [
        {
          slot: "1",
          rect: {
            width: boxSize,
            height: boxSize,
            x: offsetX - (5 * scaleBox + offCenterL),
            y: offsetY - offBottom
          }
        },
        {
          slot: "2",
          rect: {
            width: boxSize,
            height: boxSize,
            x: offsetX - (4 * scaleBox + offCenterL),
            y: offsetY - offBottom
          }
        },
        {
          slot: "3",
          rect: {
            width: boxSize,
            height: boxSize,
            x: offsetX - (3 * scaleBox + offCenterL),
            y: offsetY - offBottom
          }
        },
        {
          slot: "4",
          rect: {
            width: boxSize,
            height: boxSize,
            x: offsetX - (2 * scaleBox + offCenterL),
            y: offsetY - offBottom
          }
        },
        {
          slot: "5",
          rect: {
            width: boxSize,
            height: boxSize,
            x: offsetX - (1 * scaleBox + offCenterL),
            y: offsetY - offBottom
          }
        },
        {
          slot: "6",
          rect: {
            width: boxSize,
            height: boxSize,
            x: offsetX + (1 * scaleBox + offCenterR),
            y: offsetY - offBottom
          }
        },
        {
          slot: "7",
          rect: {
            width: boxSize,
            height: boxSize,
            x: offsetX + (2 * scaleBox + offCenterR),
            y: offsetY - offBottom
          }
        },
        {
          slot: "8",
          rect: {
            width: boxSize,
            height: boxSize,
            x: offsetX + (3 * scaleBox + offCenterR),
            y: offsetY - offBottom
          }
        },
        {
          slot: "9",
          rect: {
            width: boxSize,
            height: boxSize,
            x: offsetX + (4 * scaleBox + offCenterR),
            y: offsetY - offBottom
          }
        },
        {
          slot: "0",
          rect: {
            width: boxSize,
            height: boxSize,
            x: offsetX + (5 * scaleBox + offCenterR),
            y: offsetY - offBottom
          }
        }/*,
        {
          slot: "F1",
          rect: {
            width: 39,
            height: 39,
            x: -294 + offsetX,
            y: offsetY - 122
          }
        },
        {
          slot: "F2",
          rect: {
            width: 39,
            height: 39,
            x: -249 + offsetX,
            y: offsetY - 122
          }
        },
        {
          slot: "F3",
          rect: {
            width: 39,
            height: 39,
            x: -204 + offsetX,
            y: offsetY - 122
          }
        },
        {
          slot: "F4",
          rect: {
            width: 39,
            height: 39,
            x: -159 + offsetX,
            y: offsetY - 122
          }
        },
        F5*/
      ];
    };

    baseConfig.possibleSlots = possibleSlots().map((s) => ({slot: s.slot}));


    const freeAllKeys = async() => {
      if (ahkInstance) {
        ahkInstance.stop();
        ahkInstance = null;
      }
    };

    const updateBlockedKeys = async() => {
      try {


        const filters = [{active: true}];

        //backendConfig.mumbleLinkActive.identity.name;

        if (backendConfig.mumbleLinkActive?.identity?.spec) {
          filters.push({$or: [
            {spec: ""},
            {spec: specs.find((sp) => sp.id === backendConfig.mumbleLinkActive.identity.spec).name}
          ]});
        }

        let keysToBlock = [];
        let blockingRules = [];
        if (
          backendConfig.mumbleLinkActive &&
      !backendConfig.mumbleLinkActive?.uiStates?.TextboxHasFocus &&
      !backendConfig.mumbleLinkActive?.uiStates?.IsMapOpen &&
      backendConfig.mumbleLinkActive?.uiStates?.GameHasFocus &&
      backendConfig.mumbleLinkActive?.context?.mountIndex === 0
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
            if (blockingWindows[rule.slot] && blockingWindows[rule.slot].getOpacity() !== keyBlockedOpacity) {
              //console.log(`show ${rule.slot} overlay`);
              blockingWindows[rule.slot].setOpacity(keyBlockedOpacity);
            }
          }
          blockingRules.sort();
        } else {
          blockingRules = [];
          keysToBlock = [];
        }
        if (JSON.stringify(blocked_keys) === JSON.stringify(blockingRules)) {
          //console.log("Blocked keys unchanged");
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
          //console.log(keysToBlock);
          ahkInstance = await ahkApi(ahkPath, keysToBlock.map((k) => ({
            key: k,
            noInterrupt: false
          })), {tmpDir});
          for (const blockedKey of keysToBlock) {
            ahkInstance.setHotkey(blockedKey, () => {
              //console.log(`triggered: ${blockedKey}`);
            }, true);
          }
          //console.log(backendConfig.mumbleLinkActive);
          console.info(`Blocking keys: ${JSON.stringify(keysToBlock)}`);
        } else {
          console.info("Unblocked all keys");
        }


        blocked_keys = blockingRules;

      } catch (error) {
        console.error(error);
      }
    };

    let lastMumbleLinkActive = null;
    eventHub.onLocal("mumbleLinkActive", () => {
      try {
        const newMumbleLinkActive = JSON.stringify({
          spec: backendConfig?.mumbleLinkActive?.identity?.spec,
          TextboxHasFocus: backendConfig?.mumbleLinkActive?.uiStates?.TextboxHasFocus,
          GameHasFocus: backendConfig?.mumbleLinkActive?.uiStates?.GameHasFocus,
          IsMapOpen: backendConfig?.mumbleLinkActive?.uiStates?.IsMapOpen,
          mountIndex: backendConfig?.mumbleLinkActive?.context?.mountIndex
        });
        if (newMumbleLinkActive !== lastMumbleLinkActive) {
          lastMumbleLinkActive = newMumbleLinkActive;
          updateBlockedKeys();
        }

        let newWindow = false;

        for (const possible of possibleSlots()) {
          const blockedSlot = possible.slot;

          if (blockingWindows[blockedSlot]) {
            const win = blockingWindows[blockedSlot];
            if (win.isDestroyed()) {
              delete blockingWindows[blockedSlot];
              continue;
            }
            const bounds = win.getBounds();
            if (
              bounds.width !== possible.rect.width ||
                bounds.height !== possible.rect.height ||
                bounds.x !== possible.rect.x ||
                bounds.y !== possible.rect.y
            ) {
              win.setBounds(possible.rect);
            }
            continue;
          }

          blockingWindows[blockedSlot] = new BrowserWindow({
            width: possible.rect.width,
            height: possible.rect.height,
            x: possible.rect.x,
            y: possible.rect.y,
            title: `Block Slot: ${blockedSlot}`,
            resizable: false,
            alwaysOnTop: true,
            fullscreenable: false,
            focusable: false,
            frame: false,
            hasShadow: false,
            opacity: keyUnblockedOpacity
          });
          blockingWindows[blockedSlot].setAlwaysOnTop(true, "screen-saver");
          blockingWindows[blockedSlot].setVisibleOnAllWorkspaces(true);
          blockingWindows[blockedSlot].loadURL(`file://${path.join(__dirname, "../static/locked-skill.html")}`);
          blockingWindows[blockedSlot].showInactive();
          newWindow = true;
        }
        if (newWindow) {
          updateBlockedKeys();
        }
        //console.log(Object.keys(blockingWindows));

      } catch (error) {
        console.error(error);
      }
    });
  }
};


