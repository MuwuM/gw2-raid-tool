const gw2MumbleLink = require("./gw2-mumble-link");
const path = require("path");
const fs = require("fs-extra");
const {XMLParser} = require("fast-xml-parser");
const xml = new XMLParser();

module.exports = async({
  baseConfig, eventHub
}) => {
  if (!baseConfig.mumbleLinkStats) {
    baseConfig.mumbleLinkStats = {};
  }
  const mumbleLink = gw2MumbleLink({
    pollingInterval: 100,
    gw2Pids: async() => baseConfig.gw2Instances.running.map((i) => i.pid),
    mumbleLinkIds: async() => {
      const currentMumbleLinkIds = ["MumbleLink"];
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
      return currentMumbleLinkIds;
    }
  });

  mumbleLink.on("error", (err) => {
    console.error(err);
  });
  let lastActive = null;
  mumbleLink.on("mumbleLink", (mumbleLinkStats) => {
    baseConfig.mumbleLinkStats = mumbleLinkStats;
    const stats = Object.values(baseConfig.mumbleLinkStats).filter((a) => a.name === "Guild Wars 2");
    stats.sort((a, b) => b.time - a.time);
    const active = stats[0];
    if (active) {
      baseConfig.mumbleLinkActive = active;
    } else if (stats.length < 1) {
      baseConfig.mumbleLinkActive = false;
    }

    const currentActive = JSON.stringify({
      ...baseConfig.mumbleLinkActive,
      time: true
    });

    if (lastActive !== currentActive) {
      eventHub.emit("baseConfig", {baseConfig});
      lastActive = currentActive;
    }
  });

};
