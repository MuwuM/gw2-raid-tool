module.exports = async({router}) => {
  async function renderCredits(ctx) {
    await ctx.renderView("credits", {});
  }
  router.get("/credits", async(ctx) => renderCredits(ctx));
};
