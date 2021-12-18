const NodeIPC = require("node-easy-ipc");
const path = require("path");
const fs = require("fs-extra");
const {XMLParser} = require("fast-xml-parser");
const xml = new XMLParser();

const size = 10580;

const MumbleLinkIds = ["MumbleLink"];


function readText(access, start, length) {
  let i = 0;
  const buf = Buffer.alloc(length);
  while (i < length) {
    buf.writeInt8(access.readInt8(start + i), i);
    i += 1;
  }
  // eslint-disable-next-line no-control-regex
  return buf.toString("utf16le").replace(/\u0000.*$/, "");
}

function bit_test(num, bit) {
  return ((num >> bit) % 2 !== 0);
}

async function readStats(access) {
  const uiVersion = access.readUInt32LE(0);
  if (!uiVersion) {
    return {};
  }
  const identityPlain = readText(access, 592, 512);
  let identity = null;
  try {
    identity = JSON.parse(identityPlain);
  } catch (error) {
    console.error(error);
  }
  const data = {
    uiVersion: access.readUInt32LE(0),
    uiTick: access.readUInt32LE(4),
    fAvatarPosition: {
      x: access.readFloatLE(8),
      y: access.readFloatLE(12),
      z: access.readFloatLE(16)
    },
    fAvatarFront: {
      x: access.readFloatLE(20),
      y: access.readFloatLE(24),
      z: access.readFloatLE(28)
    },
    fAvatarTop: {
      x: access.readFloatLE(32),
      y: access.readFloatLE(36),
      z: access.readFloatLE(40)
    },
    name: readText(access, 44, 512),
    fCameraPosition: {
      x: access.readFloatLE(556),
      y: access.readFloatLE(560),
      z: access.readFloatLE(564)
    },
    fCameraFront: {
      x: access.readFloatLE(568),
      y: access.readFloatLE(572),
      z: access.readFloatLE(576)
    },
    fCameraTop: {
      x: access.readFloatLE(580),
      y: access.readFloatLE(584),
      z: access.readFloatLE(588)
    },
    identity,
    identityPlain,
    context_len: access.readUInt32LE(1104),
    context: {
      serverAddress: readText(access, 1108, 28),
      mapId: access.readUInt32LE(1136),
      mapType: access.readUInt32LE(1140),
      shardId: access.readUInt32LE(1144),
      instance: access.readUInt32LE(1148),
      buildId: access.readUInt32LE(1152),
      uiState: access.readUInt32LE(1156),
      compassWidth: access.readInt16LE(1160),
      compassHeight: access.readInt16LE(1162),
      compassRotation: access.readFloatLE(1164),
      playerX: access.readFloatLE(1168),
      playerY: access.readFloatLE(1172),
      mapCenterX: access.readFloatLE(1176),
      mapCenterY: access.readFloatLE(1180),
      mapScale: access.readFloatLE(1184),
      processId: access.readUInt32LE(1188),
      mountIndex: access.readInt8(1192)
    }
  };
  data.uiStates = {
    IsMapOpen: bit_test(data.context.uiState, 0),
    IsCompassTopRight: bit_test(data.context.uiState, 1),
    DoesCompassHaveRotationEnabled: bit_test(data.context.uiState, 2),
    GameHasFocus: bit_test(data.context.uiState, 3),
    IsInCompetitiveGameMode: bit_test(data.context.uiState, 4),
    TextboxHasFocus: bit_test(data.context.uiState, 5),
    IsInCombat: bit_test(data.context.uiState, 6)
  };
  return data;
}


const accesses = {};
const processesMap = {};

