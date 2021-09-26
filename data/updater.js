const updateArcDps = require("./update-arc-dps");
const updateArcDps11 = require("./update-arc-dps-11");
const updateEiParser = require("./update-ei-parser");
const updateRaidTool = require("./update-raid-tool");

module.exports = async({baseConfig}) => {
  await updateRaidTool();
  await updateEiParser({baseConfig});
  await updateArcDps({baseConfig});
  await updateArcDps11({baseConfig});
};
