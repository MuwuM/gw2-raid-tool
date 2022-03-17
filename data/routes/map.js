
module.exports = async({router}) => {
  router.get("/map", async(ctx) => {
    await ctx.renderView("map", {});
  });
};
