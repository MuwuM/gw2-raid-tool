const updateArcDps = require("./update-arc-dps");
const updateArcDps11 = require("./update-arc-dps-11");
const updateEiParser = require("./update-ei-parser");
const updateRaidTool = require("./update-raid-tool");

module.exports = async({
  baseConfig, initStatus
}) => {
  initStatus.step = "... Raid Tool ...";
  await updateRaidTool();
  initStatus.step = "... GW2-Elite-Insights-Parser  ...";
  await updateEiParser({baseConfig});
  initStatus.step = "... Arc DPS (Dx 9)  ...";
  await updateArcDps({baseConfig});
  initStatus.step = "... Arc DPS (Dx 11)  ...";
  await updateArcDps11({baseConfig});
  initStatus.step = "";
};
