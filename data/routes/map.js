const wings = require("../info/wings");
const wingsHelpers = require("../info/wing-helpers");

module.exports = async({
  router, hashLog, baseConfig
}) => {


  router.get("/map", async(ctx) => {
    const mumbleLinkActive = baseConfig.mumbleLinkActive;
    const map_id = mumbleLinkActive && mumbleLinkActive.identity && mumbleLinkActive.identity.map_id;
    const wing = wings.find((w) => w.map_id === map_id);
    const activeHelp = wing && wingsHelpers.find((h) => h.wing === wing.w && h.active);

    const uiStates = mumbleLinkActive && mumbleLinkActive.uiStates;

    const logsHash = await hashLog(JSON.stringify({
      name: mumbleLinkActive && mumbleLinkActive.identity && mumbleLinkActive.identity.name,
      /*map_id,
      wing,
      uiStates,*/
      activeHelp
    }));
    await ctx.renderView("map", {
      logsHash,
      mumbleLinkActive,
      wing,
      uiStates,
      activeHelp
    });
  });
};