module.exports = async({baseConfig}) => {

  if (!baseConfig.mumbleLinkStats) {
    baseConfig.mumbleLinkStats = {};
  }

  async function updateMumbleLinkData() {
    if (!baseConfig.gw2Instances || !baseConfig.gw2Instances.running) {
      return;
    }

    for (const [
      pid,
      key
    ] of Object.entries(processesMap)) {
      if (!baseConfig.gw2Instances.running.find((i) => `${i.pid}` === `${pid}`)) {
        if (accesses[key]) {
          await accesses[key].close();
          delete accesses[key];
        }
        if (baseConfig.mumbleLinkStats[key]) {
          delete baseConfig.mumbleLinkStats[key];
        }
        delete processesMap[pid];
      }
    }

    const missesMumbleLinkFiles = baseConfig.gw2Instances.running.find((i) => !processesMap[i.pid]);

    if (missesMumbleLinkFiles) {
      console.info(`Searching MumbleLink for pids ${JSON.stringify(baseConfig.gw2Instances.running.filter((i) => !processesMap[i.pid]).map((i) => i.pid))}`);
      const currentMumbleLinkIds = Array.from(MumbleLinkIds);

      if (baseConfig.gw2Instances.lauchbuddy && baseConfig.gw2Instances.lauchbuddy.length > 0) {
        const launchBuddyAccsPath = path.join(baseConfig.launchBuddyConfigDir, "Accs.xml");
        if (await fs.pathExists(launchBuddyAccsPath)) {
          const accsContent = await fs.readFile(launchBuddyAccsPath);
          const accs = await xml.parse(accsContent);
          if (accs && accs.ArrayOfAccount && accs.ArrayOfAccount.Account) {
            for (const acc of accs.ArrayOfAccount.Account) {
              if (acc && acc.Settings && acc.Settings.AccountID >= 0) {
                currentMumbleLinkIds.push(`GW2MumbleLink${acc.Settings.AccountID}`);
              }
            }
          }
        } else {
          console.warn(`Could not find LaunchBuddy config at: ${launchBuddyAccsPath}`);
        }
      }

      for (const file of currentMumbleLinkIds) {
        if (!accesses[file]) {
          const map = new NodeIPC.FileMapping();
          try {
            map.openMapping(file, size);
            accesses[file] = map;
            baseConfig.mumbleLinkStats[file] = {};
          } catch (error) {
            try {
              map.createMapping(null, file, size);
              accesses[file] = map;
              baseConfig.mumbleLinkStats[file] = {};
            } catch (error) {
              console.error(`Error creating File [${file}]: ${error}`);
              delete accesses[file];
              delete baseConfig.mumbleLinkStats[file];
              continue;
            }
          }
        }
      }
    }
    for (const [
      key,
      access
    ] of Object.entries(accesses)) {
      const data = Buffer.alloc(size);
      try {
        access.readInto(data, 0, 0, size);
      } catch (error) {
        console.error(error);
        try {
          await access.closeMapping();
        } catch (error) {
          console.error(error);
        }
        delete accesses[key];
        delete baseConfig.mumbleLinkStats[key];
        continue;
      }
      const stats = await readStats(data);
      if (stats.context && stats.context.processId) {
        processesMap[stats.context.processId] = key;
      } else {
        try {
          await access.closeMapping();
        } catch (error) {
          console.error(error);
        }
        delete accesses[key];
        delete baseConfig.mumbleLinkStats[key];
        continue;
      }
      if (!baseConfig.mumbleLinkStats[key] || baseConfig.mumbleLinkStats[key].uiTick !== stats.uiTick) {
        if (
          stats.context && stats.context.uiState > 0 &&
          (
            (!baseConfig.mumbleLinkStats[key]) ||
            (!baseConfig.mumbleLinkStats[key].uiStates) ||
            (baseConfig.mumbleLinkStats[key].uiStates.GameHasFocus !== stats.uiStates.GameHasFocus)
          )
        ) {
          stats.time = Date.now();
        } else if (baseConfig.mumbleLinkStats[key] && baseConfig.mumbleLinkStats[key].time) {
          stats.time = baseConfig.mumbleLinkStats[key].time;
        } else {
          stats.time = Date.now();
        }
        baseConfig.mumbleLinkStats[key] = stats;
      }
    }
    //console.log({processesMap});
    const stats = Object.values(baseConfig.mumbleLinkStats).filter((a) => a.name === "Guild Wars 2");
    stats.sort((a, b) => b.time - a.time);
    const active = stats[0];
    if (active) {
      baseConfig.mumbleLinkActive = active;
    }
  }

  try {
    await updateMumbleLinkData();
  } catch (error) {
    console.error(error);
  }
  setTimeout(() => module.exports({baseConfig}), 1000);
};
