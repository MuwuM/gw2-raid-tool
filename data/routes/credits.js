const hashLog = require("../hash-log");

const pgk = require("../package.json");

module.exports = async({router}) => {

  async function renderCredits(ctx) {
    const deps = Object.keys(pgk.dependencies);

    const data = {deps};
    const logsHash = await hashLog(JSON.stringify(data));
    await ctx.renderView("credits", {
      ...data,
      logsHash
    });
  }

  router.get("/credits", async(ctx) => renderCredits(ctx));

};
