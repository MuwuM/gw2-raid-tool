const updateArcDps = require("./update-arc-dps");
const updateArcDps11 = require("./update-arc-dps-11");
const updateBuildsJson = require("./update-builds-json");
const updateEiParser = require("./update-ei-parser");
const updateRaidTool = require("./update-raid-tool");

module.exports = async({
  baseConfig, backendConfig, initStatus
}) => {
  initStatus.step = "... Raid Tool ...";
  await updateRaidTool();
  initStatus.step = "... GW2-Elite-Insights-Parser  ...";
  await updateEiParser({
    baseConfig,
    backendConfig
  });
  initStatus.step = "... Arc DPS (Dx 9)  ...";
  await updateArcDps({baseConfig});
  initStatus.step = "... Arc DPS (Dx 11)  ...";
  await updateArcDps11({baseConfig});
  initStatus.step = "... builds.json ...";
  await updateBuildsJson({
    baseConfig,
    backendConfig
  });
  initStatus.step = "";
};
